import { APP_NAME } from "@/lib/config";

export function LogoMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 34" className={className} aria-hidden="true">
      <path d="M3 17 L16 4 L29 17 L29 23.5 L16 10.5 L3 23.5 Z" fill="#ff4655" />
      <path d="M3 27 L16 14 L29 27 L29 33.5 L16 20.5 L3 33.5 Z" fill="#ece8e1" opacity="0.55" />
    </svg>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark />
      {!compact && <span className="font-display text-xl font-bold tracking-[0.14em] text-bone uppercase">{APP_NAME}</span>}
    </span>
  );
}
