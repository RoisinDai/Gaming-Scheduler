import type { ISODate } from "./types";

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 86_400_000;

export function isISODate(value: unknown): value is ISODate {
  if (typeof value !== "string") return false;
  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) return false;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return toISODate(date) === value;
}

function toUTC(date: ISODate): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function toISODate(date: Date): ISODate {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: ISODate, days: number): ISODate {
  return toISODate(new Date(toUTC(date).getTime() + days * DAY_MS));
}

export function daysBetween(from: ISODate, to: ISODate): number {
  return Math.round((toUTC(to).getTime() - toUTC(from).getTime()) / DAY_MS);
}

/** 0 = Monday … 6 = Sunday. */
export function weekdayIndex(date: ISODate): number {
  return (toUTC(date).getUTCDay() + 6) % 7;
}

export function startOfWeek(date: ISODate): ISODate {
  return addDays(date, -weekdayIndex(date));
}

export function weekDates(weekStart: ISODate): ISODate[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

export function monthKey(date: ISODate): string {
  return date.slice(0, 7);
}

export function firstOfMonth(month: string): ISODate {
  return `${month}-01`;
}

export function addMonths(month: string, delta: number): string {
  const [year, monthIndex] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthIndex - 1 + delta, 1));
  return toISODate(date).slice(0, 7);
}

/** Monday-start grid of whole weeks covering the month. */
export function monthGrid(month: string): ISODate[] {
  const start = startOfWeek(firstOfMonth(month));
  const end = startOfWeek(addDays(firstOfMonth(addMonths(month, 1)), -1));
  const days: ISODate[] = [];
  for (let day = start; day <= addDays(end, 6); day = addDays(day, 1)) days.push(day);
  return days;
}

export function isValidTimeZone(timeZone: unknown): timeZone is string {
  if (typeof timeZone !== "string" || timeZone.length === 0) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function todayInTimeZone(timeZone: string, now: Date = new Date()): ISODate {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function timeZoneName(timeZone: string, style: "short" | "long" = "long"): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: style === "short" ? "shortGeneric" : "longGeneric",
    }).formatToParts(new Date());
    return parts.find((part) => part.type === "timeZoneName")?.value ?? timeZone;
  } catch {
    return timeZone;
  }
}

function format(date: ISODate, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" }).format(toUTC(date));
}

export const formatWeekdayShort = (date: ISODate) => format(date, { weekday: "short" });
export const formatWeekdayLong = (date: ISODate) => format(date, { weekday: "long" });
export const formatMonthDay = (date: ISODate) => format(date, { month: "short", day: "numeric" });
export const formatDayNumber = (date: ISODate) => String(Number(date.slice(8, 10)));
export const formatMonthLong = (month: string) =>
  format(firstOfMonth(month), { month: "long", year: "numeric" });
export const formatFullDate = (date: ISODate) =>
  format(date, { weekday: "long", month: "long", day: "numeric" });

export function formatWeekRange(weekStart: ISODate): string {
  const end = addDays(weekStart, 6);
  const sameMonth = monthKey(weekStart) === monthKey(end);
  const startLabel = formatMonthDay(weekStart);
  const endLabel = sameMonth ? formatDayNumber(end) : formatMonthDay(end);
  return `${startLabel} – ${endLabel}, ${end.slice(0, 4)}`;
}

export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const diffMs = now.getTime() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.round(days / 30)}mo ago`;
}
