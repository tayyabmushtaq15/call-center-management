"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { generateApiKey } from "@/lib/api-key";
import { requireAdminSession } from "@/lib/require-admin";
import { revalidatePath } from "next/cache";

export type CreateCallCenterResult = { ok: true; id: number } | { ok: false; error: string };

export async function createCallCenterAction(fd: FormData): Promise<CreateCallCenterResult> {
  if (!(await requireAdminSession())) return { ok: false, error: "Your session expired. Sign in again." };
  const name = String(fd.get("name") ?? "").trim();
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const pwField = String(fd.get("password") ?? "");
  if (!name || !email) return { ok: false, error: "Name and email are required." };
  if (pwField && pwField.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters, or leave it empty." };
  }
  const password = pwField || `TempCc!${Math.random().toString(36).slice(2, 12)}`;
  const hash = await bcrypt.hash(password, 12);
  const key = generateApiKey();
  try {
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hash,
        status: "active",
        apiKeys: { create: { key, status: "active" } },
      },
      select: { id: true },
    });
    revalidatePath("/admin/call-centers");
    return { ok: true, id: user.id };
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && e.code === "P2002") {
      return { ok: false, error: "A call center with this email already exists." };
    }
    console.error("createCallCenterAction", e);
    return { ok: false, error: "Could not create the call center." };
  }
}
