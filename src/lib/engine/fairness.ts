import { FAIRNESS_WEIGHTS, STACK_SIZE, type FairnessWeights } from "@/lib/config";
import { daysBetween, formatMonthDay, formatWeekdayLong, monthKey } from "@/lib/domain/dates";
import type { GameNightRecord, ISODate, Player, UserId } from "@/lib/domain/types";
import { availableOn } from "./schedule";
import { computeStats, type PlayerStats } from "./stats";

export type RecommendationBasis = "history" | "availability" | "insufficient";

export interface FactorComponents {
  participation: number;
  playRate: number;
  opportunities: number;
  sitOuts: number;
}

export interface PlayerFactors {
  playerId: UserId;
  playedThisMonth: number;
  /** Earlier nights in the same week where this player is projected to play. Never saved as attendance. */
  projectedThisWeek: number;
  playRate: number | null;
  otherOpportunities: number;
  recentSitOutPressure: number;
  lastSitOut: ISODate | null;
  lastSitOutWasProposed: boolean;
  allTimePlayed: number;
  components: FactorComponents;
  /** Normalized priority to play, 0–1. Higher means a stronger claim to a slot. */
  score: number;
}

export interface DayRecommendation {
  date: ISODate;
  availableIds: UserId[];
  sitOutIds: UserId[];
  /** Players skipped as sit-out candidates because they sat out the previous game night. */
  heldBackIds: UserId[];
  basis: RecommendationBasis;
  reasons: string[];
  /** Highest priority to play first. */
  factors: PlayerFactors[];
}

export interface FairnessInput {
  players: readonly Player[];
  availability: Readonly<Record<UserId, readonly ISODate[]>>;
  gameNights: readonly GameNightRecord[];
  /** The week being viewed, in any order. */
  dates: readonly ISODate[];
  today: ISODate;
  weights?: FairnessWeights;
}

const EPSILON = 1e-9;

function normalize(values: readonly (number | null)[], higherIsPriority: boolean): number[] {
  const known = values.filter((value): value is number => value !== null);
  if (known.length === 0) return values.map(() => 0);
  const min = Math.min(...known);
  const max = Math.max(...known);
  if (max - min < EPSILON) return values.map(() => 0);
  return values.map((value) => {
    if (value === null) return 0.5;
    return higherIsPriority ? (value - min) / (max - min) : (max - value) / (max - min);
  });
}

function sitOutWeight(ageInDays: number): number {
  if (ageInDays <= 7) return 1;
  if (ageInDays <= 14) return 0.6;
  if (ageInDays <= 30) return 0.3;
  return 0;
}

/** Stable per-date hash so exact ties don't always land on the same player. */
function tiebreakHash(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;
const percent = (value: number | null) => (value === null ? "n/a" : `${Math.round(value * 100)}%`);

export function recommendWeek(input: FairnessInput): DayRecommendation[] {
  const weights = input.weights ?? FAIRNESS_WEIGHTS;
  const weightTotal =
    weights.monthlyParticipation + weights.playRateWhenAvailable + weights.upcomingOpportunities + weights.recentSitOuts;
  const players = input.players;
  const nameOf = new Map(players.map((player) => [player.id, player.displayName]));
  const name = (id: UserId) => nameOf.get(id) ?? "Unknown";

  const recordedDates = new Set(input.gameNights.map((night) => night.date));
  const playedNights = input.gameNights
    .filter((night) => night.status === "played")
    .sort((a, b) => a.date.localeCompare(b.date));
  const allTime = new Map(computeStats(players, input.gameNights, { kind: "all" }).players.map((s) => [s.playerId, s]));
  const hasHistory = playedNights.length > 0;

  const monthStatsCache = new Map<string, Map<UserId, PlayerStats>>();
  const monthStats = (month: string) => {
    let stats = monthStatsCache.get(month);
    if (!stats) {
      stats = new Map(
        computeStats(players, input.gameNights, { kind: "month", month }).players.map((s) => [s.playerId, s]),
      );
      monthStatsCache.set(month, stats);
    }
    return stats;
  };

  const upcoming = [...input.dates]
    .filter((date) => date >= input.today && !recordedDates.has(date))
    .sort()
    .map((date) => ({ date, ids: availableOn(date, players, input.availability) }))
    .filter((day) => day.ids.length >= STACK_SIZE);

  const projected = new Map<string, Map<UserId, number>>();
  const addProjected = (date: ISODate, ids: readonly UserId[]) => {
    const month = monthKey(date);
    const counts = projected.get(month) ?? new Map<UserId, number>();
    for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
    projected.set(month, counts);
  };
  const proposedSitOuts = new Map<UserId, ISODate[]>();

  const firstUpcoming = upcoming[0]?.date;
  const lastRecorded = [...playedNights].reverse().find((night) => !firstUpcoming || night.date < firstUpcoming);
  let previousNightSitOuts: UserId[] = lastRecorded
    ? Object.entries(lastRecorded.attendance)
        .filter(([, outcome]) => outcome === "rotated_out")
        .map(([id]) => id)
    : [];

  const recommendations: DayRecommendation[] = [];

  for (const day of upcoming) {
    if (day.ids.length === STACK_SIZE) {
      addProjected(day.date, day.ids);
      previousNightSitOuts = [];
      continue;
    }

    const month = monthKey(day.date);
    const raw = day.ids.map((id) => {
      const recordedSitOuts = playedNights.filter(
        (night) => night.date < day.date && night.attendance[id] === "rotated_out",
      );
      const proposed = proposedSitOuts.get(id) ?? [];
      const pressure =
        recordedSitOuts.reduce((sum, night) => sum + sitOutWeight(daysBetween(night.date, day.date)), 0) +
        proposed.length;
      const lastRecordedSitOut = recordedSitOuts.at(-1)?.date ?? null;
      const lastProposed = proposed.at(-1) ?? null;
      const stats = allTime.get(id);
      return {
        playerId: id,
        playedThisMonth: monthStats(month).get(id)?.played ?? 0,
        projectedThisWeek: projected.get(month)?.get(id) ?? 0,
        playRate: stats?.playRate ?? null,
        otherOpportunities: upcoming.filter((other) => other.date !== day.date && other.ids.includes(id)).length,
        recentSitOutPressure: pressure,
        lastSitOut: lastProposed ?? lastRecordedSitOut,
        lastSitOutWasProposed: lastProposed !== null,
        allTimePlayed: stats?.played ?? 0,
      };
    });

    const participation = normalize(
      raw.map((r) => r.playedThisMonth + r.projectedThisWeek),
      false,
    );
    const playRate = normalize(
      raw.map((r) => r.playRate),
      false,
    );
    const opportunities = normalize(
      raw.map((r) => r.otherOpportunities),
      false,
    );
    const sitOuts = normalize(
      raw.map((r) => r.recentSitOutPressure),
      true,
    );

    const factors: PlayerFactors[] = raw.map((r, i) => {
      const components = {
        participation: participation[i],
        playRate: playRate[i],
        opportunities: opportunities[i],
        sitOuts: sitOuts[i],
      };
      const score =
        (weights.monthlyParticipation * components.participation +
          weights.playRateWhenAvailable * components.playRate +
          weights.upcomingOpportunities * components.opportunities +
          weights.recentSitOuts * components.sitOuts) /
        weightTotal;
      return { ...r, components, score };
    });

    const discriminating = factors.some((f) => f.score > EPSILON);
    const allTimeVaries = new Set(factors.map((f) => f.allTimePlayed)).size > 1;
    const basis: RecommendationBasis = hasHistory
      ? "history"
      : discriminating || allTimeVaries
        ? "availability"
        : "insufficient";

    const ranked = [...factors].sort(
      (a, b) =>
        b.score - a.score ||
        a.allTimePlayed - b.allTimePlayed ||
        tiebreakHash(`${day.date}:${a.playerId}`) - tiebreakHash(`${day.date}:${b.playerId}`),
    );

    if (basis === "insufficient") {
      recommendations.push({
        date: day.date,
        availableIds: day.ids,
        sitOutIds: [],
        heldBackIds: [],
        basis,
        reasons: [
          "Nobody has any game history yet and everyone has the same chances this week, so there's no fair pick to suggest. Decide between yourselves.",
        ],
        factors: ranked,
      });
      previousNightSitOuts = [];
      continue;
    }

    const sitOutCount = day.ids.length - STACK_SIZE;
    const lowestFirst = [...ranked].reverse();
    const eligible = lowestFirst.filter((f) => !previousNightSitOuts.includes(f.playerId));
    const pool = eligible.length >= sitOutCount ? eligible : lowestFirst;
    const sitOutIds = pool.slice(0, sitOutCount).map((f) => f.playerId);
    const heldBackIds =
      pool === eligible
        ? lowestFirst
            .slice(0, lowestFirst.findIndex((f) => f.playerId === sitOutIds.at(-1)))
            .filter((f) => previousNightSitOuts.includes(f.playerId))
            .map((f) => f.playerId)
        : [];

    recommendations.push({
      date: day.date,
      availableIds: day.ids,
      sitOutIds,
      heldBackIds,
      basis,
      reasons: explain(factors, sitOutIds, heldBackIds, weights, name),
      factors: ranked,
    });

    for (const id of sitOutIds) proposedSitOuts.set(id, [...(proposedSitOuts.get(id) ?? []), day.date]);
    addProjected(
      day.date,
      day.ids.filter((id) => !sitOutIds.includes(id)),
    );
    previousNightSitOuts = sitOutIds;
  }

  return recommendations;
}

function explain(
  factors: readonly PlayerFactors[],
  sitOutIds: readonly UserId[],
  heldBackIds: readonly UserId[],
  weights: FairnessWeights,
  name: (id: UserId) => string,
): string[] {
  const sitter = factors.find((f) => f.playerId === sitOutIds[0]);
  const others = factors.filter((f) => !sitOutIds.includes(f.playerId));
  if (!sitter || others.length === 0) return [];
  const s = name(sitter.playerId);

  const pick = (key: keyof FactorComponents) =>
    others.reduce((best, f) => (f.components[key] > best.components[key] ? f : best), others[0]);

  const candidates: { weight: number; text: string }[] = [];

  const p = pick("participation");
  const pGap = p.components.participation - sitter.components.participation;
  if (pGap > EPSILON) {
    const b = name(p.playerId);
    const text =
      sitter.playedThisMonth !== p.playedThisMonth
        ? `${s} has played ${plural(sitter.playedThisMonth, "night")} this month, compared to ${b}'s ${p.playedThisMonth}.`
        : `${s} is already in for ${plural(sitter.projectedThisWeek, "earlier night")} this week.`;
    candidates.push({ weight: weights.monthlyParticipation * pGap, text });
  }

  const o = pick("opportunities");
  const oGap = o.components.opportunities - sitter.components.opportunities;
  if (oGap > EPSILON) {
    const b = name(o.playerId);
    const tail = o.otherOpportunities === 0 ? `this is ${b}'s only one.` : `${b} has ${o.otherOpportunities}.`;
    candidates.push({
      weight: weights.upcomingOpportunities * oGap,
      text: `${s} has ${plural(sitter.otherOpportunities, "other gaming night")} this week; ${tail}`,
    });
  }

  const r = pick("playRate");
  const rGap = r.components.playRate - sitter.components.playRate;
  if (rGap > EPSILON && r.playRate !== null) {
    candidates.push({
      weight: weights.playRateWhenAvailable * rGap,
      text: `${name(r.playerId)} has played ${percent(r.playRate)} of the nights they were available, vs ${s}'s ${percent(sitter.playRate)}.`,
    });
  }

  const so = pick("sitOuts");
  const soGap = so.components.sitOuts - sitter.components.sitOuts;
  if (soGap > EPSILON && so.lastSitOut) {
    const b = name(so.playerId);
    candidates.push({
      weight: weights.recentSitOuts * soGap,
      text: so.lastSitOutWasProposed
        ? `${b} is already suggested to sit out ${formatWeekdayLong(so.lastSitOut)}.`
        : `${b} sat out recently (${formatMonthDay(so.lastSitOut)}).`,
    });
  }

  const reasons = candidates
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 2)
    .map((c) => c.text);

  if (reasons.length === 0) {
    const mostAllTime = Math.max(...factors.map((f) => f.allTimePlayed));
    reasons.push(
      sitter.allTimePlayed === mostAllTime && factors.some((f) => f.allTimePlayed !== mostAllTime)
        ? `Everyone's level this month, so the tiebreak goes to all-time games: ${s} has played the most (${sitter.allTimePlayed}).`
        : `Everyone's level on every factor, so this is a stable tiebreak. Any rotation is equally fair.`,
    );
  }

  if (heldBackIds.length > 0) {
    reasons.push(`${heldBackIds.map(name).join(" and ")} sat out the previous game night, so they're not suggested again.`);
  }

  return reasons;
}
