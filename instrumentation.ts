/**
 * Keeps the dialer request log bounded: it gets one row per call, so rows older than
 * REQUEST_LOG_RETENTION_DAYS (default 30) are deleted once an hour.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const g = globalThis as unknown as { __logPruner?: boolean };
  if (g.__logPruner) return;
  g.__logPruner = true;

  const { prisma } = await import("@/lib/prisma");
  const retentionDays = Number(process.env.REQUEST_LOG_RETENTION_DAYS ?? 30);
  const prune = async () => {
    try {
      await prisma.didRequestLog.deleteMany({
        where: { createdAt: { lt: new Date(Date.now() - retentionDays * 86_400_000) } },
      });
    } catch (e) {
      console.error("request log prune failed", e);
    }
  };
  setInterval(() => void prune(), 3_600_000).unref();
}
