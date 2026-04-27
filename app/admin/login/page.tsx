"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@callcenter.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
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
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-4 [background-image:radial-gradient(rgba(148,163,184,0.28)_1px,transparent_1px)] [background-size:24px_24px]">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md space-y-5 rounded-2xl border border-slate-700/80 bg-slate-900/90 p-8 shadow-2xl ring-1 ring-white/5 backdrop-blur"
      >
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400/90">
            Local presence
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">
            Admin sign in
          </h1>
        </div>
        <p className="text-sm text-slate-400">
          Use the seeded super admin in development. Change the password in production under
          Settings.
        </p>
        <label className="block text-sm text-slate-300">
          <span className="text-slate-400">Email</span>
          <input
            className="mt-1.5 w-full rounded-lg border border-slate-600/80 bg-slate-950/50 px-3 py-2.5 text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
          />
        </label>
        <label className="block text-sm text-slate-300">
          <span className="text-slate-400">Password</span>
          <input
            type="password"
            className="mt-1.5 w-full rounded-lg border border-slate-600/80 bg-slate-950/50 px-3 py-2.5 text-white focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        {error ? (
          <p className="rounded-lg border border-rose-500/30 bg-rose-950/40 px-3 py-2 text-sm text-rose-200" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
        >
          Sign in
        </button>
      </form>
    </div>
  );
}
