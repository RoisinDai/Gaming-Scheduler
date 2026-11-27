"use client";

import { FlaskConical, RotateCcw, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { loadScenarioAction, mockLoginAction } from "@/app/dev-actions";
import { useSquad } from "@/components/providers/squad-provider";
import { Avatar } from "@/components/ui/avatar";

export function DevPanel() {
  const { data, me, scenario, replaceState } = useSquad();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [busy, startTransition] = useTransition();
  const [activeScenario, setActiveScenario] = useState(scenario);

  const load = (name: "demo" | "empty") =>
    startTransition(async () => {
      replaceState(await loadScenarioAction(name));
      setActiveScenario(name);
    });

  return (
    <div className="fixed bottom-20 left-4 z-40 md:bottom-6">
      {open ? (
        <div className="panel animate-rise w-80 border-warn/30 bg-ink-950 p-4 shadow-2xl shadow-black/60">
          <div className="flex items-center justify-between">
            <p className="eyebrow flex items-center gap-2 text-warn">
              <FlaskConical className="h-3.5 w-3.5" /> Dev tools · mock data
            </p>
            <button onClick={() => setOpen(false)} className="text-mist hover:text-bone" aria-label="Close dev tools">
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="mt-4 eyebrow">View as</p>
          <div className="mt-2 grid grid-cols-6 gap-2">
            {data.players.map((player) => (
              <button
                key={player.id}
                disabled={busy}
                onClick={() => startTransition(() => mockLoginAction(player.id, pathname))}
                className="flex cursor-pointer flex-col items-center gap-1"
                title={`Switch to ${player.displayName}`}
              >
                <Avatar player={player} size={36} tooltip={false} tone={player.id === me.id ? "val" : "none"} dim={busy} />
                <span className={`text-[10px] ${player.id === me.id ? "text-bone" : "text-mist"}`}>{player.displayName}</span>
              </button>
            ))}
          </div>

          <p className="mt-5 eyebrow">Scenario</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(["demo", "empty"] as const).map((name) => (
              <button
                key={name}
                disabled={busy}
                onClick={() => load(name)}
                className={`btn-ghost justify-between py-2 text-xs ${activeScenario === name ? "border-warn/60 text-warn" : ""}`}
              >
                {name === "demo" ? "Demo squad" : "Empty squad"}
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-haze">
            Loading a scenario resets all mock data. Mock tools never exist in production builds.
          </p>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="chip chamfer-sm cursor-pointer bg-warn/15 py-1.5 text-warn ring-1 ring-warn/40 hover:bg-warn/25"
        >
          <FlaskConical className="h-3.5 w-3.5" /> Dev · {me.displayName}
        </button>
      )}
    </div>
  );
}
