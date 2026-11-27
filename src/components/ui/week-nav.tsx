"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, formatWeekRange, startOfWeek } from "@/lib/domain/dates";
import { useSquad } from "@/components/providers/squad-provider";

export function WeekNav() {
  const { weekStart, setWeekStart, today } = useSquad();
  const isCurrent = weekStart === startOfWeek(today);
  return (
    <div className="flex items-center gap-2">
      <button className="btn-icon" aria-label="Previous week" onClick={() => setWeekStart(addDays(weekStart, -7))}>
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button className="btn-ghost px-3 py-1.5 text-xs" disabled={isCurrent} onClick={() => setWeekStart(startOfWeek(today))}>
        Today
      </button>
      <button className="btn-icon" aria-label="Next week" onClick={() => setWeekStart(addDays(weekStart, 7))}>
        <ChevronRight className="h-4 w-4" />
      </button>
      <span className="ml-2 font-display text-lg font-semibold tracking-[0.08em] text-bone uppercase">
        {formatWeekRange(weekStart)}
      </span>
    </div>
  );
}
