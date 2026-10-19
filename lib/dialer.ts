import { prisma } from "@/lib/prisma";
import { getClientIp, ipMatches } from "@/lib/ip";
import { checkApiKeyRateLimit } from "@/lib/rate-limit";
import { normalizeUsPhone } from "@/lib/phone";

/**
 * Shared pieces of the Asterisk/Vicidial dialer API.
 *
 * Asterisk's CURL() puts the raw response body into a dialplan variable, which the
 * dialplan then assigns to CALLERID(num). So every response is bare text: the DID
 * digits on success, or the caller ID the dialer sent us when we can't serve it —
 * never JSON or an error message.
 */

export type Outcome = "ok" | "fallback" | "rejected";

export function textResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}

/** The caller ID the dialer already has, passed through unchanged on any failure. */
export function fallbackCallerId(raw: string | null): string {
  return (raw ?? "").replace(/[^\d+]/g, "").slice(0, 20);
}

/** Digits as the trunk expects them. Set DID_OUTPUT_PREFIX to "1" or "+1" if it wants more than 10 digits. */
export function formatDid(tenDigits: string): string {
  return `${process.env.DID_OUTPUT_PREFIX ?? ""}${tenDigits}`;
}

export function normalizeDidParam(raw: string | null): string | null {
  return raw ? normalizeUsPhone(raw) : null;
}

type AreaEntry = { stateId: number; code: string; active: boolean };
let areaCache: { at: number; map: Map<string, AreaEntry> } | null = null;
const AREA_TTL_MS = 30_000;

export async function lookupState(areaCode: string): Promise<AreaEntry | null> {
  const now = Date.now();
  if (!areaCache || now - areaCache.at > AREA_TTL_MS) {
    const rows = await prisma.areaCodeMap.findMany({
      include: { state: { select: { code: true, status: true } } },
    });
    areaCache = {
      at: now,
      map: new Map(rows.map((r) => [r.areaCode, { stateId: r.stateId, code: r.state.code, active: r.state.status === "active" }])),
    };
  }
  return areaCache.map.get(areaCode) ?? null;
}

export type DialerAuth =
  | { ok: true; ip: string; userId: number; apiKeyId: number; leaseSeconds: number }
  | { ok: false; ip: string; userId: number | null; status: number; reason: string };

/** API key + source-IP whitelist + rate limit. The IP check fails closed: a call center with no allowed IPs is rejected. */
export async function authenticateDialer(req: Request, apiKey: string | null): Promise<DialerAuth> {
  const ip = getClientIp(req);
  if (!apiKey) return { ok: false, ip, userId: null, status: 401, reason: "missing_api_key" };

  const row = await prisma.apiKey.findFirst({
    where: { key: apiKey, status: "active" },
    select: {
      id: true,
      userId: true,
      user: {
        select: {
          status: true,
          leaseSeconds: true,
          allowedIps: { where: { status: "active" }, select: { ip: true } },
        },
      },
    },
  });
  if (!row || row.user.status !== "active") {
    return { ok: false, ip, userId: null, status: 401, reason: "invalid_api_key" };
  }
  if (!row.user.allowedIps.some((a) => ipMatches(ip, a.ip))) {
    return { ok: false, ip, userId: row.userId, status: 403, reason: "ip_not_allowed" };
  }
  if (!(await checkApiKeyRateLimit(row.id))) {
    return { ok: false, ip, userId: row.userId, status: 429, reason: "rate_limited" };
  }
  return {
    ok: true,
    ip,
    userId: row.userId,
    apiKeyId: row.id,
    leaseSeconds: row.user.leaseSeconds,
  };
}

export async function logRequest(entry: {
  userId: number | null;
  kind: "did" | "release";
  ip: string;
  destination?: string | null;
  didNumber?: string | null;
  outcome: Outcome;
  reason?: string | null;
  startedAt: number;
}) {
  try {
    await prisma.didRequestLog.create({
      data: {
        userId: entry.userId,
        kind: entry.kind,
        ip: entry.ip.slice(0, 64),
        destination: entry.destination ?? null,
        didNumber: entry.didNumber ?? null,
        outcome: entry.outcome,
        reason: entry.reason ?? null,
        latencyMs: Date.now() - entry.startedAt,
      },
    });
  } catch (e) {
    console.error("didRequestLog write failed", e);
  }
}
