"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconPhone } from "@/components/icons";
import { PasswordInput } from "@/components/PasswordInput";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@callcenter.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError((j as { error?: string }).error ?? "Login failed");
        return;
      }
      router.push("/admin/dashboard");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f4f9f5] p-4">
      {/* soft green glows */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-emerald-200/50 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-lime-200/40 blur-3xl" />

      <form
        onSubmit={onSubmit}
        className="relative w-full max-w-md space-y-5 rounded-3xl border border-emerald-100 bg-white p-8 shadow-xl shadow-emerald-900/10"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-md shadow-emerald-600/30">
            <IconPhone width={24} height={24} />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-600">Admin sign in</div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">SYMBO DID Portal</h1>
          </div>
        </div>
        <p className="text-sm text-slate-500">Welcome back. Sign in to manage DIDs and call centers.</p>
        <label className="block text-sm">
          <span className="text-xs font-medium text-slate-600">Email</span>
          <input
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-slate-900 placeholder:text-slate-400 transition focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-100"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
          />
        </label>
        <label className="block text-sm">
          <span className="text-xs font-medium text-slate-600">Password</span>
          <PasswordInput
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-slate-900 transition focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-100"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        {error ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-600 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-600/30 transition hover:from-emerald-500 hover:to-emerald-500 active:scale-[0.99] focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
