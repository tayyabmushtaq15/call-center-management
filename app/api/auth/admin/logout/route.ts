import { NextResponse } from "next/server";
import { clearAdminCookie } from "@/lib/auth-admin";

export async function POST() {
  await clearAdminCookie();
  return NextResponse.json({ success: true });
}
