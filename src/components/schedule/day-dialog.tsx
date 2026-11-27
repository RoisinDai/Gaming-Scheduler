"use client";

import { useSquad } from "@/components/providers/squad-provider";
import { Avatar } from "@/components/ui/avatar";
import { Dialog } from "@/components/ui/dialog";
import { formatFullDate } from "@/lib/domain/dates";
import type { GameNightRecord } from "@/lib/domain/types";
import type { DayRecommendation } from "@/lib/engine/fairness";
import type { DayAvailability } from "@/lib/engine/schedule";
import { AttendanceEditor } from "./attendance-editor";
import { RotationPanel } from "./rotation-panel";

const STATE_LABEL: Record<DayAvailability["state"], string> = {
  empty: "Nobody in",
  building: "Not a full stack yet",
  stack: "Five-stack ready",
  excess: "More than five",
};

export function DayDialog({
  day,
  record,
  recommendation,
  onClose,
}: {
  day: DayAvailability;
  record: GameNightRecord | undefined;
  recommendation: DayRecommendation | undefined;
  onClose: () => void;
}) {
  const { today, playerById } = useSquad();
  const isFuture = day.date > today;
  const canRecord = day.date <= today && (day.count > 0 || record !== undefined);
  const tone = day.state === "stack" ? "go" : day.state === "excess" ? "warn" : "none";

  return (
    <Dialog open onClose={onClose} eyebrow={`${day.count} available · ${STATE_LABEL[day.state]}`} title={formatFullDate(day.date)}>
      <div className="space-y-6">
        <section>
          <p className="eyebrow">{day.date < today ? "Marked available" : "Available"}</p>
          {day.count > 0 ? (
            <div className="mt-3 flex flex-wrap gap-4">
              {day.playerIds.map((id) => {
                const player = playerById(id);
                if (!player) return null;
                return (
                  <div key={id} className="flex flex-col items-center gap-1.5">
                    <Avatar player={player} size={48} tone={tone} tooltip={false} />
                    <span className="text-xs text-bone/90">{player.displayName}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-2 text-sm text-mist">Nobody has marked this day.</p>
          )}
          {day.state === "stack" && isFuture && (
            <p className="mt-4 text-sm text-go">Exactly five. Everyone&apos;s in, no rotation needed.</p>
          )}
        </section>

        {recommendation && day.date >= today && !record && <RotationPanel recommendation={recommendation} />}

        {canRecord && <AttendanceEditor key={`${day.date}:${record?.recordedAt ?? "new"}`} date={day.date} availableNow={day.playerIds} record={record} />}
      </div>
    </Dialog>
  );
}
