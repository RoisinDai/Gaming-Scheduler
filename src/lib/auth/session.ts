import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getRepository } from "@/lib/data";
import { todayInTimeZone } from "@/lib/domain/dates";
import type { Player, SquadState } from "@/lib/domain/types";
import { isMockMode } from "@/lib/env";

export const MOCK_SESSION_COOKIE = "qu_mock_user";

async function sessionUserId(): Promise<string | null> {
  const store = await cookies();
  if (isMockMode()) return store.get(MOCK_SESSION_COOKIE)?.value ?? null;
  return null;
}

export async function getCurrentPlayer(): Promise<Player | null> {
  const userId = await sessionUserId();
  if (!userId) return null;
  const { data } = await getRepository().getSquad();
  return data.players.find((player) => player.id === userId) ?? null;
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
  const store = await cookies();
  store.set(MOCK_SESSION_COOKIE, userId, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(MOCK_SESSION_COOKIE);
}
