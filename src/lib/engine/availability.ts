import type { ISODate } from "@/lib/domain/types";

export function updateDates(current: readonly ISODate[], dates: readonly ISODate[], available: boolean): ISODate[] {
  const next = new Set(current);
  for (const date of dates) {
    if (available) next.add(date);
    else next.delete(date);
  }
  return [...next].sort();
}

/** Past dates are locked so calendar edits can never rewrite history. */
export function isEditableDate(date: ISODate, today: ISODate): boolean {
  return date >= today;
}

export function countInRange(dates: readonly ISODate[], from: ISODate, to: ISODate): number {
  return dates.filter((date) => date >= from && date <= to).length;
}
