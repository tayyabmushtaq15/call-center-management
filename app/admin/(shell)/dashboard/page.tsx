import type { ReactNode } from "react";
import { getDashboardPayload } from "@/lib/dashboard-data";
import { DashboardCharts } from "@/components/DashboardCharts";
import { PageHeader, StatTile, cardClass } from "@/components/admin-chrome";
import { withCountryCode } from "@/lib/phone";
import {
  IconBuilding,
  IconChart,
  IconClock,
  IconGrid,
  IconInbox,
  IconPhone,
  IconPulse,
} from "@/components/icons";

const statusPill: Record<string, string> = {
  answered: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  not_answered: "bg-rose-50 text-rose-700 ring-rose-200",
  in_progress: "bg-amber-50 text-amber-800 ring-amber-200",
  unknown: "bg-slate-100 text-slate-600 ring-slate-200",
};
const statusLabel: Record<string, string> = {
  answered: "Answered",
  not_answered: "Not answered",
  in_progress: "In progress",
  unknown: "Ended",
};

/** A dashboard section: coloured icon, title, one line of help, and an optional badge on the right. */
function Section({
  icon,
  tone,
  title,
  description,
  badge,
  children,
}: {
  icon: ReactNode;
  tone: string;
  title: string;
  description: string;
  badge?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={`${cardClass} overflow-hidden`}>
      <div className="flex items-center gap-3 border-b border-emerald-100 px-5 py-4">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}>{icon}</div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          <p className="truncate text-xs text-slate-500">{description}</p>
        </div>
        {badge}
      </div>
      {children}
    </section>
  );
}

function EmptyState({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center text-sm text-slate-400">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">{icon}</div>
      {text}
    </div>
  );
}

export default async function DashboardPage() {
  const data = await getDashboardPayload();
  const { stats } = data;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Your DID pool, the calls on the line right now, and today's traffic from the dialers."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatTile title="Total DIDs" value={stats.totalDids} accent="default" icon={<IconGrid />} />
        <StatTile title="Active DIDs" value={stats.activeDids} accent="sky" icon={<IconPulse />} />
        <StatTile title="On a Call Now" value={stats.inUseDids} accent="amber" icon={<IconPhone />} />
        <StatTile title="Active Call Centers" value={stats.activeCenters} accent="violet" icon={<IconBuilding />} />
        <StatTile title="Calls Today" value={stats.callsToday} accent="rose" icon={<IconChart />} />
      </div>

      {data.poolWarnings.length > 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-white p-4 sm:p-5" role="status">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h2 className="text-sm font-semibold text-amber-900">Running Low on DIDs</h2>
            <p className="text-xs text-amber-800/80">
              {data.poolWarnings.length} state{data.poolWarnings.length === 1 ? "" : "s"} below the warning level. Add
              numbers for these area codes.
            </p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {data.poolWarnings.map((w) => (
              <span
                key={w.state}
                className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-white px-2.5 py-1 text-xs font-medium text-amber-900"
              >
                {w.state}
                <span className="rounded-full bg-amber-100 px-1.5 text-[11px] tabular-nums text-amber-800">{w.count}</span>
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <Section
        icon={<IconPhone width={18} height={18} />}
        tone="bg-amber-100 text-amber-600"
        title="Calls in Progress"
        description="DIDs reserved for a live call. Each is freed when its call ends."
        badge={
          data.activeCalls.length > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
              {data.activeCalls.length} live
            </span>
          ) : null
        }
      >
        {data.activeCalls.length === 0 ? (
          <EmptyState icon={<IconPhone width={22} height={22} />} text="No calls in progress right now" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 text-xs font-semibold text-slate-500">
                <tr>
                  <th className="px-5 py-3">DID</th>
                  <th className="px-5 py-3">Dialed</th>
                  <th className="px-5 py-3">Call Center</th>
                  <th className="px-5 py-3">Since</th>
                </tr>
              </thead>
              <tbody>
                {data.activeCalls.map((c) => (
                  <tr key={c.id} className="border-t border-slate-100 transition hover:bg-amber-50/40">
                    <td className="px-5 py-3 font-mono text-slate-800">{withCountryCode(c.did.number)}</td>
                    <td className="px-5 py-3 font-mono text-slate-800">{c.receiverNumber}</td>
                    <td className="px-5 py-3 text-slate-800">{c.user.name}</td>
                    <td className="px-5 py-3 text-xs text-slate-500">{c.startedAt.toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <DashboardCharts hourly={data.charts.hourly} byState={data.charts.byStateToday} />

      <Section
        icon={<IconClock width={18} height={18} />}
        tone="bg-violet-100 text-violet-600"
        title="Recent Activity"
        description="The latest DIDs handed to the dialers."
      >
        {data.recentLogs.length === 0 ? (
          <EmptyState icon={<IconInbox width={22} height={22} />} text="Nothing yet. Calls will show up here." />
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {data.recentLogs.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 transition hover:bg-violet-50/40">
                <span className="font-mono text-slate-800">{withCountryCode(l.did.number)}</span>
                <span className="text-slate-300">→</span>
                <span className="font-mono text-slate-600">{l.receiverNumber}</span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${statusPill[l.callStatus] ?? statusPill.unknown}`}
                >
                  {statusLabel[l.callStatus] ?? l.callStatus}
                </span>
                <span className="ml-auto text-xs text-slate-500">
                  {l.user.name} · {l.startedAt.toLocaleTimeString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
