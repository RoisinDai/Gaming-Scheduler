import "server-only";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { DEFAULT_TIME_ZONE } from "@/lib/config";
import { todayInTimeZone } from "@/lib/domain/dates";
import type { SquadData } from "@/lib/domain/types";
import { updateDates } from "@/lib/engine/availability";
import { buildScenario, type ScenarioName } from "@/mock/scenarios";
import type { SquadRepository, SquadSnapshot } from "../repository";

interface MockDatabase {
  version: 1;
  scenario: ScenarioName;
  revision: number;
  data: SquadData;
}

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "mock-db.json");

let writeQueue: Promise<unknown> = Promise.resolve();

function freshDatabase(scenario: ScenarioName, revision = 0): MockDatabase {
  return { version: 1, scenario, revision, data: buildScenario(scenario, todayInTimeZone(DEFAULT_TIME_ZONE)) };
}

async function load(): Promise<MockDatabase> {
  try {
    const parsed = JSON.parse(await readFile(DB_FILE, "utf8")) as MockDatabase;
    if (parsed.version === 1) return parsed;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const db = freshDatabase("demo");
  await persist(db);
  return db;
}

async function persist(db: MockDatabase): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  const tmp = `${DB_FILE}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`;
  await writeFile(tmp, JSON.stringify(db, null, 2));
  await rename(tmp, DB_FILE);
}

function mutate(change: (db: MockDatabase) => void): Promise<void> {
  const run = writeQueue.then(async () => {
    const db = await load();
    change(db);
    db.revision += 1;
    await persist(db);
  });
  writeQueue = run.catch(() => undefined);
  return run;
}

export async function getMockScenario(): Promise<ScenarioName> {
  return (await load()).scenario;
}

export function resetMockScenario(scenario: ScenarioName): Promise<void> {
  return mutate((db) => {
    const fresh = freshDatabase(scenario);
    db.scenario = fresh.scenario;
    db.data = fresh.data;
  });
}

export const mockRepository: SquadRepository = {
  async getSquad(): Promise<SquadSnapshot> {
    await writeQueue;
    const db = await load();
    return { data: db.data, revision: db.revision };
  },

  setAvailability(userId, dates, available) {
    return mutate((db) => {
      db.data.availability[userId] = updateDates(db.data.availability[userId] ?? [], dates, available);
      const player = db.data.players.find((p) => p.id === userId);
      if (player) player.availabilityUpdatedAt = new Date().toISOString();
    });
  },

  updateTimezone(userId, timezone) {
    return mutate((db) => {
      const player = db.data.players.find((p) => p.id === userId);
      if (player) player.timezone = timezone;
    });
  },

  saveGameNight(record) {
    return mutate((db) => {
      db.data.gameNights = [...db.data.gameNights.filter((night) => night.date !== record.date), record].sort((a, b) =>
        a.date.localeCompare(b.date),
      );
    });
  },

  deleteGameNight(date) {
    return mutate((db) => {
      db.data.gameNights = db.data.gameNights.filter((night) => night.date !== date);
    });
  },
};
