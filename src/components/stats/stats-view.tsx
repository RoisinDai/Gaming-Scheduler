"use client";

import { ChevronLeft, ChevronRight, ClipboardPen, Trophy } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useSquad } from "@/components/providers/squad-provider";
import { Avatar } from "@/components/ui/avatar";
import { PageHeader } from "@/components/ui/page-header";
import { Tip } from "@/components/ui/tip";
import { addMonths, formatMonthDay, formatMonthLong, monthKey } from "@/lib/domain/dates";
import type { Player } from "@/lib/domain/types";
import { computeStats, inPeriod, unrecordedPotentialNights, type PlayerStats, type StatsPeriod } from "@/lib/engine/stats";

const TIPS = {
  played: "Recorded game nights this player actually played.",
  available: "Recorded game nights this player was available for (marked available, or played anyway).",
  ratio: "Played ÷ available, as raw counts.",
  playRate: "Play rate when available: nights played ÷ nights they were available for. Measures equal opportunity.",
  participation: "Overall participation: nights played ÷ all squad game nights. Measures total time with the squad.",
  sitOuts: "Forced sit-outs: nights they were available but rotated out because too many were in. Being unavailable doesn't count.",
  lastPlayed: "Most recent recorded game night they played.",
};

const pct = (value: number | null) => (value === null ? "—" : `${Math.round(value * 100)}%`);

function Bar({ value, tone }: { value: number | null; tone: "go" | "val" }) {
  return (
    <span className="flex items-center gap-2">
      <span className="h-2 w-24 bg-bone/[0.08] lg:w-32">
        <span
          className={`block h-full transition-[width] duration-500 ${tone === "go" ? "bg-go" : "bg-val"}`}
          style={{ width: `${Math.round((value ?? 0) * 100)}%` }}
        />
      </span>
      <span className="w-10 font-display text-base font-semibold tabular-nums">{pct(value)}</span>
    </span>
  );
}

function SummaryCard({ label, value, hint, tip }: { label: string; value: string; hint?: string; tip: string }) {
  return (
    <div className="panel panel-tick p-5">
      <p className="eyebrow">
        <Tip text={tip} align="left">
          {label}
        </Tip>
      </p>
      <p className="mt-3 font-display text-5xl leading-none font-bold">{value}</p>
      {hint && <p className="mt-2 text-xs text-haze">{hint}</p>}
    </div>
  );
}

export function StatsView() {
  const { data, today, me } = useSquad();
  const [mode, setMode] = useState<"month" | "all">("month");
  const [month, setMonth] = useState(() => monthKey(today));

  const period = useMemo<StatsPeriod>(() => (mode === "all" ? { kind: "all" } : { kind: "month", month }), [mode, month]);
  const stats = useMemo(() => computeStats(data.players, data.gameNights, period), [data, period]);
  const unrecorded = useMemo(
    () => unrecordedPotentialNights(data.players, data.availability, data.gameNights, today).filter((d) => inPeriod(d, period)),
    [data, today, period],
  );

  const earliestMonth = data.gameNights.length > 0 ? monthKey(data.gameNights[0].date) : monthKey(today);
  const rows = [...stats.players].sort(
    (a, b) => (b.participation ?? -1) - (a.participation ?? -1) || b.played - a.played || (b.playRate ?? -1) - (a.playRate ?? -1),
  );
  const playerById = new Map(data.players.map((p) => [p.id, p]));
  const hasData = stats.totalGameNights + stats.noGameNights > 0;

  return (
    <div className="space-y-8">
      <PageHeader
        index="03"
        title="Stats"
        subtitle="Built only from recorded attendance. Availability alone never counts as a game played."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            {mode === "month" && (
              <div className="flex items-center gap-2">
                <button className="btn-icon" aria-label="Previous month" disabled={month <= earliestMonth} onClick={() => setMonth(addMonths(month, -1))}>
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="min-w-36 text-center font-display text-base font-semibold tracking-[0.1em] uppercase">
                  {formatMonthLong(month)}
                </span>
                <button className="btn-icon" aria-label="Next month" disabled={month >= monthKey(today)} onClick={() => setMonth(addMonths(month, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
            <div className="segmented">
              <button
                aria-pressed={mode === "month"}
                onClick={() => {
                  setMode("month");
                  setMonth(monthKey(today));
                }}
              >
                This month
              </button>
              <button aria-pressed={mode === "all"} onClick={() => setMode("all")}>
                All time
              </button>
            </div>
          </div>
        }
      />

      {unrecorded.length > 0 && (
        <Link href="/schedule" className="panel flex items-center gap-3 p-4 text-sm transition-colors hover:border-bone/30">
          <ClipboardPen className="h-4 w-4 shrink-0 text-val" />
          <span>
            <span className="font-semibold">
              {unrecorded.length} potential game night{unrecorded.length === 1 ? "" : "s"} not recorded
            </span>
            <span className="text-mist"> and not counted here. Record them on the Gaming Schedule.</span>
          </span>
        </Link>
      )}

      {!hasData ? (
        <div className="panel panel-tick flex flex-col items-center px-6 py-16 text-center">
          <Trophy className="h-10 w-10 text-haze" />
          <h2 className="heading mt-4 text-3xl">No game nights recorded{mode === "month" ? " this month" : ""}</h2>
          <p className="mt-2 max-w-md text-sm text-mist">
            After you play, open that night on the Gaming Schedule and tap who played. Stats build up from there.
          </p>
          <Link href="/schedule" className="btn-primary mt-6">
            Go to schedule
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <SummaryCard label="Game nights" value={String(stats.totalGameNights)} tip="Recorded nights where the squad actually played." />
            <SummaryCard
              label="Avg available"
              value={stats.averageAvailable === null ? "—" : stats.averageAvailable.toFixed(1)}
              hint="players per game night"
              tip="Average number of players available on recorded game nights."
            />
            <SummaryCard
              label="Excess nights"
              value={String(stats.excessNights)}
              hint="more than five available"
              tip="Recorded game nights where more than five players were available, so someone may have had to rotate out."
            />
            <SummaryCard
              label="No-game nights"
              value={String(stats.noGameNights)}
              hint="recorded as didn't happen"
              tip="Nights someone recorded as no game. They don't count toward anyone's stats."
            />
          </div>

          <section className="panel">
            <div className="flex items-center justify-between border-b border-bone/[0.08] px-4 py-3">
              <p className="font-display text-sm font-semibold tracking-[0.2em] uppercase">Squad leaderboard</p>
              <p className="text-xs text-haze">{mode === "all" ? "All time" : formatMonthLong(month)}</p>
            </div>

            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="eyebrow text-left">
                    <th className="w-10 py-3 pl-4 font-semibold">#</th>
                    <th className="py-3 pr-4 font-semibold">Player</th>
                    <th className="py-3 pr-4 font-semibold"><Tip text={TIPS.played}>Played</Tip></th>
                    <th className="py-3 pr-4 font-semibold"><Tip text={TIPS.available}>Avail.</Tip></th>
                    <th className="py-3 pr-4 font-semibold"><Tip text={TIPS.ratio}>P / A</Tip></th>
                    <th className="py-3 pr-4 font-semibold"><Tip text={TIPS.playRate}>Play rate</Tip></th>
                    <th className="py-3 pr-4 font-semibold"><Tip text={TIPS.participation}>Participation</Tip></th>
                    <th className="py-3 pr-4 font-semibold"><Tip text={TIPS.sitOuts} align="right">Sit-outs</Tip></th>
                    <th className="py-3 pr-4 font-semibold"><Tip text={TIPS.lastPlayed} align="right">Last played</Tip></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => {
                    const player = playerById.get(row.playerId);
                    return player ? <LeaderRow key={row.playerId} rank={i + 1} row={row} player={player} isMe={player.id === me.id} /> : null;
                  })}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-bone/[0.06] lg:hidden">
              {rows.map((row, i) => {
                const player = playerById.get(row.playerId);
                if (!player) return null;
                return (
                  <li key={row.playerId} className="space-y-3 p-4">
                    <div className="flex items-center gap-3">
                      <span className="w-5 font-display text-lg font-bold text-haze">{i + 1}</span>
                      <Avatar player={player} size={36} tone={player.id === me.id ? "val" : "none"} />
                      <span className="heading flex-1 text-lg">{player.displayName}</span>
                      <span className="font-display text-lg font-semibold tabular-nums">
                        {row.played}
                        <span className="text-haze">/{row.available}</span>
                      </span>
                    </div>
                    <div className="grid grid-cols-[6.5rem_1fr] items-center gap-y-2 pl-8 text-xs text-mist">
                      <span>Play rate</span>
                      <Bar value={row.playRate} tone="go" />
                      <span>Participation</span>
                      <Bar value={row.participation} tone="val" />
                      <span>Sit-outs</span>
                      <span className="text-bone">{row.forcedSitOuts}</span>
                      <span>Last played</span>
                      <span className="text-bone">{row.lastPlayed ? formatMonthDay(row.lastPlayed) : "—"}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <p className="text-xs leading-relaxed text-haze">
            Play rate compares a player to their own availability; participation compares them to the whole squad. Someone
            on call for a week can have a high play rate but lower participation, and the rotation suggestions take both into
            account.
          </p>
        </>
      )}
    </div>
  );
}

function LeaderRow({ rank, row, player, isMe }: { rank: number; row: PlayerStats; player: Player; isMe: boolean }) {
  return (
    <tr className={`border-t border-bone/[0.06] transition-colors hover:bg-ink-800/50 ${isMe ? "bg-val/[0.04]" : ""}`}>
      <td className="py-3 pl-4 font-display text-lg font-bold text-haze">{rank}</td>
      <td className="py-3 pr-4">
        <span className="flex items-center gap-3">
          <Avatar player={player} size={34} tone={isMe ? "val" : "none"} />
          <span className="font-display text-base font-semibold tracking-[0.1em] uppercase">{player.displayName}</span>
        </span>
      </td>
      <td className="py-3 pr-4 font-display text-lg font-semibold tabular-nums">{row.played}</td>
      <td className="py-3 pr-4 font-display text-lg tabular-nums text-mist">{row.available}</td>
      <td className="py-3 pr-4 font-display text-lg tabular-nums">
        {row.played}
        <span className="text-haze">/{row.available}</span>
      </td>
      <td className="py-3 pr-4"><Bar value={row.playRate} tone="go" /></td>
      <td className="py-3 pr-4"><Bar value={row.participation} tone="val" /></td>
      <td className="py-3 pr-4">
        <span className="font-display text-lg tabular-nums">{row.forcedSitOuts}</span>
        {row.lastSitOut && <span className="ml-2 text-xs text-haze">last {formatMonthDay(row.lastSitOut)}</span>}
      </td>
      <td className="py-3 pr-4 text-mist">{row.lastPlayed ? formatMonthDay(row.lastPlayed) : "—"}</td>
    </tr>
  );
}
