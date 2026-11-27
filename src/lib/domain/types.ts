export type UserId = string;

/** Calendar date in `YYYY-MM-DD` form. A date is the same game night for every player, regardless of time zone. */
export type ISODate = string;

export interface Player {
  id: UserId;
  displayName: string;
  avatarUrl: string;
  /** IANA time zone, e.g. `America/New_York`. Only decides which date is "today" for this player. */
  timezone: string;
  availabilityUpdatedAt: string | null;
}

export type AttendanceOutcome = "played" | "rotated_out" | "did_not_join";

export type GameNightStatus = "played" | "no_game";

export interface GameNightRecord {
  date: ISODate;
  status: GameNightStatus;
  /** Who had marked themselves available when the night was first recorded. Never rewritten by later calendar edits. */
  availableUserIds: UserId[];
  attendance: Record<UserId, AttendanceOutcome>;
  recordedBy: UserId;
  recordedAt: string;
}

export interface SquadData {
  players: Player[];
  availability: Record<UserId, ISODate[]>;
  gameNights: GameNightRecord[];
}

export interface SquadState {
  data: SquadData;
  meId: UserId;
  today: ISODate;
  revision: number;
}
