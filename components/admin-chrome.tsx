import type { ButtonHTMLAttributes, ReactNode } from "react";

/** Shared dark-surface look — no white primary */
export const cardClass =
  "rounded-2xl border border-slate-600/40 bg-slate-800/50 shadow-lg shadow-slate-950/40 ring-1 ring-slate-700/30";
export const cardHeaderClass = "border-b border-slate-600/50 px-5 py-4 bg-slate-800/30";
export const tableContainerClass = "overflow-x-auto";
export const theadClass =
  "bg-slate-800/60 text-left text-xs font-semibold uppercase tracking-wider text-slate-400";
export const thClass = "px-4 py-3";
export const tdClass = "border-t border-slate-700/50 px-4 py-3 text-sm text-slate-200";
export const inputClass =
  "w-full rounded-lg border border-slate-600/60 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/20";
export const labelClass = "text-xs font-medium text-slate-400";

type PageHeaderProps = { title: string; description?: string; children?: ReactNode };

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100 sm:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
            {description}
          </p>
        ) : null}
      </div>
      {children ? <div className="shrink-0">{children}</div> : null}
    </div>
  );
}

type CardProps = { children: ReactNode; className?: string; padding?: string };

export function Card({ children, className = "", padding = "p-5" }: CardProps) {
  return <div className={`${cardClass} ${padding} ${className}`}>{children}</div>;
}

type StatTileProps = {
  title: string;
  value: string | number;
  hint?: string;
  accent?: "default" | "violet" | "amber" | "rose" | "sky";
};

const accentRing: Record<NonNullable<StatTileProps["accent"]>, string> = {
  default: "from-emerald-900/30 to-slate-800/20",
  violet: "from-violet-900/30 to-slate-800/20",
  amber: "from-amber-900/25 to-slate-800/20",
  rose: "from-rose-900/30 to-slate-800/20",
  sky: "from-sky-900/30 to-slate-800/20",
};

export function StatTile({ title, value, hint, accent = "default" }: StatTileProps) {
  return (
    <div
      className={`rounded-2xl border border-slate-600/40 bg-gradient-to-br p-4 shadow-md shadow-slate-950/30 sm:p-5 ${accentRing[accent]}`}
    >
      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">{title}</div>
      <div className="mt-2 text-2xl font-semibold tabular-nums text-slate-100">{value}</div>
      {hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}
    </div>
  );
}

export function PrimaryButton({
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-md shadow-emerald-950/40 transition hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/35 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    />
  );
}

export function SecondaryButton({
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center rounded-lg border border-slate-600/70 bg-slate-800/80 px-4 py-2 text-sm font-medium text-slate-200 shadow-sm transition hover:bg-slate-700/90 focus:outline-none focus:ring-2 focus:ring-slate-500/30 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    />
  );
}
