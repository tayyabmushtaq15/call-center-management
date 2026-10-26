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
};

const CHART_H = 256;
const TREND_H = 224;

const card =
  "min-w-0 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm shadow-emerald-900/5";
const title = "mb-2 text-sm font-semibold text-slate-900";
const gridStroke = "#d7e6dc";
const tickStyle = { fill: "#64748b", fontSize: 12 };
const tooltipContent = {
  backgroundColor: "#ffffff",
  border: "1px solid #bbf7d0",
  borderRadius: "0.75rem",
  color: "#1e293b",
};

export function DashboardCharts({ hourly, byState }: Props) {
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
              <Bar dataKey="calls" fill="#34d399" name="Calls" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
