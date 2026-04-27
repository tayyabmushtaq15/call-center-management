import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/require-admin";
import { z } from "zod";

const bodySchema = z.object({
  stateId: z.number().int().positive(),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const userId = Number(id);
  try {
    const { stateId } = bodySchema.parse(await req.json());
    await prisma.$transaction([
      prisma.did.updateMany({
        where: { assignedTo: userId, stateId, isInUse: false },
        data: { assignedTo: null, assignedAt: null },
      }),
      prisma.userStateAssignment.deleteMany({
        where: { userId, stateId },
      }),
    ]);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
