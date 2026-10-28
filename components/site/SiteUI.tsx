import Link from "next/link";
import type { ReactNode } from "react";
import { CONTACT_EMAIL, NAV, type Titled } from "./content";
import { Logo } from "./SiteHeader";

export function ButtonLink({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "light" | "ghostLight";
}) {
  const styles = {
    primary: "bg-emerald-600 text-white shadow-sm shadow-emerald-600/30 hover:bg-emerald-700",
    secondary: "border border-slate-200 bg-white text-slate-800 hover:border-emerald-300 hover:bg-emerald-50",
    light: "bg-white text-emerald-800 hover:bg-emerald-50",
    ghostLight: "border border-white/60 text-white hover:bg-white/10",
  }[variant];
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold transition ${styles}`}
    >
      {children}
    </Link>
  );
}

export function Eyebrow({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return (
    <p
      className={`text-xs font-semibold uppercase tracking-[0.18em] ${light ? "text-emerald-200" : "text-emerald-600"}`}
    >
      {children}
    </p>
  );
}

/** Opening banner. `big` is used on the home page; inner pages use the compact one. */
export function PageHero({
  eyebrow,
  title,
  intro,
  actions,
  big = false,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  actions?: ReactNode;
  big?: boolean;
  children?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden border-b border-emerald-100 bg-gradient-to-b from-emerald-50 via-white to-white">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-emerald-200/40 blur-3xl"
      />
      <div
        className={`relative mx-auto max-w-6xl px-4 sm:px-6 ${big ? "py-14 md:py-20" : "py-12 md:py-16"} ${
          children ? "grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]" : ""
        }`}
      >
        <div>
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1
            className={`mt-3 max-w-3xl font-bold tracking-tight text-slate-900 ${
              big ? "text-4xl sm:text-5xl lg:text-6xl" : "text-3xl sm:text-4xl lg:text-5xl"
            }`}
          >
            {title}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">{intro}</p>
          {actions && <div className="mt-8 flex flex-col gap-3 sm:flex-row">{actions}</div>}
        </div>
        {children}
      </div>
    </section>
  );
}

export function Section({
  id,
  eyebrow,
  title,
  intro,
  tint = false,
  children,
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  intro?: string;
  tint?: boolean;
  children: ReactNode;
}) {
  return (
    <section id={id} className={`scroll-mt-20 py-14 md:py-20 ${tint ? "bg-emerald-50/50" : "bg-white"}`}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h2 className="mt-2 max-w-3xl text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h2>
        {intro && <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600">{intro}</p>}
        <div className="mt-8 md:mt-10">{children}</div>
      </div>
    </section>
  );
}

export function CardGrid({ items, cols = 3 }: { items: Titled[]; cols?: 2 | 3 | 4 }) {
  const grid = { 2: "md:grid-cols-2", 3: "md:grid-cols-3", 4: "md:grid-cols-2 lg:grid-cols-4" }[cols];
  return (
    <div className={`grid gap-5 sm:grid-cols-2 ${grid}`}>
      {items.map((item) => (
        <div
          key={item.title}
          className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm shadow-emerald-900/5"
        >
          <div className="mb-4 h-1 w-10 rounded-full bg-gradient-to-r from-emerald-400 to-teal-400" />
          <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.description}</p>
        </div>
      ))}
    </div>
  );
}

export function StatStrip({ items }: { items: readonly { value: string; label: string }[] }) {
  return (
    <div className="bg-slate-900 py-9 text-white">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 sm:px-6 md:grid-cols-4">
        {items.map((item) => (
          <div key={item.value}>
            <p className="text-xl font-bold text-emerald-300 sm:text-2xl">{item.value}</p>
            <p className="mt-1 text-sm text-slate-300">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CheckList({ items }: { items: readonly string[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2.5 text-sm leading-relaxed text-slate-700">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mt-0.5 shrink-0 text-emerald-600"
            aria-hidden
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function NumberedSteps({ steps }: { steps: (Titled & { detail?: string[] })[] }) {
  return (
    <ol>
      {steps.map((step, i) => (
        <li
          key={step.title}
          className={`grid gap-4 py-7 md:grid-cols-[3.5rem_1fr_1fr] md:gap-6 ${i > 0 ? "border-t border-emerald-100" : ""}`}
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-base font-bold text-white shadow-md shadow-emerald-600/25">
            {i + 1}
          </span>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{step.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{step.description}</p>
          </div>
          {step.detail && (
            <div className="md:pt-1">
              <CheckList items={step.detail} />
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}

export function Faq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <details
          key={item.q}
          className="group rounded-2xl border border-emerald-100 bg-white px-5 py-4 shadow-sm shadow-emerald-900/5 open:bg-emerald-50/40"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-slate-900 sm:text-base">
            {item.q}
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="shrink-0 text-emerald-600 transition group-open:rotate-180"
              aria-hidden
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </summary>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.a}</p>
        </details>
      ))}
    </div>
  );
}

export function CodeBlock({ title, code }: { title: string; code: string }) {
  return (
    <figure className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-lg shadow-slate-900/10">
      <figcaption className="border-b border-slate-700 px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-slate-400">
        {title}
      </figcaption>
      <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed text-emerald-100">
        <code className="font-mono">{code}</code>
      </pre>
    </figure>
  );
}

/** Closing call-to-action band, repeated at the foot of every page. */
export function CtaBand({
  title = "Ready to dial with local numbers?",
  text = "Get your call center set up and start showing a local number to the people you call.",
}: {
  title?: string;
  text?: string;
}) {
  return (
    <section className="bg-gradient-to-br from-emerald-600 via-emerald-600 to-teal-600 py-14 text-white md:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="max-w-2xl text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
        <p className="mt-3 max-w-xl text-emerald-50">{text}</p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/get-started" variant="light">
            Get started
          </ButtonLink>
          <ButtonLink href="/how-it-works" variant="ghostLight">
            See how it works
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-emerald-100 bg-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.3fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-500">
            Local numbers on every outbound call, handled for you.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">Explore</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="hover:text-emerald-700">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">Portal</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li>
              <Link href="/get-started" className="hover:text-emerald-700">
                Get started
              </Link>
            </li>
            <li>
              <Link href="/admin/login" className="hover:text-emerald-700">
                Admin sign in
              </Link>
            </li>
            {CONTACT_EMAIL && (
              <li>
                <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-emerald-700">
                  {CONTACT_EMAIL}
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>
      <div className="border-t border-emerald-50 py-5 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} SYMBO. All rights reserved.
      </div>
    </footer>
  );
}

/** Pure-CSS picture of one call: dialed number in, matching caller ID out. */
export function CallFlowCard() {
  return (
    <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-xl shadow-emerald-900/10">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">What your customer sees</p>
      <div className="mt-5 space-y-3">
        <FlowRow label="Your agent calls" value="(937) 555-0142" tone="slate" />
        <Arrow />
        <FlowRow label="Without SYMBO" value="Unknown number, out of area" tone="slate" />
        <FlowRow label="With SYMBO" value="(937) 476-0278" tone="emerald" strong />
      </div>
      <p className="mt-5 text-xs text-slate-400">Example numbers for illustration.</p>
    </div>
  );
}

function Arrow() {
  return (
    <div aria-hidden className="flex justify-center text-emerald-400">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M12 5v14M6 13l6 6 6-6" />
      </svg>
    </div>
  );
}

function FlowRow({
  label,
  value,
  tone,
  mono = false,
  strong = false,
}: {
  label: string;
  value: string;
  tone: "slate" | "emerald";
  mono?: boolean;
  strong?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 ${
        tone === "emerald" ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"
      }`}
    >
      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">{label}</p>
      <p
        className={`mt-0.5 ${mono ? "font-mono text-sm" : "text-sm"} ${
          strong ? "text-lg font-bold text-emerald-800" : "font-semibold text-slate-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
