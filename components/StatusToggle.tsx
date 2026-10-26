"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { SecondaryButton } from "@/components/admin-chrome";

type Props = {
  status: string;
  /** Saves the new status; resolves true when it worked. */
  onToggle: (next: "active" | "inactive") => Promise<boolean>;
  /** When set, switching off first asks for confirmation in a modal showing this text. */
  confirmOff?: string;
};

/** Green on/off switch with an "Active" / "Inactive" label. */
export function StatusToggle({ status, onToggle, confirmOff }: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [asking, setAsking] = useState(false);
  const active = status === "active";

  async function apply(next: "active" | "inactive") {
    setError("");
    setPending(true);
    try {
      if (!(await onToggle(next))) setError("Could not change the status.");
    } catch {
      setError("Could not change the status.");
    } finally {
      setPending(false);
      setAsking(false);
    }
  }

  function click() {
    if (pending) return;
    if (active && confirmOff) setAsking(true);
    else void apply(active ? "inactive" : "active");
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        role="switch"
        aria-checked={active}
        aria-label={active ? "Active. Click to make inactive" : "Inactive. Click to make active"}
        disabled={pending}
        onClick={click}
        className={`group inline-flex items-center gap-2.5 rounded-full border py-1 pl-1 pr-3.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-100 disabled:opacity-60 ${
          active
            ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100"
        }`}
      >
        <span className={`relative h-6 w-11 rounded-full transition ${active ? "bg-emerald-500" : "bg-slate-300"}`}>
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
              active ? "left-[22px]" : "left-0.5"
            }`}
          />
        </span>
        {pending && !asking ? "Saving…" : active ? "Active" : "Inactive"}
      </button>
      {error ? <span className="text-xs text-rose-600">{error}</span> : null}

      <Modal
        open={asking}
        onClose={() => !pending && setAsking(false)}
        title="Make this call center inactive?"
        description={confirmOff}
      >
        <div className="flex justify-end gap-2">
          <SecondaryButton onClick={() => setAsking(false)} disabled={pending} autoFocus>
            Cancel
          </SecondaryButton>
          <button
            type="button"
            disabled={pending}
            onClick={() => void apply("inactive")}
            className="inline-flex items-center justify-center rounded-xl bg-gradient-to-b from-rose-500 to-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-rose-600/30 transition hover:from-rose-500 hover:to-rose-500 active:scale-[0.98] focus:outline-none focus-visible:ring-4 focus-visible:ring-rose-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Saving…" : "Make inactive"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
