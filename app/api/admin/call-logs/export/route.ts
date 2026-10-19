import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/require-admin";
import { Prisma } from "@/app/generated/prisma/client";

function toCsv(rows: Record<string, string | number | null>[]) {
  if (!rows.length) return "";
  const keys = Object.keys(rows[0]);
  const esc = (v: unknown) =>
    `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [keys.join(","), ...rows.map((r) => keys.map((k) => esc(r[k])).join(","))].join(
    "\n"
  );
}

export async function GET(req: Request) {
  const admin = await requireAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const switchId = searchParams.get("switchId");
  const state = searchParams.get("state");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: Prisma.CallLogWhereInput = {};
  if (userId) where.userId = Number(userId);
  if (switchId) where.switchId = Number(switchId);
  if (state) where.receiverState = state;
  if (from || to) {
    where.startedAt = {};
    if (from) where.startedAt.gte = new Date(from);
    if (to) where.startedAt.lte = new Date(to);
  }

  const logs = await prisma.callLog.findMany({
    where,
    orderBy: { startedAt: "desc" },
    take: 10_000,
    include: {
      user: { select: { name: true } },
      did: { select: { number: true } },
      switch: { select: { name: true } },
    },
  });

  const rows = logs.map((l) => ({
    receiver: l.receiverNumber,
    state: l.receiverState,
    did: l.did.number,
    call_center: l.user.name,
    switch: l.switch?.name ?? "Dialer",
    status: l.callStatus,
    duration: l.duration ?? "",
    started: l.startedAt.toISOString(),
    ended: l.endedAt?.toISOString() ?? "",
  }));

  return new NextResponse(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="call-logs.csv"',
    },
  });
}
