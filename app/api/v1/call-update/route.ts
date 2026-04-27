import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeUsPhone } from "@/lib/phone";
import { z } from "zod";

const bodySchema = z.object({
  did: z.string().min(3),
  destination: z.string().min(3),
  status: z.enum(["answered", "not_answered"]),
  duration: z.number().int().nonnegative(),
  started_at: z.string().min(1),
  ended_at: z.string().min(1),
});

function parseLooseDate(s: string): Date {
  const iso = s.includes("T") ? s : s.replace(" ", "T");
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return new Date(s);
  }
  return d;
}

export async function POST(req: Request) {
  const secret = req.headers.get("x-webhook-secret");
  if (!secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sw = await prisma.switch.findUnique({
    where: { webhookSecret: secret },
  });
  if (!sw || sw.status !== "active") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const didDigits = normalizeUsPhone(body.did);
  const destDigits = normalizeUsPhone(body.destination);
  if (!didDigits || !destDigits) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const didRow = await prisma.did.findUnique({
    where: { number: didDigits },
  });
  if (!didRow) {
    return NextResponse.json({ error: "Unknown DID" }, { status: 400 });
  }

  const startedAt = parseLooseDate(body.started_at);
  const endedAt = parseLooseDate(body.ended_at);
  const callStatus =
    body.status === "answered" ? ("answered" as const) : ("not_answered" as const);

  await prisma.$transaction(async (tx) => {
    const log = await tx.callLog.findFirst({
      where: {
        didId: didRow.id,
        receiverNumber: destDigits,
        switchId: sw.id,
      },
      orderBy: { startedAt: "desc" },
    });

    if (!log) {
      await tx.did.update({
        where: { id: didRow.id },
        data: { isInUse: false },
      });
      return;
    }

    if (log.callStatus !== "in_progress") {
      return;
    }

    await tx.callLog.update({
      where: { id: log.id },
      data: {
        callStatus,
        duration: body.duration,
        startedAt,
        endedAt,
      },
    });

    await tx.did.update({
      where: { id: didRow.id },
      data: {
        isInUse: false,
        totalUses: { increment: 1 },
        lastUsedAt: endedAt,
      },
    });
  });

  return NextResponse.json({ success: true });
}
