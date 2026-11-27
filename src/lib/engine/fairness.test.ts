import { describe, expect, it } from "vitest";
import { addDays, weekDates } from "@/lib/domain/dates";
import type { GameNightRecord } from "@/lib/domain/types";
import { availabilityFor, IDS, makePlayers, night } from "@/test/fixtures";
import { recommendWeek, type FairnessInput } from "./fairness";

const players = makePlayers();
const WEEK = "2026-11-23";
const MON = WEEK;
const WED = addDays(WEEK, 2);
const FRI = addDays(WEEK, 4);
const SAT = addDays(WEEK, 5);
const SUN = addDays(WEEK, 6);
const ALL = [...IDS];

function input(entries: Record<string, string[]>, gameNights: GameNightRecord[] = [], today = MON): FairnessInput {
  return { players, availability: availabilityFor(entries), gameNights, dates: weekDates(WEEK), today };
}

const everyone = (...dates: string[]) => Object.fromEntries(ALL.map((id) => [id, dates]));
const equalHistory = [night("2026-11-02", ALL)];

describe("fairness engine", () => {
  it("only recommends when more than five are available", () => {
    const five = Object.fromEntries(IDS.slice(0, 5).map((id) => [id, [FRI]]));
    expect(recommendWeek(input(five, equalHistory))).toEqual([]);
    const recs = recommendWeek(input(everyone(FRI), equalHistory));
    expect(recs).toHaveLength(1);
    expect(recs[0].sitOutIds).toHaveLength(1);
  });

  it("prioritizes players with lower monthly participation", () => {
    const history = [
      night("2026-11-02", ["a", "b", "c", "d", "e"], { f: "did_not_join" }),
      night("2026-11-03", ["a", "b", "c", "d", "e"], { f: "did_not_join" }),
      night("2026-11-04", ["a", "b", "c", "d", "f"], { e: "did_not_join" }),
    ];
    const [rec] = recommendWeek(input(everyone(FRI), history));
    expect(rec.sitOutIds).not.toContain("f");
    expect(rec.factors[0].playerId).toBe("f");
  });

  it("gives priority on Friday to the player with no other night that week", () => {
    const entries = { ...everyone(FRI, SAT, SUN), a: [FRI] };
    const recs = recommendWeek(input(entries, equalHistory));
    const friday = recs.find((r) => r.date === FRI)!;
    expect(friday.sitOutIds).not.toContain("a");
    expect(friday.reasons.join(" ")).toMatch(/A's only one/);
  });

  it("favours a player returning from an on-call week with fewer nights played", () => {
    const history = Array.from({ length: 6 }, (_, i) =>
      night(addDays("2026-11-09", i), ["a", "b", "c", "d", "e"]),
    );
    const [rec] = recommendWeek(input(everyone(FRI), history));
    expect(rec.sitOutIds).not.toContain("f");
    expect(rec.basis).toBe("history");
  });

  it("protects someone who was recently forced to sit out", () => {
    const history = [night("2026-11-20", ["a", "b", "c", "d", "e"], { f: "rotated_out" }), night("2026-11-21", ALL)];
    const [rec] = recommendWeek(input(everyone(FRI), history));
    expect(rec.sitOutIds).not.toContain("f");
  });

  it("avoids suggesting the same person on consecutive game nights", () => {
    const recs = recommendWeek(input(everyone(FRI, SAT, SUN), equalHistory));
    expect(recs).toHaveLength(3);
    for (let i = 1; i < recs.length; i++) expect(recs[i].sitOutIds[0]).not.toBe(recs[i - 1].sitOutIds[0]);
  });

  it("accounts for earlier proposed rotations within the same week", () => {
    const recs = recommendWeek(input(everyone(WED, FRI, SAT, SUN), equalHistory));
    const sitters = recs.map((r) => r.sitOutIds[0]);
    expect(new Set(sitters).size).toBe(4);
  });

  it("is deterministic across runs", () => {
    const a = recommendWeek(input(everyone(FRI, SAT), equalHistory));
    const b = recommendWeek(input(everyone(FRI, SAT), equalHistory));
    expect(a).toEqual(b);
  });

  it("breaks exact ties with all-time participation", () => {
    const history = [night("2026-10-02", ALL), night("2026-10-03", ["a", "b", "c", "d", "e"], { f: "did_not_join" })];
    const [rec] = recommendWeek(input(everyone(FRI), history));
    expect(rec.factors.find((f) => f.playerId === "f")!.allTimePlayed).toBe(1);
    expect(rec.sitOutIds).not.toContain("f");
  });

  it("declines to guess when there is no history and nothing distinguishes players", () => {
    const [rec] = recommendWeek(input(everyone(FRI)));
    expect(rec.basis).toBe("insufficient");
    expect(rec.sitOutIds).toEqual([]);
  });

  it("falls back to upcoming availability without history", () => {
    const entries = { ...everyone(FRI, SAT), a: [FRI] };
    const friday = recommendWeek(input(entries)).find((r) => r.date === FRI)!;
    expect(friday.basis).toBe("availability");
    expect(friday.sitOutIds).not.toContain("a");
  });

  it("never produces NaN scores with empty or zero data", () => {
    const recs = recommendWeek(input(everyone(FRI, SAT, SUN), [night("2026-11-02", [], {}, "no_game")]));
    for (const rec of recs) for (const factor of rec.factors) expect(Number.isFinite(factor.score)).toBe(true);
  });

  it("skips past days and nights that are already recorded", () => {
    const recs = recommendWeek(input(everyone(MON, FRI, SAT), [...equalHistory, night(FRI, ALL)], WED));
    expect(recs.map((r) => r.date)).toEqual([SAT]);
  });

  it("never modifies availability or history", () => {
    const base = input(everyone(FRI, SAT), equalHistory);
    const snapshot = JSON.stringify(base);
    recommendWeek(base);
    expect(JSON.stringify(base)).toBe(snapshot);
  });
});
