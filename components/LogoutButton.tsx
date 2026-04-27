"use client";

export function LogoutButton() {
  return (
    <button
      type="button"
      className="w-full rounded-lg border border-slate-600/80 bg-slate-900/50 px-3 py-2.5 text-left text-sm text-slate-200 transition hover:bg-slate-800/90"
      onClick={async () => {
        await fetch("/api/auth/admin/logout", { method: "POST" });
        window.location.href = "/admin/login";
      }}
    >
      Log out
    </button>
  );
}
