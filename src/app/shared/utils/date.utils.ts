/**
 * Shared date utilities to avoid duplicating month-name logic
 * across services and components.
 */

/**
 * Convert English month name to 2-digit string (01–12).
 * Returns '01' if the month name is unrecognised.
 */
export function getMonthNumber(monthName: string): string {
  const date = new Date(`${monthName} 1, 2000`);
  if (isNaN(date.getTime())) return '01';
  return String(date.getMonth() + 1).padStart(2, '0');
}

/**
 * Format month name + year into "MM-YYYY" string used by payroll APIs.
 */
export function formatMonthYear(monthName: string, year: number): string {
  return `${getMonthNumber(monthName)}-${year}`;
}
