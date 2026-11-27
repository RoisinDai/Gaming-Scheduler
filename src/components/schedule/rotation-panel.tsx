"use client";

import { ChevronDown, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { useSquad } from "@/components/providers/squad-provider";
import { Avatar } from "@/components/ui/avatar";
import { Tip } from "@/components/ui/tip";
import { formatMonthDay } from "@/lib/domain/dates";
import type { DayRecommendation } from "@/lib/engine/fairness";

const pct = (value: number | null) => (value === null ? "—" : `${Math.round(value * 100)}%`);

export function RotationPanel({ recommendation }: { recommendation: DayRecommendation }) {
  const { playerById } = useSquad();
  const [showNumbers, setShowNumbers] = useState(false);
  const sitOuts = recommendation.sitOutIds.map(playerById).filter((p) => p !== undefined);

  return (
    <section className="border border-warn/40 bg-warn/[0.06]">
      <div className="flex items-center justify-between gap-3 border-b border-warn/25 px-4 py-3">
        <p className="flex items-center gap-2 font-display text-sm font-semibold tracking-[0.18em] text-warn uppercase">
          <TriangleAlert className="h-4 w-4" />
          {recommendation.availableIds.length} available · rotation may be needed
        </p>
        <span className="chip border border-warn/40 text-warn">Suggestion only</span>
      </div>

      <div className="space-y-4 p-4">
        {sitOuts.length > 0 ? (
          <div className="flex items-center gap-4">
            {sitOuts.map((player) => (
              <Avatar key={player.id} player={player} size={52} tone="warn" />
            ))}
            <div>
              <p className="eyebrow">Suggested to rotate out</p>
              <p className="heading text-2xl">{sitOuts.map((p) => p.displayName).join(" & ")}</p>
            </div>
          </div>
        ) : (
          <p className="heading text-xl">No fair pick yet</p>
        )}

        <ul className="space-y-2">
          {recommendation.reasons.map((reason) => (
            <li key={reason} className="flex gap-3 text-sm leading-relaxed text-bone/90">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rotate-45 bg-warn" />
              {reason}
            </li>
          ))}
        </ul>

        {recommendation.basis === "availability" && (
          <p className="text-xs text-mist">No attendance history yet, so this is based mostly on who has other nights this week.</p>
        )}

        <button
          onClick={() => setShowNumbers((v) => !v)}
          className="flex cursor-pointer items-center gap-1.5 font-display text-xs font-semibold tracking-[0.18em] text-mist uppercase hover:text-bone"
          aria-expanded={showNumbers}
        >
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showNumbers ? "rotate-180" : ""}`} />
          {showNumbers ? "Hide the numbers" : "Show the numbers"}
        </button>

        {showNumbers && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="eyebrow text-left">
                  <th className="py-2 pr-3 font-semibold">Player</th>
                  <th className="py-2 pr-3 font-semibold">
                    <Tip text="Recorded game nights played this calendar month.">Month</Tip>
                  </th>
                  <th className="py-2 pr-3 font-semibold">
                    <Tip text="All-time: nights played ÷ nights they were available for.">Play rate</Tip>
                  </th>
                  <th className="py-2 pr-3 font-semibold">
                    <Tip text="Other five-plus nights this week this player is available for.">Other nights</Tip>
                  </th>
                  <th className="py-2 pr-3 font-semibold">
                    <Tip text="Most recent time they were rotated out (recorded, or suggested earlier this week)." align="right">
                      Last sit-out
                    </Tip>
                  </th>
                  <th className="py-2 font-semibold">
                    <Tip text="Combined priority to play. Higher means a stronger claim to a slot tonight." align="right">
                      Priority
                    </Tip>
                  </th>
                </tr>
              </thead>
              <tbody>
                {recommendation.factors.map((factor) => {
                  const player = playerById(factor.playerId);
                  if (!player) return null;
                  const sitting = recommendation.sitOutIds.includes(factor.playerId);
                  return (
                    <tr key={factor.playerId} className={`border-t border-bone/[0.06] ${sitting ? "text-warn" : "text-bone/90"}`}>
                      <td className="py-2 pr-3">
                        <span className="flex items-center gap-2">
                          <Avatar player={player} size={24} tooltip={false} tone={sitting ? "warn" : "none"} />
                          {player.displayName}
                        </span>
                      </td>
                      <td className="py-2 pr-3 tabular-nums">
                        {factor.playedThisMonth}
                        {factor.projectedThisWeek > 0 && <span className="text-haze"> +{factor.projectedThisWeek}</span>}
                      </td>
                      <td className="py-2 pr-3 tabular-nums">{pct(factor.playRate)}</td>
                      <td className="py-2 pr-3 tabular-nums">{factor.otherOpportunities}</td>
                      <td className="py-2 pr-3">
                        {factor.lastSitOut ? (
                          <>
                            {formatMonthDay(factor.lastSitOut)}
                            {factor.lastSitOutWasProposed && <span className="text-haze"> (suggested)</span>}
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-2">
                        <span className="flex items-center gap-2">
                          <span className="h-1.5 w-20 bg-bone/10">
                            <span
                              className={`block h-full ${sitting ? "bg-warn" : "bg-bone/70"}`}
                              style={{ width: `${Math.round(factor.score * 100)}%` }}
                            />
                          </span>
                          <span className="tabular-nums">{Math.round(factor.score * 100)}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-haze">
              Month column shows recorded nights; “+N” is earlier nights this week they&apos;re projected to play.
            </p>
          </div>
        )}

        <p className="border-t border-warn/20 pt-3 text-xs text-mist">
          Everyone stays on the schedule. This is a nudge for fairness. Sort it out in Discord.
        </p>
      </div>
    </section>
  );
}
