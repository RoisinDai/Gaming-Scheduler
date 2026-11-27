import type { Player } from "@/lib/domain/types";

export type AvatarTone = "none" | "go" | "warn" | "val" | "muted";

const TONE_RING: Record<AvatarTone, string> = {
  none: "ring-bone/10",
  go: "ring-go",
  warn: "ring-warn",
  val: "ring-val",
  muted: "ring-bone/10",
};

export function Avatar({
  player,
  size = 36,
  tone = "none",
  dim = false,
  tooltip = true,
  className = "",
}: {
  player: Player;
  size?: number;
  tone?: AvatarTone;
  dim?: boolean;
  tooltip?: boolean;
  className?: string;
}) {
  const image = (
    <img
      src={player.avatarUrl}
      alt={player.displayName}
      width={size}
      height={size}
      draggable={false}
      className={`rounded-full object-cover ring-2 ${TONE_RING[tone]} ${dim ? "opacity-35 grayscale" : ""} ${className}`}
      style={{ width: size, height: size }}
    />
  );

  if (!tooltip) return image;

  return (
    <span tabIndex={0} className="group/avatar relative inline-flex shrink-0 rounded-full outline-none">
      {image}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 -translate-x-1/2 bg-bone px-2 py-1 font-display text-xs font-semibold tracking-[0.12em] whitespace-nowrap text-ink-900 uppercase opacity-0 transition-opacity group-hover/avatar:opacity-100 group-focus/avatar:opacity-100"
      >
        {player.displayName}
      </span>
    </span>
  );
}
