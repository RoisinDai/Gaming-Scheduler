import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getRepository } from "@/lib/data";
import { todayInTimeZone } from "@/lib/domain/dates";
import type { Player, SquadState } from "@/lib/domain/types";
import { isMockMode } from "@/lib/env";
import { createSupabaseClient } from "./supabase";

export const MOCK_SESSION_COOKIE = "qu_mock_user";

async function sessionUserId(): Promise<string | null> {
  if (isMockMode()) return (await cookies()).get(MOCK_SESSION_COOKIE)?.value ?? null;
  const db = await createSupabaseClient();
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user) return null;
  const result = await db.rpc("current_discord_id");
  if (result.error) throw new Error(result.error.message);
  return typeof result.data === "string" ? result.data : null;
}

export async function getCurrentPlayer(): Promise<Player | null> {
  const userId = await sessionUserId();
  if (!userId) return null;
  const { data } = await getRepository().getSquad();
  return data.players.find(player => player.id === userId) ?? null;
}

export async function requirePlayer(): Promise<Player> {
  const player = await getCurrentPlayer();
  if (!player) redirect("/login");
  return player;
}

export async function loadSquadState(): Promise<SquadState> {
  const me = await requirePlayer();
  const { data, revision } = await getRepository().getSquad();
  return { data, revision, meId: me.id, today: todayInTimeZone(me.timezone) };
}

export async function setMockSession(userId: string): Promise<void> {
  if (!isMockMode()) throw new Error("Mock login is only available in local development.");
  (await cookies()).set(MOCK_SESSION_COOKIE, userId, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
}

export async function clearSession(): Promise<void> {
  if (!isMockMode()) {
    const db = await createSupabaseClient();
    const { error } = await db.auth.signOut({ scope: "local" });
    if (error) throw new Error(error.message);
  }
  (await cookies()).delete(MOCK_SESSION_COOKIE);
}
