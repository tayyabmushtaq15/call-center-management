import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/require-admin";
import { randomBytes } from "crypto";
import { z } from "zod";

export async function GET() {
  const admin = await requireAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const switches = await prisma.switch.findMany({
    orderBy: { id: "desc" },
    include: { _count: { select: { users: true } } },
  });
  return NextResponse.json({
    switches: switches.map((s) => ({
      id: s.id,
      name: s.name,
      switchType: s.switchType,
      switchUrl: s.switchUrl,
      switchPort: s.switchPort,
      status: s.status,
      callCenters: s._count.users,
    })),
  });
}

const createSchema = z.object({
  name: z.string().min(1),
  switchType: z.string().min(1),
  switchUrl: z.string().min(1),
  switchPort: z.number().int().positive(),
  authToken: z.string().min(1),
  status: z.enum(["active", "inactive"]).optional(),
});

export async function POST(req: Request) {
  const admin = await requireAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = createSchema.parse(await req.json());
    const webhookSecret = randomBytes(32).toString("hex");
    const sw = await prisma.switch.create({
      data: {
        name: body.name,
        switchType: body.switchType,
        switchUrl: body.switchUrl,
        switchPort: body.switchPort,
        authToken: body.authToken,
        webhookSecret,
        status: body.status ?? "active",
      },
    });
    return NextResponse.json({
      success: true,
      id: sw.id,
      webhookSecret,
    });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
