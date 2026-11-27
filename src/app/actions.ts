"use server";

import { redirect } from "next/navigation";
import { clearSession, loadSquadState, requirePlayer } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { TIME_ZONE_OPTIONS } from "@/lib/config";
import { isISODate, todayInTimeZone } from "@/lib/domain/dates";
import type { AttendanceOutcome, GameNightRecord, GameNightStatus, ISODate, SquadState, UserId } from "@/lib/domain/types";
import { isEditableDate } from "@/lib/engine/availability";
import { availableOn } from "@/lib/engine/schedule";

export type ActionResult = { ok: true; state: SquadState } | { ok: false; error: string };

const OUTCOMES: readonly AttendanceOutcome[] = ["played", "rotated_out", "did_not_join"];

async function respond(work: () => Promise<void>): Promise<ActionResult> {
  try {
    await work();
    return { ok: true, state: await loadSquadState() };
  } catch (error) {
    if (error instanceof Error && "digest" in error) throw error;
    return { ok: false, error: error instanceof Error ? error.message : "Something went wrong." };
  }
}

export async function refreshSquadAction(): Promise<ActionResult> {
  return respond(async () => {});
}

export async function setAvailabilityAction(dates: ISODate[], available: boolean): Promise<ActionResult> {
  return respond(async () => {
    const me = await requirePlayer();
    if (!Array.isArray(dates) || dates.length === 0 || dates.length > 62) throw new Error("Pick between 1 and 62 days.");
    if (typeof available !== "boolean") throw new Error("Invalid request.");
    const today = todayInTimeZone(me.timezone);
    for (const date of dates) {
      if (!isISODate(date)) throw new Error("Invalid date.");
      if (!isEditableDate(date, today)) throw new Error("Past days are locked.");
    }
    await getRepository().setAvailability(me.id, dates, available);
  });
}

export async function updateTimezoneAction(timezone: string): Promise<ActionResult> {
  return respond(async () => {
    const me = await requirePlayer();
    if (!TIME_ZONE_OPTIONS.includes(timezone)) throw new Error("Pick Pacific, Mountain, or Eastern time.");
    await getRepository().updateTimezone(me.id, timezone);
  });
}

export interface SaveGameNightInput {
  date: ISODate;
  status: GameNightStatus;
  attendance: Record<UserId, AttendanceOutcome>;
}

export async function saveGameNightAction(input: SaveGameNightInput): Promise<ActionResult> {
  return respond(async () => {
    const me = await requirePlayer();
    const repo = getRepository();
    const { data } = await repo.getSquad();
    if (!input || !isISODate(input.date)) throw new Error("Invalid date.");
    if (input.date > todayInTimeZone(me.timezone)) throw new Error("You can only record tonight or past nights.");
    if (input.status !== "played" && input.status !== "no_game") throw new Error("Invalid status.");

    const playerIds = new Set(data.players.map((player) => player.id));
    const attendance: Record<UserId, AttendanceOutcome> = {};
    if (input.status === "played") {
      for (const [id, outcome] of Object.entries(input.attendance ?? {})) {
        if (!playerIds.has(id) || !OUTCOMES.includes(outcome)) throw new Error("Invalid attendance.");
        attendance[id] = outcome;
      }
      if (!Object.values(attendance).includes("played")) throw new Error("Pick at least one player who played.");
    }

    const existing = data.gameNights.find((night) => night.date === input.date);
    const record: GameNightRecord = {
      date: input.date,
      status: input.status,
      availableUserIds: existing?.availableUserIds ?? availableOn(input.date, data.players, data.availability),
      attendance,
      recordedBy: me.id,
      recordedAt: new Date().toISOString(),
    };
    await repo.saveGameNight(record);
  });
}

export async function clearGameNightAction(date: ISODate): Promise<ActionResult> {
  return respond(async () => {
    await requirePlayer();
    if (!isISODate(date)) throw new Error("Invalid date.");
    await getRepository().deleteGameNight(date);
  });
}

export async function logoutAction(): Promise<void> {
  await clearSession();
  redirect("/login");
}
