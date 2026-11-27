import "server-only";
import { resolveDataSource } from "@/lib/env";
import { mockRepository } from "./mock/mock-repository";
import { supabaseRepository } from "./supabase-repository";
import type { SquadRepository } from "./repository";

export function getRepository(): SquadRepository {
  return resolveDataSource() === "mock" ? mockRepository : supabaseRepository;
}
