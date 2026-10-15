// Single source of truth for age. Used by the browser UI and the CSV export.
// Age is an ESTIMATE: current calendar year minus birth year. It is never stored.

export function currentYear(): number {
  return new Date().getFullYear();
}

export function calcAge(birthYear: number, year: number = currentYear()): number {
  return Math.max(0, year - birthYear);
}

export function formatAge(birthYear: number): string {
  const age = calcAge(birthYear);
  return `${age} ${age === 1 ? "year" : "years"} old`;
}

/** e.g. "1995 (31 years old)" */
export function formatBirthYear(birthYear: number): string {
  return `${birthYear} (${formatAge(birthYear)})`;
}
