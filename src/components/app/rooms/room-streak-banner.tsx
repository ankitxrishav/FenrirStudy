"use client";

import { useMemo } from "react";
import { Flame, Award } from "lucide-react";
import { Room } from "@/lib/definitions";
import { cn } from "@/lib/utils";

interface RoomStreakBannerProps {
  room: Room;
  totalStudyMinutesToday?: number;
}

export function RoomStreakBanner({ room, totalStudyMinutesToday = 0 }: RoomStreakBannerProps) {
  const streak = room.collectiveStreak ?? 0;
  const memberCount = room.totalMemberCount ?? 1;
  const baseTarget = Math.max(30, memberCount * 30);

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

  const title = useMemo(() => {
    if (totalStudyMinutesToday === 0) {
      if (isZero) return "Start today's room streak";
      return `${streak}-day room streak active`;
    }
    if (level > 1) {
      return `Milestone ${level - 1} reached — next goal ${targetMinutes}m`;
    }
    if (isZero) return `Target ${targetMinutes}m combined study today`;
    return `${streak}-day room streak`;
  }, [streak, isZero, totalStudyMinutesToday, level, targetMinutes]);

  return (
    <div
      id="streak-banner"
      className={cn(
        "rounded-[16px] border border-line px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4",
        isLegendary ? "bg-highlight/45" : "bg-surface-soft"
      )}
    >
      <div className="flex-1 space-y-2 w-full">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {isLegendary ? (
              <Award className="h-4 w-4 text-ink shrink-0" strokeWidth={1.75} />
            ) : (
              <Flame className="h-4 w-4 text-clay shrink-0" strokeWidth={1.75} />
            )}
            <p className="font-semibold text-sm text-ink">{title}</p>
          </div>
          <span className="font-mono text-xs text-ink-muted timer-digit">
            {Math.round(totalStudyMinutesToday)} / {targetMinutes} min today
          </span>
        </div>

        <div className="h-1.5 w-full rounded-full border border-line/20 bg-surface overflow-hidden">
          <div
            className="h-full rounded-full bg-clay transition-[width] duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
