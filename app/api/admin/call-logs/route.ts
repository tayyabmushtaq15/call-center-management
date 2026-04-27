import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/require-admin";
import { Prisma } from "@/app/generated/prisma/client";

export async function GET(req: Request) {
  const admin = await requireAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const switchId = searchParams.get("switchId");
  const state = searchParams.get("state");
  const status = searchParams.get("status");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const q = searchParams.get("q");

  const where: Prisma.CallLogWhereInput = {};
  if (userId) where.userId = Number(userId);
  if (switchId) where.switchId = Number(switchId);
  if (state) where.receiverState = state;
  if (status === "answered" || status === "not_answered" || status === "in_progress") {
    where.callStatus = status;
  }
  if (from || to) {
    where.startedAt = {};
    if (from) where.startedAt.gte = new Date(from);
    if (to) where.startedAt.lte = new Date(to);
  }
  if (q) {
    where.OR = [
      { receiverNumber: { contains: q.replace(/\D/g, "") } },
      { did: { number: { contains: q.replace(/\D/g, "") } } },
    ];
  }

  const logs = await prisma.callLog.findMany({
    where,
    orderBy: { startedAt: "desc" },
    take: 500,
    include: {
      user: { select: { name: true } },
      did: { select: { number: true } },
      switch: { select: { name: true } },
    },
  });

  return NextResponse.json({ logs });
}
