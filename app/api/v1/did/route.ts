import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeUsPhone, extractAreaCode } from "@/lib/phone";
import {
  authenticateDialer,
  fallbackCallerId,
  formatDid,
  logRequest,
  lookupState,
  textResponse,
} from "@/lib/dialer";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/did?apikey=…&number=…&callerId=…
 * Called from the Asterisk dialplan via CURL(); the body is used as CALLERID(num).
 * Returns the DID digits, or the caller's own `callerId` if we can't serve the request.
 */
export async function GET(req: Request) {
  const startedAt = Date.now();
  const q = new URL(req.url).searchParams;
  const fallback = fallbackCallerId(q.get("callerId"));
  const normalized = normalizeUsPhone(q.get("number") ?? "");

  const auth = await authenticateDialer(req, q.get("apikey"));
  if (!auth.ok) {
    await logRequest({
      userId: auth.userId, kind: "did", ip: auth.ip, destination: normalized,
      outcome: "rejected", reason: auth.reason, startedAt,
    });
    return textResponse(fallback, auth.status);
  }

  const fail = async (reason: string, status = 200) => {
    await logRequest({
      userId: auth.userId, kind: "did", ip: auth.ip, destination: normalized,
      outcome: "fallback", reason, startedAt,
    });
    return textResponse(fallback, status);
  };

  const npa = normalized ? extractAreaCode(normalized) : null;
  if (!normalized || !npa) return fail("invalid_number");

  try {
    const area = await lookupState(npa);
    if (!area) return fail("unknown_area_code");
    if (!area.active) return fail("state_inactive");

    const picked = await prisma.$transaction(async (tx) => {
      // Any call center may use any DID in the shared pool; no per-center assignment.
      // Free = not in use, or its lease ran out (the dialer never sent a release).
      const rows = await tx.$queryRaw<Array<{ id: number; number: string }>>(Prisma.sql`
        SELECT d.id, d.number
        FROM callcenter.dids d
        WHERE d.state_id = ${area.stateId}
          AND d.status::text = 'active'
          AND (d.is_in_use = false OR d.lease_expires_at IS NULL OR d.lease_expires_at < now())
        ORDER BY d.total_uses ASC, d.id ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      `);
      if (!rows.length) return null;
      const { id: didId, number } = rows[0];
      const now = new Date();

      // A lease that expired without a release leaves its old call open; close it.
      await tx.callLog.updateMany({
        where: { didId, callStatus: "in_progress" },
        data: { callStatus: "unknown", endedAt: now },
      });
      await tx.did.update({
        where: { id: didId },
        data: {
          isInUse: true,
          leaseExpiresAt: new Date(now.getTime() + auth.leaseSeconds * 1000),
          totalUses: { increment: 1 },
          lastUsedAt: now,
        },
      });
      await tx.callLog.create({
        data: {
          userId: auth.userId,
          didId,
          switchId: null,
          receiverNumber: normalized,
          receiverState: area.code,
          callStatus: "in_progress",
          startedAt: now,
        },
      });
      return number;
    });

    if (!picked) return fail("no_did_available");

    await prisma.apiKey.updateMany({
      where: { id: auth.apiKeyId, OR: [{ lastUsedAt: null }, { lastUsedAt: { lt: new Date(Date.now() - 60_000) } }] },
      data: { lastUsedAt: new Date() },
    });
    await logRequest({
      userId: auth.userId, kind: "did", ip: auth.ip, destination: normalized,
      didNumber: picked, outcome: "ok", startedAt,
    });
    return textResponse(formatDid(picked));
  } catch (e) {
    console.error("GET /api/v1/did", e);
    return fail("server_error", 500);
  }
}
