"use client";

import * as React from "react";
import { Repeat2, X, Pencil, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useUser } from "@/firebase";

export function StarterGuide() {
  const { user } = useUser();
  const [dismissed, setDismissed] = React.useState(true);

  React.useEffect(() => {
    if (user) {
      const isDismissed = localStorage.getItem(`guide_dismissed_${user.uid}`);
      setDismissed(!!isDismissed);
    }
  }, [user]);

  const handleDismiss = () => {
    if (user) {
      localStorage.setItem(`guide_dismissed_${user.uid}`, "true");
      setDismissed(true);
    }
  };

  if (dismissed) return null;

  return (
    <Card className="border-line bg-surface rounded-2xl">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start gap-3.5">
          <div className="h-10 w-10 rounded-xl border border-line bg-highlight flex items-center justify-center shrink-0 text-ink">
            <Repeat2 className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <h3 className="text-sm font-semibold text-ink">
              Daily Routine Starter Guide
            </h3>
            <p className="text-xs leading-relaxed text-ink-muted">
              Your schedule starts with sample habits you can edit, reorder, or time-box to specific hours of the day.
            </p>

            <div className="pt-1 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-muted border border-line/20 bg-surface-soft px-2.5 py-1 rounded-full">
                <Pencil className="h-3 w-3" /> Edit or reorder
              </span>
              <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-muted border border-line/20 bg-surface-soft px-2.5 py-1 rounded-full">
                <Clock className="h-3 w-3" /> Optional time windows
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss guide"
            className="h-9 w-9 rounded-full flex items-center justify-center text-ink-muted hover:text-ink hover:bg-surface-soft transition-colors shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
