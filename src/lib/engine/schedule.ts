import { STACK_SIZE } from "@/lib/config";
import type { ISODate, Player, UserId } from "@/lib/domain/types";

export type DayState = "empty" | "building" | "stack" | "excess";

export interface DayAvailability {
  date: ISODate;
  playerIds: UserId[];
  count: number;
  state: DayState;
}

export function dayState(count: number): DayState {
  if (count === 0) return "empty";
  if (count < STACK_SIZE) return "building";
  if (count === STACK_SIZE) return "stack";
  return "excess";
}

/** Who marked themselves available on a date, in squad order. Never adds, drops, or reorders anyone. */
export function availableOn(
  date: ISODate,
  players: readonly Player[],
  availability: Readonly<Record<UserId, readonly ISODate[]>>,
): UserId[] {
  return players.filter((player) => availability[player.id]?.includes(date)).map((player) => player.id);
}

export function buildDay(
  date: ISODate,
  players: readonly Player[],
  availability: Readonly<Record<UserId, readonly ISODate[]>>,
): DayAvailability {
  const playerIds = availableOn(date, players, availability);
  return { date, playerIds, count: playerIds.length, state: dayState(playerIds.length) };
}

export function buildDays(
  dates: readonly ISODate[],
  players: readonly Player[],
  availability: Readonly<Record<UserId, readonly ISODate[]>>,
): DayAvailability[] {
  return dates.map((date) => buildDay(date, players, availability));
}

export function isPotentialGameNight(day: DayAvailability): boolean {
  return day.count >= STACK_SIZE;
}
