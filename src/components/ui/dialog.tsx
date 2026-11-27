"use client";

import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";

export function Dialog({
  open,
  onClose,
  eyebrow,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  eyebrow?: string;
  title: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <button aria-label="Close" className="absolute inset-0 cursor-default bg-ink-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="panel panel-tick animate-rise relative flex max-h-[92vh] w-full max-w-2xl flex-col bg-ink-900 shadow-2xl shadow-black/60">
        <div className="flex items-start justify-between gap-4 border-b border-bone/[0.08] px-5 py-4 sm:px-6">
          <div>
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            <h2 className="heading mt-1 text-2xl">{title}</h2>
          </div>
          <button onClick={onClose} className="btn-icon" aria-label="Close dialog">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
      </div>
    </div>
  );
}
