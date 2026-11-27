import type { GameNightRecord, ISODate, SquadData, UserId } from "@/lib/domain/types";

export interface SquadSnapshot {
  data: SquadData;
  revision: number;
}

/**
 * Storage boundary. The mock (local JSON file) and Supabase implementations are interchangeable.
 * Callers must pass an already-authenticated user id; implementations never trust client input for identity.
 */
export interface SquadRepository {
  getSquad(): Promise<SquadSnapshot>;
  setAvailability(userId: UserId, dates: readonly ISODate[], available: boolean): Promise<void>;
  updateTimezone(userId: UserId, timezone: string): Promise<void>;
  saveGameNight(record: GameNightRecord): Promise<void>;
  deleteGameNight(date: ISODate): Promise<void>;
}
