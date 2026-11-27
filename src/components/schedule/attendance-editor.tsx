"use client";

import { Check, ClipboardCheck } from "lucide-react";
import { useState } from "react";
import { clearGameNightAction, saveGameNightAction } from "@/app/actions";
import { useSquad } from "@/components/providers/squad-provider";
import { Avatar } from "@/components/ui/avatar";
import { STACK_SIZE } from "@/lib/config";
import { formatMonthDay } from "@/lib/domain/dates";
import type { AttendanceOutcome, GameNightRecord, GameNightStatus, ISODate, UserId } from "@/lib/domain/types";
import { nightAvailableIds } from "@/lib/engine/stats";

export function AttendanceEditor({
  date,
  availableNow,
  record,
}: {
  date: ISODate;
  availableNow: UserId[];
  record: GameNightRecord | undefined;
}) {
  const { data, me, playerById, mutate, saveStatus } = useSquad();
  const availableIds = record ? nightAvailableIds(record) : availableNow;
  const notOutcome: AttendanceOutcome = availableIds.length > STACK_SIZE ? "rotated_out" : "did_not_join";
  const suggested = !record && availableIds.length === STACK_SIZE;

  const [status, setStatus] = useState<GameNightStatus>(record?.status ?? "played");
  const [attendance, setAttendance] = useState<Record<UserId, AttendanceOutcome>>(() => {
    if (record) return { ...record.attendance };
    if (suggested) return Object.fromEntries(availableIds.map((id) => [id, "played" as const]));
    return {};
  });

  const others = data.players.map((p) => p.id).filter((id) => !availableIds.includes(id));
  const playedCount = Object.values(attendance).filter((o) => o === "played").length;
  const dirty =
    !record ||
    record.status !== status ||
    JSON.stringify(Object.entries(record.attendance).sort()) !== JSON.stringify(Object.entries(attendance).sort());

  const togglePlayed = (id: UserId) =>
    setAttendance((current) => {
      const next = { ...current };
      if (next[id] === "played") {
        if (availableIds.includes(id)) next[id] = notOutcome;
        else delete next[id];
      } else next[id] = "played";
      return next;
    });

  const save = () => {
    const finalAttendance: Record<UserId, AttendanceOutcome> = {};
    if (status === "played") {
      for (const id of availableIds) finalAttendance[id] = attendance[id] ?? notOutcome;
      for (const id of others) if (attendance[id] === "played") finalAttendance[id] = "played";
    }
    const optimistic: GameNightRecord = {
      date,
      status,
      availableUserIds: record?.availableUserIds ?? availableNow,
      attendance: finalAttendance,
      recordedBy: me.id,
      recordedAt: new Date().toISOString(),
    };
    setAttendance(finalAttendance);
    void mutate(
      (current) => ({
        ...current,
        gameNights: [...current.gameNights.filter((n) => n.date !== date), optimistic].sort((a, b) => a.date.localeCompare(b.date)),
      }),
      () => saveGameNightAction({ date, status, attendance: finalAttendance }),
    );
  };

  const clear = () => {
    setStatus("played");
    setAttendance(suggested ? Object.fromEntries(availableIds.map((id) => [id, "played" as const])) : {});
    void mutate(
      (current) => ({ ...current, gameNights: current.gameNights.filter((n) => n.date !== date) }),
      () => clearGameNightAction(date),
    );
  };

  const recorder = record ? playerById(record.recordedBy) : undefined;

  return (
    <section className="border border-bone/10 bg-ink-850/60">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-bone/[0.08] px-4 py-3">
        <p className="flex items-center gap-2 font-display text-sm font-semibold tracking-[0.18em] uppercase">
          <ClipboardCheck className="h-4 w-4 text-mist" /> Attendance
        </p>
        {record ? (
          <span className="chip bg-go/15 text-go">
            Recorded{recorder ? ` by ${recorder.displayName}` : ""} · {formatMonthDay(record.recordedAt.slice(0, 10))}
          </span>
        ) : suggested ? (
          <span className="chip border border-warn/40 text-warn">Suggested from availability · not saved</span>
        ) : (
          <span className="chip border border-bone/20 text-mist">Not recorded</span>
        )}
      </div>

      <div className="space-y-5 p-4">
        <div className="segmented">
          <button aria-pressed={status === "played"} onClick={() => setStatus("played")}>
            We played
          </button>
          <button aria-pressed={status === "no_game"} onClick={() => setStatus("no_game")}>
            No game
          </button>
        </div>

        {status === "played" ? (
          <>
            <div>
              <p className="eyebrow">Tap who played · {playedCount} selected</p>
              <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-6">
                {availableIds.map((id) => {
                  const player = playerById(id);
                  if (!player) return null;
                  const played = attendance[id] === "played";
                  const outcome = attendance[id] ?? notOutcome;
                  return (
                    <div key={id} className="flex flex-col items-center gap-2">
                      <button
                        onClick={() => togglePlayed(id)}
                        aria-pressed={played}
                        className="relative cursor-pointer"
                        aria-label={`${player.displayName}: ${played ? "played" : "didn't play"}`}
                      >
                        <Avatar player={player} size={52} tooltip={false} tone={played ? "go" : "none"} dim={!played} />
                        {played && (
                          <span className="absolute -right-1 -bottom-1 flex h-5 w-5 items-center justify-center rounded-full bg-go text-ink-900">
                            <Check className="h-3 w-3" strokeWidth={3} />
                          </span>
                        )}
                      </button>
                      <span className="text-xs">{player.displayName}</span>
                      {!played && (
                        <div className="flex flex-col gap-1">
                          {(["rotated_out", "did_not_join"] as const).map((o) => (
                            <button
                              key={o}
                              onClick={() => setAttendance((c) => ({ ...c, [id]: o }))}
                              className={`cursor-pointer px-1.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase ${
                                outcome === o ? "bg-bone text-ink-900" : "text-haze hover:text-bone"
                              }`}
                            >
                              {o === "rotated_out" ? "Rotated out" : "Didn't join"}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {others.length > 0 && (
              <div>
                <p className="eyebrow">Weren&apos;t marked available · tap if they joined anyway</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  {others.map((id) => {
                    const player = playerById(id);
                    if (!player) return null;
                    const played = attendance[id] === "played";
                    return (
                      <button
                        key={id}
                        onClick={() => togglePlayed(id)}
                        aria-pressed={played}
                        className="flex cursor-pointer flex-col items-center gap-1.5"
                      >
                        <Avatar player={player} size={36} tooltip={false} tone={played ? "go" : "none"} dim={!played} />
                        <span className="text-[11px] text-mist">{player.displayName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-mist">Nobody played this night. It won&apos;t count toward anyone&apos;s stats.</p>
        )}

        <div className="flex flex-wrap items-center gap-3 border-t border-bone/[0.08] pt-4">
          <button
            className="btn-primary"
            onClick={save}
            disabled={(status === "played" && playedCount === 0) || !dirty || saveStatus === "saving"}
          >
            {record ? "Update record" : "Save record"}
          </button>
          {record && (
            <button className="btn-ghost" onClick={clear} disabled={saveStatus === "saving"}>
              Clear record
            </button>
          )}
          <p className="text-xs text-haze">Anyone in the squad can record or fix a night. No one else needs to confirm.</p>
        </div>
      </div>
    </section>
  );
}
