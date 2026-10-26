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
      if (body.action === "deactivate") {
        await prisma.apiKey.updateMany({
          where: { userId: body.userId },
          data: { status: "inactive" },
        });
      } else {
        // Re-enable only the newest key. Older keys were rotated out (possibly because they leaked) and stay off.
        const newest = await prisma.apiKey.findFirst({
          where: { userId: body.userId },
          orderBy: { id: "desc" },
          select: { id: true },
        });
        if (newest) {
          await prisma.apiKey.update({ where: { id: newest.id }, data: { status: "active" } });
        }
      }
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}

/**
 * DELETE /api/admin/api-keys?keyId=…   deletes one inactive key
 * DELETE /api/admin/api-keys?inactive=1 deletes every inactive key
 * Active keys are never deleted here: a key in use must be regenerated or deactivated first.
 */
export async function DELETE(req: Request) {
  const admin = await requireAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const q = new URL(req.url).searchParams;
  try {
    if (q.get("inactive") === "1") {
      const { count } = await prisma.apiKey.deleteMany({ where: { status: "inactive" } });
      return NextResponse.json({ success: true, deleted: count });
    }
    const keyId = Number(q.get("keyId"));
    if (!Number.isInteger(keyId) || keyId <= 0) {
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }
    const key = await prisma.apiKey.findUnique({ where: { id: keyId }, select: { status: true } });
    if (!key) return NextResponse.json({ error: "Key not found" }, { status: 404 });
    if (key.status === "active") {
      return NextResponse.json(
        { error: "This key is active. Regenerate or deactivate it first." },
        { status: 400 }
      );
    }
    await prisma.apiKey.delete({ where: { id: keyId } });
    return NextResponse.json({ success: true, deleted: 1 });
  } catch {
    return NextResponse.json({ error: "Could not delete" }, { status: 400 });
  }
}
