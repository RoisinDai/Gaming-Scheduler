import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  formatWeekRange,
  isISODate,
  isValidTimeZone,
  monthGrid,
  startOfWeek,
  todayInTimeZone,
  weekDates,
  weekdayIndex,
} from "./dates";

describe("date helpers", () => {
  it("validates real calendar dates only", () => {
    expect(isISODate("2026-11-27")).toBe(true);
    expect(isISODate("2026-02-30")).toBe(false);
    expect(isISODate("2026-1-5")).toBe(false);
    expect(isISODate(20261127)).toBe(false);
  });

  it("adds days across month and year boundaries", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("starts weeks on Monday", () => {
    expect(weekdayIndex("2026-11-23")).toBe(0);
    expect(weekdayIndex("2026-11-29")).toBe(6);
    expect(startOfWeek("2026-11-27")).toBe("2026-11-23");
    expect(startOfWeek("2026-11-29")).toBe("2026-11-23");
    expect(weekDates("2026-11-23")).toHaveLength(7);
  });

  it("builds whole-week month grids", () => {
    const grid = monthGrid("2026-11");
    expect(grid.length % 7).toBe(0);
    expect(weekdayIndex(grid[0])).toBe(0);
    expect(grid).toContain("2026-11-01");
    expect(grid).toContain("2026-11-30");
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
  });

  it("formats week ranges", () => {
    expect(formatWeekRange("2026-11-23")).toBe("Nov 23 – 29, 2026");
    expect(formatWeekRange("2026-11-30")).toBe("Nov 30 – Dec 6, 2026");
  });
});

describe("time zones", () => {
  it("resolves today separately for Pacific and Eastern players", () => {
    const lateFridayPacific = new Date("2026-11-28T05:30:00Z");
    expect(todayInTimeZone("America/Los_Angeles", lateFridayPacific)).toBe("2026-11-27");
    expect(todayInTimeZone("America/New_York", lateFridayPacific)).toBe("2026-11-28");
  });

  it("handles daylight-saving transitions", () => {
    expect(todayInTimeZone("America/Los_Angeles", new Date("2026-03-08T07:59:00Z"))).toBe("2026-03-07");
    expect(todayInTimeZone("America/Los_Angeles", new Date("2026-03-08T08:00:00Z"))).toBe("2026-03-08");
    expect(todayInTimeZone("America/New_York", new Date("2026-11-01T04:30:00Z"))).toBe("2026-11-01");
    expect(todayInTimeZone("America/Los_Angeles", new Date("2026-11-02T07:59:00Z"))).toBe("2026-11-01");
    expect(todayInTimeZone("America/Los_Angeles", new Date("2026-11-02T08:00:00Z"))).toBe("2026-11-02");
  });

  it("rejects unknown time zones", () => {
    expect(isValidTimeZone("America/New_York")).toBe(true);
    expect(isValidTimeZone("Mars/Olympus")).toBe(false);
    expect(isValidTimeZone("")).toBe(false);
  });
});
