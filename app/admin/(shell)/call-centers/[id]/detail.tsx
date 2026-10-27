"use client";

import { useCallback, useEffect, useState } from "react";
import { Modal } from "@/components/Modal";
import { StatusToggle } from "@/components/StatusToggle";
import { HostsEditor, type AllowedIpRow } from "./hosts-editor";
import { withCountryCode } from "@/lib/phone";
import { PageHeader, StatTile, cardClass, inputClass, labelClass, PrimaryButton, SecondaryButton } from "@/components/admin-chrome";
import { IconBars, IconChart, IconClock, IconPhone, IconPulse } from "@/components/icons";

/** $1.25, $0.0125, $1,240.50: at least 2 decimals, up to 4 when the rate needs them. */
const money = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;

type RequestRow = {
  id: number;
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
  const [ips, setIps] = useState<AllowedIpRow[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [ipMsg, setIpMsg] = useState("");
  const [prefix, setPrefix] = useState<string | null>(null);
  const [copied, setCopied] = useState("");
  const [chargesOpen, setChargesOpen] = useState(false);
  const [chargeForm, setChargeForm] = useState({ perCall: "", perAttended: "" });
  const [chargeError, setChargeError] = useState("");
  const [chargeSaving, setChargeSaving] = useState(false);
  const [loadError, setLoadError] = useState("");

  const load = useCallback(async () => {
    // A failed request (server error, empty reply, signed out) must show a message, not crash the page.
    const get = async (url: string) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(res.status === 401 ? "Your session expired. Sign in again." : `The server answered ${res.status}.`);
      return res.json();
    };
    try {
      const [u, ipRes, reqRes] = await Promise.all([
        get(`/api/admin/call-centers/${id}`),
        get(`/api/admin/call-centers/${id}/ips`),
        get(`/api/admin/call-centers/${id}/requests`),
      ]);
      setData(u);
      setIps(ipRes.ips ?? []);
      setRequests(reqRes.requests ?? []);
      setPrefix((prev) => prev ?? u.user?.dialPrefix ?? "");
      setLoadError("");
    } catch (e) {
      setLoadError(e instanceof Error && e.message ? e.message : "Could not load this call center.");
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!data?.user && loadError) {
    return (
      <div className={`${cardClass} mx-auto mt-10 max-w-lg p-8 text-center`}>
        <h2 className="text-base font-semibold text-slate-900">Could not load this call center</h2>
        <p className="mt-2 text-sm text-slate-500">{loadError}</p>
        <p className="mt-1 text-xs text-slate-400">
          If you just updated the app, stop the dev server and start it again, then retry.
        </p>
        <div className="mt-5 flex justify-center">
          <PrimaryButton onClick={() => void load()}>Try again</PrimaryButton>
        </div>
      </div>
    );
  }

  if (!data?.user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-500" />
      </div>
    );
  }

  const user = data.user as {
    id: number;
    name: string;
    email: string;
    status: string;
    dialPrefix: string | null;
    chargePerCall: number;
    chargePerAttended: number;
    apiKeys: { id: number; key: string; status: string }[];
  };
  const stats = data.stats as Record<string, number>;
  const showHangup = (data.settings as { showHangupLine?: boolean } | undefined)?.showHangupLine === true;

  function openCharges() {
    setChargeForm({ perCall: String(user.chargePerCall), perAttended: String(user.chargePerAttended) });
    setChargeError("");
    setChargesOpen(true);
  }

  async function saveCharges(e: React.FormEvent) {
    e.preventDefault();
    const perCall = Number(chargeForm.perCall === "" ? 0 : chargeForm.perCall);
    const perAttended = Number(chargeForm.perAttended === "" ? 0 : chargeForm.perAttended);
    if (![perCall, perAttended].every((n) => Number.isFinite(n) && n >= 0 && n <= 1000)) {
      setChargeError("Enter amounts between 0 and 1000.");
      return;
    }
    setChargeSaving(true);
    setChargeError("");
    try {
      const res = await fetch(`/api/admin/call-centers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chargePerCall: perCall, chargePerAttended: perAttended }),
      });
      if (!res.ok) {
        setChargeError("Could not save the charges.");
        return;
      }
      setChargesOpen(false);
      await load();
    } finally {
      setChargeSaving(false);
    }
  }

  async function savePrefix() {
    setIpMsg("");
    const value = (prefix ?? "").trim();
    const res = await fetch(`/api/admin/call-centers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dialPrefix: value === "" ? null : value }),
    });
    setIpMsg(res.ok ? "Dial prefix saved" : "Prefix must be digits only (up to 10)");
    if (res.ok) await load();
  }

  async function copyDialplan(text: string, which: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(""), 2000);
    } catch {
      setIpMsg("Copy failed. Select the text and copy it manually.");
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={user.name}
        description={`${user.email}. Gets a free DID from the shared pool, matched to the dialed number's area code. When inactive, its dialers get their own caller ID back.`}
      >
        <div className="flex flex-wrap items-center justify-end gap-3">
        <SecondaryButton onClick={openCharges}>Set Charges</SecondaryButton>
        <StatusToggle
          status={user.status}
          confirmOff="Its dialers will get their own caller ID back until you switch it on again."
          onToggle={async (next) => {
            const res = await fetch(`/api/admin/call-centers/${id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: next }),
            });
            if (res.ok) await load();
            return res.ok;
          }}
        />
        </div>
      </PageHeader>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        <StatTile title="Calls Today" value={stats.callsToday} accent="default" icon={<IconPhone />} />
        <StatTile title="Calls (30 Days)" value={stats.callsMonth} accent="sky" icon={<IconClock />} />
        <StatTile title="Charge Per Call" value={money(user.chargePerCall)} accent="violet" icon={<IconBars />} />
        <StatTile title="Charge Per Attended" value={money(user.chargePerAttended)} accent="amber" icon={<IconPulse />} />
        <StatTile
          title="Total Charges"
          value={money(stats.totalCharges)}
          hint={`30 days · ${stats.attendedMonth} attended`}
          accent="rose"
          icon={<IconChart />}
        />
      </div>

      <Modal
        open={chargesOpen}
        onClose={() => !chargeSaving && setChargesOpen(false)}
        title="Set Charges"
        description="What this call center is charged. Total Charges adds up the last 30 days: every call at the per-call rate, plus every attended (answered) call at the attended rate."
      >
        <form onSubmit={(e) => void saveCharges(e)} className="space-y-4">
          <label className="block">
            <span className={labelClass}>Charge per call ($)</span>
            <input
              className={`${inputClass} mt-1.5`}
              type="number"
              min={0}
              max={1000}
              step="0.0001"
              inputMode="decimal"
              value={chargeForm.perCall}
              onChange={(e) => setChargeForm((f) => ({ ...f, perCall: e.target.value }))}
            />
          </label>
          <label className="block">
            <span className={labelClass}>Charge per attended call ($)</span>
            <input
              className={`${inputClass} mt-1.5`}
              type="number"
              min={0}
              max={1000}
              step="0.0001"
              inputMode="decimal"
              value={chargeForm.perAttended}
              onChange={(e) => setChargeForm((f) => ({ ...f, perAttended: e.target.value }))}
            />
          </label>
          {chargeError ? (
            <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {chargeError}
            </p>
          ) : null}
          <div className="flex justify-end gap-2 pt-1">
            <SecondaryButton onClick={() => setChargesOpen(false)} disabled={chargeSaving}>
              Cancel
            </SecondaryButton>
            <PrimaryButton type="submit" disabled={chargeSaving}>
              {chargeSaving ? "Saving…" : "Save"}
            </PrimaryButton>
          </div>
        </form>
      </Modal>

      <div className={`${cardClass} p-5`}>
        <h2 className="text-sm font-semibold text-slate-900">Whitelist IPs</h2>
        <p className="mt-0.5 text-xs text-slate-600">
          Dial plans call <span className="font-mono">GET /api/v1/did</span> from these hosts only: a single IP address or an IP range (CIDR).
          With no active host listed, every request from this call center is rejected.
        </p>
        <HostsEditor callCenterId={id} ips={ips} onChanged={load} />
        {ipMsg ? <p className="mt-2 text-sm text-slate-700">{ipMsg}</p> : null}
      </div>

      <div className={`${cardClass} p-5`}>
        <h2 className="text-sm font-semibold text-slate-900">Dial plan for this call center</h2>
        <p className="mt-0.5 text-xs text-slate-600">
          Optional dial prefix: digits the dialer puts in front of the dialed number (for example 7084). Leave empty for none.
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <input
            className={`${inputClass} w-40`}
            placeholder="e.g. 7084"
            inputMode="numeric"
            maxLength={10}
            value={prefix ?? ""}
            onChange={(e) => setPrefix(e.target.value.replace(/\D/g, ""))}
          />
          <PrimaryButton onClick={() => void savePrefix()}>Save prefix</PrimaryButton>
        </div>
        {(() => {
          const activeKey = user.apiKeys.find((k) => k.status === "active")?.key ?? "YOUR_API_KEY";
          const saved = user.dialPrefix ?? "";
          const origin = typeof window !== "undefined" ? window.location.origin : "";
          const pattern = saved ? `_${saved}X.` : "_X.";
          const dialed = saved ? `\${EXTEN:${saved.length}}` : "\${EXTEN}";
          const text = [
            `exten => ${pattern},1,AGI(agi://127.0.0.1:4577/call_log)`,
            `exten => ${pattern},n,Set(RESPONSECALLERID=\${CURL(${origin}/api/v1/did?apikey=${activeKey}&number=${dialed}&callerId=\${CALLERID(num)})})`,
            `exten => ${pattern},n,Set(CALLERID(num)=\${RESPONSECALLERID})`,
            `exten => ${pattern},n,Dial(SIP/${dialed}@SIPTRUNK,,To)`,
            `exten => ${pattern},n,Hangup()`,
          ].join("\n");
          const hangup = `exten => h,n,Set(X=\${CURL(${origin}/api/v1/did/release?apikey=${activeKey}&did=\${CALLERID(num)}&status=\${DIALSTATUS}&duration=\${ANSWEREDTIME})})`;
          return (
            <div className="mt-4">
              <pre className="overflow-x-auto rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-800">{text}</pre>
              <div className="mt-2 flex items-center gap-3">
                <SecondaryButton onClick={() => void copyDialplan(text, "plan")}>{copied === "plan" ? "Copied" : "Copy dial plan"}</SecondaryButton>
                <span className="text-xs text-slate-500">Uses the active API key and this site address.</span>
              </div>
              {showHangup ? (
                <>
                  <h3 className="mt-6 text-sm font-semibold text-slate-900">Free the DID when the call ends</h3>
                  <p className="mt-0.5 text-xs text-slate-600">
                    Add this one line to your existing <span className="font-mono">h</span> (hangup) extension, after the
                    call_log line. It runs when a call ends any way: hung up, busy, no answer, cancelled or failed.
                  </p>
                  <pre className="mt-2 overflow-x-auto rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-800">{hangup}</pre>
                  <div className="mt-2">
                    <SecondaryButton onClick={() => void copyDialplan(hangup, "hangup")}>{copied === "hangup" ? "Copied" : "Copy hangup line"}</SecondaryButton>
                  </div>
                </>
              ) : null}
            </div>
          );
        })()}
      </div>

      <div className={`${cardClass} p-5`}>
        <h2 className="text-sm font-semibold text-slate-900">Recent dialer API requests</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="text-slate-600">
              <tr>
                <th className="px-2 py-1.5">Time</th>
                <th className="px-2 py-1.5">IP</th>
                <th className="px-2 py-1.5">Dialed</th>
                <th className="px-2 py-1.5">DID</th>
                <th className="px-2 py-1.5">Result</th>
                <th className="px-2 py-1.5">ms</th>
              </tr>
            </thead>
            <tbody className="text-slate-800">
              {requests.map((r) => (
                <tr key={r.id} className="border-t border-emerald-50 transition hover:bg-emerald-50/40">
                  <td className="px-2 py-1.5 whitespace-nowrap">{new Date(r.createdAt).toLocaleString()}</td>
                  <td className="px-2 py-1.5 font-mono">{r.ip}</td>
                  <td className="px-2 py-1.5 font-mono">{r.destination ?? "-"}</td>
                  <td className="px-2 py-1.5 font-mono">{r.didNumber ? withCountryCode(r.didNumber) : "-"}</td>
                  <td className="px-2 py-1.5">{r.outcome}{r.reason ? ` (${r.reason})` : ""}</td>
                  <td className="px-2 py-1.5 tabular-nums">{r.latencyMs}</td>
                </tr>
              ))}
              {requests.length === 0 ? (
                <tr><td colSpan={6} className="px-2 py-3 text-slate-500">No requests yet.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
