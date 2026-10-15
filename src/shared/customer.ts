// Validation shared by the browser form (instant feedback) and the Netlify
// Functions (authoritative server-side validation).
// Every field is optional, but a customer must have at least one of them filled in.

import { currentYear } from "./age";

export const LIMITS = {
  name: 100,
  notes: 5000,
} as const;

export const MIN_BIRTH_YEAR = 1900;

export interface CustomerInput {
  name: string | null;
  birth_year: number | null;
  notes: string | null;
}

export type FieldErrors = Partial<Record<keyof CustomerInput, string>>;

export type ValidationResult =
  | { ok: true; value: CustomerInput }
  | { ok: false; errors: FieldErrors };

export const UNNAMED = "Unnamed customer";

/** What to show when a customer has no name. */
export function displayName(name: string | null): string {
  return name ?? UNNAMED;
}

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
  // Notes are kept exactly as typed (only NFC + line endings); blank => null.
  const notes = text("notes", "Notes", false);

  // Year of birth is optional, but if given it must be a real four-digit year.
  const year = currentYear();
  const rawYear = body.birth_year;
  let birthYear: number | null = null;
  const blankYear =
    rawYear === undefined || rawYear === null || (typeof rawYear === "string" && rawYear.trim() === "");
  if (!blankYear) {
    let n = NaN;
    if (typeof rawYear === "number") n = rawYear;
    else if (typeof rawYear === "string" && /^\d{4}$/.test(rawYear.trim())) n = Number(rawYear.trim());
    if (!Number.isInteger(n) || n < MIN_BIRTH_YEAR || n > year) {
      errors.birth_year = `Enter a four-digit year of birth between ${MIN_BIRTH_YEAR} and ${year}, or leave it blank.`;
    } else {
      birthYear = n;
    }
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const value: CustomerInput = {
    name: name === "" ? null : name,
    birth_year: birthYear,
    notes: notes.trim() === "" ? null : notes,
  };

  // Guard against saving a completely empty record.
  if (value.name === null && value.birth_year === null && value.notes === null) {
    return { ok: false, errors: { name: "Fill in at least one field: name, year of birth, or notes." } };
  }

  return { ok: true, value };
}
