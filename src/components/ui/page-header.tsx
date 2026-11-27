import type { ReactNode } from "react";

export function PageHeader({
  index,
  title,
  subtitle,
  actions,
}: {
  index: string;
  title: string;
  subtitle: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="eyebrow flex items-center gap-2">
          <span className="text-val">{index}</span>
          <span className="h-px w-8 bg-bone/20" />
        </p>
        <h1 className="heading mt-2 text-4xl leading-none sm:text-5xl">{title}</h1>
        <p className="mt-2 max-w-xl text-sm text-mist">{subtitle}</p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </header>
  );
}
