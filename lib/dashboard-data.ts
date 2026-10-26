import { prisma } from "@/lib/prisma";

export async function getDashboardPayload() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const weekStart = new Date(start);
  weekStart.setDate(weekStart.getDate() - 7);

  const settings = await prisma.systemSettings.findUnique({ where: { id: 1 } });

  const [
    totalDids,
    activeDids,
    activeCenters,
    callsToday,
    recentActivity,
    poolByState,
  ] = await Promise.all([
    prisma.did.count(),
    prisma.did.count({ where: { status: "active" } }),
    prisma.user.count({ where: { status: "active" } }),
    prisma.callLog.count({ where: { startedAt: { gte: start } } }),
    prisma.callLog.findMany({
      orderBy: { startedAt: "desc" },
      take: 10,
      include: {
        user: { select: { name: true } },
        did: { select: { number: true } },
      },
    }),
    // The dialer API draws from every active DID, so "low pool" is per-state active DIDs.
    prisma.did.groupBy({
      by: ["stateId"],
      where: { status: "active" },
      _count: { _all: true },
    }),
  ]);

  const states = await prisma.state.findMany();
  const stateMap = new Map(states.map((s) => [s.id, s]));
  const threshold = settings?.lowPoolWarningThreshold ?? 5;
  const poolWarnings = poolByState
    .filter((p) => (p._count._all ?? 0) < threshold)
    .map((p) => ({
      state: stateMap.get(p.stateId)?.code ?? "?",
      count: p._count._all,
    }));

  const hourly = await prisma.$queryRaw<Array<{ h: number; c: bigint }>>`
    SELECT EXTRACT(HOUR FROM started_at)::int AS h, COUNT(*)::bigint AS c
    FROM callcenter.call_logs
    WHERE started_at >= ${start}
    GROUP BY 1
    ORDER BY 1
  `;

  const byStateToday = await prisma.$queryRaw<
    Array<{ code: string; c: bigint }>
  >`
    SELECT s.code, COUNT(*)::bigint AS c
    FROM callcenter.call_logs cl
    JOIN callcenter.dids d ON d.id = cl.did_id
    JOIN callcenter.states s ON s.id = d.state_id
    WHERE cl.started_at >= ${start}
    GROUP BY s.code
    ORDER BY c DESC
  `;

  return {
    stats: {
      totalDids,
      activeDids,
      activeCenters,
      callsToday,
    },
    poolWarnings,
    recentLogs: recentActivity,
    charts: {
      hourly: hourly.map((r) => ({ hour: r.h, calls: Number(r.c) })),
      byStateToday: byStateToday.map((r) => ({
        state: r.code,
        calls: Number(r.c),
      })),
    },
  };
}
