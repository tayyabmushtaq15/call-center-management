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
  const userId = Number(id);

  const states = await prisma.state.findMany({ orderBy: { code: "asc" } });
  const pool = await prisma.did.groupBy({
    by: ["stateId"],
    where: { assignedTo: null, status: "active" },
    _count: { _all: true },
  });
  const poolMap = new Map(pool.map((p) => [p.stateId, p._count._all]));
  const assigned = await prisma.did.groupBy({
    by: ["stateId"],
    where: { assignedTo: userId },
    _count: { _all: true },
  });
  const assignedMap = new Map(assigned.map((p) => [p.stateId, p._count._all]));

  return NextResponse.json({
    preview: states.map((s) => ({
      stateId: s.id,
      code: s.code,
      name: s.name,
      poolAvailable: poolMap.get(s.id) ?? 0,
      assignedToUser: assignedMap.get(s.id) ?? 0,
    })),
  });
}

const postSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("auto_all"),
    count: z.number().int().positive().max(500),
  }),
  z.object({
    mode: z.literal("manual"),
    items: z.array(
      z.object({
        stateId: z.number().int().positive(),
        count: z.number().int().nonnegative().max(5000),
      })
    ),
  }),
]);

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const userId = Number(id);

  let body: z.infer<typeof postSchema>;
  try {
    body = postSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    if (body.mode === "auto_all") {
      const states = await tx.state.findMany();
      for (const st of states) {
        const batch = await tx.did.findMany({
          where: {
            stateId: st.id,
            assignedTo: null,
            status: "active",
          },
          orderBy: [{ totalUses: "asc" }, { id: "asc" }],
          take: body.count,
        });
        for (const d of batch) {
          await tx.did.update({
            where: { id: d.id },
            data: { assignedTo: userId, assignedAt: new Date() },
          });
        }
        const total = await tx.did.count({
          where: { stateId: st.id, assignedTo: userId },
        });
        await tx.userStateAssignment.upsert({
          where: {
            userId_stateId: { userId, stateId: st.id },
          },
          create: { userId, stateId: st.id, didCount: total },
          update: { didCount: total },
        });
      }
    } else {
      for (const item of body.items) {
        if (item.count === 0) continue;
        const batch = await tx.did.findMany({
          where: {
            stateId: item.stateId,
            assignedTo: null,
            status: "active",
          },
          orderBy: [{ totalUses: "asc" }, { id: "asc" }],
          take: item.count,
        });
        for (const d of batch) {
          await tx.did.update({
            where: { id: d.id },
            data: { assignedTo: userId, assignedAt: new Date() },
          });
        }
        const total = await tx.did.count({
          where: { stateId: item.stateId, assignedTo: userId },
        });
        await tx.userStateAssignment.upsert({
          where: {
            userId_stateId: { userId, stateId: item.stateId },
          },
          create: {
            userId,
            stateId: item.stateId,
            didCount: total,
          },
          update: { didCount: total },
        });
      }
    }
  });

  return NextResponse.json({ success: true });
}
