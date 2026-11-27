import { FlaskConical } from "lucide-react";
import { mockLoginAction } from "@/app/dev-actions";
import { Avatar } from "@/components/ui/avatar";
import { getCurrentPlayer } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { isMockMode } from "@/lib/env";

function DiscordIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
      <path d="M20.3 4.4A19.6 19.6 0 0 0 15.4 3l-.6 1.3a18.2 18.2 0 0 0-5.6 0L8.6 3a19.5 19.5 0 0 0-4.9 1.4C.6 9.1-.3 13.6.1 18.1a19.7 19.7 0 0 0 6 3l1.3-2a12.8 12.8 0 0 1-2-1l.5-.4a14 14 0 0 0 12.2 0l.5.4c-.6.4-1.3.7-2 1l1.3 2a19.6 19.6 0 0 0 6-3c.5-5.2-.9-9.7-3.6-13.7ZM8 15.4c-1.2 0-2.2-1.1-2.2-2.4S6.8 10.6 8 10.6s2.2 1.1 2.2 2.4-1 2.4-2.2 2.4Zm8 0c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4Z" />
    </svg>
  );
}

export async function LoginOptions() {
  const current = await getCurrentPlayer();
  const mock = isMockMode();

  return (
    <div>
      <p className="eyebrow">Sign in</p>
      <h2 className="heading mt-2 text-3xl">Ready up</h2>

      <button
        disabled={mock}
        className="btn mt-6 w-full bg-[#5865F2] py-3 text-bone chamfer-sm hover:bg-[#4752c4]"
        title={mock ? "Discord login is configured at deployment" : undefined}
      >
        <DiscordIcon /> Continue with Discord
      </button>
      {mock && (
        <p className="mt-2 text-xs text-haze">Discord login is switched on when the app is deployed with Supabase.</p>
      )}

      {mock && <MockUsers currentId={current?.id ?? null} />}
    </div>
  );
}

async function MockUsers({ currentId }: { currentId: string | null }) {
  const { data } = await getRepository().getSquad();
  return (
    <div className="mt-8 border-t border-bone/[0.08] pt-6">
      <p className="eyebrow flex items-center gap-2 text-warn">
        <FlaskConical className="h-3.5 w-3.5" /> Local dev · pick a mock player
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {data.players.map((player) => (
          <form key={player.id} action={mockLoginAction.bind(null, player.id, "/calendar")}>
            <button
              type="submit"
              className={`group flex w-full cursor-pointer items-center gap-3 border p-2.5 text-left transition-colors ${
                currentId === player.id ? "border-val/60 bg-val/10" : "border-bone/10 hover:border-bone/40 hover:bg-ink-800"
              }`}
            >
              <Avatar player={player} size={36} tooltip={false} />
              <span className="font-display text-base font-semibold tracking-[0.1em] uppercase">{player.displayName}</span>
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
