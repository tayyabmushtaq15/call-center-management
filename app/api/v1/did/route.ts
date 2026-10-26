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
 * Called from the Asterisk dial plan via CURL(); the body becomes CALLERID(num).
 *
 * Returns a DID for the dialed number: one with the same area code if we have it, otherwise any DID in
 * the same state, rotating through them so the least-used goes first. There is no reservation and no
 * release step, a DID can be on several calls at once. If we can't serve the request, the dialer's own
 * `callerId` is returned so the call still goes out.
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
          userId: auth.userId, ip: auth.ip, destination: rawDigits || null,
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
        userId: auth.userId, ip: auth.ip, destination: normalized ?? (rawDigits || null),
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

    // One statement: pick the least-used DID (same area code first, else same state), count the use, log the call.
    // Timestamp columns hold naive UTC, so times come from (now() AT TIME ZONE 'UTC'), not the session timezone.
    const rows = await prisma.$queryRaw<Array<{ number: string }>>(Prisma.sql`
      WITH picked AS (
        SELECT id FROM (
          (SELECT d.id, 0 AS rnk FROM callcenter.dids d
            WHERE d.state_id = ${area.stateId} AND d.area_code = ${npa}::text AND d.status::text = 'active'
            ORDER BY d.total_uses, d.id LIMIT 1)
          UNION ALL
          (SELECT d.id, 1 AS rnk FROM callcenter.dids d
            WHERE d.state_id = ${area.stateId} AND d.status::text = 'active'
            ORDER BY d.total_uses, d.id LIMIT 1)
        ) c
        ORDER BY rnk
        LIMIT 1
      ),
      upd AS (
        UPDATE callcenter.dids d
        SET total_uses = d.total_uses + 1,
            last_used_at = (now() AT TIME ZONE 'UTC')
        FROM picked
        WHERE d.id = picked.id
        RETURNING d.id, d.number
      ),
      ins AS (
        INSERT INTO callcenter.call_logs
          (user_id, did_id, switch_id, receiver_number, receiver_state, call_status, started_at)
        SELECT ${auth.userId}::int, upd.id, NULL, ${normalized}::text, ${area.code}::text,
               'unknown'::callcenter."CallLogStatus", (now() AT TIME ZONE 'UTC')
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
        userId: auth.userId, ip: auth.ip, destination: normalized,
        didNumber: picked, outcome: "ok", startedAt,
      });
    });
    return textResponse(formatDid(picked));
  } catch (e) {
    console.error("GET /api/v1/did", e);
    return fail("server_error", 500);
  }
}
