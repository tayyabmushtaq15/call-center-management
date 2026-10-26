"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { inputClass } from "@/components/admin-chrome";

type Row = {
  id: number;
  name: string;
  code: string;
  status: string;
  poolDids: number;
  busyDids: number;
  callsToday: number;
};

type Filter = "all" | "free" | "none" | "low";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "free", label: "Has free DIDs" },
  { key: "none", label: "No free DIDs" },
  { key: "low", label: "Running low" },
];

export function StatesClient({ initialRows, lowThreshold }: { initialRows: Row[]; lowThreshold: number }) {
  const [rows, setRows] = useState(initialRows);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  async function toggle(id: number, status: string) {
    const next = status === "active" ? "inactive" : "active";
    const res = await fetch("/api/admin/states", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: next }),
    });
    if (!res.ok) return;
    setRows((r) => r.map((row) => (row.id === id ? { ...row, status: next } : row)));
  }

  const withFree = useMemo(
    () => rows.map((r) => ({ ...r, free: Math.max(0, r.poolDids - r.busyDids) })),
    [rows]
  );

  const counts = useMemo(
    () => ({
      all: withFree.length,
      free: withFree.filter((r) => r.free > 0).length,
      none: withFree.filter((r) => r.free === 0).length,
      low: withFree.filter((r) => r.poolDids > 0 && r.poolDids < lowThreshold).length,
    }),
    [withFree, lowThreshold]
  );

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return withFree.filter((r) => {
      if (q && !r.name.toLowerCase().includes(q) && !r.code.toLowerCase().includes(q)) return false;
      if (filter === "free") return r.free > 0;
      if (filter === "none") return r.free === 0;
      if (filter === "low") return r.poolDids > 0 && r.poolDids < lowThreshold;
      return true;
    });
  }, [withFree, search, filter, lowThreshold]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <input
          className={`${inputClass} lg:max-w-xs`}
          placeholder="Search a state or code, e.g. Ohio or OH"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search states"
        />
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter states">
          {FILTERS.map((f) => {
            const on = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                aria-pressed={on}
                onClick={() => setFilter(f.key)}
                className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-100 ${
                  on
                    ? "border-emerald-500 bg-emerald-500 text-white shadow-sm shadow-emerald-600/30"
                    : "border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50"
                }`}
              >
                {f.label}
                <span
                  className={`rounded-full px-1.5 text-xs tabular-nums ${
                    on ? "bg-white/25 text-white" : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {counts[f.key]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm shadow-emerald-900/5">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-emerald-50/70 text-xs font-semibold uppercase tracking-wider text-emerald-900/70">
              <tr>
                <th className="px-4 py-3">State</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Free now</th>
                <th className="px-4 py-3">On a call</th>
                <th className="px-4 py-3">Active DIDs</th>
                <th className="px-4 py-3">Calls today</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {shown.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                    No states match.
                  </td>
                </tr>
              ) : null}
              {shown.map((s) => (
                <tr key={s.id} className="border-t border-emerald-50 transition hover:bg-emerald-50/40">
                  <td className="px-4 py-3 font-medium text-slate-800">{s.name}</td>
                  <td className="px-4 py-3 font-mono text-slate-700">{s.code}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex min-w-9 justify-center rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums ${
                        s.free === 0
                          ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
                          : s.free < lowThreshold
                            ? "bg-amber-50 text-amber-800 ring-1 ring-amber-200"
                            : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                      }`}
                    >
                      {s.free}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-slate-700">{s.busyDids}</td>
                  <td className="px-4 py-3 tabular-nums text-slate-700">{s.poolDids}</td>
                  <td className="px-4 py-3 tabular-nums text-slate-700">{s.callsToday}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      title={s.status === "active" ? "Click to turn this state off" : "Click to turn this state on"}
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 transition ${
                        s.status === "active"
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100"
                          : "bg-slate-100 text-slate-500 ring-slate-200 hover:bg-slate-200"
                      }`}
                      onClick={() => void toggle(s.id, s.status)}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${s.status === "active" ? "bg-emerald-500" : "bg-slate-400"}`} />
                      {s.status}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/dids?stateId=${s.id}&free=1`}
                      className="text-sm font-medium text-emerald-700 hover:underline"
                    >
                      View free DIDs
                    </Link>
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
