import { NextResponse } from "next/server";
import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/require-admin";
import { normalizeUsPhone, extractAreaCode } from "@/lib/phone";
import { z } from "zod";

type Filters = { q?: string | null; stateId?: string | number | null; status?: string | null; free?: boolean };

/** The DID list filters, shared by the list and "delete all" so both act on exactly the same set. */
function buildWhere({ q, stateId, status, free }: Filters): Prisma.DidWhereInput {
  const where: Prisma.DidWhereInput = {};
  if (q) {
    // A search for 12102821540 must find the DID stored as 2102821540.
    const digits = q.replace(/\D/g, "");
    where.number = { contains: digits.length > 10 && digits.startsWith("1") ? digits.slice(1) : digits };
  }
  if (stateId) where.stateId = Number(stateId);
  if (status === "active" || status === "inactive") where.status = status;
  if (free) {
    // Free = active and not on a call (or its reservation timed out)
    where.status = "active";
    where.OR = [{ isInUse: false }, { leaseExpiresAt: null }, { leaseExpiresAt: { lt: new Date() } }];
  }
  return where;
}

export async function GET(req: Request) {
  const admin = await requireAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const where = buildWhere({
    q: searchParams.get("q")?.trim(),
    stateId: searchParams.get("stateId"),
    status: searchParams.get("status"),
    free: searchParams.get("free") === "1",
  });

  // One page at a time. The count (the slow part on a big table) is skipped when the client already knows it,
  // i.e. when only the page changed, and runs in parallel with the page query otherwise.
  const page = Math.max(1, Math.floor(Number(searchParams.get("page"))) || 1);
  const pageSize = Math.min(200, Math.max(10, Math.floor(Number(searchParams.get("pageSize"))) || 50));
  const skipTotal = searchParams.get("skipTotal") === "1";

  const [rows, total] = await Promise.all([
    prisma.did.findMany({
      where,
      orderBy: { id: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        number: true,
        areaCode: true,
        status: true,
        isInUse: true,
        leaseExpiresAt: true,
        totalUses: true,
        lastUsedAt: true,
        createdAt: true,
        state: { select: { code: true, name: true } },
      },
    }),
    skipTotal ? Promise.resolve(null) : prisma.did.count({ where }),
  ]);

  // "Used by" only matters for numbers on a call right now, so look it up for those few, not for every row.
  const now = Date.now();
  const onCallIds = rows
    .filter((r) => r.isInUse && r.leaseExpiresAt && r.leaseExpiresAt.getTime() > now)
    .map((r) => r.id);
  const userByDid = new Map<number, { id: number; name: string }>();
  if (onCallIds.length) {
    const open = await prisma.callLog.findMany({
      where: { didId: { in: onCallIds }, callStatus: "in_progress" },
      orderBy: { startedAt: "desc" },
      select: { didId: true, user: { select: { id: true, name: true } } },
    });
    for (const l of open) if (!userByDid.has(l.didId)) userByDid.set(l.didId, l.user);
  }

  return NextResponse.json({
    total,
    page,
    pageSize,
    dids: rows.map((d) => ({ ...d, user: userByDid.get(d.id) ?? null })),
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

const filtersSchema = z.object({
  q: z.string().max(40).optional().nullable(),
  stateId: z.union([z.string(), z.number()]).optional().nullable(),
  free: z.boolean().optional(),
});

const bulkSchema = z.object({
  ids: z.array(z.number().int()).min(1).max(10_000),
  action: z.enum(["delete", "activate", "deactivate"]),
});

export async function PATCH(req: Request) {
  const admin = await requireAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const raw = await req.json();
    if (raw && raw.action === "delete_all") {
      // Delete every DID matching the filters, not just the first 500 shown. A DID on a call right now is skipped.
      // Their call logs go with them (the logs reference the DID).
      const f = filtersSchema.parse(raw);
      const where = buildWhere({ q: f.q, stateId: f.stateId, free: f.free });
      const notOnCall: Prisma.DidWhereInput = {
        OR: [{ isInUse: false }, { leaseExpiresAt: null }, { leaseExpiresAt: { lt: new Date() } }],
      };
      const deletable: Prisma.DidWhereInput = { AND: [where, notOnCall] };
      const matching = await prisma.did.count({ where });
      const [logs, dids] = await prisma.$transaction([
        prisma.callLog.deleteMany({ where: { did: deletable } }),
        prisma.did.deleteMany({ where: deletable }),
      ]);
      return NextResponse.json({
        success: true,
        deleted: dids.count,
        skippedOnCall: Math.max(0, matching - dids.count),
        callLogsDeleted: logs.count,
      });
    }
    const body = bulkSchema.parse(raw);
    if (body.action === "delete") {
      // A DID on a call right now is skipped. Every other selected DID is deleted together with its call logs
      // (the logs reference the DID, so they cannot outlive it).
      const deletable = await prisma.did.findMany({
        where: {
          id: { in: body.ids },
          OR: [{ isInUse: false }, { leaseExpiresAt: null }, { leaseExpiresAt: { lt: new Date() } }],
        },
        select: { id: true },
      });
      const ids = deletable.map((d) => d.id);
      const [logs, dids] = await prisma.$transaction([
        prisma.callLog.deleteMany({ where: { didId: { in: ids } } }),
        prisma.did.deleteMany({ where: { id: { in: ids } } }),
      ]);
      return NextResponse.json({
        success: true,
        deleted: dids.count,
        skippedOnCall: body.ids.length - ids.length,
        callLogsDeleted: logs.count,
      });
    } else if (body.action === "activate") {
      await prisma.did.updateMany({
        where: { id: { in: body.ids } },
        data: { status: "active" },
      });
    } else {
      await prisma.did.updateMany({
        where: { id: { in: body.ids } },
        data: { status: "inactive" },
      });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
