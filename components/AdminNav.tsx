"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/LogoutButton";

const links: { href: string; label: string }[] = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/states", label: "States" },
  { href: "/admin/dids", label: "DIDs" },
  { href: "/admin/call-centers", label: "Call centers" },
  { href: "/admin/switches", label: "Switches" },
  { href: "/admin/api-keys", label: "API keys" },
  { href: "/admin/call-logs", label: "Call logs" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/area-codes", label: "Area code map" },
  { href: "/admin/settings", label: "Settings" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-slate-800/90 bg-slate-950/95 p-0 text-slate-100">
      <div className="border-b border-slate-800/80 p-5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-400/90">
          Local presence
        </div>
        <div className="mt-1 text-lg font-semibold tracking-tight text-white">Control center</div>
      </div>
      <nav className="flex flex-col gap-0.5 p-3 text-sm">
        {links.map((l) => {
          const active =
            l.href === "/admin/dashboard"
              ? pathname === l.href
              : pathname === l.href || pathname.startsWith(`${l.href}/`);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={
                active
                  ? "rounded-lg bg-emerald-500/15 px-3 py-2 font-medium text-emerald-100 ring-1 ring-emerald-500/30"
                  : "rounded-lg px-3 py-2 text-slate-400 transition hover:bg-slate-800/80 hover:text-slate-100"
              }
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-slate-800/80 p-4">
        <LogoutButton />
      </div>
    </aside>
  );
}
