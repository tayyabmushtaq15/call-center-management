import { prisma } from "@/lib/prisma";

const buckets = new Map<string, number[]>();

function prune(now: number, windowMs: number, timestamps: number[]) {
  return timestamps.filter((t) => now - t < windowMs);
}

/** Returns true if under limit, false if rate limited. */
export async function checkApiKeyRateLimit(apiKeyId: number): Promise<boolean> {
  const settings = await prisma.systemSettings.findUnique({ where: { id: 1 } });
  const perMinute = settings?.apiRateLimitPerMinute ?? 120;
  const windowMs = 60_000;
  const now = Date.now();
  const key = `ak:${apiKeyId}`;
  const prev = buckets.get(key) ?? [];
  const ts = prune(now, windowMs, prev);
  if (ts.length >= perMinute) {
    buckets.set(key, ts);
    return false;
  }
  ts.push(now);
  buckets.set(key, ts);
  return true;
}
