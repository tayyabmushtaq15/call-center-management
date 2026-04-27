import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/require-admin";
import { z } from "zod";

export async function GET() {
  const admin = await requireAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await prisma.areaCodeMap.findMany({
    orderBy: { areaCode: "asc" },
    include: { state: true },
  });
  return NextResponse.json({ rows });
}

const postSchema = z.object({
  areaCode: z.string().regex(/^\d{3}$/),
  stateId: z.number().int().positive(),
});

export async function POST(req: Request) {
  const admin = await requireAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = postSchema.parse(await req.json());
    await prisma.areaCodeMap.create({
      data: { areaCode: body.areaCode, stateId: body.stateId },
    });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && e.code === "P2002") {
      return NextResponse.json({ error: "Area code exists" }, { status: 400 });
    }
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
