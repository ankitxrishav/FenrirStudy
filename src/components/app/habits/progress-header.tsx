"use client";

import * as React from "react";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProgressHeaderProps {
  completed: number;
  total: number;
}

export function ProgressHeader({ completed, total }: ProgressHeaderProps) {
  const pct = total > 0 ? (completed / total) * 100 : 0;
  const allDone = total > 0 && completed === total;

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-2">
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl font-bold tracking-tight tabular-nums text-ink">
            {completed}
          </span>
          <span className="font-mono text-base text-ink-muted">/{total}</span>
          <span className="text-sm text-ink-muted ml-1">completed</span>
        </div>

        {allDone && (
          <div className="flex items-center gap-1.5 text-ink bg-highlight border border-line px-3 py-1 rounded-full">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider">
              All done
            </span>
          </div>
        )}
      </div>

      <div className="h-2.5 w-full bg-surface-soft border border-line/25 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full transition-all duration-300",
            allDone ? "bg-success" : "bg-clay"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-ink-muted">
        <span>Daily Completion</span>
        <span className="tabular-nums text-ink">{Math.round(pct)}%</span>
      </div>
    </div>
  );
}
