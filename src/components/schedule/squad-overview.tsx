"use client";

import { CalendarCheck, CalendarX } from "lucide-react";
import { useSquad } from "@/components/providers/squad-provider";
import { Avatar } from "@/components/ui/avatar";
import { addDays, formatRelativeTime, timeZoneName } from "@/lib/domain/dates";
import { countInRange } from "@/lib/engine/availability";

export function SquadOverview() {
  const { data, weekStart, me } = useSquad();
  const weekEnd = addDays(weekStart, 6);

  return (
    <section className="panel panel-tick p-4">
      <p className="eyebrow">Squad · this week</p>
      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3 lg:grid-cols-6">
        {data.players.map((player) => {
          const days = countInRange(data.availability[player.id] ?? [], weekStart, weekEnd);
          return (
            <div key={player.id} className="flex items-center gap-3">
              <Avatar player={player} size={40} tone={player.id === me.id ? "val" : "none"} />
              <div className="min-w-0">
                <p className="truncate font-display text-base leading-tight font-semibold tracking-[0.08em] uppercase">
                  {player.displayName}
                  <span className="ml-1.5 text-[11px] tracking-[0.12em] text-haze">{timeZoneName(player.timezone, "short")}</span>
                </p>
                <p className={`flex items-center gap-1 text-xs ${days > 0 ? "text-go" : "text-haze"}`}>
                  {days > 0 ? <CalendarCheck className="h-3 w-3" /> : <CalendarX className="h-3 w-3" />}
                  {days > 0 ? `${days} day${days === 1 ? "" : "s"} marked` : "Nothing marked"}
                </p>
                <p className="text-[11px] text-haze" suppressHydrationWarning>
                  {player.availabilityUpdatedAt ? `Updated ${formatRelativeTime(player.availabilityUpdatedAt)}` : "Never updated"}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
