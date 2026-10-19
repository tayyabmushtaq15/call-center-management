import { prisma } from "@/lib/prisma";

const buckets = new Map<string, number[]>();
let cachedLimit: { at: number; perMinute: number } | null = null;

async function getPerMinute(now: number): Promise<number> {
  if (cachedLimit && now - cachedLimit.at < 30_000) return cachedLimit.perMinute;
  const settings = await prisma.systemSettings.findUnique({ where: { id: 1 } });
  cachedLimit = { at: now, perMinute: settings?.apiRateLimitPerMinute ?? 6000 };
  return cachedLimit.perMinute;
}

function prune(now: number, windowMs: number, timestamps: number[]) {
  return timestamps.filter((t) => now - t < windowMs);
}

/** Returns true if under limit, false if rate limited. */
export async function checkApiKeyRateLimit(apiKeyId: number): Promise<boolean> {
  const now = Date.now();
  const perMinute = await getPerMinute(now);
  const windowMs = 60_000;
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
