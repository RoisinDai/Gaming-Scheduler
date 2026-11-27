"use client";

import { CalendarDays, ChartColumn, CircleAlert, Swords, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";
import { useSquad } from "@/components/providers/squad-provider";
import { SaveIndicator } from "@/components/ui/save-indicator";
import { DevPanel } from "./dev-panel";
import { UserMenu } from "./user-menu";

const TABS = [
  { href: "/calendar", label: "My Calendar", short: "Calendar", icon: CalendarDays },
  { href: "/schedule", label: "Gaming Schedule", short: "Schedule", icon: Swords },
  { href: "/stats", label: "Stats", short: "Stats", icon: ChartColumn },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { error, dismissError, isMock } = useSquad();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-bone/[0.08] bg-ink-950/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
          <Link href="/calendar" className="shrink-0" aria-label="Queue Up home">
            <Logo />
          </Link>
          <nav className="hidden h-full items-stretch md:flex" aria-label="Primary">
            {TABS.map((tab) => {
              const active = pathname.startsWith(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex items-center px-4 font-display text-sm font-semibold tracking-[0.2em] uppercase transition-colors ${
                    active ? "text-bone" : "text-mist hover:text-bone"
                  }`}
                >
                  {tab.label}
                  <span
                    className={`absolute inset-x-4 bottom-0 h-[3px] bg-val transition-transform duration-200 ${
                      active ? "scale-x-100" : "scale-x-0"
                    }`}
                  />
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-4">
            <span className="hidden sm:inline-flex">
              <SaveIndicator />
            </span>
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-6 pb-28 sm:px-6 sm:pt-10 md:pb-16">{children}</main>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-bone/[0.08] bg-ink-950/95 backdrop-blur-md md:hidden"
        aria-label="Primary mobile"
      >
        {TABS.map((tab) => {
          const active = pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`relative flex flex-col items-center gap-1 py-3 font-display text-[11px] font-semibold tracking-[0.18em] uppercase ${
                active ? "text-bone" : "text-mist"
              }`}
            >
              {active && <span className="absolute inset-x-6 top-0 h-[3px] bg-val" />}
              <Icon className="h-5 w-5" />
              {tab.short}
            </Link>
          );
        })}
      </nav>

      {error && (
        <div className="fixed inset-x-4 bottom-24 z-50 mx-auto flex max-w-md items-start gap-3 border border-val/40 bg-ink-950 p-4 shadow-xl md:bottom-6">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-val" />
          <p className="flex-1 text-sm text-bone/90">{error}</p>
          <button onClick={dismissError} aria-label="Dismiss" className="text-mist hover:text-bone">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {isMock && <DevPanel />}
    </div>
  );
}
