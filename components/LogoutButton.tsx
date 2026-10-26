"use client";

import { IconLogout } from "@/components/icons";

export function LogoutButton() {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-600 transition hover:bg-rose-50 hover:text-rose-600"
      onClick={async () => {
        await fetch("/api/auth/admin/logout", { method: "POST" });
        window.location.href = "/admin/login";
      }}
    >
      <IconLogout />
      Log out
    </button>
  );
}
