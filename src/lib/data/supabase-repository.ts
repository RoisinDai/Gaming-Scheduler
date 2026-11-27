import "server-only";
import { createSupabaseClient } from "@/lib/auth/supabase";
import type { SquadRepository } from "./repository";
import type { SquadData } from "@/lib/domain/types";

function check(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export const supabaseRepository: SquadRepository = {
  async getSquad() {
    const db = await createSupabaseClient();
    const { data: id, error: authError } = await db.rpc("current_discord_id");
    check(authError);
    if (!id) throw new Error("Access denied.");
    const [roster, availability, nights] = await Promise.all([
      db.from("allowed_discord_users").select("*").order("display_name"),
      db.from("availability").select("*").order("date").limit(10000),
      db.from("game_nights").select("*").order("date").limit(10000),
    ]);
    check(roster.error); check(availability.error); check(nights.error);
    const data: SquadData = {
      players: (roster.data ?? []).map(p => ({
        id: p.discord_id, displayName: p.display_name, avatarUrl: p.avatar_url,
        timezone: p.timezone, availabilityUpdatedAt: p.availability_updated_at,
      })),
      availability: {},
      gameNights: (nights.data ?? []).map(n => ({
        date: n.date, status: n.status, availableUserIds: n.available_user_ids,
        attendance: n.attendance, recordedBy: n.recorded_by, recordedAt: n.recorded_at,
      })),
    };
    for (const p of data.players) data.availability[p.id] = [];
    for (const a of availability.data ?? []) (data.availability[a.discord_id] ??= []).push(a.date);
    return { data, revision: Date.now() };
  },
  async setAvailability(userId, dates, available) {
    const db = await createSupabaseClient();
    const result = await db.rpc("set_my_availability", { p_dates: [...new Set(dates)], p_available: available });
    check(result.error);
    void userId;
  },
  async updateTimezone(userId, timezone) {
    const db = await createSupabaseClient();
    check((await db.from("allowed_discord_users").update({ timezone }).eq("discord_id", userId)).error);
  },
  async saveGameNight(record) {
    const db = await createSupabaseClient();
    check((await db.rpc("save_game_night", { p_date: record.date, p_status: record.status, p_attendance: record.attendance })).error);
  },
  async deleteGameNight(date) {
    const db = await createSupabaseClient();
    check((await db.from("game_nights").delete().eq("date", date)).error);
  },
};
