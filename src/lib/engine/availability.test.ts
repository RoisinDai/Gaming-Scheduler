import { describe, expect, it } from "vitest";
import { countInRange, isEditableDate, updateDates } from "./availability";

describe("availability editing", () => {
  it("starts empty and adds explicit selections", () => {
    expect(updateDates([], ["2026-11-27"], true)).toEqual(["2026-11-27"]);
  });

  it("dedupes and keeps dates sorted", () => {
    expect(updateDates(["2026-11-28"], ["2026-11-27", "2026-11-28"], true)).toEqual(["2026-11-27", "2026-11-28"]);
  });

  it("removes deselected dates", () => {
    expect(updateDates(["2026-11-27", "2026-11-28"], ["2026-11-27"], false)).toEqual(["2026-11-28"]);
    expect(updateDates([], ["2026-11-27"], false)).toEqual([]);
  });

  it("does not mutate the input", () => {
    const current = Object.freeze(["2026-11-27"]);
    updateDates(current, ["2026-11-28"], true);
    expect(current).toEqual(["2026-11-27"]);
  });

  it("locks past dates but allows today", () => {
    expect(isEditableDate("2026-11-26", "2026-11-27")).toBe(false);
    expect(isEditableDate("2026-11-27", "2026-11-27")).toBe(true);
    expect(isEditableDate("2026-12-01", "2026-11-27")).toBe(true);
  });

  it("counts marked days in a range", () => {
    expect(countInRange(["2026-11-22", "2026-11-23", "2026-11-29", "2026-11-30"], "2026-11-23", "2026-11-29")).toBe(2);
  });
});
