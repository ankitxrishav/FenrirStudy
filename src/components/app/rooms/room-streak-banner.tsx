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
  const baseTarget = memberCount * 30; // 30 min per member

  // Calculate dynamic target and level
  let targetMinutes = baseTarget;
  let level = 1;
  while (totalStudyMinutesToday >= targetMinutes) {
    targetMinutes += baseTarget;
    level++;
  }

  const prevTarget = level === 1 ? 0 : targetMinutes - baseTarget;
  const levelProgress = totalStudyMinutesToday - prevTarget;
  const progressPct = Math.min(100, (levelProgress / baseTarget) * 100);

  const isLegendary = streak >= 7;
  const isZero = streak === 0;

  const bannerClass = cn(
    "rounded-xl border px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 transition-all",
    isLegendary
      ? "border-yellow-500/40 bg-yellow-500/5"
      : "border-orange-500/20 bg-orange-500/5"
  );

  const title = useMemo(() => {
    if (totalStudyMinutesToday === 0) {
      if (isZero) return "Start the streak! Be the first to study today.";
      return `🔥 ${streak} day room streak. Keep it alive!`;
    }
    
    if (level > 1) {
      return `🌟 Milestone ${level - 1} Reached! Let's hit ${targetMinutes} mins!`;
    }

    if (isZero) return `Great start! Let's reach ${targetMinutes} mins today.`;
    if (isLegendary) return `🏆 ${streak}-day streak! You're on fire!`;
    return `🔥 ${streak} day room streak`;
  }, [streak, isLegendary, isZero, totalStudyMinutesToday, level, targetMinutes]);

  return (
    <div id="streak-banner" className={bannerClass}>
      <div className="flex-1 space-y-1.5 w-full">
        <div className="flex items-center justify-between">
          <p className={cn(
            "font-bold text-base",
            isLegendary ? "text-yellow-400" : "text-orange-400"
          )}>
            {title}
          </p>
          {level > 1 && (
            <span className="text-xs font-bold bg-primary/20 text-primary px-2 py-0.5 rounded-full">
              Milestone {level} Goal
            </span>
          )}
        </div>
        
        {totalStudyMinutesToday === 0 && !isZero && (
          <p className="text-xs text-muted-foreground">
            Keep it alive! Someone needs to study today.
          </p>
        )}

        {/* Progress bar */}
        <div className="mt-2">
          <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden relative">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700",
                isLegendary ? "bg-yellow-500" : "bg-orange-500"
              )}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-1">
            <p className="text-[10px] text-muted-foreground/60">
              {Math.round(totalStudyMinutesToday)} / {targetMinutes} min studied today
            </p>
            {level > 1 && (
              <p className="text-[10px] text-primary/80 font-semibold">
                Bonus Streak Progress!
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
