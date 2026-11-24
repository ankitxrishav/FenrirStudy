"use client";

import { FenrirLogo } from "@/components/icons";

export default function LoadingScreen({ label = "Restoring workspace" }: { label?: string }) {
  return (
    <div className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-3 p-8 text-ink">
      <div className="flex h-11 w-11 items-center justify-center rounded-md border border-line bg-surface-soft">
        <FenrirLogo className="h-5 w-5 text-ink" />
      </div>
      <span className="font-mono text-xs text-ink-muted">{label}</span>
    </div>
  );
}
