import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/require-admin";
import { z } from "zod";

const types = z.enum([
  "summary",
  "by_state",
  "by_call_center",
  "did_usage",
  "pool_health",
]);

export async function GET(req: Request) {
  const admin = await requireAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const type = types.safeParse(searchParams.get("type") ?? "summary");
  if (!type.success) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }
  const from = searchParams.get("from")
    ? new Date(searchParams.get("from")!)
    : new Date(Date.now() - 30 * 86400000);
  const to = searchParams.get("to")
    ? new Date(searchParams.get("to")!)
    : new Date();
  const userId = searchParams.get("userId");
  const stateCode = searchParams.get("state");

  const uid = userId && !Number.isNaN(Number(userId)) ? Number(userId) : undefined;
  const logWhere = {
    startedAt: { gte: from, lte: to },
    ...(uid ? { userId: uid } : {}),
    ...(stateCode
      ? {
          receiverState: stateCode,
        }
      : {}),
  };

  switch (type.data) {
    case "summary": {
      const [total, answered, dur] = await Promise.all([
        prisma.callLog.count({ where: logWhere }),
        prisma.callLog.count({
          where: { ...logWhere, callStatus: "answered" },
        }),
        prisma.callLog.aggregate({
          where: logWhere,
          _sum: { duration: true },
        }),
      ]);
      return NextResponse.json({
        totalCalls: total,
        answered,
        notAnswered: total - answered,
        answerRate: total ? answered / total : 0,
        talkSeconds: dur._sum.duration ?? 0,
      });
    }
    case "by_state": {
      const rows = await prisma.$queryRaw<
        Array<{ code: string; calls: bigint; answered: bigint }>
      >`
        SELECT s.code,
          COUNT(*)::bigint AS calls,
          SUM(CASE WHEN cl.call_status = 'answered' THEN 1 ELSE 0 END)::bigint AS answered
        FROM callcenter.call_logs cl
        JOIN callcenter.dids d ON d.id = cl.did_id
        JOIN callcenter.states s ON s.id = d.state_id
        WHERE cl.started_at >= ${from} AND cl.started_at <= ${to}
        GROUP BY s.code
        ORDER BY calls DESC
      `;
      return NextResponse.json({
        rows: rows.map((r) => ({
          state: r.code,
          calls: Number(r.calls),
          answerRate: Number(r.calls)
            ? Number(r.answered) / Number(r.calls)
            : 0,
        })),
      });
    }
    case "by_call_center": {
      const rows = await prisma.callLog.groupBy({
        by: ["userId"],
        where: logWhere,
        _count: { _all: true },
      });
      const users = await prisma.user.findMany({
        where: { id: { in: rows.map((r) => r.userId) } },
      });
      const nameMap = new Map(users.map((u) => [u.id, u.name]));
      const answered = await prisma.callLog.groupBy({
        by: ["userId"],
        where: { ...logWhere, callStatus: "answered" },
        _count: { _all: true },
      });
      const ansMap = new Map(answered.map((a) => [a.userId, a._count._all]));
      const dur = await prisma.callLog.groupBy({
        by: ["userId"],
        where: logWhere,
        _sum: { duration: true },
      });
      const durMap = new Map(dur.map((d) => [d.userId, d._sum.duration ?? 0]));
      return NextResponse.json({
        rows: rows.map((r) => ({
          callCenter: nameMap.get(r.userId) ?? "?",
          calls: r._count._all,
          answerRate: r._count._all
            ? (ansMap.get(r.userId) ?? 0) / r._count._all
            : 0,
          talkSeconds: durMap.get(r.userId) ?? 0,
        })),
      });
    }
    case "did_usage": {
      const most = await prisma.did.findMany({
        orderBy: { totalUses: "desc" },
        take: 20,
        include: { state: true },
      });
      const least = await prisma.did.findMany({
        orderBy: { totalUses: "asc" },
        take: 20,
        include: { state: true },
      });
      const never = await prisma.did.count({ where: { totalUses: 0 } });
      return NextResponse.json({ most, least, neverUsedCount: never });
    }
    case "pool_health": {
      const settings = await prisma.systemSettings.findUnique({
        where: { id: 1 },
      });
      const threshold = settings?.lowPoolWarningThreshold ?? 5;
      const states = await prisma.state.findMany({ orderBy: { code: "asc" } });
      const pool = await prisma.did.groupBy({
        by: ["stateId"],
        where: { status: "active" },
        _count: { _all: true },
      });
      const busy = await prisma.did.groupBy({
        by: ["stateId"],
        where: { status: "active", isInUse: true, leaseExpiresAt: { gt: new Date() } },
        _count: { _all: true },
      });
      const pm = new Map(pool.map((p) => [p.stateId, p._count._all]));
      const am = new Map(busy.map((a) => [a.stateId, a._count._all]));
      return NextResponse.json({
        threshold,
        rows: states.map((s) => ({
          state: s.code,
          pool: pm.get(s.id) ?? 0,
          inUse: am.get(s.id) ?? 0,
          low: (pm.get(s.id) ?? 0) < threshold,
        })),
      });
    }
    default:
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }
}
