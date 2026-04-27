import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/require-admin";
import { normalizeUsPhone, extractAreaCode } from "@/lib/phone";
import { z } from "zod";
import { Prisma } from "@/app/generated/prisma/client";

const bodySchema = z.object({
  numbers: z.array(z.string()).max(10000),
});

const INSERT_CHUNK = 2000;

export async function POST(req: Request) {
  const admin = await requireAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { numbers: rawList } = bodySchema.parse(await req.json());
    const lineCount = rawList.length;

    const maps = await prisma.areaCodeMap.findMany({
      include: { state: { select: { code: true } } },
    });
    const byAreaCode = new Map(maps.map((m) => [m.areaCode, m] as const));

    const uniques: string[] = [];
    const seen = new Set<string>();
    let invalid = 0;
    let duplicateInFile = 0;

    for (const raw of rawList) {
      const n = normalizeUsPhone(raw);
      if (!n) {
        invalid++;
        continue;
      }
      if (seen.has(n)) {
        duplicateInFile++;
        continue;
      }
      seen.add(n);
      uniques.push(n);
    }

    const candidates: { number: string; areaCode: string; stateId: number; stateCode: string }[] =
      [];
    let unknownAreaCode = 0;
    for (const n of uniques) {
      const npa = extractAreaCode(n);
      if (!npa) {
        invalid++;
        continue;
      }
      const ac = byAreaCode.get(npa);
      if (!ac) {
        unknownAreaCode++;
        continue;
      }
      candidates.push({
        number: n,
        areaCode: npa,
        stateId: ac.stateId,
        stateCode: ac.state.code,
      });
    }

    if (candidates.length === 0) {
      return NextResponse.json({
        success: true,
        lineCount,
        uniqueInBatch: uniques.length,
        imported: 0,
        importedByState: {} as Record<string, number>,
        duplicateInFile,
        alreadyInDatabase: 0,
        skippedDuplicates: duplicateInFile,
        invalid,
        unknownAreaCode,
      });
    }

    const nums = candidates.map((c) => c.number);
    const existing = await prisma.did.findMany({
      where: { number: { in: nums } },
      select: { number: true },
    });
    const existingSet = new Set(existing.map((e) => e.number));
    const alreadyInDatabase = candidates.filter((c) => existingSet.has(c.number)).length;
    const toInsert = candidates.filter((c) => !existingSet.has(c.number));

    const importedByState: Record<string, number> = {};
    for (const c of toInsert) {
      importedByState[c.stateCode] = (importedByState[c.stateCode] ?? 0) + 1;
    }

    let imported = 0;
    for (let i = 0; i < toInsert.length; i += INSERT_CHUNK) {
      const slice = toInsert.slice(i, i + INSERT_CHUNK);
      const data: Prisma.DidCreateManyInput[] = slice.map((c) => ({
        number: c.number,
        areaCode: c.areaCode,
        stateId: c.stateId,
        status: "active" as const,
      }));
      const { count } = await prisma.did.createMany({ data, skipDuplicates: true });
      imported += count;
    }

    const skippedFromRace = Math.max(0, toInsert.length - imported);
    const skippedDuplicates = duplicateInFile + alreadyInDatabase + skippedFromRace;

    return NextResponse.json({
      success: true,
      lineCount,
      uniqueInBatch: uniques.length,
      imported,
      importedByState,
      duplicateInFile,
      alreadyInDatabase,
      skippedDuplicates,
      invalid,
      unknownAreaCode,
    });
  } catch (e) {
    console.error("dids/import", e);
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}

export const maxDuration = 300;
