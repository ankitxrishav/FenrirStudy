"use client";

import { useMemo } from "react";
import { Room } from "@/lib/definitions";
import { cn } from "@/lib/utils";

interface RoomStreakBannerProps {
  room: Room;
  totalStudyMinutesToday?: number; // sum from all sessions today across members
}

export function RoomStreakBanner({ room, totalStudyMinutesToday = 0 }: RoomStreakBannerProps) {
  const streak = room.collectiveStreak ?? 0;
  const memberCount = room.totalMemberCount ?? 1;
  const targetMinutes = memberCount * 30; // 30 min per member threshold
  const progressPct = Math.min(100, (totalStudyMinutesToday / targetMinutes) * 100);

  const isLegendary = streak >= 7;
  const isZero = streak === 0;

  const bannerClass = cn(
    "rounded-xl border px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 transition-all",
    isLegendary
      ? "border-yellow-500/40 bg-yellow-500/5"
      : "border-orange-500/20 bg-orange-500/5"
  );

  const title = useMemo(() => {
    if (isZero) return "Start the streak! Be the first to study today.";
    if (isLegendary) return `🏆 ${streak}-day streak! You're on fire!`;
    return `🔥 ${streak} day room streak`;
  }, [streak, isLegendary, isZero]);

  return (
    <div id="streak-banner" className={bannerClass}>
      <div className="flex-1 space-y-1.5">
        <p className={cn(
          "font-bold text-base",
          isLegendary ? "text-yellow-400" : "text-orange-400"
        )}>
          {title}
        </p>
        {!isZero && (
          <p className="text-xs text-muted-foreground">
            Keep it alive! Someone needs to study today.
          </p>
        )}

        {/* Progress bar */}
        <div className="mt-2">
          <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700",
                isLegendary ? "bg-yellow-500" : "bg-orange-500"
              )}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground/60 mt-1">
            {Math.round(totalStudyMinutesToday)} / {targetMinutes} min studied today (room goal)
          </p>
        </div>
      </div>
    </div>
  );
}
