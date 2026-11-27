import { Info } from "lucide-react";
import type { ReactNode } from "react";

export function Tip({ text, children, align = "center" }: { text: string; children?: ReactNode; align?: "center" | "left" | "right" }) {
  const position =
    align === "left" ? "left-0" : align === "right" ? "right-0" : "left-1/2 -translate-x-1/2";
  return (
    <span tabIndex={0} className="group/tip relative inline-flex items-center gap-1 outline-none">
      {children}
      <Info className="h-3.5 w-3.5 text-haze transition-colors group-hover/tip:text-bone" aria-hidden="true" />
      <span
        role="tooltip"
        className={`pointer-events-none absolute top-full z-30 mt-2 w-60 border border-bone/10 bg-ink-950 p-3 text-left font-sans text-xs leading-relaxed font-normal tracking-normal text-bone/85 normal-case opacity-0 shadow-xl shadow-black/40 transition-opacity group-hover/tip:opacity-100 group-focus/tip:opacity-100 ${position}`}
      >
        {text}
      </span>
    </span>
  );
}
