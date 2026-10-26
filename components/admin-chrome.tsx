import type { ButtonHTMLAttributes, ReactNode } from "react";

/** Shared look: white surfaces, soft green borders and shadows, rounded corners. */
export const cardClass =
  "rounded-2xl border border-emerald-100 bg-white shadow-sm shadow-emerald-900/5";
export const cardHeaderClass = "border-b border-emerald-100 px-5 py-4 bg-emerald-50/50";
export const tableContainerClass = "overflow-x-auto";
export const theadClass =
  "bg-emerald-50/70 text-left text-xs font-semibold uppercase tracking-wider text-emerald-900/70";
export const thClass = "px-4 py-3";
export const tdClass = "border-t border-emerald-50 px-4 py-3 text-sm text-slate-800";
export const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-100";
export const labelClass = "text-xs font-medium text-slate-600";

type PageHeaderProps = { title: string; description?: string; children?: ReactNode };

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">{description}</p>
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
  icon?: ReactNode;
};

const accentBubble: Record<NonNullable<StatTileProps["accent"]>, string> = {
  default: "bg-emerald-100 text-emerald-600",
  violet: "bg-teal-100 text-teal-600",
  amber: "bg-amber-100 text-amber-600",
  rose: "bg-rose-100 text-rose-600",
  sky: "bg-lime-100 text-lime-700",
};

export function StatTile({ title, value, hint, accent = "default", icon }: StatTileProps) {
  return (
    <div className={`${cardClass} flex items-center gap-4 p-4 transition hover:-translate-y-0.5 hover:shadow-md sm:p-5`}>
      {icon ? (
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${accentBubble[accent]}`}>
          {icon}
        </div>
      ) : null}
      <div className="min-w-0">
        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</div>
        <div className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{value}</div>
        {hint ? <div className="mt-0.5 text-xs text-slate-400">{hint}</div> : null}
      </div>
    </div>
  );
}

/** Small rounded status label: green for active, grey for anything else. */
export function StatusPill({ status }: { status: string }) {
  const on = status === "active";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
        on ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-slate-100 text-slate-500 ring-1 ring-slate-200"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${on ? "bg-emerald-500" : "bg-slate-400"}`} />
      {status}
    </span>
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
      className={`inline-flex items-center justify-center rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-600/30 transition hover:from-emerald-500 hover:to-emerald-500 active:scale-[0.98] focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
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
      className={`inline-flex items-center justify-center rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50 active:scale-[0.98] focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    />
  );
}
