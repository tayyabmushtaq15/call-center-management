"use client";

import { useState } from "react";
import type { InputHTMLAttributes } from "react";
import { IconEye, IconEyeOff } from "@/components/icons";

/** A password field with an eye button on the right that shows or hides what was typed. */
export function PasswordInput({
  className = "",
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={visible ? "text" : "password"} className={`${className} pr-11`} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        title={visible ? "Hide password" : "Show password"}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-slate-400 transition hover:text-emerald-600 focus:outline-none focus-visible:text-emerald-600 focus-visible:ring-2 focus-visible:ring-emerald-200"
      >
        {visible ? <IconEyeOff /> : <IconEye />}
      </button>
    </div>
  );
}
