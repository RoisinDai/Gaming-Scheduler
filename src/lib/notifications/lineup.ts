import { STACK_SIZE } from "@/lib/config";
import { formatFullDate, startOfWeek, weekDates } from "@/lib/domain/dates";
import type { ISODate, SquadData } from "@/lib/domain/types";
import { recommendWeek } from "@/lib/engine/fairness";
import { availableOn } from "@/lib/engine/schedule";

export type Lineup = {
  available: string[];
  lineup: string[];
  sitOuts: string[];
  kind: "short" | "ready" | "rotation" | "undecided";
};

export type NotificationState = {
  candidate: Lineup | null;
  candidateSince: string | null;
  announced: Lineup | null;
};

export type NotificationPlan = {
  candidate: Lineup;
  candidateSince: string;
  pending: boolean;
  send: boolean;
};

const sorted = (ids: readonly string[]) => [...new Set(ids)].sort();
const difference = (a: string[], b: string[]) => a.filter(id => !b.includes(id));
const same = (a: Lineup | null, b: Lineup) =>
  a !== null && a.kind === b.kind &&
  JSON.stringify(a.available) === JSON.stringify(b.available) &&
  JSON.stringify(a.lineup) === JSON.stringify(b.lineup) &&
  JSON.stringify(a.sitOuts) === JSON.stringify(b.sitOuts);

export function lineupForToday(data: SquadData, date: ISODate): Lineup | null {
  if (data.gameNights.some(n => n.date === date)) return null;
  const available = sorted(availableOn(date, data.players, data.availability));
  if (available.length < STACK_SIZE) return { available, lineup: [], sitOuts: [], kind: "short" };
  if (available.length === STACK_SIZE) return { available, lineup: available, sitOuts: [], kind: "ready" };
  const rec = recommendWeek({ ...data, today: date, dates: weekDates(startOfWeek(date)) })
    .find(r => r.date === date);
  if (!rec || rec.basis === "insufficient" || !rec.sitOutIds.length) {
    return { available, lineup: [], sitOuts: [], kind: "undecided" };
  }
  const sitOuts = sorted(rec.sitOutIds);
  return { available, lineup: difference(available, sitOuts), sitOuts, kind: "rotation" };
}

/** First daily evaluation is immediate; subsequent changes must persist for two minutes. */
export function planNotification(state: NotificationState, current: Lineup, now: string): NotificationPlan {
  const unchanged = same(state.candidate, current);
  const candidateSince = unchanged && state.candidateSince ? state.candidateSince : now;
  const base = { candidate: current, candidateSince };
  const meaningful = !same(state.announced, current) &&
    (current.kind !== "short" || (state.announced !== null && state.announced.kind !== "short"));
  if (!meaningful) return { ...base, pending: false, send: false };
  const stable = state.candidate === null || Date.parse(now) - Date.parse(candidateSince) >= 120_000;
  return { ...base, pending: !stable, send: stable };
}

export type DiscordMessage = {
  content: string;
  allowed_mentions: { parse: []; users: string[] };
};

export function buildDiscordMessage(
  current: Lineup, previous: Lineup | null, date: ISODate, data: SquadData, origin: string,
): DiscordMessage {
  const names = new Map(data.players.map(p => [p.id, p.displayName]));
  const added = difference(current.available, previous?.available ?? []);
  const removed = difference(previous?.available ?? [], current.available);
  // Only call someone rotated out if they are still available; unavailability has its own section.
  const rotatedIn = previous ? current.lineup.filter(id => previous.sitOuts.includes(id)) : [];
  const rotatedOut = previous ? current.sitOuts.filter(id => previous.lineup.includes(id)) : [];
  const affected = previous && previous.kind !== "short"
    ? sorted([...added, ...removed, ...rotatedIn, ...rotatedOut,
        ...difference(current.sitOuts, previous.sitOuts).filter(id => previous.available.includes(id)),
        ...difference(previous.sitOuts, current.sitOuts).filter(id => current.available.includes(id))])
    : current.kind === "short" ? sorted([...added, ...removed]) : current.available;
  // Explicit allowlist prevents @everyone, @here and role pings.
  const mentionIds = affected.filter(id => /^\d{17,20}$/.test(id));
  const clean = (name: string) => name.replace(/[\\`*_~|<>@#\r\n]/g, " ").trim().slice(0, 80) || "Player";
  const label = (id: string) => mentionIds.includes(id) ? `<@${id}>` : clean(names.get(id) ?? "Former player");
  const list = (ids: string[]) => ids.map(label).join(", ");
  let title: string;
  if (current.kind === "short") title = "🚨 Attention needed — Player short!";
  else if (current.kind === "ready") title = previous && previous.available.length > STACK_SIZE
    ? "✅ Rotation no longer needed!" : "🎮 Today's five-stack is ready!";
  else if (previous?.kind === "ready" || previous?.kind === "short") title = "⚠️ Lineup changed — Rotation needed!";
  else if (previous && previous.kind === "rotation" && current.kind === "rotation" &&
    (rotatedIn.length || rotatedOut.length || added.length || removed.length)) title = "🔄 Today's recommended rotation has changed!";
  else title = "⚠️ Today's rotation — Attention needed!";

  const lines = [`**${title}**`, formatFullDate(date), ""];
  if (previous) {
    if (added.length) lines.push(`**Now available:** ${list(added)}`);
    if (removed.length) lines.push(`**No longer available:** ${list(removed)}`);
    if (rotatedIn.length) lines.push(`**Rotated in:** ${list(rotatedIn)}`);
    if (rotatedOut.length) lines.push(`**Rotated out:** ${list(rotatedOut)}`);
    if (added.length || removed.length || rotatedIn.length || rotatedOut.length) lines.push("");
  }
  if (current.kind === "short") {
    const needed = STACK_SIZE - current.available.length;
    lines.push(`We now have ${current.available.length} available and need ${needed} more for a five-stack.`);
    if (current.available.length) lines.push("", `**Available players:** ${list(current.available)}`);
  } else if (current.kind === "ready") {
    lines.push("We have exactly 5 players available today.", "", `**Today's lineup:** ${list(current.lineup)}`);
  } else {
    lines.push(`We have ${current.available.length} players available today for 5 spots.`, "");
    if (current.kind === "undecided") {
      lines.push(`**Available players:** ${list(current.available)}`, "",
        "There isn't enough fairness data to recommend a rotation. Please decide among yourselves.");
    } else {
      lines.push(`**Recommended lineup:** ${list(current.lineup)}`, "",
        `**Suggested sit-out${current.sitOuts.length === 1 ? "" : "s"}:** ${list(current.sitOuts)}`, "",
        "This is a recommendation, not a confirmed lineup.");
    }
  }
  lines.push("", `[View Gaming Schedule](${origin.replace(/\/$/, "")}/schedule)`);
  return { content: lines.join("\n"), allowed_mentions: { parse: [], users: mentionIds } };
}
