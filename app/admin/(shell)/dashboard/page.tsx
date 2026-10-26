import { getDashboardPayload } from "@/lib/dashboard-data";
import { DashboardCharts } from "@/components/DashboardCharts";
import { PageHeader, StatTile, cardClass, cardHeaderClass } from "@/components/admin-chrome";
import { IconBuilding, IconChart, IconPhone, IconPulse } from "@/components/icons";

export default async function DashboardPage() {
  const data = await getDashboardPayload();
  const { stats } = data;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="DID pool size and the calls served by the dialer API."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile title="Total DIDs" value={stats.totalDids} accent="default" icon={<IconPhone />} />
        <StatTile title="Active DIDs" value={stats.activeDids} accent="violet" icon={<IconPulse />} />
        <StatTile title="Active call centers" value={stats.activeCenters} accent="sky" icon={<IconBuilding />} />
        <StatTile title="Calls today" value={stats.callsToday} accent="default" icon={<IconChart />} />
      </div>

      {data.poolWarnings.length > 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 sm:p-5" role="status">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h2 className="text-sm font-semibold text-amber-900">Running low on DIDs</h2>
            <p className="text-xs text-amber-800/80">
              {data.poolWarnings.length} state{data.poolWarnings.length === 1 ? "" : "s"} below the warning level. Add numbers for these area codes.
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

      <DashboardCharts
        hourly={data.charts.hourly}
        byState={data.charts.byStateToday}
      />

      <div className={`${cardClass} overflow-hidden`}>
        <div className={cardHeaderClass}>
          <h2 className="text-sm font-semibold text-slate-900">Recent activity</h2>
          <p className="mt-0.5 text-xs text-slate-600">Latest DIDs handed to the dialers</p>
        </div>
        <ul className="divide-y divide-slate-200 text-sm">
          {data.recentLogs.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center gap-2 px-4 py-3">
              <span className="font-mono text-slate-800">{l.did.number}</span>
              <span className="text-slate-500">→</span>
              <span className="font-mono text-slate-700">{l.receiverNumber}</span>
              <span className="rounded-md border border-slate-200 bg-emerald-50/60 px-2 py-0.5 text-xs font-medium text-slate-700">
                {l.callStatus}
              </span>
              <span className="text-slate-500">{l.user.name}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
