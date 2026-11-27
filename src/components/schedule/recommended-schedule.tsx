"use client";

import { ChevronDown, Scale } from "lucide-react";
import { useState } from "react";
import { useSquad } from "@/components/providers/squad-provider";
import { Avatar } from "@/components/ui/avatar";
import { formatMonthDay, formatWeekdayShort } from "@/lib/domain/dates";
import type { DayRecommendation } from "@/lib/engine/fairness";

export function RecommendedSchedule({
  recommendations,
  onOpen,
}: {
  recommendations: DayRecommendation[];
  onOpen: (date: string) => void;
}) {
  const { playerById } = useSquad();
  const [open, setOpen] = useState(false);

  return (
    <section className="panel">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center justify-between gap-4 px-4 py-3.5 text-left hover:bg-ink-800/60"
      >
        <span className="flex items-center gap-3">
          <Scale className="h-4 w-4 text-warn" />
          <span className="font-display text-sm font-semibold tracking-[0.2em] uppercase">Recommended rotations</span>
          <span className="chip bg-warn/15 text-warn">
            {recommendations.length} night{recommendations.length === 1 ? "" : "s"}
          </span>
        </span>
        <ChevronDown className={`h-4 w-4 text-haze transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t border-bone/[0.08]">
          {recommendations.length === 0 ? (
            <p className="px-4 py-5 text-sm text-mist">No rotations needed. No upcoming night this week has more than five players.</p>
          ) : (
            <ul>
              {recommendations.map((rec) => (
                <li key={rec.date} className="flex flex-col gap-3 border-b border-bone/[0.06] px-4 py-4 last:border-0 sm:flex-row sm:items-center">
                  <div className="w-24 shrink-0">
                    <p className="font-display text-sm font-semibold tracking-[0.2em] text-mist uppercase">{formatWeekdayShort(rec.date)}</p>
                    <p className="font-display text-xl font-bold uppercase">{formatMonthDay(rec.date)}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {rec.availableIds.map((id) => {
                      const player = playerById(id);
                      return player ? (
                        <Avatar key={id} player={player} size={28} tone={rec.sitOutIds.includes(id) ? "warn" : "none"} />
                      ) : null;
                    })}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      {rec.sitOutIds.length > 0 ? (
                        <>
                          <span className="text-mist">Suggest </span>
                          <span className="font-semibold text-warn">
                            {rec.sitOutIds.map((id) => playerById(id)?.displayName).join(" & ")}
                          </span>
                          <span className="text-mist"> rotates out</span>
                        </>
                      ) : (
                        <span className="text-mist">No fair pick yet</span>
                      )}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-haze">{rec.reasons[0]}</p>
                  </div>
                  <button className="btn-ghost shrink-0 py-1.5 text-xs" onClick={() => onOpen(rec.date)}>
                    Details
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
