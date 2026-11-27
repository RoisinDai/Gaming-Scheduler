import { Lock } from "lucide-react";
import { Suspense } from "react";
import { LogoMark } from "@/components/brand/logo";
import { APP_NAME, APP_TAGLINE } from "@/lib/config";
import { LoginOptions } from "./login-options";

export const metadata = { title: `Log in · ${APP_NAME}` };

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center overflow-hidden px-6 py-12">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 -right-40 h-full w-[55%] skew-x-[-14deg] bg-ink-850/80" />
        <div className="absolute top-0 right-[38%] h-full w-[3px] skew-x-[-14deg] bg-val/70" />
      </div>

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
        <section>
          <div className="flex items-center gap-3">
            <LogoMark className="h-10 w-10" />
            <span className="eyebrow">Gaming</span>
          </div>
          <h1 className="heading mt-8 text-6xl leading-[0.9] sm:text-8xl">
            {APP_NAME.split(" ").map((word) => (
              <span key={word} className="block">
                {word}
              </span>
            ))}
          </h1>
          <p className="mt-6 flex items-center gap-3 font-display text-xl font-semibold tracking-[0.12em] text-val uppercase sm:text-2xl">
            <span className="h-[3px] w-10 bg-val" />
            {APP_TAGLINE}
          </p>
          <p className="mt-6 max-w-md text-sm leading-relaxed text-mist">
            Mark the days you can play. Queue Up shows when the squad lines up, flags five-stacks, and suggests fair
            rotations.
          </p>
          <p className="chip mt-8 border border-bone/15 py-1 text-mist">
            <Lock className="h-3 w-3" /> Invite only
          </p>
        </section>

        <section className="panel panel-tick bg-ink-900/95 p-6 shadow-2xl shadow-black/50 sm:p-8">
          <Suspense fallback={<p className="eyebrow">Loading…</p>}>
            <LoginOptions />
          </Suspense>
        </section>
      </div>
    </main>
  );
}
