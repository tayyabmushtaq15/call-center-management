"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { inputClass, labelClass, PrimaryButton, SecondaryButton } from "@/components/admin-chrome";
import { Modal } from "@/components/Modal";
import { extractPhonesFromDataFile, extractPhonesFromPastedText } from "@/lib/parse-did-import-file";

const CHUNK = 10_000;

type DidRow = {
  id: number;
  number: string;
  areaCode: string;
  status: string;
  isInUse: boolean;
  leaseExpiresAt: string | null;
  user: { id: number; name: string } | null;
  totalUses: number;
  lastUsedAt: string | null;
  createdAt: string;
  state: { code: string; name: string };
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
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [addError, setAddError] = useState("");
  const [adding, setAdding] = useState(false);
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

  async function addOne(e: React.FormEvent) {
    e.preventDefault();
    setAddError("");
    setAdding(true);
    try {
      const res = await fetch("/api/admin/dids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: single }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAddError((j as { error?: string }).error ?? "Could not add the DID.");
        return;
      }
      setSingle("");
      setAddOpen(false);
      setMsg("DID added.");
      await load();
    } finally {
      setAdding(false);
    }
  }

  const runImport = useCallback(
    async (numbers: string[], onDone?: () => void) => {
      if (numbers.length === 0) {
        setMsg("No valid US 10-digit numbers found. Check format, area code map, and file contents.");
        setImportOpen(false);
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
        setImportOpen(false);
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex max-w-lg flex-1 flex-col gap-2 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <div className={labelClass}>Search</div>
            <input
              className={`${inputClass} mt-1`}
              placeholder="Search by number…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <PrimaryButton onClick={() => void load()} className="h-[38px] shrink-0 self-stretch sm:self-end">
            Search
          </PrimaryButton>
        </div>
        <div className="flex gap-2">
          <SecondaryButton onClick={() => setImportOpen(true)}>Bulk import</SecondaryButton>
          <PrimaryButton
            onClick={() => {
              setAddError("");
              setAddOpen(true);
            }}
          >
            Add DID
          </PrimaryButton>
        </div>
      </div>

      <Modal
        open={addOpen}
        onClose={() => !adding && setAddOpen(false)}
        title="Add DID"
        description="Area code and state are detected automatically."
      >
        <form onSubmit={(e) => void addOne(e)} className="space-y-4">
          <label className="block">
            <span className={labelClass}>Phone number</span>
            <input
              className={`${inputClass} mt-1.5`}
              placeholder="10 digits or +1…"
              value={single}
              onChange={(e) => setSingle(e.target.value)}
              required
            />
          </label>
          {addError ? (
            <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {addError}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <SecondaryButton onClick={() => setAddOpen(false)} disabled={adding}>
              Cancel
            </SecondaryButton>
            <PrimaryButton type="submit" disabled={adding}>
              {adding ? "Adding…" : "Add DID"}
            </PrimaryButton>
          </div>
        </form>
      </Modal>

      <Modal
        wide
        open={importOpen}
        onClose={() => !importing && setImportOpen(false)}
        title="Bulk import"
        description="Paste numbers (one per line, CSV, or mixed) or upload a CSV, TSV, or Excel file. Numbers are found in all columns and cells. Lists over 10,000 are sent in chunks."
      >
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.tsv,.txt,.xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
          className="hidden"
          onChange={(e) => void onFileSelected(e)}
        />
        <div className="flex flex-wrap items-center gap-2">
          <SecondaryButton disabled={importing} onClick={() => fileRef.current?.click()}>
            {importing ? "Importing…" : "Import file…"}
          </SecondaryButton>
          <span className="text-xs text-slate-500">.csv, .tsv, .xls, .xlsx</span>
        </div>
        <textarea
          className="mt-4 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          rows={6}
          value={bulk}
          onChange={(e) => setBulk(e.target.value)}
          placeholder={"5551234567\n+15551234568\nor paste a CSV row…"}
          disabled={importing}
        />
        <div className="mt-4 flex justify-end gap-2">
          <SecondaryButton onClick={() => setImportOpen(false)} disabled={importing}>
            Cancel
          </SecondaryButton>
          <PrimaryButton onClick={() => void importBulk()} disabled={importing || !bulk.trim()}>
            {importing ? "Importing…" : "Import from text"}
          </PrimaryButton>
        </div>
      </Modal>

      {msg ? (
        <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
          {msg}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg ring-1 ring-slate-900/5">
        <div className="border-b border-emerald-100 bg-emerald-50/60 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-900">DID list</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="bg-emerald-50 text-xs font-semibold uppercase tracking-wider text-slate-600">
              <tr>
                <th className="px-4 py-3">Number</th>
                <th className="px-4 py-3">State</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Used by</th>
                <th className="px-4 py-3">Uses</th>
                <th className="px-4 py-3">Last used</th>
              </tr>
            </thead>
            <tbody>
              {dids.map((d) => (
                <tr key={d.id} className="border-t border-emerald-50 transition hover:bg-emerald-50/40">
                  <td className="px-4 py-3 font-mono text-slate-800">{d.number}</td>
                  <td className="px-4 py-3 text-slate-800">{d.state.code}</td>
                  <td className="px-4 py-3">
                    {d.isInUse && d.leaseExpiresAt && new Date(d.leaseExpiresAt) > new Date() ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 ring-1 ring-amber-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        On a call
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Free
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{d.user?.name ?? "-"}</td>
                  <td className="px-4 py-3 tabular-nums text-slate-800">{d.totalUses}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {d.lastUsedAt ? new Date(d.lastUsedAt).toLocaleString() : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
