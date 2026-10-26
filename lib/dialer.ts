import { prisma } from "@/lib/prisma";
import { getClientIp, ipMatches } from "@/lib/ip";
import { checkApiKeyRateLimit } from "@/lib/rate-limit";
import { normalizeUsPhone } from "@/lib/phone";
import { count, hit } from "@/lib/throttle";

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

/** Digits as the trunk expects them: 1 + 10 digits (11 digits) by default. Set DID_OUTPUT_PREFIX to "" for 10 digits, or "+1" for E.164. */
export function formatDid(tenDigits: string): string {
  return `${process.env.DID_OUTPUT_PREFIX ?? "1"}${tenDigits}`;
}

/**
 * The dialed (B) number as 10 digits. The dialer may send it with the call center's dial prefix still on
 * the front (e.g. 7084 + 9045551234); that is stripped when the digits are not already a valid number.
 * The prefix is optional, so a number without it works too.
 */
export function resolveDestination(raw: string | null, dialPrefix: string | null): string | null {
  const digits = (raw ?? "").replace(/\D/g, "");
  const direct = normalizeUsPhone(digits);
  if (direct) return direct;
  if (dialPrefix && digits.startsWith(dialPrefix)) return normalizeUsPhone(digits.slice(dialPrefix.length));
  return null;
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
  | { ok: true; ip: string; userId: number; apiKeyId: number; dialPrefix: string | null }
  | { ok: false; ip: string; userId: number | null; status: number; reason: string; logIt: boolean };

const FAIL_WINDOW_MS = 60_000;
/** Past this many rejected requests per minute from one IP, stop touching the database for it at all. */
const FAIL_SHORT_CIRCUIT = 30;
/** Rejected requests are logged for diagnosis, but only the first few per IP per minute, so junk traffic can't fill the table. */
const FAIL_LOGGED = 5;
/** Across all sources, at most this many rejected requests are logged per minute (a flood from many IPs still can't fill the table). */
const FAIL_LOGGED_GLOBAL = 100;

function reject(ip: string, userId: number | null, status: number, reason: string): DialerAuth {
  const n = hit(`fail:${ip}`, FAIL_WINDOW_MS);
  const logIt = n <= FAIL_LOGGED && hit("fail-log:all", FAIL_WINDOW_MS) <= FAIL_LOGGED_GLOBAL;
  return { ok: false, ip, userId, status, reason, logIt };
}

/** API key + source-IP whitelist + rate limit. The IP check fails closed: a call center with no allowed IPs is rejected. */
export async function authenticateDialer(req: Request, apiKey: string | null): Promise<DialerAuth> {
  const ip = getClientIp(req);
  if (count(`fail:${ip}`, FAIL_WINDOW_MS) >= FAIL_SHORT_CIRCUIT) return reject(ip, null, 429, "throttled");
  if (!apiKey) return reject(ip, null, 401, "missing_api_key");

  const row = await prisma.apiKey.findFirst({
    where: { key: apiKey, status: "active" },
    select: {
      id: true,
      userId: true,
      user: {
        select: {
          status: true,
          dialPrefix: true,
          allowedIps: { where: { status: "active" }, select: { ip: true } },
        },
      },
    },
  });
  if (!row) return reject(ip, null, 401, "invalid_api_key");
  if (row.user.status !== "active") return reject(ip, row.userId, 403, "call_center_inactive");
  if (!row.user.allowedIps.some((a) => ipMatches(ip, a.ip))) {
    return reject(ip, row.userId, 403, "ip_not_allowed");
  }
  if (!(await checkApiKeyRateLimit(row.id))) {
    return reject(ip, row.userId, 429, "rate_limited");
  }
  return {
    ok: true,
    ip,
    userId: row.userId,
    apiKeyId: row.id,
    dialPrefix: row.user.dialPrefix,
  };
}

export async function logRequest(entry: {
  userId: number | null;
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
        kind: "did",
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
