"use client";

import { useEffect, useState } from "react";
import { PageHeader, inputClass, PrimaryButton } from "@/components/admin-chrome";

export default function AreaCodesPage() {
  const [rows, setRows] = useState<
    { id: number; areaCode: string; state: { code: string; name: string } }[]
  >([]);
  const [ac, setAc] = useState("");
  const [stateId, setStateId] = useState("");

  async function load() {
    const res = await fetch("/api/admin/area-codes");
    const j = await res.json();
    setRows(j.rows ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function add() {
    await fetch("/api/admin/area-codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ areaCode: ac, stateId: Number(stateId) }),
    });
    setAc("");
    await load();
  }

  async function del(id: number) {
    await fetch(`/api/admin/area-codes/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Area code map"
        description="The database ships with US area codes. Add overrides here for new splits or fixes."
      />
      <div className="flex max-w-2xl flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-lg ring-1 ring-slate-900/5 sm:flex-row sm:items-end sm:flex-wrap">
        <div className="min-w-0 sm:flex-1">
          <div className="text-xs font-medium text-slate-600">Area code (3 digits)</div>
          <input
            className={`${inputClass} mt-1.5 max-w-xs`}
            placeholder="e.g. 213"
            value={ac}
            onChange={(e) => setAc(e.target.value)}
          />
        </div>
        <div className="min-w-0 sm:w-32">
          <div className="text-xs font-medium text-slate-600">State ID</div>
          <input
            className={`${inputClass} mt-1.5`}
            placeholder="ID"
            value={stateId}
            onChange={(e) => setStateId(e.target.value)}
          />
        </div>
        <PrimaryButton onClick={() => void add()}>Add mapping</PrimaryButton>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg ring-1 ring-slate-900/5">
        <div className="border-b border-emerald-100 bg-emerald-50/60 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Mappings (first 200)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-emerald-50 text-xs font-semibold uppercase tracking-wider text-slate-600">
              <tr>
                <th className="px-4 py-3">Area code</th>
                <th className="px-4 py-3">State</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
            {rows.slice(0, 200).map((r) => (
              <tr key={r.id} className="border-t border-emerald-50 transition hover:bg-emerald-50/40">
                <td className="px-4 py-3 font-mono text-slate-800">{r.areaCode}</td>
                <td className="px-4 py-3 text-slate-800">
                  {r.state.name} ({r.state.code})
                </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      className="text-sm font-medium text-rose-600 hover:text-rose-700 hover:underline"
                      onClick={() => void del(r.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
          Showing first 200 rows. Full data is available from the server when needed.
        </p>
      </div>
    </div>
  );
}
