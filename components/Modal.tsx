"use client";

import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  /** Wider panel for content like bulk import. */
  wide?: boolean;
};

/** Centered dialog on a dimmed backdrop. Esc or a backdrop click closes it; page scroll is locked while open. */
export function Modal({ open, onClose, title, description, children, wide }: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    // Focus the first field so the user can start typing straight away.
    const first = panelRef.current?.querySelector<HTMLElement>(
      "input:not([type=file]):not([type=hidden]), textarea, select"
    );
    first?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-sm sm:items-center"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`my-8 w-full ${wide ? "max-w-2xl" : "max-w-md"} rounded-2xl border border-slate-600/50 bg-slate-800 shadow-2xl shadow-slate-950/60 ring-1 ring-slate-700/40`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-600/50 px-5 py-4">
          <div>
            <h2 id={titleId} className="text-base font-semibold text-slate-100">
              {title}
            </h2>
            {description ? <p className="mt-1 text-xs leading-relaxed text-slate-400">{description}</p> : null}
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="-mr-1 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-700/70 hover:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500/40"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
      </div>
    </div>
  );
}
