import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/require-admin";
import { z } from "zod";

export async function GET() {
  const admin = await requireAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const states = await prisma.state.findMany({ orderBy: { name: "asc" } });
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const poolByState = await prisma.did.groupBy({
    by: ["stateId"],
    where: { assignedTo: null },
    _count: { _all: true },
  });
  const assignedByState = await prisma.did.groupBy({
    by: ["stateId"],
    where: { assignedTo: { not: null } },
    _count: { _all: true },
  });
  const callsByStateToday = await prisma.$queryRaw<
    Array<{ state_id: number; c: bigint }>
  >`
    SELECT d.state_id, COUNT(*)::bigint AS c
    FROM call_logs cl
    JOIN dids d ON d.id = cl.did_id
    WHERE cl.started_at >= ${start}
    GROUP BY d.state_id
  `;

  const poolMap = new Map(poolByState.map((p) => [p.stateId, p._count._all]));
  const assignedMap = new Map(
    assignedByState.map((p) => [p.stateId, p._count._all])
  );
  const callsStateMap = new Map(
    callsByStateToday.map((r) => [r.state_id, Number(r.c)])
  );

  return NextResponse.json({
    states: states.map((s) => ({
      id: s.id,
      name: s.name,
      code: s.code,
      status: s.status,
      poolDids: poolMap.get(s.id) ?? 0,
      assignedDids: assignedMap.get(s.id) ?? 0,
      callsToday: callsStateMap.get(s.id) ?? 0,
    })),
  });
}

const patchSchema = z.object({
  id: z.number().int(),
  status: z.enum(["active", "inactive"]),
});

export async function PATCH(req: Request) {
  const admin = await requireAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = patchSchema.parse(await req.json());
    await prisma.state.update({
      where: { id: body.id },
      data: { status: body.status },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
