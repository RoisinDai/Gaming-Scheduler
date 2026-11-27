"use server";

import { redirect } from "next/navigation";
import { loadSquadState, requirePlayer, setMockSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { resetMockScenario } from "@/lib/data/mock/mock-repository";
import type { SquadState } from "@/lib/domain/types";
import { isMockMode } from "@/lib/env";
import type { ScenarioName } from "@/mock/scenarios";

function assertMock() {
  if (!isMockMode()) throw new Error("Development tools are disabled outside local development.");
}

export async function mockLoginAction(userId: string, redirectTo = "/calendar"): Promise<void> {
  assertMock();
  const { data } = await getRepository().getSquad();
  if (!data.players.some((player) => player.id === userId)) throw new Error("Unknown mock user.");
  await setMockSession(userId);
  redirect(redirectTo.startsWith("/") && !redirectTo.startsWith("//") ? redirectTo : "/calendar");
}

export async function loadScenarioAction(scenario: ScenarioName): Promise<SquadState> {
  assertMock();
  await requirePlayer();
  if (scenario !== "demo" && scenario !== "empty") throw new Error("Unknown scenario.");
  await resetMockScenario(scenario);
  return loadSquadState();
}
