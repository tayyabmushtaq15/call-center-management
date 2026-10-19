import { NextResponse } from "next/server";
import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/require-admin";
import { normalizeUsPhone, extractAreaCode } from "@/lib/phone";
import { z } from "zod";

export async function GET(req: Request) {
  const admin = await requireAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const stateId = searchParams.get("stateId");
  const status = searchParams.get("status");
  const pool = searchParams.get("pool");
  const inUse = searchParams.get("inUse");

  const where: Prisma.DidWhereInput = {};
  if (q) {
    where.number = { contains: q.replace(/\D/g, "") };
  }
  if (stateId) where.stateId = Number(stateId);
  if (status === "active" || status === "inactive") where.status = status;
  if (pool === "1") where.assignedTo = null;
  if (pool === "0") where.assignedTo = { not: null };
  if (inUse === "1") where.isInUse = true;
  if (inUse === "0") where.isInUse = false;

  const dids = await prisma.did.findMany({
    where,
    orderBy: { id: "desc" },
    take: 500,
    include: {
      state: true,
      callLogs: {
        where: { callStatus: "in_progress" },
        orderBy: { startedAt: "desc" },
        take: 1,
        select: { user: { select: { id: true, name: true } } },
      },
    },
  });

  return NextResponse.json({
    dids: dids.map(({ callLogs, ...d }) => ({ ...d, user: callLogs[0]?.user ?? null })),
  });
}

const createSchema = z.object({
  number: z.string().min(10),
});

export async function POST(req: Request) {
  const admin = await requireAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = createSchema.parse(await req.json());
    const normalized = normalizeUsPhone(body.number);
    if (!normalized) {
      return NextResponse.json({ error: "Invalid number" }, { status: 400 });
    }
    const npa = extractAreaCode(normalized);
    if (!npa) {
      return NextResponse.json({ error: "Unknown area code" }, { status: 400 });
    }
    const map = await prisma.areaCodeMap.findUnique({
      where: { areaCode: npa },
    });
    if (!map) {
      return NextResponse.json({ error: "Unknown area code" }, { status: 400 });
    }
    await prisma.did.create({
      data: {
        number: normalized,
        areaCode: npa,
        stateId: map.stateId,
        status: "active",
      },
    });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e && typeof e === "object" && "code" in e && e.code === "P2002";
    if (msg) {
      return NextResponse.json({ error: "Duplicate DID" }, { status: 400 });
    }
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}

const bulkSchema = z.object({
  ids: z.array(z.number()).min(1),
  action: z.enum(["delete", "activate", "deactivate"]),
});

export async function PATCH(req: Request) {
  const admin = await requireAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = bulkSchema.parse(await req.json());
    if (body.action === "delete") {
      await prisma.did.deleteMany({
        where: { id: { in: body.ids }, isInUse: false },
      });
    } else if (body.action === "activate") {
      await prisma.did.updateMany({
        where: { id: { in: body.ids } },
        data: { status: "active" },
      });
    } else {
      await prisma.did.updateMany({
        where: { id: { in: body.ids }, isInUse: false },
        data: { status: "inactive" },
      });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
