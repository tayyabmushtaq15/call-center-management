import { getDashboardPayload } from "@/lib/dashboard-data";
import { DashboardCharts } from "@/components/DashboardCharts";
import { PageHeader, StatTile, cardClass, cardHeaderClass } from "@/components/admin-chrome";

export default async function DashboardPage() {
  const data = await getDashboardPayload();
  const { stats } = data;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Live system overview — capacity, call traffic, and pool health for your local presence program."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile title="Total DIDs" value={stats.totalDids} accent="default" />
        <StatTile title="In pool" value={stats.poolDids} />
        <StatTile title="Assigned" value={stats.assignedDids} accent="sky" />
        <StatTile title="In use now" value={stats.inUseDids} accent="violet" />
        <StatTile title="Active call centers" value={stats.activeCenters} />
        <StatTile title="Active switches" value={stats.activeSwitches} />
        <StatTile title="Calls today" value={stats.callsToday} />
        <StatTile
          title="Answer rate today"
          value={`${(stats.answerRateToday * 100).toFixed(1)}%`}
          accent="violet"
        />
        <StatTile
          title="Talk time today"
          value={`${Math.floor((stats.durationToday ?? 0) / 60)}m`}
          hint="From completed calls today"
        />
      </div>

      {data.poolWarnings.length > 0 ? (
        <div
          className="rounded-2xl border border-rose-500/30 bg-rose-950/40 p-5 shadow-md ring-1 ring-rose-500/20"
          role="status"
        >
          <h2 className="font-semibold text-rose-200">Low pool warnings</h2>
          <ul className="mt-2 list-inside list-disc text-sm text-rose-300/90">
            {data.poolWarnings.map((w) => (
              <li key={w.state}>
                {w.state}: only {w.count} DIDs in pool
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className={`${cardClass} overflow-hidden`}>
        <div className={`${cardHeaderClass}`}>
          <h2 className="text-sm font-semibold text-slate-100">Active calls</h2>
          <p className="mt-0.5 text-xs text-slate-400">DIDs currently reserved for a live call</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-800/60 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3">DID</th>
                <th className="px-4 py-3">Receiver</th>
                <th className="px-4 py-3">Call center</th>
                <th className="px-4 py-3">Switch</th>
                <th className="px-4 py-3">Started</th>
              </tr>
            </thead>
            <tbody>
              {data.activeCalls.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    No active calls
                  </td>
                </tr>
              ) : (
                data.activeCalls.map((c) => (
                  <tr key={c.id} className="border-t border-slate-700/50">
                    <td className="px-4 py-3 font-mono text-slate-200">{c.did.number}</td>
                    <td className="px-4 py-3 font-mono text-slate-200">{c.receiverNumber}</td>
                    <td className="px-4 py-3 text-slate-200">{c.user.name}</td>
                    <td className="px-4 py-3 text-slate-200">{c.switch.name}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {c.startedAt.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DashboardCharts
        hourly={data.charts.hourly}
        byState={data.charts.byStateToday}
        answerTrend={data.charts.answerTrend}
      />

      <div className={`${cardClass} overflow-hidden`}>
        <div className={cardHeaderClass}>
          <h2 className="text-sm font-semibold text-slate-100">Recent activity</h2>
          <p className="mt-0.5 text-xs text-slate-400">Last completed and in-progress events</p>
        </div>
        <ul className="divide-y divide-slate-700/50 text-sm">
          {data.recentLogs.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center gap-2 px-4 py-3">
              <span className="font-mono text-slate-200">{l.did.number}</span>
              <span className="text-slate-500">→</span>
              <span className="font-mono text-slate-300">{l.receiverNumber}</span>
              <span className="rounded-md border border-slate-600/50 bg-slate-900/40 px-2 py-0.5 text-xs font-medium text-slate-300">
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
