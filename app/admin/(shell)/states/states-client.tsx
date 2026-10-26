"use client";

import { useState } from "react";

type Row = {
  id: number;
  name: string;
  code: string;
  status: string;
  poolDids: number;
  callsToday: number;
};

export function StatesClient({ initialRows }: { initialRows: Row[] }) {
  const [rows, setRows] = useState(initialRows);

  async function toggle(id: number, status: string) {
    const next = status === "active" ? "inactive" : "active";
    const res = await fetch("/api/admin/states", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: next }),
    });
    if (!res.ok) return;
    setRows((r) =>
      r.map((row) => (row.id === id ? { ...row, status: next } : row))
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg ring-1 ring-slate-900/5">
      <div className="border-b border-emerald-100 bg-emerald-50/60 px-5 py-3">
        <h2 className="text-sm font-semibold text-slate-900">All states</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-emerald-50 text-xs font-semibold uppercase tracking-wider text-slate-600">
            <tr>
              <th className="px-4 py-3">State</th>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Active DIDs</th>
              <th className="px-4 py-3">Calls today</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} className="border-t border-emerald-50 transition hover:bg-emerald-50/40">
                <td className="px-4 py-3 text-slate-800">{s.name}</td>
                <td className="px-4 py-3 font-mono text-slate-800">{s.code}</td>
                <td className="px-4 py-3 tabular-nums text-slate-800">{s.poolDids}</td>
                <td className="px-4 py-3 tabular-nums text-slate-800">{s.callsToday}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                      s.status === "active"
                        ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-500/30"
                        : "bg-white text-slate-600 ring-1 ring-slate-900/5"
                    }`}
                    onClick={() => toggle(s.id, s.status)}
                  >
                    {s.status}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
