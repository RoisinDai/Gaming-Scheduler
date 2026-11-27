import { Suspense, type ReactNode } from "react";
import { connection } from "next/server";
import { LogoMark } from "@/components/brand/logo";
import { SquadProvider } from "@/components/providers/squad-provider";
import { AppShell } from "@/components/shell/app-shell";
import { loadSquadState } from "@/lib/auth/session";
import { getMockScenario } from "@/lib/data/mock/mock-repository";
import { isMockMode } from "@/lib/env";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <AuthenticatedApp>{children}</AuthenticatedApp>
    </Suspense>
  );
}

async function AuthenticatedApp({ children }: { children: ReactNode }) {
  await connection();
  const state = await loadSquadState();
  const isMock = isMockMode();
  const scenario = isMock ? await getMockScenario() : null;
  return (
    <SquadProvider initial={state} isMock={isMock} scenario={scenario}>
      <AppShell>{children}</AppShell>
    </SquadProvider>
  );
}

function LoadingScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <LogoMark className="h-10 w-10 animate-pulse" />
      <p className="eyebrow">Loading squad</p>
    </div>
  );
}
