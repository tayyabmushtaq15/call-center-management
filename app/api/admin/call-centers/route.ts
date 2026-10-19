import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/require-admin";
import bcrypt from "bcryptjs";
import { generateApiKey } from "@/lib/api-key";
import { z } from "zod";

export async function GET() {
  const admin = await requireAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const users = await prisma.user.findMany({
    orderBy: { id: "desc" },
    include: {
      _count: { select: { allowedIps: true } },
    },
  });
  const calls = await prisma.callLog.groupBy({
    by: ["userId"],
    where: { startedAt: { gte: start } },
    _count: { _all: true },
  });
  const callMap = new Map(calls.map((c) => [c.userId, c._count._all]));
  return NextResponse.json({
    callCenters: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      allowedIps: u._count.allowedIps,
      callsToday: callMap.get(u.id) ?? 0,
      status: u.status,
    })),
  });
}

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8).optional(),
});

export async function POST(req: Request) {
  const admin = await requireAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = createSchema.parse(await req.json());
    const password =
      body.password ?? `TempCc!${Math.random().toString(36).slice(2, 12)}`;
    const hash = await bcrypt.hash(password, 12);
    const key = generateApiKey();
    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        password: hash,
        status: "active",
        apiKeys: {
          create: { key, status: "active" },
        },
      },
      include: { apiKeys: true },
    });
    return NextResponse.json({
      success: true,
      id: user.id,
      apiKey: key,
      tempPassword: body.password ? undefined : password,
    });
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && e.code === "P2002") {
      return NextResponse.json({ error: "Email already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
