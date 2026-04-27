import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE = "admin_token";

function getSecret() {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 16) {
    throw new Error("JWT_SECRET must be set (min 16 characters).");
  }
  return new TextEncoder().encode(s);
}

export type AdminJwtPayload = {
  sub: string;
  email: string;
  name: string;
};

export async function signAdminToken(payload: {
  adminId: number;
  email: string;
  name: string;
}) {
  const token = await new SignJWT({
    email: payload.email,
    name: payload.name,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(payload.adminId))
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(getSecret());
  return token;
}

export async function verifyAdminToken(token: string) {
  const { payload } = await jwtVerify(token, getSecret());
  const sub = payload.sub;
  if (!sub) return null;
  const adminId = Number(sub);
  if (!Number.isFinite(adminId)) return null;
  return {
    adminId,
    email: String(payload.email ?? ""),
    name: String(payload.name ?? ""),
  };
}

export async function setAdminCookie(token: string) {
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function clearAdminCookie() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getAdminFromCookie() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    return await verifyAdminToken(token);
  } catch {
    return null;
  }
}

export { COOKIE as ADMIN_TOKEN_COOKIE };
