import type { AttendanceOutcome, GameNightRecord, ISODate, Player, UserId } from "@/lib/domain/types";

export const IDS = ["a", "b", "c", "d", "e", "f"] as const;

export function makePlayers(ids: readonly string[] = IDS): Player[] {
  return ids.map((id) => ({
    id,
    displayName: id.toUpperCase(),
    avatarUrl: "",
    timezone: "America/Los_Angeles",
    availabilityUpdatedAt: null,
  }));
}

export function night(
  date: ISODate,
  played: UserId[],
  extra: Partial<Record<UserId, AttendanceOutcome>> = {},
  status: GameNightRecord["status"] = "played",
): GameNightRecord {
  const attendance: Record<UserId, AttendanceOutcome> = Object.fromEntries(played.map((id) => [id, "played"]));
  for (const [id, outcome] of Object.entries(extra)) if (outcome) attendance[id] = outcome;
  return {
    date,
    status,
    availableUserIds: Object.keys(attendance),
    attendance: status === "played" ? attendance : {},
    recordedBy: played[0] ?? "a",
    recordedAt: `${date}T23:00:00.000Z`,
  };
}

export function availabilityFor(entries: Record<UserId, ISODate[]>, ids: readonly string[] = IDS): Record<UserId, ISODate[]> {
  return Object.fromEntries(ids.map((id) => [id, [...(entries[id] ?? [])].sort()]));
}
