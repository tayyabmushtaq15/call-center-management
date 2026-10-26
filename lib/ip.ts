import { isIP } from "net";

/**
 * Client IP as seen by the reverse proxy in front of the app. Next route handlers
 * cannot read the socket address, so the proxy must set one of these headers and
 * the app port must not be reachable except through that proxy.
 *
 * X-Forwarded-For is appended to by each hop, so the rightmost entry is the one
 * our own proxy saw; the leftmost can be forged by the client.
 */
export function getClientIp(req: Request): string {
  // Local development (never production): `next dev` fills X-Forwarded-For with the socket address (::1),
  // which would never match a whitelisted dialer. DEV_CLIENT_IP stands in for it; an explicit
  // X-Real-IP header still wins so the rejection paths can be tried by hand.
  const dev = process.env.DEV_CLIENT_IP;
  if (dev && process.env.NODE_ENV !== "production") {
    const forced = req.headers.get("x-real-ip")?.trim();
    return cleanIp(forced || dev);
  }
  const custom = process.env.CLIENT_IP_HEADER;
  if (custom) {
    const v = req.headers.get(custom)?.trim();
    if (v) return cleanIp(v);
  }
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return cleanIp(real);
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length) return cleanIp(parts[parts.length - 1]);
  }
  return "unknown";
}

/** Strips the IPv4-mapped IPv6 prefix and any port. */
export function cleanIp(raw: string): string {
  let ip = raw.trim();
  if (ip.startsWith("::ffff:")) ip = ip.slice(7);
  const v4port = /^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/.exec(ip);
  if (v4port) ip = v4port[1];
  return ip;
}

function v4ToInt(ip: string): number | null {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip);
  if (!m) return null;
  let n = 0;
  for (let i = 1; i <= 4; i++) {
    const o = Number(m[i]);
    if (o > 255) return null;
    n = n * 256 + o;
  }
  return n;
}

/** Validates an entry stored in allowed_ips: an IP or an IPv4 CIDR. Returns the normalised form or null. */
export function normalizeAllowedEntry(raw: string): string | null {
  const s = cleanIp(raw);
  const slash = s.indexOf("/");
  if (slash === -1) return isIP(s) ? s.toLowerCase() : null;
  const base = s.slice(0, slash);
  const bits = Number(s.slice(slash + 1));
  // Nothing wider than /16: a /0 to /15 range is almost certainly a typo and would whitelist a large part of the internet.
  if (v4ToInt(base) === null || !Number.isInteger(bits) || bits < 16 || bits > 32) return null;
  return `${base}/${bits}`;
}

/** True if `ip` equals the entry, or falls inside it when the entry is an IPv4 CIDR. */
export function ipMatches(ip: string, entry: string): boolean {
  const c = cleanIp(ip).toLowerCase();
  const slash = entry.indexOf("/");
  if (slash === -1) return c === entry.toLowerCase();
  const ipN = v4ToInt(c);
  const baseN = v4ToInt(entry.slice(0, slash));
  const bits = Number(entry.slice(slash + 1));
  if (ipN === null || baseN === null) return false;
  if (bits === 0) return true;
  const mask = (0xffffffff << (32 - bits)) >>> 0;
  return ((ipN & mask) >>> 0) === ((baseN & mask) >>> 0);
}
