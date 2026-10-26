import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  authenticateDialer,
  callStatusFromDialStatus,
  logRequest,
  normalizeDidParam,
  textResponse,
} from "@/lib/dialer";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/did/release?apikey=…&did=…[&status=<DIALSTATUS>][&duration=<seconds>]
 *
 * Called from the dial plan's `h` (hangup) extension. It runs for every way a call can end: answered and
 * hung up, busy, no answer, cancelled, congestion, failed. Whatever the status, the DID is freed.
 * `status` (Asterisk DIALSTATUS) and `duration` only describe how the call went. Always answers "OK";
 * a repeated or unknown release is harmless.
 */
export async function GET(req: Request) {
  const startedAt = Date.now();
  const q = new URL(req.url).searchParams;
  const did = normalizeDidParam(q.get("did"));

  const auth = await authenticateDialer(req, q.get("apikey"));
  if (!auth.ok) {
    if (auth.logIt) {
      after(() =>
        logRequest({
          userId: auth.userId, kind: "release", ip: auth.ip, didNumber: did,
          outcome: "rejected", reason: auth.reason, startedAt,
        })
      );
    }
    return textResponse("", auth.status);
  }
  if (!did) {
    after(() =>
      logRequest({
        userId: auth.userId, kind: "release", ip: auth.ip,
        outcome: "fallback", reason: "invalid_did", startedAt,
      })
    );
    return textResponse("OK");
  }

  const callStatus = callStatusFromDialStatus(q.get("status"));
  // A bogus duration (1e99, -5, text) must never fail the release: keep it only if it is a sane number of seconds.
  const durationRaw = Number(q.get("duration"));
  const reportedDuration =
    Number.isFinite(durationRaw) && durationRaw >= 0 && durationRaw <= 7 * 86_400 ? Math.round(durationRaw) : null;

  try {
    const released = await prisma.$transaction(async (tx) => {
      const row = await tx.did.findUnique({ where: { number: did }, select: { id: true } });
      if (!row) return false;
      // Only the call center that was handed this DID can release it: it must have an open call on it.
      const log = await tx.callLog.findFirst({
        where: { didId: row.id, userId: auth.userId, callStatus: "in_progress" },
        orderBy: { startedAt: "desc" },
        select: { id: true, startedAt: true },
      });
      // No open call: the lease already ran out (and the DID may be on a new call), so leave it alone.
      if (!log) return false;
      const now = new Date();
      await tx.did.update({ where: { id: row.id }, data: { isInUse: false, leaseExpiresAt: null } });
      await tx.callLog.update({
        where: { id: log.id },
        data: {
          callStatus,
          endedAt: now,
          duration: reportedDuration ?? Math.max(0, Math.round((now.getTime() - log.startedAt.getTime()) / 1000)),
        },
      });
      return true;
    });
    after(() =>
      logRequest({
        userId: auth.userId, kind: "release", ip: auth.ip, didNumber: did,
        outcome: released ? "ok" : "fallback",
        reason: released ? (q.get("status") ? `status=${q.get("status")!.slice(0, 20)}` : null) : "no_open_call",
        startedAt,
      })
    );
  } catch (e) {
    console.error("GET /api/v1/did/release", e);
    after(() =>
      logRequest({
        userId: auth.userId, kind: "release", ip: auth.ip, didNumber: did,
        outcome: "fallback", reason: "server_error", startedAt,
      })
    );
  }
  return textResponse("OK");
}
