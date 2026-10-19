"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader, StatTile, cardClass, inputClass, PrimaryButton } from "@/components/admin-chrome";

type SwitchOpt = { id: number; name: string };
type AllowedIpRow = { id: number; ip: string; label: string | null; status: string };
type RequestRow = {
  id: number;
  kind: string;
  ip: string;
  destination: string | null;
  didNumber: string | null;
  outcome: string;
  reason: string | null;
  latencyMs: number;
  createdAt: string;
};
export function CallCenterDetail({ id }: { id: number }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [switches, setSwitches] = useState<SwitchOpt[]>([]);
  const [ips, setIps] = useState<AllowedIpRow[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [newIp, setNewIp] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [ipMsg, setIpMsg] = useState("");
  const [lease, setLease] = useState<number | null>(null);

  const load = useCallback(async () => {
    const [u, sw, ipRes, reqRes] = await Promise.all([
      fetch(`/api/admin/call-centers/${id}`).then((r) => r.json()),
      fetch("/api/admin/switches").then((r) => r.json()),
      fetch(`/api/admin/call-centers/${id}/ips`).then((r) => r.json()),
      fetch(`/api/admin/call-centers/${id}/requests`).then((r) => r.json()),
    ]);
    setData(u);
    setIps(ipRes.ips ?? []);
    setRequests(reqRes.requests ?? []);
    setLease((prev) => prev ?? u.user?.leaseSeconds ?? 180);
    setSwitches(sw.switches ?? []);
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
    leaseSeconds: number;
    switchId: number | null;
    apiKeys: { id: number; key: string; status: string }[];
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

  async function addIp() {
    setIpMsg("");
    const res = await fetch(`/api/admin/call-centers/${id}/ips`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ip: newIp.trim(), label: newLabel.trim() || undefined }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setIpMsg(j.error ?? "Could not add IP");
      return;
    }
    setNewIp("");
    setNewLabel("");
    await load();
  }

  async function toggleIp(ipId: number, status: string) {
    await fetch(`/api/admin/call-centers/${id}/ips`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ipId, status: status === "active" ? "inactive" : "active" }),
    });
    await load();
  }

  async function removeIp(ipId: number) {
    await fetch(`/api/admin/call-centers/${id}/ips?ipId=${ipId}`, { method: "DELETE" });
    await load();
  }

  async function saveLease() {
    setIpMsg("");
    const res = await fetch(`/api/admin/call-centers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leaseSeconds: lease }),
    });
    setIpMsg(res.ok ? "Lease saved" : "Lease must be 10-14400 seconds");
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={user.name}
        description={`${user.email} — status: ${user.status}. Dials any DID in the shared pool through the dialer API.`}
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatTile title="Calls today" value={String(stats.callsToday)} />
        <StatTile
          title="Answer rate (today)"
          value={`${(Number(stats.answerRateToday) * 100).toFixed(1)}%`}
          accent="violet"
        />
        <StatTile title="Calls (30 days)" value={String(stats.callsMonth)} />
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
        <h2 className="text-sm font-semibold text-slate-100">Dialer API access</h2>
        <p className="mt-0.5 text-xs text-slate-400">
          Dial plans call <span className="font-mono">GET /api/v1/did</span> from these server IPs only (single IP or IPv4 CIDR).
          With no active IP listed, every request from this call center is rejected.
        </p>
        <ul className="mt-3 space-y-2 text-xs text-slate-200">
          {ips.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-600/50 bg-slate-900/40 px-3 py-2">
              <span className="font-mono">{r.ip}</span>
              <span className="text-slate-400">{r.label ?? ""}</span>
              <span className={r.status === "active" ? "text-emerald-400" : "text-slate-500"}>{r.status}</span>
              <button type="button" className="ml-auto text-slate-300 hover:underline" onClick={() => void toggleIp(r.id, r.status)}>
                {r.status === "active" ? "Disable" : "Enable"}
              </button>
              <button type="button" className="text-rose-400 hover:underline" onClick={() => void removeIp(r.id)}>
                Remove
              </button>
            </li>
          ))}
          {ips.length === 0 ? <li className="text-slate-500">No IPs listed, so this call center cannot use the dialer API yet.</li> : null}
        </ul>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <input className={`${inputClass} w-52`} placeholder="203.0.113.10 or 203.0.113.0/28" value={newIp} onChange={(e) => setNewIp(e.target.value)} />
          <input className={`${inputClass} w-44`} placeholder="Label (e.g. Dialer 1)" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} />
          <PrimaryButton onClick={() => void addIp()}>Add IP</PrimaryButton>
        </div>
        <div className="mt-5 flex flex-wrap items-end gap-2">
          <label>
            <div className="text-xs font-medium text-slate-400">DID lease (seconds), the safety net when no release arrives</div>
            <input
              type="number"
              min={10}
              max={14400}
              className={`mt-1.5 w-28 ${inputClass}`}
              value={lease ?? user.leaseSeconds}
              onChange={(e) => setLease(Number(e.target.value))}
            />
          </label>
          <PrimaryButton onClick={() => void saveLease()}>Save lease</PrimaryButton>
        </div>
        {ipMsg ? <p className="mt-2 text-sm text-slate-300">{ipMsg}</p> : null}
      </div>

      <div className={`${cardClass} p-5`}>
        <h2 className="text-sm font-semibold text-slate-100">Recent dialer API requests</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="text-slate-400">
              <tr>
                <th className="px-2 py-1.5">Time</th>
                <th className="px-2 py-1.5">Type</th>
                <th className="px-2 py-1.5">IP</th>
                <th className="px-2 py-1.5">Dialed</th>
                <th className="px-2 py-1.5">DID</th>
                <th className="px-2 py-1.5">Result</th>
                <th className="px-2 py-1.5">ms</th>
              </tr>
            </thead>
            <tbody className="text-slate-200">
              {requests.map((r) => (
                <tr key={r.id} className="border-t border-slate-700/50">
                  <td className="px-2 py-1.5 whitespace-nowrap">{new Date(r.createdAt).toLocaleString()}</td>
                  <td className="px-2 py-1.5">{r.kind}</td>
                  <td className="px-2 py-1.5 font-mono">{r.ip}</td>
                  <td className="px-2 py-1.5 font-mono">{r.destination ?? "-"}</td>
                  <td className="px-2 py-1.5 font-mono">{r.didNumber ?? "-"}</td>
                  <td className="px-2 py-1.5">{r.outcome}{r.reason ? ` (${r.reason})` : ""}</td>
                  <td className="px-2 py-1.5 tabular-nums">{r.latencyMs}</td>
                </tr>
              ))}
              {requests.length === 0 ? (
                <tr><td colSpan={7} className="px-2 py-3 text-slate-500">No requests yet.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
