"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/Modal";
import { PageHeader, PrimaryButton, SecondaryButton, StatusPill, cardClass } from "@/components/admin-chrome";

type Row = {
  id: number;
  callCenter: string;
  userId: number;
  masked: string;
  status: string;
  callsToday: number;
};

type Ask =
  | { kind: "regenerate"; row: Row }
  | { kind: "delete"; row: Row }
  | { kind: "cleanup"; count: number }
  | null;

const dangerBtn =
  "inline-flex items-center justify-center rounded-xl bg-gradient-to-b from-rose-500 to-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-rose-600/30 transition hover:from-rose-500 hover:to-rose-500 active:scale-[0.98] focus:outline-none focus-visible:ring-4 focus-visible:ring-rose-200 disabled:cursor-not-allowed disabled:opacity-50";

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<Row[]>([]);
  const [reveal, setReveal] = useState<string | null>(null);
  const [ask, setAsk] = useState<Ask>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/admin/api-keys");
    const j = await res.json();
    setKeys(j.keys ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  const inactiveCount = keys.filter((k) => k.status !== "active").length;

  // Regenerate lives on the key in use. A call center with no active key gets it on its newest key.
  const regenerateRows = useMemo(() => {
    const ids = new Set<number>();
    const byUser = new Map<number, Row[]>();
    for (const k of keys) byUser.set(k.userId, [...(byUser.get(k.userId) ?? []), k]);
    for (const list of byUser.values()) {
      const active = list.filter((k) => k.status === "active");
      if (active.length) active.forEach((k) => ids.add(k.id));
      else ids.add(Math.max(...list.map((k) => k.id)));
    }
    return ids;
  }, [keys]);

  function close() {
    if (busy) return;
    setAsk(null);
    setError("");
  }

  async function confirm() {
    if (!ask) return;
    setBusy(true);
    setError("");
    try {
      if (ask.kind === "regenerate") {
        const res = await fetch("/api/admin/api-keys", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: ask.row.userId, action: "regenerate" }),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error((j as { error?: string }).error ?? "Could not regenerate the key.");
        if (j.apiKey) setReveal(j.apiKey as string);
      } else {
        const qs = ask.kind === "delete" ? `keyId=${ask.row.id}` : "inactive=1";
        const res = await fetch(`/api/admin/api-keys?${qs}`, { method: "DELETE" });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error((j as { error?: string }).error ?? "Could not delete.");
      }
      setAsk(null);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="API keys"
        description="Each call center's dialer uses its key to call the DID API. Old keys that were replaced stay here as inactive; delete them to keep the list tidy."
      >
        {inactiveCount > 0 ? (
          <SecondaryButton onClick={() => setAsk({ kind: "cleanup", count: inactiveCount })}>
            Delete {inactiveCount} inactive key{inactiveCount === 1 ? "" : "s"}
          </SecondaryButton>
        ) : null}
      </PageHeader>

      {reveal ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <strong className="font-semibold">New key. Copy it now, it is not shown in full again.</strong>
          <code className="mt-2 block break-all rounded-lg border border-amber-200 bg-white p-2 font-mono text-xs text-amber-900">
            {reveal}
          </code>
        </div>
      ) : null}

      <div className={`${cardClass} overflow-hidden`}>
        <div className="border-b border-emerald-100 bg-emerald-50/50 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Keys by call center</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-emerald-50/70 text-xs font-semibold uppercase tracking-wider text-emerald-900/70">
              <tr>
                <th className="px-4 py-3">Call center</th>
                <th className="px-4 py-3">Key</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Calls today</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {keys.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                    No keys yet. Create a call center to get one.
                  </td>
                </tr>
              ) : null}
              {keys.map((k) => (
                <tr key={k.id} className="border-t border-emerald-50 transition hover:bg-emerald-50/40">
                  <td className="px-4 py-3 font-medium text-slate-800">{k.callCenter}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">{k.masked}</td>
                  <td className="px-4 py-3">
                    <StatusPill status={k.status} />
                  </td>
                  <td className="px-4 py-3 tabular-nums text-slate-700">{k.callsToday}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-4">
                      {regenerateRows.has(k.id) ? (
                        <button
                          type="button"
                          className="text-sm font-medium text-emerald-700 hover:underline"
                          onClick={() => setAsk({ kind: "regenerate", row: k })}
                        >
                          Regenerate
                        </button>
                      ) : null}
                      {k.status !== "active" ? (
                        <button
                          type="button"
                          className="text-sm font-medium text-rose-600 hover:underline"
                          onClick={() => setAsk({ kind: "delete", row: k })}
                        >
                          Delete
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={ask !== null}
        onClose={close}
        title={
          ask?.kind === "regenerate"
            ? "Regenerate this key?"
            : ask?.kind === "cleanup"
              ? "Delete all inactive keys?"
              : "Delete this key?"
        }
        description={
          ask?.kind === "regenerate"
            ? `${ask.row.callCenter}'s current key stops working immediately and a new one is created. Its dialers must be updated with the new key.`
            : ask?.kind === "cleanup"
              ? `${ask.count} inactive key${ask.count === 1 ? "" : "s"} will be removed for good. Active keys are not touched.`
              : ask?.kind === "delete"
                ? `${ask.row.masked} (${ask.row.callCenter}) is already inactive and no dialer can use it. Deleting removes it for good.`
                : undefined
        }
      >
        {error ? (
          <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <SecondaryButton onClick={close} disabled={busy} autoFocus>
            Cancel
          </SecondaryButton>
          {ask?.kind === "regenerate" ? (
            <PrimaryButton onClick={() => void confirm()} disabled={busy}>
              {busy ? "Working…" : "Regenerate"}
            </PrimaryButton>
          ) : (
            <button type="button" className={dangerBtn} onClick={() => void confirm()} disabled={busy}>
              {busy ? "Deleting…" : "Delete"}
            </button>
          )}
        </div>
      </Modal>
    </div>
  );
}
