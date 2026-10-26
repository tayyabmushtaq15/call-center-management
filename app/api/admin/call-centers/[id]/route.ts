import { NextResponse } from "next/server";
import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/require-admin";
import bcrypt from "bcryptjs";
import { z } from "zod";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const userId = Number(id);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      dialPrefix: true,
      leaseSeconds: true,
      createdAt: true,
      apiKeys: { select: { id: true, key: true, status: true, lastUsedAt: true } },
    },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const weekAgo = new Date(start);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(start);
  monthAgo.setDate(monthAgo.getDate() - 30);

  const [today, week, month, answered, duration] = await Promise.all([
    prisma.callLog.count({ where: { userId, startedAt: { gte: start } } }),
    prisma.callLog.count({ where: { userId, startedAt: { gte: weekAgo } } }),
    prisma.callLog.count({ where: { userId, startedAt: { gte: monthAgo } } }),
    prisma.callLog.count({
      where: { userId, startedAt: { gte: start }, callStatus: "answered" },
    }),
    prisma.callLog.aggregate({
      where: { userId, startedAt: { gte: start } },
      _sum: { duration: true },
    }),
  ]);

  return NextResponse.json({
    user,
    stats: {
      callsToday: today,
      callsWeek: week,
      callsMonth: month,
      answerRateToday: today ? answered / today : 0,
      talkSecondsToday: duration._sum.duration ?? 0,
    },
  });
}

const patchSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  status: z.enum(["active", "inactive"]).optional(),
  dialPrefix: z.string().regex(/^\d{0,10}$/).nullable().optional(),
  leaseSeconds: z.number().int().min(10).max(86400).optional(),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const userId = Number(id);
  try {
    const body = patchSchema.parse(await req.json());
    const { password, ...rest } = body;
    const data: Prisma.UserUpdateInput = {};
    if (rest.name !== undefined) data.name = rest.name;
    if (rest.email !== undefined) data.email = rest.email;
    if (rest.status !== undefined) data.status = rest.status;
    if (rest.leaseSeconds !== undefined) data.leaseSeconds = rest.leaseSeconds;
    if (rest.dialPrefix !== undefined) data.dialPrefix = rest.dialPrefix === "" ? null : rest.dialPrefix;
    if (password) data.password = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id: userId },
      data,
    });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && e.code === "P2002") {
      return NextResponse.json({ error: "Email already exists" }, { status: 400 });
    }
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
    await prisma.user.delete({ where: { id: Number(id) } });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && e.code === "P2003") {
      return NextResponse.json(
        { error: "This call center has call history and cannot be deleted. Set it to inactive instead." },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Cannot delete" }, { status: 400 });
  }
}
