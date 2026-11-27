"use client";

import { ChevronDown, Globe, LogOut } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { logoutAction, updateTimezoneAction } from "@/app/actions";
import { useSquad } from "@/components/providers/squad-provider";
import { Avatar } from "@/components/ui/avatar";
import { TIME_ZONE_OPTIONS } from "@/lib/config";
import { timeZoneName } from "@/lib/domain/dates";

export function TimeZoneSelect({ className = "" }: { className?: string }) {
  const { me, mutate } = useSquad();

  return (
    <select
      value={me.timezone}
      onChange={(event) => {
        const timezone = event.target.value;
        void mutate(
          (data) => ({
            ...data,
            players: data.players.map((p) => (p.id === me.id ? { ...p, timezone } : p)),
          }),
          () => updateTimezoneAction(timezone),
        );
      }}
      className={`cursor-pointer border border-bone/15 bg-ink-900 px-2 py-1.5 text-sm text-bone outline-none hover:border-bone/40 ${className}`}
      aria-label="Time zone"
    >
      {TIME_ZONE_OPTIONS.map((tz) => (
        <option key={tz} value={tz}>
          {timeZoneName(tz)}
        </option>
      ))}
    </select>
  );
}

export function UserMenu() {
  const { me } = useSquad();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex cursor-pointer items-center gap-2 border border-transparent py-1 pr-2 pl-1 transition-colors hover:border-bone/15"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Avatar player={me} size={32} tooltip={false} tone="val" />
        <span className="hidden font-display text-sm font-semibold tracking-[0.14em] uppercase sm:inline">{me.displayName}</span>
        <ChevronDown className="h-4 w-4 text-mist" />
      </button>
      {open && (
        <div role="menu" className="panel panel-tick animate-rise absolute right-0 z-50 mt-2 w-72 bg-ink-900 p-4 shadow-2xl shadow-black/50">
          <div className="flex items-center gap-3">
            <Avatar player={me} size={44} tooltip={false} />
            <div>
              <p className="heading text-lg leading-tight">{me.displayName}</p>
              <p className="text-xs text-mist">Squad member</p>
            </div>
          </div>
          <label className="mt-4 block">
            <span className="eyebrow flex items-center gap-1.5">
              <Globe className="h-3 w-3" /> Time zone
            </span>
            <TimeZoneSelect className="mt-1.5 w-full" />
          </label>
          <form action={logoutAction} className="mt-4 border-t border-bone/[0.08] pt-3">
            <button className="btn w-full justify-start px-0 text-mist hover:text-val" type="submit">
              <LogOut className="h-4 w-4" /> Log out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
