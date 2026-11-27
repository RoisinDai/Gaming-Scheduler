import { STACK_SIZE } from "@/lib/config";
import { addDays, startOfWeek, weekdayIndex } from "@/lib/domain/dates";
import type { AttendanceOutcome, GameNightRecord, ISODate, Player, SquadData, UserId } from "@/lib/domain/types";
import { availableOn } from "@/lib/engine/schedule";
import { mockAvatar } from "./avatars";

export type ScenarioName = "demo" | "empty";

interface MockPlayerSeed {
  id: UserId;
  displayName: string;
  initials: string;
  color: string;
  timezone: string;
  /** Chance of being available, Monday → Sunday. */
  weekly: [number, number, number, number, number, number, number];
  onCallWeekOfMonth?: boolean;
  /** Relative chance of being the one rotated out on a six-player night. */
  sitOutBias: number;
}

const SEEDS: MockPlayerSeed[] = [
  { id: "mock-roisin", displayName: "Roisin", initials: "RS", color: "#8b5cf6", timezone: "America/Los_Angeles", weekly: [0.25, 0.6, 0.45, 0.6, 0.97, 0.95, 0.8], sitOutBias: 0.5 },
  { id: "mock-gordon", displayName: "Gordon", initials: "GD", color: "#22d3ee", timezone: "America/New_York", weekly: [0.6, 0.3, 0.7, 0.5, 0.9, 0.85, 0.5], sitOutBias: 1.5 },
  { id: "mock-jeff", displayName: "Jeff", initials: "JF", color: "#f472b6", timezone: "America/Los_Angeles", weekly: [0.2, 0.4, 0.5, 0.8, 0.95, 0.9, 0.85], sitOutBias: 1 },
  { id: "mock-jerry", displayName: "Jerry", initials: "JR", color: "#3b82f6", timezone: "America/New_York", weekly: [0.35, 0.75, 0.65, 0.5, 0.9, 0.95, 0.8], sitOutBias: 1 },
  { id: "mock-steed", displayName: "Steed", initials: "ST", color: "#d97757", timezone: "America/Los_Angeles", weekly: [0.3, 0.3, 0.4, 0.55, 0.85, 0.92, 0.65], sitOutBias: 1.2 },
  { id: "mock-vinny", displayName: "Vinny", initials: "VN", color: "#a3e635", timezone: "America/New_York", weekly: [0.35, 0.45, 0.75, 0.5, 0.95, 0.9, 0.85], onCallWeekOfMonth: true, sitOutBias: 0.8 },
];

export const MOCK_PLAYER_IDS = SEEDS.map((seed) => seed.id);

function basePlayers(): Player[] {
  return SEEDS.map((seed, i) => ({
    id: seed.id,
    displayName: seed.displayName,
    avatarUrl: mockAvatar(seed.initials, seed.color, i),
    timezone: seed.timezone,
    availabilityUpdatedAt: null,
  }));
}

/** Deterministic pseudo-random number in [0, 1) derived from a string. */
function chance(key: string): number {
  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0x5bd1e995);
  hash ^= hash >>> 15;
  return (hash >>> 0) / 4294967296;
}

/** Vinny is on call during the week that starts between the 8th and 14th of each month. */
function isOnCallWeek(date: ISODate): boolean {
  const day = Number(startOfWeek(date).slice(8, 10));
  return day >= 8 && day <= 14;
}

export function buildEmptySquad(): SquadData {
  return {
    players: basePlayers(),
    availability: Object.fromEntries(SEEDS.map((seed) => [seed.id, []])),
    gameNights: [],
  };
}

export function buildDemoSquad(today: ISODate, now: Date = new Date()): SquadData {
  const players = basePlayers();
  const availability: Record<UserId, ISODate[]> = Object.fromEntries(SEEDS.map((seed) => [seed.id, []]));
  const historyStart = addDays(startOfWeek(today), -77);
  const horizon = addDays(startOfWeek(today), 20);

  for (let date = historyStart; date <= horizon; date = addDays(date, 1)) {
    for (const seed of SEEDS) {
      if (seed.onCallWeekOfMonth && isOnCallWeek(date)) continue;
      if (chance(`${seed.id}:${date}`) < seed.weekly[weekdayIndex(date)]) availability[seed.id].push(date);
    }
  }

  const thisWeek = startOfWeek(today);
  const nextWeek = addDays(thisWeek, 7);
  const set = (date: ISODate, ids: UserId[]) => {
    for (const seed of SEEDS) {
      const list = availability[seed.id].filter((d) => d !== date);
      if (ids.includes(seed.id)) list.push(date);
      availability[seed.id] = list;
    }
  };
  const all = SEEDS.map((seed) => seed.id);
  const without = (...ids: UserId[]) => all.filter((id) => !ids.includes(id));

  // Guarantee every state shows up in the current and next week.
  set(addDays(thisWeek, 1), ["mock-roisin", "mock-jerry", "mock-vinny"]);
  set(addDays(thisWeek, 2), without("mock-roisin", "mock-steed"));
  set(addDays(thisWeek, 4), all);
  set(addDays(thisWeek, 5), without("mock-gordon"));
  set(addDays(thisWeek, 6), all);
  set(addDays(nextWeek, 2), without("mock-jeff", "mock-steed"));
  set(addDays(nextWeek, 4), all);
  set(addDays(nextWeek, 5), all);
  set(addDays(nextWeek, 6), without("mock-vinny"));
  for (const id of all) availability[id].sort();

  const potential = [...new Set(Object.values(availability).flat())]
    .filter((date) => date < today && availableOn(date, players, availability).length >= STACK_SIZE)
    .sort();
  const leaveUnrecorded = new Set(potential.slice(-1));
  const gameNights: GameNightRecord[] = [];

  for (const date of potential) {
    if (leaveUnrecorded.has(date)) continue;
    const ids = availableOn(date, players, availability);
    const recordedBy = ids[Math.floor(chance(`recorder:${date}`) * ids.length)];
    const recordedAt = `${addDays(date, 1)}T17:${String(Math.floor(chance(`min:${date}`) * 60)).padStart(2, "0")}:00.000Z`;

    if (chance(`nogame:${date}`) < 0.1) {
      gameNights.push({ date, status: "no_game", availableUserIds: ids, attendance: {}, recordedBy, recordedAt });
      continue;
    }

    const attendance: Record<UserId, AttendanceOutcome> = Object.fromEntries(ids.map((id) => [id, "played"]));
    if (ids.length === STACK_SIZE) {
      if (chance(`dnj:${date}`) < 0.2) attendance[ids[Math.floor(chance(`dnj-who:${date}`) * ids.length)]] = "did_not_join";
    } else if (chance(`rotate-all:${date}`) >= 0.2) {
      const weighted = ids.map((id) => ({ id, w: SEEDS.find((s) => s.id === id)!.sitOutBias * chance(`sit:${date}:${id}`) }));
      weighted.sort((a, b) => b.w - a.w);
      for (const { id } of weighted.slice(0, ids.length - STACK_SIZE)) attendance[id] = "rotated_out";
    }
    gameNights.push({ date, status: "played", availableUserIds: ids, attendance, recordedBy, recordedAt });
  }

  const hoursAgo = [3, 26, 7, 51, 1, 75];
  const withUpdates = players.map((player, i) => ({
    ...player,
    availabilityUpdatedAt: new Date(now.getTime() - hoursAgo[i] * 3_600_000).toISOString(),
  }));

  return { players: withUpdates, availability, gameNights };
}

export function buildScenario(name: ScenarioName, today: ISODate, now?: Date): SquadData {
  return name === "demo" ? buildDemoSquad(today, now) : buildEmptySquad();
}
