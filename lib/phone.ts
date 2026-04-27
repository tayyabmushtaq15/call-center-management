/** Normalize to 10 digits (US). Strips leading +1 / 1. */
export function normalizeUsPhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return digits.slice(1);
  }
  if (digits.length === 10) {
    return digits;
  }
  return null;
}

export function extractAreaCode(tenDigits: string): string | null {
  if (tenDigits.length !== 10) return null;
  return tenDigits.slice(0, 3);
}
