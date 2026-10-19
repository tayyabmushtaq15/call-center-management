/**
 * Frees DIDs whose lease ran out because the dialer never called /api/v1/did/release,
 * and closes the call log left open for them. (Selection already treats an expired
 * lease as free, so this is bookkeeping for the dashboard counts, not correctness.)
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const g = globalThis as unknown as { __leaseSweeper?: boolean };
  if (g.__leaseSweeper) return;
  g.__leaseSweeper = true;

  const { prisma } = await import("@/lib/prisma");
  const sweep = async () => {
    try {
      await prisma.$transaction([
        prisma.$executeRaw`
          UPDATE callcenter.call_logs
          SET call_status = 'unknown', ended_at = now()
          WHERE call_status::text = 'in_progress'
            AND switch_id IS NULL
            AND did_id IN (
              SELECT id FROM callcenter.dids
              WHERE is_in_use AND lease_expires_at IS NOT NULL AND lease_expires_at < now()
            )`,
        prisma.$executeRaw`
          UPDATE callcenter.dids
          SET is_in_use = false, lease_expires_at = NULL
          WHERE is_in_use AND lease_expires_at IS NOT NULL AND lease_expires_at < now()`,
      ]);
    } catch (e) {
      console.error("lease sweeper failed", e);
    }
  };
  setInterval(() => void sweep(), 30_000).unref();
}
