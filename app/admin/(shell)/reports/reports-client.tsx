"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  inputClass,
  labelClass,
  cardClass,
  cardHeaderClass,
} from "@/components/admin-chrome";

const reportTypes = [
  "summary",
  "by_state",
  "by_call_center",
  "by_switch",
  "did_usage",
  "pool_health",
] as const;

type ReportType = (typeof reportTypes)[number];

const typeMeta: Record<
  ReportType,
  { label: string; description: string; filterNote: string }
> = {
  summary: {
    label: "Call summary",
    description: "Totals, answer rate, and talk time for the selected period.",
    filterNote: "Respects date range, call center, and state filters below.",
  },
  by_state: {
    label: "Calls by state",
    description: "Volume and answer rate by US state (destination DID state).",
    filterNote: "Uses date range only. Breakdown is system-wide for this report.",
  },
  by_call_center: {
    label: "Calls by call center",
    description: "Per–call center calls, rate, and talk time.",
    filterNote: "Respects date range, call center, and state filters below.",
  },
  by_switch: {
    label: "Calls by switch",
    description: "Traffic and performance per VoIP switch.",
    filterNote: "Respects date range, call center, and state filters below.",
  },
  did_usage: {
    label: "DID usage",
    description: "Most and least used numbers and never-used count (live snapshot).",
    filterNote: "Snapshot only — not filtered by date or by call center (API behavior).",
  },
  pool_health: {
    label: "Pool health",
    description: "Unassigned vs assigned DIDs by state, with low-pool flags.",
    filterNote: "Live snapshot — compares pool size to your low-pool threshold in settings.",
  },
};

type Summary = {
  totalCalls: number;
  answered: number;
  notAnswered: number;
  answerRate: number;
  talkSeconds: number;
};

type ByRow = { state: string; calls: number; answerRate: number };
type ByCRow = {
  callCenter: string;
  calls: number;
  answerRate: number;
  talkSeconds: number;
};
type BySRow = {
  switch: string;
  calls: number;
  answerRate: number;
  talkSeconds: number;
  callCenters: number;
};

type DidInRow = {
  id: number;
  number: string;
  areaCode: string;
  totalUses: number;
  state: { code: string; name: string };
};

type DidUsage = {
  most: DidInRow[];
  least: DidInRow[];
  neverUsedCount: number;
};

type PoolRow = { state: string; pool: number; assigned: number; low: boolean };
type PoolHealth = { threshold: number; rows: PoolRow[] };

type CallCenterOpt = { id: number; name: string; email: string };
type StateOpt = { id: number; name: string; code: string };

function formatDur(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}m ${s}s`;
}

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

const CHART_H = 280;
const barColors = [
  "#059669",
  "#0d9488",
  "#0891b2",
  "#2563eb",
  "#7c3aed",
  "#c026d3",
  "#db2777",
];

export function ReportsClient() {
  const [type, setType] = useState<ReportType>("summary");
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [userId, setUserId] = useState("");
  const [stateCode, setStateCode] = useState("");

  const [callCenters, setCallCenters] = useState<CallCenterOpt[]>([]);
  const [states, setStates] = useState<StateOpt[]>([]);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [payload, setPayload] = useState<unknown>(null);
  const typeRef = useRef(type);
  typeRef.current = type;

  useEffect(() => {
    void (async () => {
      const [cc, st] = await Promise.all([
        fetch("/api/admin/call-centers").then((r) => r.json()),
        fetch("/api/admin/states").then((r) => r.json()),
      ]);
      setCallCenters((cc as { callCenters?: CallCenterOpt[] }).callCenters ?? []);
      setStates((st as { states?: StateOpt[] }).states ?? []);
    })();
  }, []);

  // Previous fetch results are for a specific report `type` — do not mix with a new type.
  useEffect(() => {
    setPayload(null);
    setErr(null);
  }, [type]);

  const run = useCallback(async () => {
    const runForType = type;
    setErr(null);
    setLoading(true);
    try {
      const fromD = new Date(from + "T00:00:00");
      const toD = new Date(to + "T23:59:59.999");
      if (toD < fromD) {
        setErr("End date must be on or after start date.");
        setLoading(false);
        return;
      }
      const params = new URLSearchParams({
        type: runForType,
        from: fromD.toISOString(),
        to: toD.toISOString(),
      });
      if (userId) params.set("userId", userId);
      if (stateCode) params.set("state", stateCode);

      const res = await fetch(`/api/admin/reports?${params}`);
      const j = (await res.json()) as { error?: string } | unknown;
      if (typeRef.current !== runForType) {
        return;
      }
      if (!res.ok) {
        setErr((j as { error?: string }).error ?? "Request failed");
        setPayload(null);
        return;
      }
      setPayload(j);
    } catch {
      if (typeRef.current === runForType) {
        setErr("Network error");
        setPayload(null);
      }
    } finally {
      setLoading(false);
    }
  }, [from, to, type, userId, stateCode]);

  return (
    <div className="min-w-0 max-w-6xl space-y-8">
      <PageHeader
        title="Reports"
        description="Run analytics for call volume, geography, call centers, switches, DID usage, and pool health. Exports for CSV are available on Call logs and from your workflow as needed."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {reportTypes.map((t) => {
          const active = type === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`rounded-2xl border p-4 text-left transition ${
                active
                  ? "border-emerald-500/40 bg-gradient-to-br from-emerald-900/30 to-slate-800/40 shadow-md ring-2 ring-emerald-500/20"
                  : "border-slate-600/40 bg-slate-800/30 hover:border-slate-500/50"
              }`}
            >
              <div className="text-sm font-semibold text-slate-100">{typeMeta[t].label}</div>
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-400">
                {typeMeta[t].description}
              </p>
            </button>
          );
        })}
      </div>

      <Card>
        <div className="text-sm text-slate-400">{typeMeta[type].filterNote}</div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className={labelClass}>From</div>
            <input
              className={`${inputClass} mt-1.5`}
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div>
            <div className={labelClass}>To</div>
            <input
              className={`${inputClass} mt-1.5`}
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <div>
            <div className={labelClass}>Call center</div>
            <select
              className={`${inputClass} mt-1.5`}
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            >
              <option value="">All</option>
              {callCenters.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className={labelClass}>Receiver state</div>
            <select
              className={`${inputClass} mt-1.5`}
              value={stateCode}
              onChange={(e) => setStateCode(e.target.value)}
            >
              <option value="">All</option>
              {states.map((s) => (
                <option key={s.id} value={s.code}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <PrimaryButton
            onClick={() => void run()}
            disabled={loading}
            className="min-w-[120px]"
          >
            {loading ? "Running…" : "Run report"}
          </PrimaryButton>
          <SecondaryButton onClick={() => setPayload(null)}>Clear</SecondaryButton>
        </div>
        {err ? (
          <p className="mt-3 text-sm text-rose-400" role="alert">
            {err}
          </p>
        ) : null}
      </Card>

      {!loading && !payload && !err ? (
        <Card>
          <p className="text-sm text-slate-400">
            Select a report type, adjust filters, then click <strong className="text-slate-200">Run report</strong>.
          </p>
        </Card>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-600 border-t-emerald-500" />
        </div>
      ) : null}

      {payload && !loading ? <ReportBody type={type} data={payload} /> : null}
    </div>
  );
}

function ReportBody({ type, data }: { type: ReportType; data: unknown }) {
  if (isErrorData(data)) {
    return (
      <Card>
        <p className="text-sm text-rose-400">{(data as { error: string }).error}</p>
      </Card>
    );
  }
  switch (type) {
    case "summary":
      return <SummaryView data={data as Summary} />;
    case "by_state":
      return <ByStateView data={data as { rows: ByRow[] } } />;
    case "by_call_center":
      return <ByCallCenterView data={data as { rows: ByCRow[] } } />;
    case "by_switch":
      return <BySwitchView data={data as { rows: BySRow[] } } />;
    case "did_usage":
      return <DidUsageView data={data as DidUsage} />;
    case "pool_health":
      return <PoolHealthView data={data as PoolHealth} />;
    default:
      return null;
  }
}

function isErrorData(d: unknown) {
  return d !== null && typeof d === "object" && "error" in d;
}

function SummaryView({ data }: { data: Summary }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatPill label="Total calls" value={data.totalCalls} />
        <StatPill label="Answered" value={data.answered} accent="emerald" />
        <StatPill label="Not answered" value={data.notAnswered} accent="slate" />
        <StatPill label="Answer rate" value={pct(data.answerRate)} accent="violet" />
        <div className="sm:col-span-2">
          <StatPill
            label="Total talk time"
            value={formatDur(data.talkSeconds)}
            accent="sky"
          />
        </div>
      </div>
    </div>
  );
}

function StatPill({
  label,
  value,
  accent = "slate",
}: {
  label: string;
  value: string | number;
  accent?: "slate" | "emerald" | "violet" | "sky" | "amber";
}) {
  const b =
    accent === "emerald"
      ? "border-emerald-500/25 bg-gradient-to-br from-emerald-900/35 to-slate-900/40"
      : accent === "violet"
        ? "border-violet-500/25 bg-gradient-to-br from-violet-900/35 to-slate-900/40"
        : accent === "sky"
          ? "border-sky-500/25 bg-gradient-to-br from-sky-900/35 to-slate-900/40"
        : accent === "amber"
          ? "border-amber-500/25 bg-gradient-to-br from-amber-900/30 to-slate-900/40"
          : "border-slate-500/30 bg-gradient-to-br from-slate-800/60 to-slate-900/50";
  return (
    <div className={`rounded-2xl border p-5 ${b} shadow-md shadow-slate-950/30`}>
      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-2 text-2xl font-semibold tabular-nums text-slate-100">{value}</div>
    </div>
  );
}

function ByStateView({ data }: { data: { rows?: ByRow[] } }) {
  const rows = data.rows ?? [];
  const chart = rows.slice(0, 14);
  return (
    <div className="space-y-6">
      {chart.length > 0 ? (
        <div className={`${cardClass} p-5`}>
          <h3 className="text-sm font-semibold text-slate-100">Top states by volume</h3>
          <div className="mt-4" style={{ height: CHART_H }}>
            <ResponsiveContainer width="100%" height={CHART_H} debounce={32}>
              <BarChart data={chart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="state" tick={{ fontSize: 12, fill: "#94a3b8" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#94a3b8" }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid rgb(51 65 85 / 0.6)",
                    background: "rgb(15 23 42 / 0.95)",
                    color: "#e2e8f0",
                  }}
                  cursor={{ fill: "rgba(16, 185, 129, 0.08)" }}
                />
                <Bar dataKey="calls" name="Calls" radius={[4, 4, 0, 0]}>
                  {chart.map((_, i) => (
                    <Cell key={i} fill={barColors[i % barColors.length]!} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}
      <DataTable
        title="By state"
        empty="No call data in this range."
        columns={[
          { key: "state", header: "State", cell: (r) => (r as ByRow).state },
          { key: "calls", header: "Calls", cell: (r) => (r as ByRow).calls },
          {
            key: "answerRate",
            header: "Answer rate",
            cell: (r) => pct((r as ByRow).answerRate),
          },
        ]}
        rows={rows}
        rowKey={(r) => (r as ByRow).state}
      />
    </div>
  );
}

function ByCallCenterView({ data }: { data: { rows?: ByCRow[] } }) {
  const rows = data.rows ?? [];
  const chart = rows
    .slice(0, 10)
    .map((r) => {
      const name = (r?.callCenter ?? "") || "?";
      return { name: name.length > 18 ? name.slice(0, 18) : name, full: name, calls: r?.calls ?? 0 };
    });
  return (
    <div className="space-y-6">
      {chart.length > 0 ? (
        <div className={`${cardClass} p-5`}>
          <h3 className="text-sm font-semibold text-slate-100">Calls by call center</h3>
          <div className="mt-4" style={{ height: CHART_H }}>
            <ResponsiveContainer width="100%" height={CHART_H} debounce={32}>
              <BarChart
                data={chart}
                layout="vertical"
                margin={{ top: 8, right: 12, left: 8, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fill: "#94a3b8" }} />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={100}
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid rgb(51 65 85 / 0.6)",
                    background: "rgb(15 23 42 / 0.95)",
                    color: "#e2e8f0",
                  }}
                />
                <Bar dataKey="calls" fill="#059669" name="Calls" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}
      <DataTable
        title="Call centers"
        empty="No call data in this range."
        columns={[
          { key: "callCenter", header: "Call center", cell: (r) => (r as ByCRow).callCenter },
          { key: "calls", header: "Calls", cell: (r) => (r as ByCRow).calls },
          {
            key: "answerRate",
            header: "Answer rate",
            cell: (r) => pct((r as ByCRow).answerRate),
          },
          {
            key: "talk",
            header: "Talk time",
            cell: (r) => formatDur((r as ByCRow).talkSeconds),
          },
        ]}
        rows={rows}
        rowKey={(r, i) => `${(r as ByCRow).callCenter}-${i}`}
      />
    </div>
  );
}

function BySwitchView({ data }: { data: { rows?: BySRow[] } }) {
  const rows = data.rows ?? [];
  const chart = rows
    .slice(0, 10)
    .map((r) => {
      const name = (r?.switch ?? "") || "?";
      return { name: name.length > 18 ? name.slice(0, 18) : name, full: name, calls: r?.calls ?? 0 };
    });
  return (
    <div className="space-y-6">
      {chart.length > 0 ? (
        <div className={`${cardClass} p-5`}>
          <h3 className="text-sm font-semibold text-slate-100">Calls by switch</h3>
          <div className="mt-4" style={{ height: CHART_H }}>
            <ResponsiveContainer width="100%" height={CHART_H} debounce={32}>
              <BarChart
                data={chart}
                layout="vertical"
                margin={{ top: 8, right: 12, left: 8, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fill: "#94a3b8" }} />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={100}
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid rgb(51 65 85 / 0.6)",
                    background: "rgb(15 23 42 / 0.95)",
                    color: "#e2e8f0",
                  }}
                />
                <Bar dataKey="calls" fill="#2563eb" name="Calls" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}
      <DataTable
        title="Switches"
        empty="No call data in this range."
        columns={[
          { key: "switch", header: "Switch", cell: (r) => (r as BySRow).switch },
          { key: "calls", header: "Calls", cell: (r) => (r as BySRow).calls },
          {
            key: "answerRate",
            header: "Answer rate",
            cell: (r) => pct((r as BySRow).answerRate),
          },
          {
            key: "talk",
            header: "Talk time",
            cell: (r) => formatDur((r as BySRow).talkSeconds),
          },
          {
            key: "cc",
            header: "Call centers",
            cell: (r) => (r as BySRow).callCenters,
          },
        ]}
        rows={rows}
        rowKey={(r, i) => `${(r as BySRow).switch}-${i}`}
      />
    </div>
  );
}

function DidUsageView({ data }: { data: Partial<DidUsage> }) {
  const most = data.most ?? [];
  const least = data.least ?? [];
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatPill
          label="DIDs with zero use"
          value={data.neverUsedCount ?? 0}
          accent="amber"
        />
        <div className="sm:col-span-2 flex items-center rounded-2xl border border-amber-500/20 bg-amber-950/30 px-5 py-3 text-sm text-amber-100/90">
          <span>
            <strong>Tip:</strong> Compare “most” vs “least” to balance load. Never-used numbers may be
            new or in quiet regions.
          </span>
        </div>
      </div>
      <DataTable
        title="Most used (top 20)"
        empty="No DIDs."
        columns={[
          { key: "number", header: "Number", cell: (r) => (r as DidInRow).number },
          { key: "state", header: "State", cell: (r) => (r as DidInRow).state?.code },
          { key: "uses", header: "Total uses", cell: (r) => (r as DidInRow).totalUses },
        ]}
        rows={most}
        rowKey={(r) => String((r as DidInRow).id)}
      />
      <DataTable
        title="Least used (20)"
        empty="No DIDs."
        columns={[
          { key: "number", header: "Number", cell: (r) => (r as DidInRow).number },
          { key: "state", header: "State", cell: (r) => (r as DidInRow).state?.code },
          { key: "uses", header: "Total uses", cell: (r) => (r as DidInRow).totalUses },
        ]}
        rows={least}
        rowKey={(r) => `l-${(r as DidInRow).id}`}
      />
    </div>
  );
}

function PoolHealthView({ data }: { data: { threshold?: number; rows?: PoolRow[] } }) {
  const rows = data.rows ?? [];
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-600/40 bg-slate-800/40 px-5 py-4 text-sm text-slate-300">
        <strong>Low-pool threshold:</strong> {data.threshold ?? "—"} unassigned DIDs. States below
        that show a warning.
      </div>
      <DataTable
        title="Pool vs assigned (all states)"
        empty="No data."
        columns={[
          { key: "state", header: "State", cell: (r) => (r as PoolRow).state },
          { key: "pool", header: "In pool", cell: (r) => (r as PoolRow).pool },
          { key: "asg", header: "Assigned", cell: (r) => (r as PoolRow).assigned },
          {
            key: "low",
            header: "Status",
            cell: (r) =>
              (r as PoolRow).low ? (
                <span className="inline-flex items-center rounded-full border border-rose-500/25 bg-rose-950/50 px-2.5 py-0.5 text-xs font-medium text-rose-200">
                  Low pool
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full border border-emerald-500/25 bg-emerald-950/40 px-2.5 py-0.5 text-xs font-medium text-emerald-200">
                  OK
                </span>
              ),
          },
        ]}
        rows={rows}
        rowKey={(r) => (r as PoolRow).state}
        highlightRow={(r) => (r as PoolRow).low}
      />
    </div>
  );
}

type Col<T> = {
  key: string;
  header: string;
  cell: (r: T) => ReactNode;
};

function DataTable<T>({
  title,
  columns,
  rows,
  rowKey,
  empty,
  highlightRow,
}: {
  title: string;
  columns: Col<T>[];
  rows: T[];
  rowKey: (r: T, i: number) => string;
  empty: string;
  highlightRow?: (r: T) => boolean;
}) {
  return (
    <div className={`overflow-hidden ${cardClass}`}>
      <div className={`${cardHeaderClass} px-5 py-3`}>
        <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
      </div>
      {rows.length === 0 ? (
        <p className="p-6 text-sm text-slate-500">{empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-800/60 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                {columns.map((c) => (
                  <th key={c.key} className="px-4 py-3">
                    {c.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const hi = highlightRow?.(r);
                return (
                  <tr
                    key={rowKey(r, i)}
                    className={
                      hi
                        ? "border-t border-rose-500/20 bg-rose-950/25"
                        : "border-t border-slate-700/50"
                    }
                  >
                    {columns.map((c) => (
                      <td key={c.key} className="px-4 py-3 text-slate-200">
                        {c.cell(r) as ReactNode}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
