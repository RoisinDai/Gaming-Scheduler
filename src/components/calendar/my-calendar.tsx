"use client";

import { Check, ChevronLeft, ChevronRight, Eraser, Globe, Lock, Plus, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { setAvailabilityAction } from "@/app/actions";
import { useSquad } from "@/components/providers/squad-provider";
import { TimeZoneSelect } from "@/components/shell/user-menu";
import { PageHeader } from "@/components/ui/page-header";
import { WeekNav } from "@/components/ui/week-nav";
import {
  addMonths,
  formatDayNumber,
  formatMonthDay,
  formatMonthLong,
  formatWeekdayShort,
  monthGrid,
  monthKey,
  weekDates,
} from "@/lib/domain/dates";
import type { ISODate } from "@/lib/domain/types";
import { isEditableDate, updateDates } from "@/lib/engine/availability";
import { availableOn } from "@/lib/engine/schedule";

interface Paint {
  available: boolean;
  dates: Set<ISODate>;
}

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function MyCalendar() {
  const { data, me, today, weekStart, mutate } = useSquad();
  const [view, setView] = useState<"week" | "month">("week");
  const [month, setMonth] = useState(() => monthKey(weekStart));
  const [paint, setPaint] = useState<Paint | null>(null);

  const mine = useMemo(() => new Set(data.availability[me.id] ?? []), [data.availability, me.id]);

  const apply = (dates: ISODate[], available: boolean) => {
    const editable = dates.filter((date) => isEditableDate(date, today) && mine.has(date) !== available);
    if (editable.length === 0) return;
    const now = new Date().toISOString();
    void mutate(
      (current) => ({
        ...current,
        availability: {
          ...current.availability,
          [me.id]: updateDates(current.availability[me.id] ?? [], editable, available),
        },
        players: current.players.map((p) => (p.id === me.id ? { ...p, availabilityUpdatedAt: now } : p)),
      }),
      () => setAvailabilityAction(editable, available),
    );
  };

  useEffect(() => {
    if (!paint) return;
    const finish = () => {
      apply([...paint.dates], paint.available);
      setPaint(null);
    };
    const cancel = () => setPaint(null);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", cancel);
    return () => {
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", cancel);
    };
  });

  const isOn = (date: ISODate) => (paint?.dates.has(date) ? paint.available : mine.has(date));

  const handlers = (date: ISODate) => ({
    onPointerDown: (event: React.PointerEvent) => {
      if (!isEditableDate(date, today) || event.button !== 0) return;
      (event.target as Element).releasePointerCapture?.(event.pointerId);
      setPaint({ available: !mine.has(date), dates: new Set([date]) });
    },
    onPointerEnter: () => {
      if (!paint || !isEditableDate(date, today) || paint.dates.has(date)) return;
      setPaint({ ...paint, dates: new Set(paint.dates).add(date) });
    },
    onClick: (event: React.MouseEvent) => {
      if (event.detail === 0) apply([date], !mine.has(date));
    },
  });

  const squadmatesOn = (date: ISODate) =>
    availableOn(date, data.players, data.availability).filter((id) => id !== me.id).length + (isOn(date) ? 1 : 0);
  const days = weekDates(weekStart);
  const clearable = days.filter((date) => mine.has(date) && isEditableDate(date, today));
  const markedThisWeek = days.filter((date) => mine.has(date)).length;

  return (
    <div className="space-y-8">
      <PageHeader
        index="01"
        title="My Calendar"
        subtitle="Tap every day you could play. Unmarked days count as unavailable. Nothing to submit; it saves as you go."
        actions={
          <label className="flex items-center gap-2 text-sm text-mist">
            <Globe className="h-4 w-4" />
            <TimeZoneSelect />
          </label>
        }
      />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {view === "week" ? (
          <WeekNav />
        ) : (
          <div className="flex items-center gap-2">
            <button className="btn-icon" aria-label="Previous month" onClick={() => setMonth(addMonths(month, -1))}>
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => setMonth(monthKey(today))} disabled={month === monthKey(today)}>
              Today
            </button>
            <button className="btn-icon" aria-label="Next month" onClick={() => setMonth(addMonths(month, 1))}>
              <ChevronRight className="h-4 w-4" />
            </button>
            <span className="ml-2 font-display text-lg font-semibold tracking-[0.08em] uppercase">{formatMonthLong(month)}</span>
          </div>
        )}
        <div className="flex items-center gap-3">
          {view === "week" && (
            <button className="btn-ghost py-1.5 text-xs" disabled={clearable.length === 0} onClick={() => apply(clearable, false)}>
              <Eraser className="h-3.5 w-3.5" /> Clear week
            </button>
          )}
          <div className="segmented">
            <button aria-pressed={view === "week"} onClick={() => setView("week")}>
              Week
            </button>
            <button
              aria-pressed={view === "month"}
              onClick={() => {
                setMonth(monthKey(weekStart));
                setView("month");
              }}
            >
              Month
            </button>
          </div>
        </div>
      </div>

      {view === "week" ? (
        <>
          <div className="grid grid-cols-1 gap-2 select-none sm:grid-cols-2 lg:grid-cols-7 lg:gap-3">
            {days.map((date, i) => {
              const on = isOn(date);
              const locked = !isEditableDate(date, today);
              const squadmates = squadmatesOn(date);
              return (
                <button
                  key={date}
                  {...handlers(date)}
                  disabled={locked}
                  aria-pressed={on}
                  aria-label={`${formatWeekdayShort(date)} ${formatMonthDay(date)}: ${on ? "available" : "not marked"}`}
                  style={{ animationDelay: `${i * 30}ms` }}
                  className={`animate-rise group relative flex items-center gap-4 border p-4 text-left transition-colors duration-150 lg:h-60 lg:flex-col lg:items-start lg:justify-between ${
                    locked
                      ? "cursor-not-allowed border-bone/[0.05] bg-ink-950/40"
                      : on
                        ? "cursor-pointer border-go/60 bg-go/[0.14] hover:bg-go/20"
                        : "cursor-pointer border-bone/10 bg-ink-850/80 hover:border-bone/35 hover:bg-ink-800"
                  }`}
                >
                  {on && <span className="absolute inset-x-0 top-0 h-[3px] bg-go" />}
                  <div className="flex w-20 shrink-0 items-baseline gap-2 lg:w-auto lg:flex-col lg:gap-0">
                    <span className={`font-display text-sm font-semibold tracking-[0.24em] uppercase ${locked ? "text-haze" : "text-mist"}`}>
                      {formatWeekdayShort(date)}
                    </span>
                    <span className={`font-display text-4xl leading-none font-bold lg:text-6xl ${locked ? "text-haze" : "text-bone"}`}>
                      {formatDayNumber(date)}
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col gap-2 lg:w-full lg:flex-none">
                    {date === today && <span className="chip w-fit bg-val text-bone">Today</span>}
                    <span
                      className={`flex items-center gap-1.5 font-display text-sm font-semibold tracking-[0.18em] uppercase ${
                        locked ? (on ? "text-go/60" : "text-haze") : on ? "text-go" : "text-mist group-hover:text-bone"
                      }`}
                    >
                      {locked ? <Lock className="h-3.5 w-3.5" /> : on ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                      {locked ? (on ? "Was available" : "Locked") : on ? "Available" : "Tap to add"}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-haze">
                      <Users className="h-3.5 w-3.5" /> {squadmates} squadmate{squadmates === 1 ? "" : "s"} in
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-haze">
            {markedThisWeek === 0
              ? "You haven't marked any days this week. That's fine; nobody's waiting on you."
              : `You're available ${markedThisWeek} day${markedThisWeek === 1 ? "" : "s"} this week.`}{" "}
            <span className="hidden lg:inline">Tip: click and drag across days to mark several at once.</span>
          </p>
        </>
      ) : (
        <div className="panel p-3 select-none sm:p-4">
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {WEEKDAY_LABELS.map((label) => (
              <span key={label} className="eyebrow pb-1 text-center">
                {label}
              </span>
            ))}
            {monthGrid(month).map((date) => {
              const on = isOn(date);
              const locked = !isEditableDate(date, today);
              const outside = monthKey(date) !== month;
              return (
                <button
                  key={date}
                  {...handlers(date)}
                  disabled={locked}
                  aria-pressed={on}
                  aria-label={`${formatMonthDay(date)}: ${on ? "available" : "not marked"}`}
                  className={`relative flex h-14 flex-col items-start justify-between border p-1.5 text-left transition-colors sm:h-20 sm:p-2 ${
                    outside ? "opacity-35" : ""
                  } ${
                    locked
                      ? "cursor-not-allowed border-transparent bg-ink-950/40"
                      : on
                        ? "cursor-pointer border-go/60 bg-go/[0.16] hover:bg-go/25"
                        : "cursor-pointer border-bone/[0.07] bg-ink-850 hover:border-bone/35"
                  } ${date === today ? "ring-1 ring-val" : ""}`}
                >
                  <span className={`font-display text-base font-bold sm:text-lg ${locked ? "text-haze" : "text-bone"}`}>
                    {formatDayNumber(date)}
                  </span>
                  {on && <Check className={`h-3.5 w-3.5 ${locked ? "text-go/50" : "text-go"}`} />}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-haze">Tap days to toggle, or drag across several.</p>
        </div>
      )}
    </div>
  );
}
