"use server";

import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";

export async function createSwitchAction(fd: FormData) {
  const name = String(fd.get("name") ?? "").trim();
  const switchType = String(fd.get("switchType") ?? "").trim();
  const switchUrl = String(fd.get("switchUrl") ?? "").trim();
  const switchPort = Number(fd.get("switchPort") ?? 8088);
  const authToken = String(fd.get("authToken") ?? "").trim();
  if (!name || !switchUrl) return;
  const webhookSecret = randomBytes(32).toString("hex");
  await prisma.switch.create({
    data: {
      name,
      switchType: switchType || "Other",
      switchUrl,
      switchPort: Number.isFinite(switchPort) ? switchPort : 8088,
      authToken: authToken || "token",
      webhookSecret,
      status: "active",
    },
  });
  revalidatePath("/admin/switches");
  console.info("[switch created] webhook secret (save for switch config):", webhookSecret);
}
