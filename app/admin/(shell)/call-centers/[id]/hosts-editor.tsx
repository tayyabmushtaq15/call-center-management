"use client";

import { useRef, useState } from "react";
import type { ClipboardEvent, KeyboardEvent } from "react";
import { PrimaryButton, SecondaryButton, StatusPill, inputClass } from "@/components/admin-chrome";

export type AllowedIpRow = { id: number; ip: string; label: string | null; status: string };

type HostType = "ip" | "cidr";
type Draft = { key: number; type: HostType; octets: string[]; prefix: string; error: string };

const emptyRow = (key: number): Draft => ({ key, type: "ip", octets: ["", "", "", ""], prefix: "", error: "" });

const isEmpty = (r: Draft) => r.octets.every((o) => o === "") && r.prefix === "";

const octetOk = (o: string) => /^\d{1,3}$/.test(o) && Number(o) <= 255;

/** Why a row can't be saved yet, or "" when it is fine. Empty rows are ignored, so they are fine too. */
function rowProblem(r: Draft): string {
  if (isEmpty(r)) return "";
  if (!r.octets.every(octetOk)) return "Each part of the address must be a number from 0 to 255.";
  if (r.type === "cidr") {
    const p = Number(r.prefix);
    if (!/^\d{1,2}$/.test(r.prefix) || p < 16 || p > 32) return "The range size must be from 16 to 32, for example /28.";
  }
  return "";
}

const hostString = (r: Draft) =>
  `${r.octets.map((o) => String(Number(o))).join(".")}${r.type === "cidr" ? `/${Number(r.prefix)}` : ""}`;

/** Four boxes for an IPv4 address (a.b.c.d), plus a /size box for a range. Typing a dot or 3 digits jumps to the next box. */
function HostInput({
  row,
  invalid,
  onChange,
}: {
  row: Draft;
  invalid: boolean;
  onChange: (patch: Partial<Draft>) => void;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const focus = (i: number) => {
    const el = refs.current[i];
    if (el) {
      el.focus();
      el.select();
    }
  };
  const last = row.type === "cidr" ? 4 : 3;

  // Handles one digit at a time, but also a whole address arriving in one go (autofill, pasting, fast typing):
  // "203.0.113.55" typed into the first box fills all four, "203.0.113.0/28" also fills the range size.
  function setOctet(i: number, raw: string) {
    const parts = raw.split(/[./\s]+/);
    // A separator typed into an empty box does nothing. (After 3 digits the cursor has already moved on, so the
    // dot people type out of habit must not skip a box.)
    if (parts.length > 1 && raw.replace(/[./\s]/g, "") === "") return;
    if (parts.length === 1) {
      const digits = raw.replace(/\D/g, "").slice(0, 3);
      onChange({ octets: row.octets.map((o, idx) => (idx === i ? digits : o)) });
      if (digits.length === 3 && i < last) focus(i + 1);
      return;
    }
    const octets = [...row.octets];
    let prefix = row.prefix;
    let type = row.type;
    parts.forEach((part, k) => {
      const idx = i + k;
      const trailingEmpty = part === "" && k === parts.length - 1 && k > 0; // a separator just typed: move on, keep what is there
      const digits = part.replace(/\D/g, "");
      if (idx <= 3) {
        if (!trailingEmpty) octets[idx] = digits.slice(0, 3);
      } else if (idx === 4 && digits !== "") {
        prefix = digits.slice(0, 2);
        type = "cidr";
      }
    });
    onChange({ octets, prefix, type });
    focus(Math.min(i + parts.length - 1, type === "cidr" ? 4 : 3));
  }

  function onKeyDown(i: number, e: KeyboardEvent<HTMLInputElement>) {
    const el = e.currentTarget;
    if (e.key === "Backspace" && el.value === "" && i > 0) {
      e.preventDefault();
      focus(i - 1);
    }
    if (e.key === "ArrowLeft" && el.selectionStart === 0 && i > 0) {
      e.preventDefault();
      focus(i - 1);
    }
    if (e.key === "ArrowRight" && el.selectionEnd === el.value.length && i < last) {
      e.preventDefault();
      focus(i + 1);
    }
  }

  // Pasting "203.0.113.10" (or "203.0.113.0/28") fills every box at once.
  function onPaste(e: ClipboardEvent<HTMLInputElement>) {
    const m = /^\s*(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(?:\/(\d{1,2}))?\s*$/.exec(e.clipboardData.getData("text"));
    if (!m) return;
    e.preventDefault();
    onChange({
      octets: [m[1], m[2], m[3], m[4]],
      type: m[5] ? "cidr" : row.type,
      prefix: m[5] ?? row.prefix,
    });
  }

  const box =
    "w-12 bg-transparent px-1 py-2.5 text-center text-sm tabular-nums text-slate-900 outline-none placeholder:text-slate-300";

  return (
    <div
      className={`flex items-center justify-center gap-0.5 rounded-xl border bg-white px-2 transition focus-within:ring-4 ${
        invalid
          ? "border-rose-300 focus-within:border-rose-400 focus-within:ring-rose-100"
          : "border-slate-200 focus-within:border-emerald-400 focus-within:ring-emerald-100"
      }`}
    >
      {row.octets.map((o, i) => (
        <span key={i} className="flex items-center">
          <input
            ref={(el) => {
              refs.current[i] = el;
            }}
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            aria-label={`Address part ${i + 1}`}
            placeholder="0"
            className={box}
            value={o}
            onChange={(e) => setOctet(i, e.target.value)}
            onKeyDown={(e) => onKeyDown(i, e)}
            onPaste={onPaste}
          />
          {i < 3 ? <span className="select-none text-slate-400">.</span> : null}
        </span>
      ))}
      {row.type === "cidr" ? (
        <span className="flex items-center">
          <span className="select-none px-1 text-slate-400">/</span>
          <input
            ref={(el) => {
              refs.current[4] = el;
            }}
            inputMode="numeric"
            autoComplete="off"
            maxLength={2}
            aria-label="Range size"
            placeholder="28"
            className="w-10 bg-transparent px-1 py-2.5 text-center text-sm tabular-nums text-slate-900 outline-none placeholder:text-slate-300"
            value={row.prefix}
            onChange={(e) => onChange({ prefix: e.target.value.replace(/\D/g, "").slice(0, 2) })}
            onKeyDown={(e) => onKeyDown(4, e)}
          />
        </span>
      ) : null}
    </div>
  );
}

export function HostsEditor({
  callCenterId,
  ips,
  onChanged,
}: {
  callCenterId: number;
  ips: AllowedIpRow[];
  onChanged: () => Promise<void>;
}) {
  const nextKey = useRef(2);
  const [rows, setRows] = useState<Draft[]>([emptyRow(1)]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const patch = (key: number, p: Partial<Draft>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p, error: "" } : r)));

  const filled = rows.filter((r) => !isEmpty(r));
  const anyProblem = filled.some((r) => rowProblem(r) !== "");
  const canSubmit = filled.length > 0 && !anyProblem && !saving;

  function addRow() {
    setRows((rs) => [...rs, emptyRow(nextKey.current++)]);
  }

  function reset() {
    setRows([emptyRow(nextKey.current++)]);
    setMsg(null);
  }

  function removeRow(key: number) {
    setRows((rs) => {
      const left = rs.filter((r) => r.key !== key);
      return left.length ? left : [emptyRow(nextKey.current++)];
    });
  }

  async function submit() {
    setSaving(true);
    setMsg(null);
    let added = 0;
    const failed = new Map<number, string>();
    const seen = new Set(ips.map((i) => i.ip.toLowerCase()));
    for (const r of filled) {
      const host = hostString(r);
      if (seen.has(host.toLowerCase())) {
        failed.set(r.key, "Already in the list.");
        continue;
      }
      try {
        const res = await fetch(`/api/admin/call-centers/${callCenterId}/ips`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ip: host }),
        });
        if (res.ok) {
          added++;
          seen.add(host.toLowerCase());
        } else {
          const j = await res.json().catch(() => ({}));
          failed.set(r.key, (j as { error?: string }).error ?? "Could not add this host.");
        }
      } catch {
        failed.set(r.key, "Could not reach the server.");
      }
    }
    // keep only the rows that failed, with their reason; start fresh if everything went through
    setRows((rs) => {
      const kept = rs.filter((r) => failed.has(r.key)).map((r) => ({ ...r, error: failed.get(r.key)! }));
      return kept.length ? kept : [emptyRow(nextKey.current++)];
    });
    setMsg(
      failed.size === 0
        ? { ok: true, text: `Added ${added} host${added === 1 ? "" : "s"}.` }
        : { ok: false, text: `${added ? `Added ${added}. ` : ""}${failed.size} could not be added, see below.` }
    );
    await onChanged();
    setSaving(false);
  }

  async function toggle(id: number, status: string) {
    await fetch(`/api/admin/call-centers/${callCenterId}/ips`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ipId: id, status: status === "active" ? "inactive" : "active" }),
    });
    await onChanged();
  }

  async function remove(id: number) {
    await fetch(`/api/admin/call-centers/${callCenterId}/ips?ipId=${id}`, { method: "DELETE" });
    await onChanged();
  }

  const th = "px-4 py-3 text-center text-sm font-semibold text-slate-600";
  const typeLabel = (ip: string) => (ip.includes("/") ? "IP Range (CIDR)" : "IP Address");

  return (
    <div className="mt-4">
      <PrimaryButton onClick={addRow}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="mr-2" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v8M8 12h8" />
        </svg>
        Add Host
      </PrimaryButton>

      {ips.length === 0 ? (
        <p className="mt-3 text-xs text-amber-700">No hosts yet, so this call center cannot use the dialer API. Add one below.</p>
      ) : null}

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[680px] text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className={`${th} w-[30%]`}>Type</th>
              <th className={`${th} w-[36%]`}>Host</th>
              <th className={`${th} w-[14%]`}>Status</th>
              <th className="w-[20%] px-2" />
            </tr>
          </thead>
          <tbody>
            {/* hosts already added */}
            {ips.map((r) => (
              <tr key={`saved-${r.id}`} className="border-t border-slate-200 transition hover:bg-emerald-50/40">
                <td className="px-4 py-3.5 text-center text-slate-700">{typeLabel(r.ip)}</td>
                <td className="px-4 py-3.5 text-center font-mono text-slate-900">{r.ip}</td>
                <td className="px-4 py-3.5 text-center">
                  <StatusPill status={r.status} />
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center justify-end gap-4">
                    <button type="button" className="text-sm font-medium text-slate-600 hover:underline" onClick={() => void toggle(r.id, r.status)}>
                      {r.status === "active" ? "Disable" : "Enable"}
                    </button>
                    <button type="button" className="text-sm font-medium text-rose-600 hover:underline" onClick={() => void remove(r.id)}>
                      Remove
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {/* rows being added: after Submit they move up into the list above */}
            {rows.map((r) => {
              const problem = rowProblem(r);
              return (
                <tr key={`draft-${r.key}`} className="border-t border-slate-200 align-top">
                  <td className="p-2.5">
                    <select
                      className={`${inputClass} text-center`}
                      value={r.type}
                      aria-label="Host type"
                      onChange={(e) => patch(r.key, { type: e.target.value as HostType })}
                    >
                      <option value="ip">IP Address</option>
                      <option value="cidr">IP Range (CIDR)</option>
                    </select>
                  </td>
                  <td className="p-2.5">
                    <HostInput row={r} invalid={problem !== "" || r.error !== ""} onChange={(p) => patch(r.key, p)} />
                    {problem || r.error ? (
                      <p role="alert" className="mt-1.5 text-center text-xs text-rose-600">
                        {r.error || problem}
                      </p>
                    ) : null}
                  </td>
                  <td className="p-2.5" />
                  <td className="p-2.5">
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeRow(r.key)}
                        aria-label="Remove this row"
                        title="Remove this row"
                        className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                      >
                        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                          <path d="M5 5l10 10M15 5L5 15" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
        {msg ? (
          <p role="status" className={`mr-auto text-sm ${msg.ok ? "text-emerald-700" : "text-rose-600"}`}>
            {msg.text}
          </p>
        ) : null}
        <PrimaryButton
          onClick={() => void submit()}
          disabled={!canSubmit}
          className="min-w-32 disabled:!bg-slate-200 disabled:!bg-none disabled:text-slate-500 disabled:shadow-none disabled:opacity-100"
        >
          {saving ? "Submitting…" : "Submit"}
        </PrimaryButton>
        <SecondaryButton onClick={reset} disabled={saving} className="min-w-32">
          Reset
        </SecondaryButton>
      </div>
    </div>
  );
}
