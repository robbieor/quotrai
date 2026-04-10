import { format } from "date-fns";

/**
 * Safely parse a date string and format it.
 * Handles ISO dates, DD/MM/YYYY, and DD-MM-YYYY formats.
 * Returns a fallback string if parsing fails.
 */
export function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (dmy) {
    let [, d, m, y] = dmy;
    let yearNum = parseInt(y);
    if (yearNum < 100) yearNum += 2000;
    const dayNum = parseInt(d);
    const monthNum = parseInt(m);
    if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) return null;
    const result = new Date(Date.UTC(yearNum, monthNum - 1, dayNum));
    if (result.getUTCDate() !== dayNum || result.getUTCMonth() !== monthNum - 1) return null;
    return result;
  }

  // ISO date-only (YYYY-MM-DD) — construct in UTC
  const iso = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const result = new Date(Date.UTC(+iso[1], +iso[2] - 1, +iso[3]));
    if (result.getUTCDate() !== +iso[3] || result.getUTCMonth() !== +iso[2] - 1) return null;
    return result;
  }

  // Full ISO with time — safe for new Date()
  const fallback = new Date(dateStr);
  return isNaN(fallback.getTime()) ? null : fallback;
}

export function safeFormatDate(
  dateStr: string | null | undefined,
  formatStr: string,
  fallback: string = "N/A"
): string {
  if (!dateStr) return fallback;
  const parsed = parseDate(dateStr);
  if (!parsed) return fallback;
  try {
    return format(parsed, formatStr);
  } catch {
    return fallback;
  }
}
