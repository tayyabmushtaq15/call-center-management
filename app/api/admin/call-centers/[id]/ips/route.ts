import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/require-admin";
import { normalizeAllowedEntry } from "@/lib/ip";
import { z } from "zod";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  if (!(await requireAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = Number((await ctx.params).id);
  const ips = await prisma.allowedIp.findMany({
    where: { userId },
    orderBy: { id: "asc" },
  });
  return NextResponse.json({ ips });
}

const addSchema = z.object({
  ip: z.string().min(2),
  label: z.string().max(100).optional(),
});

export async function POST(req: Request, ctx: Ctx) {
  if (!(await requireAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = Number((await ctx.params).id);
  try {
    const body = addSchema.parse(await req.json());
    const ip = normalizeAllowedEntry(body.ip);
    if (!ip) return NextResponse.json({ error: "Enter an IP address, or an IPv4 range no wider than /16 (e.g. 203.0.113.0/28)." }, { status: 400 });
    await prisma.allowedIp.create({
      data: { userId, ip, label: body.label?.trim() || null },
    });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && e.code === "P2002") {
      return NextResponse.json({ error: "IP already listed" }, { status: 400 });
    }
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}

const patchSchema = z.object({
  ipId: z.number().int().positive(),
  status: z.enum(["active", "inactive"]),
});

export async function PATCH(req: Request, ctx: Ctx) {
  if (!(await requireAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = Number((await ctx.params).id);
  try {
    const { ipId, status } = patchSchema.parse(await req.json());
    await prisma.allowedIp.updateMany({ where: { id: ipId, userId }, data: { status } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  if (!(await requireAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = Number((await ctx.params).id);
  const ipId = Number(new URL(req.url).searchParams.get("ipId"));
  if (!Number.isInteger(ipId)) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  await prisma.allowedIp.deleteMany({ where: { id: ipId, userId } });
  return NextResponse.json({ success: true });
}
