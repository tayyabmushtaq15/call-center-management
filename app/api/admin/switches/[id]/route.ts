import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/require-admin";
import { z } from "zod";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const sw = await prisma.switch.findUnique({
    where: { id: Number(id) },
    include: {
      users: { select: { id: true, name: true, email: true, status: true } },
    },
  });
  if (!sw) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const logsToday = await prisma.callLog.count({
    where: { switchId: sw.id, startedAt: { gte: start } },
  });
  const answeredToday = await prisma.callLog.count({
    where: {
      switchId: sw.id,
      startedAt: { gte: start },
      callStatus: "answered",
    },
  });
  const durationAgg = await prisma.callLog.aggregate({
    where: { switchId: sw.id, startedAt: { gte: start } },
    _sum: { duration: true },
  });

  return NextResponse.json({
    switch: sw,
    stats: {
      callsToday: logsToday,
      answerRateToday: logsToday ? answeredToday / logsToday : 0,
      durationToday: durationAgg._sum.duration ?? 0,
    },
  });
}

const patchSchema = z.object({
  name: z.string().optional(),
  switchType: z.string().optional(),
  switchUrl: z.string().optional(),
  switchPort: z.number().optional(),
  authToken: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  try {
    const body = patchSchema.parse(await req.json());
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.switchType !== undefined) data.switchType = body.switchType;
    if (body.switchUrl !== undefined) data.switchUrl = body.switchUrl;
    if (body.switchPort !== undefined) data.switchPort = body.switchPort;
    if (body.authToken !== undefined) data.authToken = body.authToken;
    if (body.status !== undefined) data.status = body.status;
    await prisma.switch.update({
      where: { id: Number(id) },
      data,
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  try {
    await prisma.switch.delete({ where: { id: Number(id) } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Cannot delete" }, { status: 400 });
  }
}
