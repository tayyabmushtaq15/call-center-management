"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { generateApiKey } from "@/lib/api-key";
import { revalidatePath } from "next/cache";

export async function createCallCenterAction(fd: FormData) {
  const name = String(fd.get("name") ?? "").trim();
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const pwField = String(fd.get("password") ?? "");
  const password =
    pwField.length >= 8
      ? pwField
      : `TempCc!${Math.random().toString(36).slice(2, 12)}`;
  if (!name || !email) return;
  const hash = await bcrypt.hash(password, 12);
  const key = generateApiKey();
  await prisma.user.create({
    data: {
      name,
      email,
      password: hash,
      status: "active",
      apiKeys: { create: { key, status: "active" } },
    },
  });
  revalidatePath("/admin/call-centers");
}
