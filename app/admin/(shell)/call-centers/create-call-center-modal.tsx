"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/Modal";
import { inputClass, labelClass, PrimaryButton, SecondaryButton } from "@/components/admin-chrome";
import { createCallCenterAction } from "./actions";

export function CreateCallCenterModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  function close() {
    if (pending) return;
    setOpen(false);
    setError("");
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setPending(true);
    try {
      const res = await createCallCenterAction(new FormData(e.currentTarget));
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setOpen(false);
      // Straight to the new call center so its dialer IPs can be added next.
      router.push(`/admin/call-centers/${res.id}`);
    } catch {
      setError("Could not create the call center. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <PrimaryButton onClick={() => setOpen(true)}>New call center</PrimaryButton>
      <Modal
        open={open}
        onClose={close}
        title="New call center"
        description="An API key is created automatically. Add its dialer IPs on the next screen."
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block">
            <span className={labelClass}>Company name</span>
            <input name="name" required placeholder="Acme Calling" className={`${inputClass} mt-1.5`} />
          </label>
          <label className="block">
            <span className={labelClass}>Email</span>
            <input name="email" type="email" required placeholder="ops@acme.com" className={`${inputClass} mt-1.5`} />
          </label>
          <label className="block">
            <span className={labelClass}>Password (optional, min 8 characters)</span>
            <input
              name="password"
              type="password"
              minLength={8}
              autoComplete="new-password"
              className={`${inputClass} mt-1.5`}
            />
          </label>
          {error ? (
            <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2 pt-1">
            <SecondaryButton onClick={close} disabled={pending}>
              Cancel
            </SecondaryButton>
            <PrimaryButton type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create"}
            </PrimaryButton>
          </div>
        </form>
      </Modal>
    </>
  );
}
