"use client";

import { ClipboardPen } from "lucide-react";
import { useMemo, useState } from "react";
import { useSquad } from "@/components/providers/squad-provider";
import { PageHeader } from "@/components/ui/page-header";
import { WeekNav } from "@/components/ui/week-nav";
import { formatMonthDay, formatWeekdayShort, startOfWeek, weekDates } from "@/lib/domain/dates";
import type { ISODate } from "@/lib/domain/types";
import { recommendWeek } from "@/lib/engine/fairness";
import { buildDay, buildDays } from "@/lib/engine/schedule";
import { unrecordedPotentialNights } from "@/lib/engine/stats";
import { DayCard } from "./day-card";
import { DayDialog } from "./day-dialog";
import { RecommendedSchedule } from "./recommended-schedule";
import { SquadOverview } from "./squad-overview";

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-mist">
      <span className="flex items-center gap-2">
        <span className="h-3 w-3 border border-bone/25 bg-ink-800" /> 1–4 in
      </span>
      <span className="flex items-center gap-2">
        <span className="h-3 w-3 border border-go bg-go/30" /> 5-stack
      </span>
      <span className="flex items-center gap-2">
        <span className="chamfer-sm flex h-4 w-4 items-center justify-center bg-warn font-display text-[11px] font-bold text-ink-900">!</span>
        6 in · rotation
      </span>
    </div>
  );
}

export function GamingSchedule() {
  const { data, today, weekStart, setWeekStart } = useSquad();
  const [openDate, setOpenDate] = useState<ISODate | null>(null);

  const dates = useMemo(() => weekDates(weekStart), [weekStart]);
  const days = useMemo(() => buildDays(dates, data.players, data.availability), [dates, data.players, data.availability]);
  const recommendations = useMemo(
    () =>
      recommendWeek({
        players: data.players,
        availability: data.availability,
        gameNights: data.gameNights,
        dates,
        today,
      }),
    [data, dates, today],
  );
  const records = useMemo(() => new Map(data.gameNights.map((night) => [night.date, night])), [data.gameNights]);
  const unrecorded = useMemo(
    () => unrecordedPotentialNights(data.players, data.availability, data.gameNights, today),
    [data, today],
  );

  const recFor = (date: ISODate) => recommendations.find((r) => r.date === date);
  const openDay = openDate ? buildDay(openDate, data.players, data.availability) : null;

  const openAnywhere = (date: ISODate) => {
    setWeekStart(startOfWeek(date));
    setOpenDate(date);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        index="02"
        title="Gaming Schedule"
        subtitle="Everyone's availability, combined."
        actions={<Legend />}
      />

      <WeekNav />

      {unrecorded.length > 0 && (
        <div className="panel flex flex-col gap-3 border-bone/15 p-4 sm:flex-row sm:items-center">
          <p className="flex items-center gap-2 text-sm">
            <ClipboardPen className="h-4 w-4 text-val" />
            <span>
              <span className="font-semibold">
                {unrecorded.length} past game night{unrecorded.length === 1 ? "" : "s"}
              </span>{" "}
              <span className="text-mist">without attendance. Stats only count recorded nights.</span>
            </span>
          </p>
          <div className="flex flex-wrap gap-2 sm:ml-auto">
            {unrecorded.slice(-4).map((date) => (
              <button key={date} className="btn-ghost py-1 text-xs" onClick={() => openAnywhere(date)}>
                {formatWeekdayShort(date)} {formatMonthDay(date)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-2 lg:grid-cols-7 lg:gap-3">
        {days.map((day, i) => (
          <DayCard
            key={day.date}
            day={day}
            index={i}
            record={records.get(day.date)}
            needsRecord={unrecorded.includes(day.date)}
            onOpen={() => setOpenDate(day.date)}
          />
        ))}
      </div>

      <RecommendedSchedule recommendations={recommendations} onOpen={setOpenDate} />

      <SquadOverview />

      {openDay && (
        <DayDialog
          day={openDay}
          record={records.get(openDay.date)}
          recommendation={recFor(openDay.date)}
          onClose={() => setOpenDate(null)}
        />
      )}
    </div>
  );
}
