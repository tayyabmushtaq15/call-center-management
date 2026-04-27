"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cardClass, inputClass, PrimaryButton, SecondaryButton } from "@/components/admin-chrome";
import { extractPhonesFromDataFile, extractPhonesFromPastedText } from "@/lib/parse-did-import-file";

const CHUNK = 10_000;

type DidRow = {
  id: number;
  number: string;
  areaCode: string;
  status: string;
  isInUse: boolean;
  totalUses: number;
  lastUsedAt: string | null;
  createdAt: string;
  state: { code: string; name: string };
  user: { id: number; name: string } | null;
};

function mergeStateCounts(
  a: Record<string, number>,
  b: Record<string, number> | undefined
) {
  if (!b) return a;
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) {
    out[k] = (out[k] ?? 0) + v;
  }
  return out;
}

export function DidManager() {
  const [dids, setDids] = useState<DidRow[]>([]);
  const [q, setQ] = useState("");
  const [single, setSingle] = useState("");
  const [bulk, setBulk] = useState("");
  const [msg, setMsg] = useState("");
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    const res = await fetch(`/api/admin/dids?${params}`);
    const j = await res.json();
    setDids(j.dids ?? []);
  }, [q]);

  useEffect(() => {
    void load();
  }, [load]);

  async function addOne() {
    setMsg("");
    const res = await fetch("/api/admin/dids", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ number: single }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg((j as { error?: string }).error ?? "Error");
      return;
    }
    setSingle("");
    await load();
  }

  const runImport = useCallback(
    async (numbers: string[], onDone?: () => void) => {
      if (numbers.length === 0) {
        setMsg("No valid US 10-digit numbers found. Check format, area code map, and file contents.");
        return;
      }
      setImporting(true);
      setMsg("");
      let importedByState: Record<string, number> = {};
      let imported = 0;
      let skipped = 0;
      let dupInFile = 0;
      let alreadyInDb = 0;
      let invalid = 0;
      let unknown = 0;
      let lines = 0;
      try {
        for (let i = 0; i < numbers.length; i += CHUNK) {
          const part = numbers.slice(i, i + CHUNK);
          const res = await fetch("/api/admin/dids/import", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ numbers: part }),
          });
          const j = await res.json() as {
            error?: string;
            imported?: number;
            importedByState?: Record<string, number>;
            skippedDuplicates?: number;
            invalid?: number;
            unknownAreaCode?: number;
            lineCount?: number;
            uniqueInBatch?: number;
            duplicateInFile?: number;
            alreadyInDatabase?: number;
          };
          if (!res.ok) {
            setMsg(j.error ?? "Import failed");
            return;
          }
          importedByState = mergeStateCounts(importedByState, j.importedByState);
          imported += j.imported ?? 0;
          skipped += j.skippedDuplicates ?? 0;
          dupInFile += j.duplicateInFile ?? 0;
          alreadyInDb += j.alreadyInDatabase ?? 0;
          invalid += j.invalid ?? 0;
          unknown += j.unknownAreaCode ?? 0;
          lines += j.lineCount ?? part.length;
        }
        setMsg(
          `New rows in DB: ${imported} · by state: ${JSON.stringify(
            importedByState
          )} · lines sent: ${lines} (unique from file: ${
            numbers.length
          }) · dup in file: ${dupInFile} · already in DB: ${alreadyInDb} · skipped (total): ${skipped} · invalid: ${invalid} · unknown area code: ${unknown}`
        );
        onDone?.();
        await load();
      } finally {
        setImporting(false);
      }
    },
    [load]
  );

  async function importBulk() {
    const numbers = extractPhonesFromPastedText(bulk);
    await runImport(numbers, () => setBulk(""));
  }

  async function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setMsg("");
    try {
      const numbers = await extractPhonesFromDataFile(file);
      await runImport(numbers);
    } catch (err) {
      setMsg((err as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex max-w-lg flex-col gap-2 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium text-slate-400">Search</div>
          <input
            className={`${inputClass} mt-1`}
            placeholder="Search by number…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <PrimaryButton
          onClick={() => void load()}
          className="h-[38px] shrink-0 self-stretch sm:self-end"
        >
          Search
        </PrimaryButton>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className={`${cardClass} p-5`}>
          <h2 className="text-sm font-semibold text-slate-100">Add single DID</h2>
          <p className="mt-0.5 text-xs text-slate-400">Area code and state are detected automatically.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              className={`min-w-0 flex-1 ${inputClass}`}
              placeholder="10 digits or +1…"
              value={single}
              onChange={(e) => setSingle(e.target.value)}
            />
            <PrimaryButton onClick={() => void addOne()}>Add</PrimaryButton>
          </div>
        </div>
        <div className={`${cardClass} p-5`}>
          <h2 className="text-sm font-semibold text-slate-100">Bulk import</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Paste numbers (one per line, CSV, or mixed) <strong>or</strong> upload a{" "}
            <strong>CSV, TSV, or Excel</strong> file. Numbers are found in all columns and cells. Up to
            10,000 per server request; larger lists are sent in chunks.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.tsv,.txt,.xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            className="hidden"
            onChange={(e) => void onFileSelected(e)}
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <SecondaryButton
              type="button"
              disabled={importing}
              onClick={() => fileRef.current?.click()}
            >
              {importing ? "Importing…" : "Import file…"}
            </SecondaryButton>
            <span className="text-xs text-slate-500">.csv, .tsv, .xls, .xlsx</span>
          </div>
          <textarea
            className="mt-3 w-full rounded-lg border border-slate-600/60 bg-slate-900/60 px-3 py-2 font-mono text-sm text-slate-100 focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            rows={4}
            value={bulk}
            onChange={(e) => setBulk(e.target.value)}
            placeholder={"5551234567\n+15551234568\nor paste a CSV row…"}
            disabled={importing}
          />
          <div className="mt-2">
            <PrimaryButton onClick={() => void importBulk()} disabled={importing}>
              {importing ? "Importing…" : "Import from text"}
            </PrimaryButton>
          </div>
        </div>
      </div>

      {msg ? (
        <p className="rounded-lg border border-slate-600/50 bg-slate-800/50 px-3 py-2 text-sm text-slate-300">
          {msg}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-600/40 bg-slate-800/50 shadow-lg ring-1 ring-slate-700/30">
        <div className="border-b border-slate-600/50 bg-slate-800/30 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-100">DID list</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="bg-slate-800/60 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3">Number</th>
                <th className="px-4 py-3">State</th>
                <th className="px-4 py-3">Assignment</th>
                <th className="px-4 py-3">In use</th>
                <th className="px-4 py-3">Uses</th>
              </tr>
            </thead>
            <tbody>
              {dids.map((d) => (
                <tr key={d.id} className="border-t border-slate-700/50">
                  <td className="px-4 py-3 font-mono text-slate-200">{d.number}</td>
                  <td className="px-4 py-3 text-slate-200">{d.state.code}</td>
                  <td className="px-4 py-3 text-slate-200">{d.user?.name ?? "Pool"}</td>
                  <td className="px-4 py-3 text-slate-200">{d.isInUse ? "yes" : "no"}</td>
                  <td className="px-4 py-3 tabular-nums text-slate-200">{d.totalUses}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
