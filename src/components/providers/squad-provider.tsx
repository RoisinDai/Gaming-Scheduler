"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { refreshSquadAction, type ActionResult } from "@/app/actions";
import { startOfWeek, todayInTimeZone } from "@/lib/domain/dates";
import type { ISODate, Player, SquadData, SquadState, UserId } from "@/lib/domain/types";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

interface SquadContextValue {
  data: SquadData;
  me: Player;
  today: ISODate;
  playerById: (id: UserId) => Player | undefined;
  weekStart: ISODate;
  setWeekStart: (weekStart: ISODate) => void;
  saveStatus: SaveStatus;
  error: string | null;
  dismissError: () => void;
  mutate: (optimistic: (data: SquadData) => SquadData, action: () => Promise<ActionResult>) => Promise<boolean>;
  replaceState: (state: SquadState) => void;
  isMock: boolean;
  scenario: string | null;
}

const SquadContext = createContext<SquadContextValue | null>(null);

const SYNC_INTERVAL_MS = 20_000;

export function SquadProvider({
  initial,
  isMock,
  scenario,
  children,
}: {
  initial: SquadState;
  isMock: boolean;
  scenario: string | null;
  children: ReactNode;
}) {
  const [state, setState] = useState(initial);
  const [seenInitial, setSeenInitial] = useState(initial);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(initial.today));
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(0);

  if (initial !== seenInitial) {
    setSeenInitial(initial);
    if (initial.meId !== state.meId || initial.revision >= state.revision) setState(initial);
  }

  const me = state.data.players.find((player) => player.id === state.meId) ?? state.data.players[0];

  const adopt = useCallback((next: SquadState) => {
    setState((current) => (next.revision >= current.revision || next.meId !== current.meId ? next : current));
  }, []);

  const mutate = useCallback<SquadContextValue["mutate"]>(
    async (optimistic, action) => {
      pending.current += 1;
      setSaveStatus("saving");
      setError(null);
      setState((current) => ({ ...current, data: optimistic(current.data) }));

      let result: ActionResult;
      try {
        result = await action();
      } catch {
        result = { ok: false, error: "Couldn't reach the server. Your change wasn't saved." };
      }
      pending.current -= 1;

      if (result.ok) {
        if (pending.current === 0) {
          adopt(result.state);
          setSaveStatus("saved");
        }
        return true;
      }

      setError(result.error);
      setSaveStatus("error");
      const fresh = await refreshSquadAction().catch(() => null);
      if (fresh?.ok && pending.current === 0) setState(fresh.state);
      return false;
    },
    [adopt],
  );

  useEffect(() => {
    const sync = async () => {
      if (pending.current > 0 || document.visibilityState !== "visible") return;
      const fresh = await refreshSquadAction().catch(() => null);
      if (fresh?.ok && pending.current === 0) adopt(fresh.state);
    };
    const interval = window.setInterval(sync, SYNC_INTERVAL_MS);
    window.addEventListener("focus", sync);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", sync);
    };
  }, [adopt]);

  useEffect(() => {
    const tick = () => {
      const today = todayInTimeZone(me.timezone);
      setState((current) => (current.today === today ? current : { ...current, today }));
    };
    tick();
    const interval = window.setInterval(tick, 60_000);
    return () => window.clearInterval(interval);
  }, [me.timezone]);

  useEffect(() => {
    if (saveStatus !== "saved") return;
    const timeout = window.setTimeout(() => setSaveStatus("idle"), 2200);
    return () => window.clearTimeout(timeout);
  }, [saveStatus]);

  const value = useMemo<SquadContextValue>(() => {
    const byId = new Map(state.data.players.map((player) => [player.id, player]));
    return {
      data: state.data,
      me,
      today: state.today,
      playerById: (id) => byId.get(id),
      weekStart,
      setWeekStart,
      saveStatus,
      error,
      dismissError: () => setError(null),
      mutate,
      replaceState: (next) => setState(next),
      isMock,
      scenario,
    };
  }, [state, me, weekStart, saveStatus, error, mutate, isMock, scenario]);

  return <SquadContext value={value}>{children}</SquadContext>;
}

export function useSquad(): SquadContextValue {
  const value = useContext(SquadContext);
  if (!value) throw new Error("useSquad must be used inside SquadProvider");
  return value;
}
