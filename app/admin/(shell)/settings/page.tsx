"use client";

import { PasswordInput } from "@/components/PasswordInput";
import { useEffect, useState } from "react";
import { PageHeader, cardClass, inputClass, labelClass, PrimaryButton } from "@/components/admin-chrome";

export default function SettingsPage() {
  const [systemName, setSystemName] = useState("");
  const [lowPool, setLowPool] = useState(5);
  const [rate, setRate] = useState(120);
  const [showHangup, setShowHangup] = useState(false);
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    const res = await fetch("/api/admin/settings");
    const j = await res.json();
    setSystemName(j.system?.systemName ?? "");
    setLowPool(j.system?.lowPoolWarningThreshold ?? 5);
    setRate(j.system?.apiRateLimitPerMinute ?? 120);
    setShowHangup(j.system?.showHangupLine === true);
    setAdminName(j.admin?.name ?? "");
    setAdminEmail(j.admin?.email ?? "");
  }

  useEffect(() => {
    void load();
  }, []);

  async function save() {
    setMsg("");
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemName,
        lowPoolWarningThreshold: lowPool,
        apiRateLimitPerMinute: rate,
        showHangupLine: showHangup,
        adminName,
        adminEmail,
        ...(adminPassword.length >= 8
          ? { adminPassword }
          : {}),
      }),
    });
    if (!res.ok) setMsg("Save failed");
    else setMsg("Saved");
    setAdminPassword("");
    await load();
  }

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title="Settings"
        description="System name, pool alerts, rate limits, and the signed-in super admin account."
      />
      <div className={`space-y-4 p-5 ${cardClass}`}>
        <h2 className="text-sm font-semibold text-slate-900">System</h2>
        <label className="block">
          <span className={labelClass}>System name</span>
          <input
            className={`${inputClass} mt-1.5`}
            value={systemName}
            onChange={(e) => setSystemName(e.target.value)}
          />
        </label>
        <label className="block">
          <span className={labelClass}>Low pool warning threshold (active DIDs per state)</span>
          <input
            type="number"
            className={`${inputClass} mt-1.5`}
            value={lowPool}
            onChange={(e) => setLowPool(Number(e.target.value))}
          />
        </label>
        <label className="block">
          <span className={labelClass}>API rate limit (per key, per minute)</span>
          <input
            type="number"
            className={`${inputClass} mt-1.5`}
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
          />
        </label>
        <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <div>
            <div className="text-sm font-medium text-slate-900">Show the hangup line on call center pages</div>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Turn this on if your dialer should tell the portal when a call ends, so the DID is freed right away.
              Each call center page then shows one line to copy into the dialer's hangup extension. Leave it off if you don't need it.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={showHangup}
            aria-label="Show the hangup line on call center pages"
            onClick={() => setShowHangup((v) => !v)}
            className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-100 ${
              showHangup ? "bg-emerald-500" : "bg-slate-300"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                showHangup ? "left-[22px]" : "left-0.5"
              }`}
            />
          </button>
        </div>
      </div>
      <div className={`space-y-4 p-5 ${cardClass}`}>
        <h2 className="text-sm font-semibold text-slate-900">Admin account</h2>
        <label className="block">
          <span className={labelClass}>Name</span>
          <input
            className={`${inputClass} mt-1.5`}
            value={adminName}
            onChange={(e) => setAdminName(e.target.value)}
          />
        </label>
        <label className="block">
          <span className={labelClass}>Email</span>
          <input
            className={`${inputClass} mt-1.5`}
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
          />
        </label>
        <label className="block">
          <span className={labelClass}>New password (min 8 characters; leave blank to keep)</span>
          <PasswordInput
            className={`${inputClass} mt-1.5`}
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            autoComplete="new-password"
          />
        </label>
      </div>
      {msg ? (
        <p
          className={
            msg === "Saved"
              ? "text-sm text-emerald-700"
              : "text-sm text-rose-600"
          }
        >
          {msg}
        </p>
      ) : null}
      <PrimaryButton type="button" onClick={() => void save()}>
        Save
      </PrimaryButton>
    </div>
  );
}
