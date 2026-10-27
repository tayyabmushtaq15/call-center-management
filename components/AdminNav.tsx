"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactElement } from "react";
import { LogoutButton } from "@/components/LogoutButton";
import {
  IconBuilding,
  IconChart,
  IconDashboard,
  IconGear,
  IconKey,
  IconList,
  IconMap,
  IconPhone,
} from "@/components/icons";

const links: { href: string; label: string; icon: ReactElement }[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: <IconDashboard /> },
  { href: "/admin/states", label: "States", icon: <IconMap /> },
  { href: "/admin/dids", label: "DIDs", icon: <IconPhone /> },
  { href: "/admin/call-centers", label: "Call centers", icon: <IconBuilding /> },
  { href: "/admin/api-keys", label: "API keys", icon: <IconKey /> },
  { href: "/admin/call-logs", label: "Call logs", icon: <IconList /> },
  { href: "/admin/reports", label: "Reports", icon: <IconChart /> },
  { href: "/admin/settings", label: "Settings", icon: <IconGear /> },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-emerald-100 bg-white">
      <div className="flex items-center gap-3 p-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-md shadow-emerald-600/30">
          <IconPhone width={20} height={20} />
        </div>
        <div className="leading-tight">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-600">SYMBO</div>
          <div className="text-base font-bold tracking-tight text-slate-900">DID Portal</div>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 pb-3 text-sm">
        {links.map((l) => {
          const active =
            l.href === "/admin/dashboard"
              ? pathname === l.href
              : pathname === l.href || pathname.startsWith(`${l.href}/`);
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active ? "page" : undefined}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 transition ${
                active
                  ? "bg-emerald-50 font-semibold text-emerald-700"
                  : "font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span className={active ? "text-emerald-600" : "text-slate-400 transition group-hover:text-emerald-500"}>
                {l.icon}
              </span>
              {l.label}
              {active ? <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-500" /> : null}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-emerald-100 p-3">
        <LogoutButton />
      </div>
    </aside>
  );
}
