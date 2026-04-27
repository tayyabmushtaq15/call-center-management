import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/require-admin";
import bcrypt from "bcryptjs";
import { z } from "zod";

export async function GET() {
  const admin = await requireAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const full = await prisma.adminUser.findUnique({ where: { id: admin.id } });
  const settings = await prisma.systemSettings.findUnique({ where: { id: 1 } });
  return NextResponse.json({
    admin: { id: full?.id, email: full?.email, name: full?.name },
    system: settings,
  });
}

const patchSchema = z.object({
  systemName: z.string().min(1).optional(),
  lowPoolWarningThreshold: z.number().int().nonnegative().optional(),
  apiRateLimitPerMinute: z.number().int().positive().optional(),
  adminName: z.string().min(1).optional(),
  adminEmail: z.string().email().optional(),
  adminPassword: z.string().min(8).optional(),
});

export async function PATCH(req: Request) {
  const admin = await requireAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = patchSchema.parse(await req.json());
    if (
      body.systemName !== undefined ||
      body.lowPoolWarningThreshold !== undefined ||
      body.apiRateLimitPerMinute !== undefined
    ) {
      await prisma.systemSettings.update({
        where: { id: 1 },
        data: {
          ...(body.systemName !== undefined
            ? { systemName: body.systemName }
            : {}),
          ...(body.lowPoolWarningThreshold !== undefined
            ? { lowPoolWarningThreshold: body.lowPoolWarningThreshold }
            : {}),
          ...(body.apiRateLimitPerMinute !== undefined
            ? { apiRateLimitPerMinute: body.apiRateLimitPerMinute }
            : {}),
        },
      });
    }
    if (
      body.adminName !== undefined ||
      body.adminEmail !== undefined ||
      body.adminPassword !== undefined
    ) {
      await prisma.adminUser.update({
        where: { id: admin.id },
        data: {
          ...(body.adminName !== undefined ? { name: body.adminName } : {}),
          ...(body.adminEmail !== undefined ? { email: body.adminEmail } : {}),
          ...(body.adminPassword !== undefined
            ? { password: await bcrypt.hash(body.adminPassword, 12) }
            : {}),
        },
      });
    }
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && e.code === "P2002") {
      return NextResponse.json({ error: "Email already in use" }, { status: 400 });
    }
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
