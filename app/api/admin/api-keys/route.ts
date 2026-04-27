import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/require-admin";
import { generateApiKey } from "@/lib/api-key";
import { z } from "zod";

export async function GET() {
  const admin = await requireAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const keys = await prisma.apiKey.findMany({
    include: { user: { select: { id: true, name: true } } },
    orderBy: { id: "desc" },
  });
  const calls = await prisma.callLog.groupBy({
    by: ["userId"],
    where: { startedAt: { gte: start } },
    _count: { _all: true },
  });
  const callMap = new Map(calls.map((c) => [c.userId, c._count._all]));
  return NextResponse.json({
    keys: keys.map((k) => ({
      id: k.id,
      callCenter: k.user.name,
      userId: k.userId,
      masked: `${k.key.slice(0, 8)}…${k.key.slice(-4)}`,
      status: k.status,
      lastUsedAt: k.lastUsedAt,
      callsToday: callMap.get(k.userId) ?? 0,
    })),
  });
}

const postSchema = z.object({
  userId: z.number().int().positive(),
  action: z.enum(["regenerate", "activate", "deactivate"]),
});

export async function POST(req: Request) {
  const admin = await requireAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = postSchema.parse(await req.json());
    if (body.action === "regenerate") {
      const newKey = generateApiKey();
      await prisma.$transaction([
        prisma.apiKey.updateMany({
          where: { userId: body.userId },
          data: { status: "inactive" },
        }),
        prisma.apiKey.create({
          data: { userId: body.userId, key: newKey, status: "active" },
        }),
      ]);
      return NextResponse.json({ success: true, apiKey: newKey });
    }
    if (body.action === "activate" || body.action === "deactivate") {
      const active = body.action === "activate";
      await prisma.apiKey.updateMany({
        where: { userId: body.userId },
        data: { status: active ? "active" : "inactive" },
      });
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
