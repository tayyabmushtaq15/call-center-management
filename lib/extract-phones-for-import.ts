import { normalizeUsPhone } from "./phone";

/** Render spreadsheet numbers without scientific notation; reduce float drift for NANP. */
function valueToStringForPhone(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "number" && Number.isFinite(value)) {
    const a = Math.abs(value);
    if (a >= 1e9 && a < 2e11) {
      return String(Math.round(value));
    }
  }
  return String(value);
}

/** Scrape possible US 10-digit numbers from a string (cell, line, or fragment). */
function collectFromString(into: Set<string>, s: string) {
  const t = s.trim();
  if (!t) return;
  const n0 = normalizeUsPhone(t);
  if (n0) into.add(n0);
  const d = t.replace(/\D/g, "");
  for (let i = 0; i + 10 <= d.length; i++) {
    const n = normalizeUsPhone(d.slice(i, i + 10));
    if (n) into.add(n);
  }
  for (let i = 0; i + 11 <= d.length; i++) {
    const n = normalizeUsPhone(d.slice(i, i + 11));
    if (n) into.add(n);
  }
}

/** One spreadsheet cell, CSV field, or line from a free-text paste. */
export function collectPhonesToSet(into: Set<string>, value: unknown) {
  if (value == null) return;
  const s = valueToStringForPhone(value);
  if (!s.trim()) return;
  collectFromString(into, s);
  for (const part of s.split(/[,;|\t]/)) {
    collectFromString(into, part);
  }
}

/** Free-text (textarea): lines and comma/tab-separated values. */
export function extractPhonesFromPastedText(content: string): string[] {
  const set = new Set<string>();
  for (const line of content.split(/\r?\n/)) {
    collectFromString(set, line);
    for (const part of line.split(/[,;|\t]/)) {
      collectFromString(set, part);
    }
  }
  return Array.from(set);
}
