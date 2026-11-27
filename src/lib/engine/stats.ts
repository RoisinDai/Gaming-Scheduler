import { STACK_SIZE } from "@/lib/config";
import { monthKey } from "@/lib/domain/dates";
import type { GameNightRecord, ISODate, Player, UserId } from "@/lib/domain/types";
import { availableOn } from "./schedule";

export type StatsPeriod = { kind: "all" } | { kind: "month"; month: string };

export interface PlayerStats {
  playerId: UserId;
  played: number;
  available: number;
  /** played ÷ nights available. `null` when the player was never available. */
  playRate: number | null;
  /** played ÷ all squad game nights. `null` when there were no game nights. */
  participation: number | null;
  forcedSitOuts: number;
  didNotJoin: number;
  lastPlayed: ISODate | null;
  lastSitOut: ISODate | null;
}

export interface SquadStats {
  totalGameNights: number;
  noGameNights: number;
  averageAvailable: number | null;
  excessNights: number;
  players: PlayerStats[];
}

export function inPeriod(date: ISODate, period: StatsPeriod): boolean {
  return period.kind === "all" || monthKey(date) === period.month;
}

/** Anyone in the availability snapshot, plus anyone recorded in attendance (playing implies being available). */
export function nightAvailableIds(record: GameNightRecord): UserId[] {
  return [...new Set([...record.availableUserIds, ...Object.keys(record.attendance)])];
}

export function ratio(numerator: number, denominator: number): number | null {
  return denominator > 0 ? numerator / denominator : null;
}

export function computeStats(
  players: readonly Player[],
  gameNights: readonly GameNightRecord[],
  period: StatsPeriod,
): SquadStats {
  const nights = gameNights
    .filter((night) => inPeriod(night.date, period))
    .sort((a, b) => a.date.localeCompare(b.date));
  const played = nights.filter((night) => night.status === "played");
  const noGameNights = nights.length - played.length;

  const availableCounts = played.map((night) => nightAvailableIds(night).length);
  const averageAvailable =
    availableCounts.length > 0 ? availableCounts.reduce((sum, n) => sum + n, 0) / availableCounts.length : null;

  const playerStats = players.map((player): PlayerStats => {
    let playedCount = 0;
    let availableCount = 0;
    let forcedSitOuts = 0;
    let didNotJoin = 0;
    let lastPlayed: ISODate | null = null;
    let lastSitOut: ISODate | null = null;

    for (const night of played) {
      if (nightAvailableIds(night).includes(player.id)) availableCount++;
      const outcome = night.attendance[player.id];
      if (outcome === "played") {
        playedCount++;
        lastPlayed = night.date;
      } else if (outcome === "rotated_out") {
        forcedSitOuts++;
        lastSitOut = night.date;
      } else if (outcome === "did_not_join") {
        didNotJoin++;
      }
    }

    return {
      playerId: player.id,
      played: playedCount,
      available: availableCount,
      playRate: ratio(playedCount, availableCount),
      participation: ratio(playedCount, played.length),
      forcedSitOuts,
      didNotJoin,
      lastPlayed,
      lastSitOut,
    };
  });

  return {
    totalGameNights: played.length,
    noGameNights,
    averageAvailable,
    excessNights: availableCounts.filter((count) => count > STACK_SIZE).length,
    players: playerStats,
  };
}

/** Past dates where five or more were available but nobody has recorded what happened. */
export function unrecordedPotentialNights(
  players: readonly Player[],
  availability: Readonly<Record<UserId, readonly ISODate[]>>,
  gameNights: readonly GameNightRecord[],
  today: ISODate,
): ISODate[] {
  const recorded = new Set(gameNights.map((night) => night.date));
  const candidates = new Set<ISODate>();
  for (const dates of Object.values(availability)) {
    for (const date of dates) if (date < today && !recorded.has(date)) candidates.add(date);
  }
  return [...candidates]
    .filter((date) => availableOn(date, players, availability).length >= STACK_SIZE)
    .sort();
}
