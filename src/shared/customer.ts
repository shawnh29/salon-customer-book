// Types and validation shared by the browser form (instant feedback) and the
// Netlify Functions (authoritative server-side validation).

import { currentYear } from "./age";

export const LIMITS = {
  name: 100,
  english_name: 100,
  korean_name: 100,
  notes: 5000,
} as const;

export const MIN_BIRTH_YEAR = 1900;

export interface CustomerInput {
  name: string;
  english_name: string | null;
  korean_name: string | null;
  birth_year: number;
  notes: string | null;
}

export type FieldErrors = Partial<Record<keyof CustomerInput, string>>;

export type ValidationResult =
  | { ok: true; value: CustomerInput }
  | { ok: false; errors: FieldErrors };

/** NFC-normalize so Hangul typed on different systems compares equal. */
export function nfc(value: string): string {
  return value.normalize("NFC");
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

export function validateCustomerInput(raw: unknown): ValidationResult {
  const errors: FieldErrors = {};

  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ok: false, errors: { name: "Request body must be a JSON object." } };
  }
  const body = raw as Record<string, unknown>;

  // Reads an optional text field. Returns "" when missing.
  function text(field: keyof typeof LIMITS, label: string, trim: boolean): string {
    const v = body[field];
    if (v === undefined || v === null) return "";
    if (typeof v !== "string") {
      errors[field] = `${label} must be text.`;
      return "";
    }
    let s = nfc(v).replace(/\r\n?/g, "\n");
    if (trim) s = s.trim();
    if (s.includes("\u0000")) {
      errors[field] = `${label} contains an invalid character.`;
      return "";
    }
    if ([...s].length > LIMITS[field]) {
      errors[field] = `${label} must be ${LIMITS[field]} characters or fewer.`;
      return "";
    }
    return s;
  }

  const name = text("name", "Name", true);
  if (!errors.name && name === "") errors.name = "Name is required.";

  const englishName = text("english_name", "English name", true);
  const koreanName = text("korean_name", "Korean name", true);
  // Notes are kept exactly as typed (only NFC + line endings); blank => null.
  const notes = text("notes", "Notes", false);

  const year = currentYear();
  const rawYear = body.birth_year;
  let birthYear = NaN;
  if (typeof rawYear === "number") birthYear = rawYear;
  else if (typeof rawYear === "string" && /^\d{4}$/.test(rawYear.trim())) birthYear = Number(rawYear.trim());
  if (!Number.isInteger(birthYear) || birthYear < MIN_BIRTH_YEAR || birthYear > year) {
    errors.birth_year = `Enter a four-digit year of birth between ${MIN_BIRTH_YEAR} and ${year}.`;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      name,
      english_name: englishName === "" ? null : englishName,
      korean_name: koreanName === "" ? null : koreanName,
      birth_year: birthYear,
      notes: notes.trim() === "" ? null : notes,
    },
  };
}
