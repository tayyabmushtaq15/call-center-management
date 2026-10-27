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
  accent?: "default" | "sky" | "amber" | "violet" | "rose" | "teal";
  icon?: ReactNode;
};

// Full class names so Tailwind can see them. default = the brand green.
// card: tinted gradient background and border. bubble: the icon tile. blob: the soft circle in the corner.
const accents: Record<NonNullable<StatTileProps["accent"]>, { card: string; bubble: string; blob: string; label: string }> = {
  default: {
    card: "border-emerald-200 from-emerald-100 via-emerald-50 to-white hover:shadow-emerald-300/60",
    bubble: "bg-emerald-500 text-white shadow-emerald-500/40",
    blob: "bg-emerald-300/40",
    label: "text-emerald-800/70",
  },
  sky: {
    card: "border-sky-200 from-sky-100 via-sky-50 to-white hover:shadow-sky-300/60",
    bubble: "bg-sky-500 text-white shadow-sky-500/40",
    blob: "bg-sky-300/40",
    label: "text-sky-800/70",
  },
  amber: {
    card: "border-amber-200 from-amber-100 via-amber-50 to-white hover:shadow-amber-300/60",
    bubble: "bg-amber-500 text-white shadow-amber-500/40",
    blob: "bg-amber-300/40",
    label: "text-amber-800/70",
  },
  violet: {
    card: "border-violet-200 from-violet-100 via-violet-50 to-white hover:shadow-violet-300/60",
    bubble: "bg-violet-500 text-white shadow-violet-500/40",
    blob: "bg-violet-300/40",
    label: "text-violet-800/70",
  },
  rose: {
    card: "border-rose-200 from-rose-100 via-rose-50 to-white hover:shadow-rose-300/60",
    bubble: "bg-rose-500 text-white shadow-rose-500/40",
    blob: "bg-rose-300/40",
    label: "text-rose-800/70",
  },
  teal: {
    card: "border-teal-200 from-teal-100 via-teal-50 to-white hover:shadow-teal-300/60",
    bubble: "bg-teal-500 text-white shadow-teal-500/40",
    blob: "bg-teal-300/40",
    label: "text-teal-800/70",
  },
};

export function StatTile({ title, value, hint, accent = "default", icon }: StatTileProps) {
  const a = accents[accent];
  return (
    <div
      className={`relative flex h-full min-h-[104px] items-center gap-4 overflow-hidden rounded-2xl border bg-gradient-to-br p-5 shadow-sm shadow-slate-900/5 transition duration-200 hover:-translate-y-0.5 hover:shadow-lg ${a.card}`}
    >
      <div className={`pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full ${a.blob}`} />
      <div className={`pointer-events-none absolute -bottom-10 right-10 h-20 w-20 rounded-full ${a.blob} opacity-60`} />
      {icon ? (
        <div className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-lg ${a.bubble}`}>
          {icon}
        </div>
      ) : null}
      <div className="relative min-w-0">
        <div className={`text-sm font-semibold leading-snug ${a.label}`} title={title}>
          {title}
        </div>
        <div className="mt-0.5 text-3xl font-bold tabular-nums tracking-tight text-slate-900">
          {typeof value === "number" ? value.toLocaleString("en-US") : value}
        </div>
        {hint ? <div className="mt-0.5 text-xs leading-snug text-slate-500">{hint}</div> : null}
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
