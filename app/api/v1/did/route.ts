import { after } from "next/server";
import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { extractAreaCode } from "@/lib/phone";
import {
  authenticateDialer,
  fallbackCallerId,
  formatDid,
  logRequest,
  lookupState,
  resolveDestination,
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
  const rawDigits = (q.get("number") ?? "").replace(/\D/g, "").slice(0, 20);

  const auth = await authenticateDialer(req, q.get("apikey"));
  if (!auth.ok) {
    if (auth.logIt) {
      after(() =>
        logRequest({
          userId: auth.userId, kind: "did", ip: auth.ip, destination: rawDigits || null,
          outcome: "rejected", reason: auth.reason, startedAt,
        })
      );
    }
    return textResponse(fallback, auth.status);
  }

  const normalized = resolveDestination(q.get("number"), auth.dialPrefix);

  const fail = (reason: string, status = 200) => {
    after(() =>
      logRequest({
        userId: auth.userId, kind: "did", ip: auth.ip, destination: normalized ?? (rawDigits || null),
        outcome: "fallback", reason, startedAt,
      })
    );
    return textResponse(fallback, status);
  };

  const npa = normalized ? extractAreaCode(normalized) : null;
  if (!normalized || !npa) return fail("invalid_number");

  try {
    const area = await lookupState(npa);
    if (!area) return fail("unknown_area_code");
    if (!area.active) return fail("state_inactive");

    // One statement, so the reservation is atomic and costs a single round trip:
    // pick a free DID (FOR UPDATE SKIP LOCKED keeps concurrent calls off the same row),
    // lock it with a lease, close any call left open on it, and open the new call log.
    // Free = not in use, or its lease ran out (the dialer never reported the end).
    // Timestamp columns hold naive UTC, so every comparison goes through
    // (now() AT TIME ZONE 'UTC') and does not depend on the database session timezone.
    const rows = await prisma.$queryRaw<Array<{ number: string }>>(Prisma.sql`
      WITH picked AS (
        SELECT d.id
        FROM callcenter.dids d
        WHERE d.state_id = ${area.stateId}
          AND d.status::text = 'active'
          AND (d.is_in_use = false
               OR d.lease_expires_at IS NULL
               OR d.lease_expires_at < (now() AT TIME ZONE 'UTC'))
        ORDER BY d.total_uses ASC, d.id ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      ),
      closed AS (
        UPDATE callcenter.call_logs cl
        SET call_status = 'unknown'::callcenter."CallLogStatus",
            ended_at = (now() AT TIME ZONE 'UTC')
        FROM picked
        WHERE cl.did_id = picked.id AND cl.call_status::text = 'in_progress'
        RETURNING cl.id
      ),
      upd AS (
        UPDATE callcenter.dids d
        SET is_in_use = true,
            lease_expires_at = (now() AT TIME ZONE 'UTC') + make_interval(secs => ${auth.leaseSeconds}::int),
            total_uses = d.total_uses + 1,
            last_used_at = (now() AT TIME ZONE 'UTC')
        FROM picked
        WHERE d.id = picked.id
        RETURNING d.id, d.number
      ),
      ins AS (
        INSERT INTO callcenter.call_logs
          (user_id, did_id, switch_id, receiver_number, receiver_state, call_status, started_at)
        SELECT ${auth.userId}::int, upd.id, NULL, ${normalized}::text, ${area.code}::text,
               'in_progress'::callcenter."CallLogStatus", (now() AT TIME ZONE 'UTC')
        FROM upd
        RETURNING id
      )
      SELECT upd.number FROM upd
    `);
    const picked = rows[0]?.number;
    if (!picked) return fail("no_did_available");

    after(async () => {
      await prisma.apiKey
        .updateMany({
          where: { id: auth.apiKeyId, OR: [{ lastUsedAt: null }, { lastUsedAt: { lt: new Date(Date.now() - 60_000) } }] },
          data: { lastUsedAt: new Date() },
        })
        .catch(() => undefined);
      await logRequest({
        userId: auth.userId, kind: "did", ip: auth.ip, destination: normalized,
        didNumber: picked, outcome: "ok", startedAt,
      });
    });
    return textResponse(formatDid(picked));
  } catch (e) {
    console.error("GET /api/v1/did", e);
    return fail("server_error", 500);
  }
}
