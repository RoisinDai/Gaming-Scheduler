import { describe, expect, it } from "vitest";
import { addDays } from "@/lib/domain/dates";
import { availabilityFor, makePlayers, night } from "@/test/fixtures";
import { computeStats, unrecordedPotentialNights } from "./stats";

const players = makePlayers();
const byId = (stats: ReturnType<typeof computeStats>, id: string) => stats.players.find((p) => p.playerId === id)!;

describe("stats", () => {
  it("matches the spec example: play rate vs overall participation", () => {
    const nights = Array.from({ length: 15 }, (_, i) => {
      const date = addDays("2026-11-01", i);
      const played = ["b", "c", "d", "e", "f"].filter((id) => !(id === "b" && i === 14));
      if (i < 9 && i !== 8) played.push("a");
      const extra: Record<string, "did_not_join"> = {};
      if (i === 8) extra.a = "did_not_join";
      if (i === 14) extra.b = "did_not_join";
      return night(date, played, extra);
    });
    const stats = computeStats(players, nights, { kind: "all" });
    const a = byId(stats, "a");
    const b = byId(stats, "b");
    expect(stats.totalGameNights).toBe(15);
    expect([a.available, a.played]).toEqual([9, 8]);
    expect(Math.round(a.playRate! * 100)).toBe(89);
    expect(Math.round(a.participation! * 100)).toBe(53);
    expect([b.available, b.played]).toEqual([15, 14]);
    expect(Math.round(b.playRate! * 100)).toBe(93);
    expect(Math.round(b.participation! * 100)).toBe(93);
  });

  it("separates monthly from all-time", () => {
    const nights = [night("2026-10-30", ["a", "b", "c", "d", "e"]), night("2026-11-06", ["a", "b", "c", "d", "f"])];
    expect(computeStats(players, nights, { kind: "month", month: "2026-11" }).totalGameNights).toBe(1);
    expect(computeStats(players, nights, { kind: "all" }).totalGameNights).toBe(2);
    expect(byId(computeStats(players, nights, { kind: "month", month: "2026-11" }), "e").played).toBe(0);
  });

  it("counts forced sit-outs but not unavailability", () => {
    const nights = [night("2026-11-06", ["a", "b", "c", "d", "e"], { f: "rotated_out" }), night("2026-11-07", ["a", "b", "c", "d", "e"])];
    const stats = computeStats(players, nights, { kind: "all" });
    expect(byId(stats, "f")).toMatchObject({ forcedSitOuts: 1, available: 1, played: 0, lastSitOut: "2026-11-06" });
    expect(byId(stats, "f").participation).toBe(0);
    expect(stats.excessNights).toBe(1);
  });

  it("supports all six playing on the same night", () => {
    const stats = computeStats(players, [night("2026-11-06", ["a", "b", "c", "d", "e", "f"])], { kind: "all" });
    expect(stats.players.every((p) => p.played === 1 && p.playRate === 1)).toBe(true);
  });

  it("excludes no-game nights from game counts", () => {
    const nights = [night("2026-11-06", ["a", "b", "c", "d", "e"]), night("2026-11-07", [], {}, "no_game")];
    const stats = computeStats(players, nights, { kind: "all" });
    expect(stats.totalGameNights).toBe(1);
    expect(stats.noGameNights).toBe(1);
  });

  it("returns null ratios instead of dividing by zero", () => {
    const stats = computeStats(players, [], { kind: "all" });
    expect(stats.totalGameNights).toBe(0);
    expect(stats.averageAvailable).toBeNull();
    expect(stats.players.every((p) => p.playRate === null && p.participation === null)).toBe(true);
  });

  it("uses the stored snapshot, so later calendar edits don't change history", () => {
    const record = night("2026-11-06", ["a", "b", "c", "d"], { e: "did_not_join" });
    const before = computeStats(players, [record], { kind: "all" });
    // Availability isn't an input: editing calendars can't touch recorded stats.
    expect(byId(before, "e").available).toBe(1);
    expect(byId(before, "f").available).toBe(0);
  });

  it("lists past potential nights that still need attendance", () => {
    const five = ["a", "b", "c", "d", "e"];
    const availability = availabilityFor(Object.fromEntries(five.map((id) => [id, ["2026-11-20", "2026-11-21", "2026-11-28"]])));
    const pending = unrecordedPotentialNights(players, availability, [night("2026-11-20", five)], "2026-11-27");
    expect(pending).toEqual(["2026-11-21"]);
  });
});
