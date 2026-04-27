import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/require-admin";
import { getDashboardPayload } from "@/lib/dashboard-data";

export async function GET() {
  const admin = await requireAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await getDashboardPayload());
}
