"use client";

import { CircleAlert, CloudCheck, LoaderCircle } from "lucide-react";
import { useSquad } from "@/components/providers/squad-provider";

export function SaveIndicator() {
  const { saveStatus } = useSquad();
  return (
    <span aria-live="polite" className="inline-flex min-w-20 items-center gap-1.5 font-display text-xs font-semibold tracking-[0.18em] uppercase">
      {saveStatus === "saving" && (
        <>
          <LoaderCircle className="h-3.5 w-3.5 animate-spin text-mist" /> <span className="text-mist">Saving</span>
        </>
      )}
      {saveStatus === "saved" && (
        <>
          <CloudCheck className="h-3.5 w-3.5 text-go" /> <span className="text-go">Saved</span>
        </>
      )}
      {saveStatus === "error" && (
        <>
          <CircleAlert className="h-3.5 w-3.5 text-val" /> <span className="text-val">Not saved</span>
        </>
      )}
    </span>
  );
}
