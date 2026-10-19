"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/admin-chrome";

export default function CallLogsPage() {
  const [logs, setLogs] = useState<
    {
      id: number;
      receiverNumber: string;
      receiverState: string;
      callStatus: string;
      duration: number | null;
      startedAt: string;
      user: { name: string };
      did: { number: string };
      switch: { name: string } | null;
    }[]
  >([]);

  async function load() {
    const res = await fetch("/api/admin/call-logs");
    const j = await res.json();
    setLogs(j.logs ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Call logs"
        description="Full history of completed and in-progress calls. Export for spreadsheets or billing."
        children={
          <a
            href="/api/admin/call-logs/export"
            className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-600/70 bg-slate-800/80 px-4 text-sm font-medium text-slate-200 shadow-sm transition hover:bg-slate-700/80"
          >
            Export CSV
          </a>
        }
      />
      <div className="overflow-hidden rounded-2xl border border-slate-600/40 bg-slate-800/50 shadow-lg ring-1 ring-slate-700/30">
        <div className="border-b border-slate-600/50 bg-slate-800/30 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-100">Recent calls</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-800/60 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-3 py-3">Receiver</th>
                <th className="px-3 py-3">State</th>
                <th className="px-3 py-3">DID</th>
                <th className="px-3 py-3">Center</th>
                <th className="px-3 py-3">Switch</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Dur</th>
                <th className="px-3 py-3">Started</th>
              </tr>
            </thead>
            <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-t border-slate-700/50">
                <td className="px-3 py-2.5 font-mono text-slate-200">{l.receiverNumber}</td>
                <td className="px-3 py-2.5 text-slate-200">{l.receiverState}</td>
                <td className="px-3 py-2.5 font-mono text-slate-200">{l.did.number}</td>
                <td className="px-3 py-2.5 text-slate-200">{l.user.name}</td>
                <td className="px-3 py-2.5 text-slate-200">{l.switch?.name ?? "Dialer"}</td>
                <td className="px-3 py-2.5 text-slate-200">{l.callStatus}</td>
                <td className="px-3 py-2.5 tabular-nums text-slate-200">
                  {l.duration ?? "—"}
                </td>
                <td className="px-3 py-2.5 text-xs text-slate-500">
                  {new Date(l.startedAt).toLocaleString()}
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
