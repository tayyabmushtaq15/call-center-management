import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (
    !pathname.startsWith("/admin") ||
    pathname === "/admin/login" ||
    pathname.startsWith("/admin/login/")
  ) {
    return NextResponse.next();
  }
  const token = request.cookies.get("admin_token")?.value;
  const secret = process.env.JWT_SECRET;
  if (!token || !secret || secret.length < 16) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }
  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
  } catch {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
