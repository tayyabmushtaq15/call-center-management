"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";

type Props = {
  hourly: { hour: number; calls: number }[];
  byState: { state: string; calls: number }[];
  answerTrend: { day: string; rate: number }[];
};

const CHART_H = 256;
const TREND_H = 224;

const card =
  "min-w-0 rounded-2xl border border-slate-600/40 bg-slate-800/50 p-5 shadow-lg shadow-slate-950/40 ring-1 ring-slate-700/30";
const title = "mb-2 text-sm font-semibold text-slate-100";
const gridStroke = "#334155";
const tickStyle = { fill: "#94a3b8", fontSize: 12 };
const tooltipContent = {
  backgroundColor: "rgb(15 23 42 / 0.95)",
  border: "1px solid rgb(51 65 85 / 0.6)",
  borderRadius: "0.75rem",
  color: "#e2e8f0",
};

export function DashboardCharts({ hourly, byState, answerTrend }: Props) {
  return (
    <div className="grid w-full min-w-0 grid-cols-1 gap-6 lg:grid-cols-2">
      <div className={card}>
        <h3 className={title}>Calls per hour (today)</h3>
        <div className="w-full" style={{ height: CHART_H }}>
          <ResponsiveContainer width="100%" height={CHART_H} debounce={32}>
            <BarChart data={hourly}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="hour" tick={tickStyle} />
              <YAxis allowDecimals={false} tick={tickStyle} />
              <Tooltip contentStyle={tooltipContent} />
              <Bar dataKey="calls" fill="#10b981" name="Calls" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className={card}>
        <h3 className={title}>Calls per state (today)</h3>
        <div className="w-full" style={{ height: CHART_H }}>
          <ResponsiveContainer width="100%" height={CHART_H} debounce={32}>
            <BarChart data={byState.slice(0, 12)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis type="number" allowDecimals={false} tick={tickStyle} />
              <YAxis dataKey="state" type="category" width={32} tick={tickStyle} />
              <Tooltip contentStyle={tooltipContent} />
              <Bar dataKey="calls" fill="#38bdf8" name="Calls" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className={`${card} lg:col-span-2`}>
        <h3 className={title}>Answer rate trend (last 7 days)</h3>
        <div className="w-full" style={{ height: TREND_H }}>
          <ResponsiveContainer width="100%" height={TREND_H} debounce={32}>
            <LineChart data={answerTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="day" tick={tickStyle} />
              <YAxis
                domain={[0, 1]}
                tick={tickStyle}
                tickFormatter={(v) => `${Math.round(v * 100)}%`}
              />
              <Tooltip
                contentStyle={tooltipContent}
                formatter={(v) => `${(Number(v ?? 0) * 100).toFixed(1)}%`}
              />
              <Line
                type="monotone"
                dataKey="rate"
                stroke="#a78bfa"
                strokeWidth={2}
                dot={{ fill: "#a78bfa" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
