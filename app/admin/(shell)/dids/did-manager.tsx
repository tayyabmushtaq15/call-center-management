"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { inputClass, labelClass, PrimaryButton, SecondaryButton } from "@/components/admin-chrome";
import { Modal } from "@/components/Modal";
import { withCountryCode } from "@/lib/phone";
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

type StateOpt = { id: number; name: string; code: string };

/** On a call = reserved and the reservation has not timed out. */
const isOnCall = (d: { isInUse: boolean; leaseExpiresAt: string | null }) =>
  d.isInUse && d.leaseExpiresAt !== null && new Date(d.leaseExpiresAt) > new Date();

export function DidManager({ initialStateId = "", initialFree = false }: { initialStateId?: string; initialFree?: boolean }) {
  const [dids, setDids] = useState<DidRow[]>([]);
  const [total, setTotal] = useState(0);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [q, setQ] = useState("");
  const [qApplied, setQApplied] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [loading, setLoading] = useState(true);
  const countedFor = useRef("");
  const [stateId, setStateId] = useState(initialStateId);
  const [freeOnly, setFreeOnly] = useState(initialFree);
  const [stateList, setStateList] = useState<StateOpt[]>([]);
  const [single, setSingle] = useState("");
  const [bulk, setBulk] = useState("");
  const [msg, setMsg] = useState("");
  const [importing, setImporting] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [addError, setAddError] = useState("");
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // force = recount the total (after adding or deleting). Otherwise the total is only fetched when the filters change,
  // so flipping pages costs one fast query.
  const load = useCallback(
    async (force = false) => {
      const key = `${qApplied}|${stateId}|${freeOnly}`;
      const params = new URLSearchParams();
      if (qApplied) params.set("q", qApplied);
      if (stateId) params.set("stateId", stateId);
      if (freeOnly) params.set("free", "1");
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (!force && countedFor.current === key) params.set("skipTotal", "1");
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/dids?${params}`);
        if (!res.ok) throw new Error(String(res.status));
        const j = await res.json();
        const rows: DidRow[] = j.dids ?? [];
        setDids(rows);
        if (typeof j.total === "number") {
          setTotal(j.total);
          countedFor.current = key;
          // deleted the last rows of the last page: step back to the last page that still exists
          const pages = Math.max(1, Math.ceil(j.total / pageSize));
          if (page > pages) setPage(pages);
        }
        // keep only selections that are still on this page
        setSelected((prev) => {
          const ids = new Set(rows.map((r) => r.id));
          const next = new Set([...prev].filter((id) => ids.has(id)));
          return next.size === prev.size ? prev : next;
        });
      } catch {
        setMsg("Could not load the DID list. Try again.");
      } finally {
        setLoading(false);
      }
    },
    [qApplied, stateId, freeOnly, page, pageSize]
  );

  // typing in the search box searches a moment after you stop, not on every key
  useEffect(() => {
    const v = q.trim();
    if (v === qApplied) return;
    const t = setTimeout(() => {
      setQApplied(v);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q, qApplied]);

  useEffect(() => {
    fetch("/api/admin/states")
      .then((r) => r.json())
      .then((j) => setStateList(j.states ?? []))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const allSelected = dids.length > 0 && dids.every((d) => selected.has(d.id));
  const someSelected = selected.size > 0 && !allSelected;
  const selectedRows = dids.filter((d) => selected.has(d.id));
  const usedCount = selectedRows.filter((d) => d.totalUses > 0).length;

  function toggleOne(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(dids.map((d) => d.id)));
  }

  async function deleteSelected() {
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/dids", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selected], action: "delete" }),
      });
      const j = (await res.json().catch(() => ({}))) as { deleted?: number; skippedOnCall?: number; error?: string };
      if (!res.ok) {
        setMsg(j.error ?? "Could not delete the selected DIDs.");
        return;
      }
      const n = j.deleted ?? 0;
      const skipped = j.skippedOnCall ?? 0;
      setMsg(
        `Deleted ${n} DID${n === 1 ? "" : "s"}.` +
          (skipped ? ` ${skipped} on a call right now ${skipped === 1 ? "was" : "were"} not deleted. Try again when the call ends.` : "")
      );
      setSelected(new Set());
      await load(true);
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  const filtersActive = Boolean(qApplied || stateId || freeOnly);
  const stateName = stateList.find((st) => String(st.id) === stateId)?.name;
  const filterSummary = [
    stateId ? `state: ${stateName ?? "selected"}` : "",
    freeOnly ? "free only" : "",
    qApplied ? `search "${qApplied}"` : "",
  ]
    .filter(Boolean)
    .join(", ");

  async function deleteAll() {
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/dids", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_all", q: qApplied || null, stateId: stateId || null, free: freeOnly }),
      });
      const j = (await res.json().catch(() => ({}))) as { deleted?: number; skippedOnCall?: number; error?: string };
      if (!res.ok) {
        setMsg(j.error ?? "Could not delete the DIDs.");
        return;
      }
      const n = j.deleted ?? 0;
      const skipped = j.skippedOnCall ?? 0;
      setMsg(
        `Deleted ${n} DID${n === 1 ? "" : "s"}.` +
          (skipped ? ` ${skipped} on a call right now ${skipped === 1 ? "was" : "were"} not deleted. Try again when the calls end.` : "")
      );
      setSelected(new Set());
      await load(true);
    } finally {
      setDeleting(false);
      setDeleteAllOpen(false);
      setConfirmText("");
    }
  }

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
      await load(true);
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
        await load(true);
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
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="min-w-0 flex-1">
            <div className={labelClass}>Search</div>
            <input
              className={`${inputClass} mt-1`}
              placeholder="Search by number…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <PrimaryButton
            onClick={() => {
              setQApplied(q.trim());
              setPage(1);
            }}
            className="shrink-0 self-stretch sm:self-end"
          >
            Search
          </PrimaryButton>
          <div>
            <div className={labelClass}>State</div>
            <select
              className={`${inputClass} mt-1 sm:w-52`}
              value={stateId}
              onChange={(e) => {
                setStateId(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by state"
            >
              <option value="">All states</option>
              {stateList.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name} ({st.code})
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            aria-pressed={freeOnly}
            onClick={() => {
              setFreeOnly((v) => !v);
              setPage(1);
            }}
            className={`inline-flex items-center gap-2 self-stretch rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-100 sm:self-end ${
              freeOnly
                ? "border-emerald-500 bg-emerald-500 text-white shadow-sm shadow-emerald-600/30"
                : "border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${freeOnly ? "bg-white" : "bg-emerald-500"}`} />
            Free only
          </button>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={total === 0}
            onClick={() => {
              setConfirmText("");
              setDeleteAllOpen(true);
            }}
            className="inline-flex items-center justify-center rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-600 shadow-sm transition hover:bg-rose-50 active:scale-[0.98] focus:outline-none focus-visible:ring-4 focus-visible:ring-rose-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Delete all
          </button>
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
        open={deleteAllOpen}
        onClose={() => !deleting && setDeleteAllOpen(false)}
        title={`Delete all ${total.toLocaleString()} DID${total === 1 ? "" : "s"}?`}
        description={
          (filtersActive
            ? `This deletes every DID matching the current filters (${filterSummary}), including those not shown on this page.`
            : "This deletes every DID in the portal, including those not shown on this page.") +
          " They are removed for good, and their call history is deleted with them. DIDs on a call right now are skipped."
        }
      >
        {!filtersActive ? (
          <label className="mb-4 block">
            <span className={labelClass}>Type DELETE to confirm</span>
            <input
              className={`${inputClass} mt-1.5`}
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              autoComplete="off"
              placeholder="DELETE"
            />
          </label>
        ) : null}
        <div className="flex justify-end gap-2">
          <SecondaryButton onClick={() => setDeleteAllOpen(false)} disabled={deleting} autoFocus={filtersActive}>
            Cancel
          </SecondaryButton>
          <button
            type="button"
            disabled={deleting || (!filtersActive && confirmText.trim() !== "DELETE")}
            onClick={() => void deleteAll()}
            className="inline-flex items-center justify-center rounded-xl bg-gradient-to-b from-rose-500 to-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-rose-600/30 transition hover:from-rose-500 hover:to-rose-500 active:scale-[0.98] focus:outline-none focus-visible:ring-4 focus-visible:ring-rose-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deleting ? "Deleting…" : `Delete ${total.toLocaleString()}`}
          </button>
        </div>
      </Modal>

      <Modal
        open={confirmDelete}
        onClose={() => !deleting && setConfirmDelete(false)}
        title={`Delete ${selected.size} DID${selected.size === 1 ? "" : "s"}?`}
        description={
          `They are removed for good and the dialer will no longer be given them.` +
          (usedCount > 0
            ? ` ${usedCount} of them ${usedCount === 1 ? "has" : "have"} been used, so ${usedCount === 1 ? "its" : "their"} call history is deleted too.`
            : "") +
          " DIDs on a call right now are skipped."
        }
      >
        <div className="flex justify-end gap-2">
          <SecondaryButton onClick={() => setConfirmDelete(false)} disabled={deleting} autoFocus>
            Cancel
          </SecondaryButton>
          <button
            type="button"
            disabled={deleting}
            onClick={() => void deleteSelected()}
            className="inline-flex items-center justify-center rounded-xl bg-gradient-to-b from-rose-500 to-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-rose-600/30 transition hover:from-rose-500 hover:to-rose-500 active:scale-[0.98] focus:outline-none focus-visible:ring-4 focus-visible:ring-rose-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </Modal>

      <Modal
        open={addOpen}
        onClose={() => !adding && setAddOpen(false)}
        title="Add DID"
        description="With or without the country code 1. The area code and state are detected automatically, and the number is kept with its country code."
      >
        <form onSubmit={(e) => void addOne(e)} className="space-y-4">
          <label className="block">
            <span className={labelClass}>Phone number</span>
            <input
              className={`${inputClass} mt-1.5`}
              placeholder="e.g. 12102821540"
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
          <h2 className="text-sm font-semibold text-slate-900">
            DID list <span className="ml-1 font-normal text-slate-500">({total.toLocaleString()}{loading ? ", loading…" : ""})</span>
          </h2>
        </div>
        {selected.size > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-100 bg-emerald-50 px-5 py-2.5">
            <span className="text-sm font-medium text-emerald-900">
              {selected.size} selected
            </span>
            <div className="flex items-center gap-2">
              <SecondaryButton onClick={() => setSelected(new Set())}>Clear</SecondaryButton>
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-b from-rose-500 to-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-rose-600/30 transition hover:from-rose-500 hover:to-rose-500 active:scale-[0.98] focus:outline-none focus-visible:ring-4 focus-visible:ring-rose-200"
              >
                Delete {selected.size}
              </button>
            </div>
          </div>
        ) : null}
        <div className={`overflow-x-auto transition-opacity ${loading ? "opacity-60" : ""}`}>
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="bg-emerald-50 text-xs font-semibold uppercase tracking-wider text-slate-600">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    className="h-4 w-4 cursor-pointer accent-emerald-600"
                    aria-label="Select all DIDs shown"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected;
                    }}
                    onChange={toggleAll}
                    disabled={dids.length === 0}
                  />
                </th>
                <th className="px-4 py-3">Number</th>
                <th className="px-4 py-3">Area code</th>
                <th className="px-4 py-3">State</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Used by</th>
                <th className="px-4 py-3">Uses</th>
                <th className="px-4 py-3">Last used</th>
              </tr>
            </thead>
            <tbody>
              {dids.map((d) => (
                <tr
                  key={d.id}
                  className={`border-t border-emerald-50 transition hover:bg-emerald-50/40 ${selected.has(d.id) ? "bg-emerald-50/70" : ""}`}
                >
                  <td className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 cursor-pointer accent-emerald-600"
                      aria-label={`Select ${withCountryCode(d.number)}`}
                      checked={selected.has(d.id)}
                      onChange={() => toggleOne(d.id)}
                    />
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-800">{withCountryCode(d.number)}</td>
                  <td className="px-4 py-3 font-mono text-slate-800">{d.areaCode}</td>
                  <td className="px-4 py-3 text-slate-800">{d.state.code}</td>
                  <td className="px-4 py-3">
                    {isOnCall(d) ? (
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
                  <td className="px-4 py-3 text-slate-700">{isOnCall(d) ? (d.user?.name ?? "-") : "-"}</td>
                  <td className="px-4 py-3 tabular-nums text-slate-800">{d.totalUses}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {d.lastUsedAt ? new Date(d.lastUsedAt).toLocaleString() : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(() => {
          const pages = Math.max(1, Math.ceil(total / pageSize));
          const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
          const to = total === 0 ? 0 : Math.min(total, from + dids.length - 1);
          const go = (p: number) => setPage(Math.min(pages, Math.max(1, p)));
          const nav =
            "inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-emerald-200 bg-white px-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white";
          return (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-emerald-100 bg-slate-50/60 px-5 py-3 text-sm">
              <span className="text-slate-500">
                {total === 0 ? "No DIDs" : `Showing ${from.toLocaleString()}–${to.toLocaleString()} of ${total.toLocaleString()}`}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-2 text-slate-500">
                  Rows
                  <select
                    className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-800 focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-100"
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                  >
                    {[25, 50, 100, 200].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="button" className={nav} onClick={() => go(1)} disabled={page <= 1 || loading} aria-label="First page" title="First page">
                  «
                </button>
                <button type="button" className={nav} onClick={() => go(page - 1)} disabled={page <= 1 || loading}>
                  Prev
                </button>
                <span className="flex items-center gap-2 text-slate-500">
                  Page
                  <input
                    key={page}
                    type="number"
                    min={1}
                    max={pages}
                    defaultValue={page}
                    aria-label="Go to page"
                    className="h-9 w-20 rounded-lg border border-slate-200 bg-white px-2 text-center text-sm text-slate-800 focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-100"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") go(Number(e.currentTarget.value) || 1);
                    }}
                    onBlur={(e) => {
                      const n = Number(e.currentTarget.value);
                      if (n && n !== page) go(n);
                    }}
                  />
                  of {pages.toLocaleString()}
                </span>
                <button type="button" className={nav} onClick={() => go(page + 1)} disabled={page >= pages || loading}>
                  Next
                </button>
                <button type="button" className={nav} onClick={() => go(pages)} disabled={page >= pages || loading} aria-label="Last page" title="Last page">
                  »
                </button>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
