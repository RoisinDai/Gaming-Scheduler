import { describe, expect, it } from "vitest";
import { buildDiscordMessage, lineupForToday, planNotification, type Lineup, type NotificationState } from "./lineup";
import type { SquadData } from "@/lib/domain/types";

const date = "2026-11-27";
const ids = Array.from({ length: 7 }, (_, i) => `10000000000000000${i}`);
function squad(count: number): SquadData {
  return {
    players: ids.map((id, i) => ({ id, displayName: "Player " + i, avatarUrl: "", timezone: "America/New_York", availabilityUpdatedAt: null })),
    availability: Object.fromEntries(ids.map((id, i) => [id, i < count ? [date] : []])),
    gameNights: [],
  };
}
const empty: NotificationState = { candidate: null, candidateSince: null, announced: null };
const time = "2026-11-27T17:00:00.000Z";
const later = "2026-11-27T17:02:00.000Z";
const origin = "https://example.com";
const ready = lineupForToday(squad(5), date)!;
const short = lineupForToday(squad(4), date)!;
const rotation: Lineup = { kind: "rotation", available: ids, lineup: ids.slice(0, 5), sitOuts: ids.slice(5) };

describe("daily notifications", () => {
  it("announces exactly five immediately at the first check", () => {
    expect(planNotification(empty, ready, time).send).toBe(true);
  });
  it("stays silent below five until a stack has been announced", () => {
    expect(planNotification(empty, short, time).send).toBe(false);
  });
  it("does not repeat an unchanged announcement", () => {
    expect(planNotification({ candidate: ready, candidateSince: time, announced: ready }, ready, later).send).toBe(false);
  });
  it("debounces a change and cancels a reverted edit", () => {
    const first = planNotification({ candidate: ready, candidateSince: time, announced: ready }, short, time);
    expect(first.pending).toBe(true);
    expect(first.send).toBe(false);
    const state = { candidate: first.candidate, candidateSince: first.candidateSince, announced: ready };
    expect(planNotification(state, short, later).send).toBe(true);
    expect(planNotification(state, ready, later).pending).toBe(false);
  });
  it("announces a late five-stack after debounce", () => {
    expect(planNotification({ candidate: ready, candidateSince: time, announced: null }, ready, later).send).toBe(true);
  });
  it("does not invent a rotation when fairness is insufficient", () => {
    expect(lineupForToday(squad(7), date)?.kind).toBe("undecided");
  });
  it("stops after attendance has been recorded", () => {
    const data = squad(5);
    data.gameNights.push({ date, status: "no_game", availableUserIds: ids.slice(0, 5), attendance: {}, recordedBy: ids[0], recordedAt: time });
    expect(lineupForToday(data, date)).toBeNull();
  });
});

describe("Discord messages", () => {
  it("mentions the initial five and links to the scheduler", () => {
    const message = buildDiscordMessage(ready, null, date, squad(5), origin);
    expect(message.allowed_mentions.users).toEqual(ready.available);
    expect(message.allowed_mentions.parse).toEqual([]);
    expect(message.content).toContain("https://example.com/schedule");
  });
  it("only pings a newly available sit-out when the lineup stays the same", () => {
    const message = buildDiscordMessage(rotation, ready, date, squad(7), origin);
    expect(message.allowed_mentions.users).toEqual(ids.slice(5));
    expect(message.content).toContain("Now available");
    expect(message.content).not.toContain("No longer available");
    expect(message.content).not.toContain("Rotated out");
  });
  it("shows only the removal when a stack falls below five", () => {
    const message = buildDiscordMessage(short, ready, date, squad(4), origin);
    expect(message.allowed_mentions.users).toEqual([ids[4]]);
    expect(message.content).toContain("Player short");
    expect(message.content).toContain("No longer available");
    expect(message.content).not.toContain("Now available");
  });
  it("pings both players in a recommendation swap", () => {
    const swapped = { ...rotation, lineup: [...ids.slice(0, 4), ids[5]], sitOuts: [ids[4], ids[6]] };
    const message = buildDiscordMessage(swapped, rotation, date, squad(7), origin);
    expect(message.allowed_mentions.users).toEqual([ids[4], ids[5]]);
    expect(message.content).toContain("Rotated in");
    expect(message.content).toContain("Rotated out");
    expect(message.content).not.toContain("Now available");
  });
});
