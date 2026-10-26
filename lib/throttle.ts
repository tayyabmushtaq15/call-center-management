/**
 * Tiny in-memory sliding-window counter, keyed by string (usually an IP).
 * Per server instance: on serverless each instance counts separately, which is
 * still enough to blunt a flood from one source, but it is not a global limit.
 */
const windows = new Map<string, number[]>();
const MAX_KEYS = 10_000;

/** Records a hit and returns how many hits `key` has made within `windowMs`, including this one. */
export function hit(key: string, windowMs: number, now = Date.now()): number {
  const prev = windows.get(key);
  const ts = prev ? prev.filter((t) => now - t < windowMs) : [];
  ts.push(now);
  if (!prev && windows.size >= MAX_KEYS) {
    // Bound memory under a spoofed-source flood: drop the oldest entry.
    const oldest = windows.keys().next().value;
    if (oldest !== undefined) windows.delete(oldest);
  }
  windows.set(key, ts);
  return ts.length;
}

/** Hits within the window without recording a new one. */
export function count(key: string, windowMs: number, now = Date.now()): number {
  const prev = windows.get(key);
  return prev ? prev.filter((t) => now - t < windowMs).length : 0;
}

export function reset(key: string) {
  windows.delete(key);
}
