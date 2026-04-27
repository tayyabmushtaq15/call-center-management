"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader, StatTile, cardClass, inputClass, PrimaryButton } from "@/components/admin-chrome";

type SwitchOpt = { id: number; name: string };
type StateOption = {
  id: number;
  name: string;
  code: string;
  status: string;
  poolDids: number;
  assignedDids: number;
  callsToday: number;
};
type Assignment = {
  id: number;
  stateId: number;
  didCount: number;
  state: { code: string; name: string };
};

export function CallCenterDetail({ id }: { id: number }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [switches, setSwitches] = useState<SwitchOpt[]>([]);
  const [allStates, setAllStates] = useState<StateOption[]>([]);
  const [autoCount, setAutoCount] = useState(5);
  const [manualStateId, setManualStateId] = useState("");
  const [manualCount, setManualCount] = useState(5);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const [u, sw, st] = await Promise.all([
      fetch(`/api/admin/call-centers/${id}`).then((r) => r.json()),
      fetch("/api/admin/switches").then((r) => r.json()),
      fetch("/api/admin/states").then((r) => r.json()),
    ]);
    setData(u);
    setSwitches(sw.switches ?? []);
    setAllStates(st.states ?? []);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!data?.user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-600 border-t-emerald-500" />
      </div>
    );
  }

  const user = data.user as {
    id: number;
    name: string;
    email: string;
    status: string;
    switchId: number | null;
    apiKeys: { id: number; key: string; status: string }[];
    assignments: Assignment[];
  };
  const stats = data.stats as Record<string, number>;

  async function saveSwitch(raw: string) {
    const switchId = raw === "" ? null : Number(raw);
    await fetch(`/api/admin/call-centers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ switchId }),
    });
    await load();
  }

  async function runAuto() {
    setMsg("");
    const res = await fetch(`/api/admin/call-centers/${id}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "auto_all", count: autoCount }),
    });
    if (!res.ok) setMsg("Assign failed");
    else setMsg("Auto-assign completed");
    await load();
  }

  async function runManual() {
    setMsg("");
    if (!manualStateId) {
      setMsg("Select a state");
      return;
    }
    const sid = Number(manualStateId);
    if (!Number.isFinite(sid)) {
      setMsg("Invalid state");
      return;
    }
    const res = await fetch(`/api/admin/call-centers/${id}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "manual",
        items: [{ stateId: sid, count: manualCount }],
      }),
    });
    if (!res.ok) setMsg("Assign failed");
    else setMsg("Manual assign completed");
    await load();
  }

  async function release(stateId: number) {
    await fetch(`/api/admin/call-centers/${id}/release-state`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stateId }),
    });
    await load();
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={user.name}
        description={`${user.email} — status: ${user.status}. Assign DIDs from the shared pool and route traffic through a switch.`}
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatTile title="Calls today" value={String(stats.callsToday)} />
        <StatTile
          title="Answer rate (today)"
          value={`${(Number(stats.answerRateToday) * 100).toFixed(1)}%`}
          accent="violet"
        />
        <StatTile title="DIDs assigned" value={String(stats.totalDidsAssigned)} />
      </div>

      <div className={`${cardClass} p-5`}>
        <h2 className="text-sm font-semibold text-slate-100">Switch</h2>
        <p className="mt-0.5 text-xs text-slate-400">Calls for this call center are routed here after get-DID.</p>
        <select
          className={`${inputClass} mt-3 max-w-md`}
          defaultValue={user.switchId ?? ""}
          onChange={(e) => void saveSwitch(e.target.value)}
        >
          <option value="">— none —</option>
          {switches.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className={`${cardClass} p-5`}>
        <h2 className="text-sm font-semibold text-slate-100">API keys</h2>
        <ul className="mt-3 space-y-2 font-mono text-xs text-slate-200">
          {user.apiKeys.map((k) => (
            <li key={k.id} className="rounded-lg border border-slate-600/50 bg-slate-900/40 px-3 py-2">
              {k.key.slice(0, 12)}… <span className="text-slate-500">({k.status})</span>
            </li>
          ))}
        </ul>
      </div>

      <div className={`${cardClass} p-5`}>
        <h2 className="text-sm font-semibold text-slate-100">Auto-assign (all states)</h2>
        <p className="mt-0.5 text-xs text-slate-400">Pulls the same count from the pool in every state that has enough capacity.</p>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <div>
            <div className="text-xs font-medium text-slate-400">Per state</div>
            <input
              type="number"
              min={1}
              max={500}
              className={`mt-1.5 w-24 ${inputClass}`}
              value={autoCount}
              onChange={(e) => setAutoCount(Number(e.target.value))}
            />
          </div>
          <PrimaryButton onClick={() => void runAuto()}>Assign to all states</PrimaryButton>
        </div>
      </div>

      <div className={`${cardClass} p-5`}>
        <h2 className="text-sm font-semibold text-slate-100">Manual assign</h2>
        <p className="mt-0.5 text-xs text-slate-400">Choose a state and how many DIDs to pull from the unassigned pool.</p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="min-w-0 sm:min-w-[240px]">
            <div className="text-xs font-medium text-slate-400">State</div>
            <select
              className={`${inputClass} mt-1.5 min-w-0 w-full sm:w-72`}
              value={manualStateId}
              onChange={(e) => setManualStateId(e.target.value)}
            >
              <option value="">Select a state…</option>
              {allStates
                .filter((s) => s.status === "active")
                .map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    {s.name} ({s.code}) — {s.poolDids} in pool
                  </option>
                ))}
            </select>
          </label>
          <div>
            <div className="text-xs font-medium text-slate-400">DIDs to assign</div>
            <input
              type="number"
              min={1}
              max={5000}
              className={`mt-1.5 w-24 ${inputClass}`}
              value={manualCount}
              onChange={(e) => setManualCount(Number(e.target.value))}
            />
          </div>
          <PrimaryButton onClick={() => void runManual()}>Assign from pool</PrimaryButton>
        </div>
      </div>

      {msg ? <p className="text-sm text-slate-300">{msg}</p> : null}

      <div className="overflow-hidden rounded-2xl border border-slate-600/40 bg-slate-800/50 shadow-lg ring-1 ring-slate-700/30">
        <div className="border-b border-slate-600/50 bg-slate-800/30 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-100">State assignments</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="bg-slate-800/60 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3">State</th>
                <th className="px-4 py-3">DID count</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {user.assignments.map((a) => (
                <tr key={a.id} className="border-t border-slate-700/50">
                  <td className="px-4 py-3 text-slate-200">
                    {a.state.name} ({a.state.code})
                  </td>
                  <td className="px-4 py-3 tabular-nums text-slate-200">{a.didCount}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      className="text-sm font-medium text-rose-400 hover:text-rose-300 hover:underline"
                      onClick={() => void release(a.stateId)}
                    >
                      Release pool DIDs
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
