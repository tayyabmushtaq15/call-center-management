import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  authenticateDialer,
  logRequest,
  normalizeDidParam,
  textResponse,
} from "@/lib/dialer";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/did/release?apikey=…&did=…[&status=answered|not_answered][&duration=secs]
 * Called from the dialplan's `h` extension when the call ends. Always answers "OK"
 * (the dialplan ignores the body); the real result goes in the request log.
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

  const statusParam = q.get("status");
  const callStatus =
    statusParam === "answered" || statusParam === "not_answered" ? statusParam : "unknown";
  // A bogus duration (1e99, -5, text) must never fail the release: keep it only if it is a sane number of seconds.
  const durationRaw = Number(q.get("duration"));
  const reportedDuration =
    Number.isFinite(durationRaw) && durationRaw >= 0 && durationRaw <= 7 * 86_400 ? Math.round(durationRaw) : null;

  try {
    const released = await prisma.$transaction(async (tx) => {
      // A call center can only release a DID it was handed (it has an open call on it, below).
      const row = await tx.did.findUnique({ where: { number: did }, select: { id: true } });
      if (!row) return false;
      const now = new Date();
      const log = await tx.callLog.findFirst({
        where: { didId: row.id, userId: auth.userId, callStatus: "in_progress" },
        orderBy: { startedAt: "desc" },
        select: { id: true, startedAt: true },
      });
      // No open call means the lease already expired (and the DID may be on a new call): leave it alone.
      if (!log) return false;
      await tx.did.update({
        where: { id: row.id },
        data: { isInUse: false, leaseExpiresAt: null },
      });
      await tx.callLog.update({
        where: { id: log.id },
        data: {
          callStatus,
          endedAt: now,
          duration:
            reportedDuration ?? Math.max(0, Math.round((now.getTime() - log.startedAt.getTime()) / 1000)),
        },
      });
      return true;
    });
    after(() =>
      logRequest({
        userId: auth.userId, kind: "release", ip: auth.ip, didNumber: did,
        outcome: released ? "ok" : "fallback",
        reason: released ? null : "no_open_call", startedAt,
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
