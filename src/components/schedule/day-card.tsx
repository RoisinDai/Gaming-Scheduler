"use client";

import { ClipboardCheck, ClipboardPen, Ban } from "lucide-react";
import { useSquad } from "@/components/providers/squad-provider";
import { Avatar } from "@/components/ui/avatar";
import { formatDayNumber, formatMonthDay, formatWeekdayShort } from "@/lib/domain/dates";
import type { GameNightRecord } from "@/lib/domain/types";
import type { DayAvailability } from "@/lib/engine/schedule";

const CARD_STYLE: Record<DayAvailability["state"], string> = {
  empty: "border-bone/[0.06] bg-ink-900/40",
  building: "border-bone/10 bg-ink-850/90",
  stack: "border-go/55 bg-go/[0.09]",
  excess: "border-warn/55 bg-warn/[0.07]",
};

const BAR_STYLE: Record<DayAvailability["state"], string> = {
  empty: "bg-transparent",
  building: "bg-bone/15",
  stack: "bg-go",
  excess: "bg-warn",
};

export function DayCard({
  day,
  record,
  needsRecord,
  onOpen,
  index,
}: {
  day: DayAvailability;
  record: GameNightRecord | undefined;
  needsRecord: boolean;
  onOpen: () => void;
  index: number;
}) {
  const { today, playerById } = useSquad();
  const isToday = day.date === today;
  const isPast = day.date < today;
  const tone = day.state === "stack" ? "go" : day.state === "excess" ? "warn" : "none";
  const playedCount = record ? Object.values(record.attendance).filter((o) => o === "played").length : 0;

  return (
    <div
      style={{ animationDelay: `${index * 35}ms` }}
      className={`animate-rise group relative flex gap-4 border p-4 transition-colors hover:border-bone/40 lg:min-h-72 lg:flex-col lg:gap-3 ${CARD_STYLE[day.state]} ${
        isPast ? "opacity-70 hover:opacity-100" : ""
      }`}
    >
      <span className={`absolute inset-x-0 top-0 h-[3px] ${BAR_STYLE[day.state]}`} />
      <button
        onClick={onOpen}
        className="absolute inset-0 cursor-pointer"
        aria-label={`Open ${formatWeekdayShort(day.date)} ${formatMonthDay(day.date)}`}
      />

      <div className="pointer-events-none flex w-16 shrink-0 flex-col lg:w-full lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="font-display text-sm font-semibold tracking-[0.24em] text-mist uppercase">{formatWeekdayShort(day.date)}</p>
          <p className="font-display text-4xl leading-none font-bold text-bone lg:text-5xl">{formatDayNumber(day.date)}</p>
        </div>
        {isToday && <span className="chip mt-2 w-fit bg-val text-bone lg:mt-0">Today</span>}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="pointer-events-none flex items-center justify-between gap-2">
          <CountLabel day={day} />
        </div>

        {day.count > 0 ? (
          <div className="relative z-10 flex w-fit flex-wrap gap-1.5">
            {day.playerIds.map((id) => {
              const player = playerById(id);
              return player ? <Avatar key={id} player={player} size={34} tone={tone} /> : null;
            })}
          </div>
        ) : (
          <p className="pointer-events-none text-xs text-haze">{isPast ? "Nobody was marked." : "Nobody's in yet."}</p>
        )}

        <div className="pointer-events-none mt-auto flex flex-wrap items-center gap-2">
          {record?.status === "played" && (
            <span className="chip bg-go/15 text-go">
              <ClipboardCheck className="h-3 w-3" /> Played · {playedCount}
            </span>
          )}
          {record?.status === "no_game" && (
            <span className="chip bg-bone/10 text-mist">
              <Ban className="h-3 w-3" /> No game
            </span>
          )}
          {!record && needsRecord && (
            <span className="chip border border-bone/25 text-bone">
              <ClipboardPen className="h-3 w-3" /> Record night
            </span>
          )}
        </div>
      </div>

      {day.state === "excess" && !isPast && (
        <button
          onClick={onOpen}
          className="chamfer-sm absolute top-3 right-3 z-20 flex h-8 w-8 cursor-pointer items-center justify-center bg-warn font-display text-xl font-bold text-ink-900 transition-transform hover:scale-110"
          aria-label="More than five available: see rotation suggestion"
          title="More than five available: see rotation suggestion"
        >
          !
        </button>
      )}
    </div>
  );
}

function CountLabel({ day }: { day: DayAvailability }) {
  if (day.state === "empty") return <span className="font-display text-sm tracking-[0.2em] text-haze uppercase">—</span>;
  const color = day.state === "stack" ? "text-go" : day.state === "excess" ? "text-warn" : "text-bone";
  const label = day.state === "stack" ? "5-stack" : day.state === "excess" ? "Rotation" : "In";
  return (
    <span className="flex items-baseline gap-2">
      <span className={`font-display text-3xl leading-none font-bold ${color}`}>{day.count}</span>
      <span className={`font-display text-xs font-semibold tracking-[0.22em] uppercase ${day.state === "building" ? "text-mist" : color}`}>
        {label}
      </span>
    </span>
  );
}
