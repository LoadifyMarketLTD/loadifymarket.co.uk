import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format an E.164 UK phone number for display.
 * "+447423272138" → "+44 7423 272138"
 *
 * Falls back to the raw value for numbers that don't match the expected
 * +44XXXXXXXXXX pattern (e.g. international numbers outside the UK).
 */
export function formatPhoneNumber(e164: string): string {
  const match = e164.match(/^\+44(\d{4})(\d{6})$/);
  if (match) {
    return `+44 ${match[1]} ${match[2]}`;
  }
  return e164;
}
