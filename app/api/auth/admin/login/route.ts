import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { setAdminCookie, signAdminToken } from "@/lib/auth-admin";
import { z } from "zod";
import { getClientIp } from "@/lib/ip";
import { count, hit, reset } from "@/lib/throttle";

const MAX_FAILS = 5;
const WINDOW_MS = 15 * 60_000;
// A valid bcrypt hash of a random string, compared against when the email is unknown so response time doesn't reveal which emails exist.
const DUMMY_HASH = "$2b$12$jj1LZKGUCWLxQbacTAK3uO/2P12/fjBFAaUbvzCYynMFXX2rqTw3S";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const { email, password } = bodySchema.parse(json);
    const throttleKey = `login:${getClientIp(req)}:${email.toLowerCase()}`;
    if (count(throttleKey, WINDOW_MS) >= MAX_FAILS) {
      return NextResponse.json(
        { error: "Too many failed attempts. Try again in 15 minutes." },
        { status: 429 }
      );
    }
    const admin = await prisma.adminUser.findUnique({ where: { email } });
    const ok = await bcrypt.compare(password, admin?.password ?? DUMMY_HASH);
    if (!admin || !ok) {
      hit(throttleKey, WINDOW_MS);
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
    reset(throttleKey);
    const token = await signAdminToken({
      adminId: admin.id,
      email: admin.email,
      name: admin.name,
    });
    await setAdminCookie(token);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
