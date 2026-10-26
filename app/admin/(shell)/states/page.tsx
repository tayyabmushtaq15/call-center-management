import { prisma } from "@/lib/prisma";
import { StatesClient } from "./states-client";
import { PageHeader } from "@/components/admin-chrome";

export default async function StatesPage() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const states = await prisma.state.findMany({ orderBy: { name: "asc" } });
  const settings = await prisma.systemSettings.findUnique({ where: { id: 1 } });
  const poolByState = await prisma.did.groupBy({
    by: ["stateId"],
    where: { status: "active" },
    _count: { _all: true },
  });
  const busyByState = await prisma.did.groupBy({
    by: ["stateId"],
    where: { status: "active", isInUse: true, leaseExpiresAt: { gt: new Date() } },
    _count: { _all: true },
  });
  const callsByStateToday = await prisma.$queryRaw<
    Array<{ state_id: number; c: bigint }>
  >`
    SELECT d.state_id, COUNT(*)::bigint AS c
    FROM callcenter.call_logs cl
    JOIN callcenter.dids d ON d.id = cl.did_id
    WHERE cl.started_at >= ${start}
    GROUP BY d.state_id
  `;
  const poolMap = new Map(poolByState.map((p) => [p.stateId, p._count._all]));
  const busyMap = new Map(busyByState.map((p) => [p.stateId, p._count._all]));
  const callsMap = new Map(
    callsByStateToday.map((r) => [r.state_id, Number(r.c)])
  );

  const rows = states.map((s) => ({
    id: s.id,
    name: s.name,
    code: s.code,
    status: s.status,
    poolDids: poolMap.get(s.id) ?? 0,
    busyDids: busyMap.get(s.id) ?? 0,
    callsToday: callsMap.get(s.id) ?? 0,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="States"
        description="How many DIDs are free in each state right now. Search or filter to find a state fast, open its free DIDs, or turn a state off to stop the dialer API using it."
      />
      <StatesClient initialRows={rows} lowThreshold={settings?.lowPoolWarningThreshold ?? 5} />
    </div>
  );
}
