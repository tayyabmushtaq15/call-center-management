"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/admin-chrome";

type Row = {
  id: number;
  callCenter: string;
  userId: number;
  masked: string;
  status: string;
  callsToday: number;
};

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<Row[]>([]);
  const [reveal, setReveal] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/api-keys");
    const j = await res.json();
    setKeys(j.keys ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function regenerate(userId: number) {
    const res = await fetch("/api/admin/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action: "regenerate" }),
    });
    const j = await res.json();
    if (j.apiKey) setReveal(j.apiKey as string);
    await load();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="API keys"
        description="Keys authenticate your dialer to the get-DID API. Regenerate if a key may be exposed."
      />
      {reveal ? (
        <div className="rounded-2xl border border-amber-500/25 bg-amber-50 p-4 text-sm text-amber-800">
          <strong className="font-semibold">New key (copy now)</strong>
          <code className="mt-2 block break-all rounded-lg border border-slate-200 bg-white p-2 font-mono text-xs text-amber-900">
            {reveal}
          </code>
        </div>
      ) : null}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg ring-1 ring-slate-900/5">
        <div className="border-b border-emerald-100 bg-emerald-50/60 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Keys by call center</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="bg-emerald-50 text-xs font-semibold uppercase tracking-wider text-slate-600">
              <tr>
                <th className="px-4 py-3">Call center</th>
                <th className="px-4 py-3">Key</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Calls today</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
            {keys.map((k) => (
              <tr key={k.id} className="border-t border-emerald-50 transition hover:bg-emerald-50/40">
                <td className="px-4 py-3 font-medium text-slate-800">{k.callCenter}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-700">{k.masked}</td>
                <td className="px-4 py-3 text-slate-800">{k.status}</td>
                <td className="px-4 py-3 tabular-nums text-slate-800">{k.callsToday}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    className="text-sm font-medium text-emerald-700 hover:text-emerald-700 hover:underline"
                      onClick={() => void regenerate(k.userId)}
                    >
                      Regenerate
                    </button>
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
