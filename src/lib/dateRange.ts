import { isValidIsoDate } from "./utils";

export type DateRangePreset = "week" | "month" | "year" | "last_month" | "last_year" | "custom" | "all";

export interface ResolvedDateRange {
  from: string | null; // inclusive, YYYY-MM-DD
  to: string | null; // inclusive, YYYY-MM-DD
}

function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startOfIsoWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay(); // 0 = Sunday
  const diff = day === 0 ? 6 : day - 1; // days since Monday
  date.setDate(date.getDate() - diff);
  return date;
}

/**
 * Turns a preset (or explicit custom dates) into a concrete inclusive
 * from/to range. Shared by Suppliers/Products purchase-history filters and
 * the Reports module so "This Month" always means the same thing
 * everywhere in the app.
 */
export function resolveDateRange(
  preset: DateRangePreset | string | null | undefined,
  customFrom?: string | null,
  customTo?: string | null
): ResolvedDateRange {
  const today = new Date();

  switch (preset) {
    case "week": {
      const start = startOfIsoWeek(today);
      return { from: toIso(start), to: toIso(today) };
    }
    case "month": {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from: toIso(start), to: toIso(today) };
    }
    case "year": {
      const start = new Date(today.getFullYear(), 0, 1);
      return { from: toIso(start), to: toIso(today) };
    }
    case "last_month": {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      return { from: toIso(start), to: toIso(end) };
    }
    case "last_year": {
      const start = new Date(today.getFullYear() - 1, 0, 1);
      const end = new Date(today.getFullYear() - 1, 11, 31);
      return { from: toIso(start), to: toIso(end) };
    }
    case "custom": {
      const from = isValidIsoDate(customFrom) ? customFrom : null;
      const to = isValidIsoDate(customTo) ? customTo : null;
      return { from, to };
    }
    default:
      return { from: null, to: null };
  }
}

export const DATE_RANGE_OPTIONS: { value: DateRangePreset; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "year", label: "This Year" },
  { value: "last_month", label: "Last Month" },
  { value: "last_year", label: "Last Year" },
  { value: "custom", label: "Custom Range" },
];

/** Salary records are keyed by month (YYYY-MM), not by day — this maps a
 *  resolved day-based range down to a month range for filtering them. */
export function dateRangeToMonthRange(range: ResolvedDateRange): { monthFrom: string | null; monthTo: string | null } {
  return {
    monthFrom: range.from ? range.from.slice(0, 7) : null,
    monthTo: range.to ? range.to.slice(0, 7) : null,
  };
}
