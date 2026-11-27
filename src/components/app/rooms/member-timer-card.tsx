"use client";

import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { BellRing, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { RoomMember } from "@/lib/definitions";
import { formatDdayBadge, getEffectiveMemberTodaySeconds, parseIsoMs } from "@/lib/study-time";

interface MemberTimerCardProps {
  member: RoomMember;
  isCurrentUser: boolean;
  onSyncRequest: (member: RoomMember) => void;
  onMemberClick: (member: RoomMember) => void;
  onNudge?: (member: RoomMember) => void;
  nudgeCooldownUntil?: number;
}

const formatTime = (s: number) => {
  const sec = Math.floor(Math.max(0, s));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const rem = sec % 60;
  if (h > 0) return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(rem).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(rem).padStart(2, "0")}`;
};

export function MemberTimerCard({
  member,
  isCurrentUser,
  onSyncRequest,
  onMemberClick,
  onNudge,
  nudgeCooldownUntil = 0,
}: MemberTimerCardProps) {
  const timerStatus = member.timerStatus ?? "stopped";
  const timerMode = member.timerMode ?? "pomodoro";
  const initialDuration = member.initialDuration ?? 1500;
  const accumulatedTime = member.accumulatedTime ?? 0;

  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    setNowMs(Date.now());
    if (timerStatus !== "running" && nudgeCooldownUntil <= Date.now()) return;
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [timerStatus, member.startedAt, member.clientStartedAtMs, nudgeCooldownUntil]);

  const startedAtMs = parseIsoMs(member.startedAt) || member.clientStartedAtMs || 0;
  let displaySeconds = 0;
  let continuousElapsedSec = 0;
  if (timerStatus === "running" && startedAtMs > 0) {
    const elapsedSinceStart = Math.max(0, (nowMs - startedAtMs) / 1000);
    const totalElapsed = accumulatedTime + elapsedSinceStart;
    continuousElapsedSec = totalElapsed;
    displaySeconds = timerMode === "pomodoro"
      ? Math.max(0, initialDuration - totalElapsed)
      : totalElapsed;
  } else if (timerStatus === "paused") {
    displaySeconds = timerMode === "pomodoro"
      ? Math.max(0, initialDuration - accumulatedTime)
      : accumulatedTime;
  } else {
    displaySeconds = timerMode === "pomodoro" ? initialDuration : 0;
  }

  const todaySec = getEffectiveMemberTodaySeconds(member, nowMs);
  const progressPercent =
    timerMode === "pomodoro" && initialDuration > 0
      ? (displaySeconds / initialDuration) * 100
      : 100;
  const isDeepFocus = timerStatus === "running" && continuousElapsedSec >= 2400;
  const nudgeLocked = nudgeCooldownUntil > nowMs;
  const nudgeMinsLeft = nudgeLocked ? Math.max(1, Math.ceil((nudgeCooldownUntil - nowMs) / 60000)) : 0;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onMemberClick(member)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onMemberClick(member)}
      id={`member-card-${member.userId}`}
      data-user-id={member.userId}
      className={cn(
        "member-card rounded-[16px] border p-4 flex flex-col gap-3 relative overflow-hidden transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isCurrentUser
          ? "border-line bg-accent-soft/40 hover:bg-accent-soft/60"
          : "border-line bg-surface hover:bg-surface-soft"
      )}
    >
      <div className="flex items-center gap-2.5">
        <Avatar className="h-9 w-9 border border-line/40 shrink-0">
          <AvatarImage src={member.photoURL} />
          <AvatarFallback className="bg-surface-soft font-mono text-xs text-ink">
            {member.displayName?.[0]?.toUpperCase() ?? "?"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ink truncate">
            {member.displayName}
            {isCurrentUser && <span className="text-ink-muted font-normal"> (you)</span>}
          </p>
          <p className="text-xs text-ink-muted truncate">
            {member.subjectName || "No active subject"}
          </p>
        </div>

        <span
          title={timerStatus}
          className={cn(
            "h-2.5 w-2.5 rounded-full border border-line shrink-0",
            timerStatus === "running"
              ? "bg-success"
              : timerStatus === "paused"
                ? "bg-highlight"
                : "bg-surface-muted"
          )}
        />
      </div>

      <div className="flex items-baseline justify-between gap-2 pt-1">
        <span
          className={cn(
            "font-mono text-3xl font-semibold tracking-tight timer-digit",
            timerStatus === "running" ? "text-ink" : "text-ink-muted"
          )}
        >
          {formatTime(displaySeconds)}
        </span>
        <span className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
          {timerMode}
        </span>
      </div>

      <div className="flex items-center justify-between border-t border-line/15 pt-2.5 font-mono text-[11px] text-ink-muted timer-digit">
        <span>{member.todaySessions || 0} sessions</span>
        <span>{(todaySec / 3600).toFixed(1)}h today</span>
      </div>

      {(isDeepFocus || member.isDayOffToday || (member.mainDdayDate && member.mainDdayTitle)) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {isDeepFocus && (
            <span className="inline-flex items-center gap-1 rounded-full border border-clay/40 bg-clay/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-clay">
              <Flame className="h-3 w-3" />
              Deep {Math.floor(continuousElapsedSec / 60)}m+
            </span>
          )}
          {member.isDayOffToday && (
            <span className="inline-flex items-center rounded-full border border-line/30 bg-surface-soft px-2 py-0.5 font-mono text-[10px] text-ink-muted">
              Day Off
            </span>
          )}
          {member.mainDdayDate && member.mainDdayTitle && (
            <span className="inline-flex items-center rounded-full border border-line/30 bg-highlight/80 px-2 py-0.5 font-mono text-[10px] font-semibold text-ink truncate max-w-[160px]">
              {formatDdayBadge(member.mainDdayDate).label} &middot; {member.mainDdayTitle}
            </span>
          )}
        </div>
      )}

      {timerStatus === "running" && !isCurrentUser && (
        <Button
          variant="outline"
          size="sm"
          className="w-full h-9 text-xs"
          onClick={(e) => {
            e.stopPropagation();
            onSyncRequest(member);
          }}
        >
          Sync to this timer
        </Button>
      )}

      {timerStatus !== "running" && !isCurrentUser && onNudge && (
        <Button
          variant="outline"
          size="sm"
          disabled={nudgeLocked}
          className="w-full h-9 text-xs gap-1.5"
          onClick={(e) => {
            e.stopPropagation();
            onNudge(member);
          }}
        >
          <BellRing className="h-3.5 w-3.5 text-clay" />
          <span>{nudgeLocked ? `Nudged (${nudgeMinsLeft}m)` : "Wake Nudge"}</span>
        </Button>
      )}

      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-surface-muted">
        <div
          className="h-full transition-[width] duration-700"
          style={{
            width: `${Math.max(0, Math.min(100, progressPercent))}%`,
            backgroundColor: member.subjectColor ?? "var(--accent)",
          }}
        />
      </div>
    </div>
  );
}
