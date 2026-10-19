import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/require-admin";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = Number((await ctx.params).id);
  const requests = await prisma.didRequestLog.findMany({
    where: { userId },
    orderBy: { id: "desc" },
    take: 50,
  });
  return NextResponse.json({ requests });
}
