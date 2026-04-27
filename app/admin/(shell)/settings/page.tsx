"use client";

import { useEffect, useState } from "react";
import { PageHeader, cardClass, inputClass, labelClass, PrimaryButton } from "@/components/admin-chrome";

export default function SettingsPage() {
  const [systemName, setSystemName] = useState("");
  const [lowPool, setLowPool] = useState(5);
  const [rate, setRate] = useState(120);
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
        <h2 className="text-sm font-semibold text-slate-100">System</h2>
        <label className="block">
          <span className={labelClass}>System name</span>
          <input
            className={`${inputClass} mt-1.5`}
            value={systemName}
            onChange={(e) => setSystemName(e.target.value)}
          />
        </label>
        <label className="block">
          <span className={labelClass}>Low pool warning threshold (unassigned DIDs)</span>
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
      </div>
      <div className={`space-y-4 p-5 ${cardClass}`}>
        <h2 className="text-sm font-semibold text-slate-100">Admin account</h2>
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
          <input
            type="password"
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
              ? "text-sm text-emerald-400"
              : "text-sm text-rose-400"
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
