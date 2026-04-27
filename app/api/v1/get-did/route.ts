import { NextResponse } from "next/server";
import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeUsPhone, extractAreaCode } from "@/lib/phone";
import { dispatchOriginate } from "@/lib/switch-client";
import { checkApiKeyRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const bodySchema = z.object({
  destination: z.string().min(3),
});

export async function POST(req: Request) {
  const apiKeyHeader = req.headers.get("x-api-key");
  if (!apiKeyHeader) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  const apiKeyRow = await prisma.apiKey.findFirst({
    where: { key: apiKeyHeader, status: "active" },
    include: {
      user: { include: { switch: true } },
    },
  });

  if (!apiKeyRow || apiKeyRow.user.status !== "active") {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  const allowed = await checkApiKeyRateLimit(apiKeyRow.id);
  if (!allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const normalized = normalizeUsPhone(body.destination);
  if (!normalized) {
    return NextResponse.json({ error: "Unknown area code" }, { status: 400 });
  }

  const npa = extractAreaCode(normalized);
  if (!npa) {
    return NextResponse.json({ error: "Unknown area code" }, { status: 400 });
  }

  const areaRow = await prisma.areaCodeMap.findUnique({
    where: { areaCode: npa },
    include: { state: true },
  });
  if (!areaRow) {
    return NextResponse.json({ error: "Unknown area code" }, { status: 400 });
  }

  const stateId = areaRow.stateId;
  const state = areaRow.state;

  const assignment = await prisma.userStateAssignment.findUnique({
    where: {
      userId_stateId: { userId: apiKeyRow.userId, stateId },
    },
  });
  if (!assignment) {
    return NextResponse.json(
      { error: "State not assigned to this user" },
      { status: 400 }
    );
  }

  const sw = apiKeyRow.user.switch;
  if (!sw || sw.status !== "active") {
    return NextResponse.json(
      { error: "No switch assigned to this call center" },
      { status: 400 }
    );
  }

  const userId = apiKeyRow.userId;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const picked = await tx.$queryRaw<Array<{ id: number; number: string }>>(
        Prisma.sql`
          SELECT d.id, d.number
          FROM dids d
          WHERE d.state_id = ${stateId}
            AND d.assigned_to = ${userId}
            AND d.status::text = 'active'
            AND d.is_in_use = false
          ORDER BY d.total_uses ASC, d.id ASC
          LIMIT 1
          FOR UPDATE SKIP LOCKED
        `
      );

      if (!picked.length) {
        return { type: "none" as const };
      }

      const didId = picked[0].id;
      const didNumber = picked[0].number;

      await tx.did.update({
        where: { id: didId },
        data: { isInUse: true },
      });

      const log = await tx.callLog.create({
        data: {
          userId,
          didId,
          switchId: sw.id,
          receiverNumber: normalized,
          receiverState: state.code,
          callStatus: "in_progress",
          startedAt: new Date(),
        },
      });

      return { type: "ok" as const, didId, didNumber, logId: log.id };
    });

    if (result.type === "none") {
      return NextResponse.json(
        { error: "No DID available for this state" },
        { status: 400 }
      );
    }

    const dispatch = await dispatchOriginate(
      {
        switchUrl: sw.switchUrl,
        switchPort: sw.switchPort,
        authToken: sw.authToken,
      },
      {
        did: result.didNumber,
        receiverNumber: normalized,
        callLogId: result.logId,
        userId,
      }
    );
    if (!dispatch.ok && process.env.SWITCH_STUB !== "1") {
      console.error("Switch dispatch failed", dispatch.status, dispatch.body);
    }

    await prisma.apiKey.update({
      where: { id: apiKeyRow.id },
      data: { lastUsedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      did: result.didNumber,
      state: state.code,
      state_name: state.name,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
