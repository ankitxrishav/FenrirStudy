"use client";

import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RoomMember } from "@/lib/definitions";
import { getEffectiveMemberTodaySeconds, parseIsoMs } from "@/lib/study-time";

interface MemberTimerCardProps {
  member: RoomMember;
  isCurrentUser: boolean;
  onSyncRequest: (member: RoomMember) => void;
  onMemberClick: (member: RoomMember) => void;
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
}: MemberTimerCardProps) {
  const timerStatus = member.timerStatus ?? "stopped";
  const timerMode = member.timerMode ?? "pomodoro";
  const initialDuration = member.initialDuration ?? 1500;
  const accumulatedTime = member.accumulatedTime ?? 0;

  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    setNowMs(Date.now());
    if (timerStatus !== "running") return;
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [timerStatus, member.startedAt, member.clientStartedAtMs]);

  const startedAtMs = parseIsoMs(member.startedAt) || member.clientStartedAtMs || 0;
  let displaySeconds = 0;
  if (timerStatus === "running" && startedAtMs > 0) {
    const elapsedSinceStart = Math.max(0, (nowMs - startedAtMs) / 1000);
    const totalElapsed = accumulatedTime + elapsedSinceStart;
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
