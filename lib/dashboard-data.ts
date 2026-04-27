import { prisma } from "@/lib/prisma";

export async function getDashboardPayload() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const weekStart = new Date(start);
  weekStart.setDate(weekStart.getDate() - 7);

  const settings = await prisma.systemSettings.findUnique({ where: { id: 1 } });

  const [
    totalDids,
    poolDids,
    assignedDids,
    inUseDids,
    activeCenters,
    activeSwitches,
    callsToday,
    answeredToday,
    durationToday,
    activeCalls,
    recentActivity,
    poolByState,
  ] = await Promise.all([
    prisma.did.count(),
    prisma.did.count({ where: { assignedTo: null } }),
    prisma.did.count({ where: { assignedTo: { not: null } } }),
    prisma.did.count({ where: { isInUse: true } }),
    prisma.user.count({ where: { status: "active" } }),
    prisma.switch.count({ where: { status: "active" } }),
    prisma.callLog.count({ where: { startedAt: { gte: start } } }),
    prisma.callLog.count({
      where: { startedAt: { gte: start }, callStatus: "answered" },
    }),
    prisma.callLog.aggregate({
      where: { startedAt: { gte: start } },
      _sum: { duration: true },
    }),
    prisma.callLog.findMany({
      where: { callStatus: "in_progress" },
      orderBy: { startedAt: "desc" },
      take: 50,
      include: {
        user: { select: { name: true } },
        did: { select: { number: true } },
        switch: { select: { name: true } },
      },
    }),
    prisma.callLog.findMany({
      orderBy: { startedAt: "desc" },
      take: 10,
      include: {
        user: { select: { name: true } },
        did: { select: { number: true } },
      },
    }),
    prisma.did.groupBy({
      by: ["stateId"],
      where: { assignedTo: null },
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
    FROM call_logs
    WHERE started_at >= ${start}
    GROUP BY 1
    ORDER BY 1
  `;

  const byStateToday = await prisma.$queryRaw<
    Array<{ code: string; c: bigint }>
  >`
    SELECT s.code, COUNT(*)::bigint AS c
    FROM call_logs cl
    JOIN dids d ON d.id = cl.did_id
    JOIN states s ON s.id = d.state_id
    WHERE cl.started_at >= ${start}
    GROUP BY s.code
    ORDER BY c DESC
  `;

  const answerTrend = await prisma.$queryRaw<
    Array<{ day: Date; answered: bigint; total: bigint }>
  >`
    SELECT date_trunc('day', started_at) AS day,
      SUM(CASE WHEN call_status = 'answered' THEN 1 ELSE 0 END)::bigint AS answered,
      COUNT(*)::bigint AS total
    FROM call_logs
    WHERE started_at >= ${weekStart}
    GROUP BY 1
    ORDER BY 1
  `;

  return {
    stats: {
      totalDids,
      poolDids,
      assignedDids,
      inUseDids,
      activeCenters,
      activeSwitches,
      callsToday,
      answerRateToday: callsToday ? answeredToday / callsToday : 0,
      durationToday: durationToday._sum.duration ?? 0,
    },
    poolWarnings,
    activeCalls,
    recentLogs: recentActivity,
    charts: {
      hourly: hourly.map((r) => ({ hour: r.h, calls: Number(r.c) })),
      byStateToday: byStateToday.map((r) => ({
        state: r.code,
        calls: Number(r.c),
      })),
      answerTrend: answerTrend.map((r) => ({
        day: r.day.toISOString().slice(0, 10),
        rate: Number(r.total) ? Number(r.answered) / Number(r.total) : 0,
      })),
    },
  };
}
