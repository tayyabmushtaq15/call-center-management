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

/**
 * A US number shown with its country code: 2102821540 -> 12102821540.
 * DIDs are stored as 10 digits (the area code is what matching uses) but are always shown, exported and
 * returned to the dialer with the leading 1, the way they were uploaded.
 */
export function withCountryCode(number: string): string {
  return number.length === 10 ? `1${number}` : number;
}
