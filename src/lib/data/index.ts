import "server-only";
import { resolveDataSource } from "@/lib/env";
import { mockRepository } from "./mock/mock-repository";
import type { SquadRepository } from "./repository";

export function getRepository(): SquadRepository {
  if (resolveDataSource() === "mock") return mockRepository;
  throw new Error("The Supabase repository isn't wired up yet. Set QUEUE_UP_DATA_SOURCE=mock for local development.");
}
