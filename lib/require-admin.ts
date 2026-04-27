import { getAdminFromCookie } from "@/lib/auth-admin";
import { prisma } from "@/lib/prisma";

export async function requireAdminSession() {
  const session = await getAdminFromCookie();
  if (!session) return null;
  const admin = await prisma.adminUser.findUnique({
    where: { id: session.adminId },
    select: { id: true, email: true, name: true },
  });
  return admin;
}
