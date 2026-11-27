"use client";

import { useEffect, useState } from "react";
import { MemberTimerCard } from "./member-timer-card";
import { useTimer } from "@/hooks/use-timer";
import { useToast } from "@/hooks/use-toast";
import { RoomMember } from "@/lib/definitions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface MemberTimerGridProps {
  members: RoomMember[];
  currentUserId: string;
  roomId: string;
  onMemberClick: (member: RoomMember) => void;
  onNudge?: (member: RoomMember) => void;
  nudgeCooldowns?: Record<string, number>;
}

export function MemberTimerGrid({ members, currentUserId, onMemberClick, onNudge, nudgeCooldowns }: MemberTimerGridProps) {
  const { handleModeChange, handleDurationChange, start, stop, isIdle } = useTimer();
  const { toast } = useToast();
  const [syncTarget, setSyncTarget] = useState<RoomMember | null>(null);
  const studyingCount = members.filter((m) => m.timerStatus === "running").length;
  const [tickNowMs, setTickNowMs] = useState(() => Date.now());

  useEffect(() => {
    setTickNowMs(Date.now());
    if (studyingCount === 0) return;
    const id = setInterval(() => setTickNowMs(Date.now()), 250);
    return () => clearInterval(id);
  }, [studyingCount]);

  const doSync = async (targetMember: RoomMember) => {
    if (!isIdle) {
      await stop("stopped");
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    if (
      targetMember.timerMode === "pomodoro" &&
      targetMember.timerStatus === "running" &&
      targetMember.startedAt
    ) {
      const elapsedSinceStart = (Date.now() - new Date(targetMember.startedAt).getTime()) / 1000;
      const totalElapsed = (targetMember.accumulatedTime ?? 0) + elapsedSinceStart;
      const remaining = Math.max(10, (targetMember.initialDuration ?? 1500) - totalElapsed);

      handleModeChange("pomodoro");
      handleDurationChange(Math.round(remaining / 60));
      await new Promise((resolve) => setTimeout(resolve, 200));
      await start();

      toast({
        title: `Synced with ${targetMember.displayName}`,
        description: `${Math.round(remaining / 60)}m remaining on this session.`,
      });
    } else if (targetMember.timerMode === "stopwatch") {
      handleModeChange("stopwatch");
      await start();
      toast({
        title: `Synced with ${targetMember.displayName}`,
        description: "Stopwatch started in sync.",
      });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-success" />
          <h2 className="font-mono text-xs uppercase tracking-wider text-ink-muted">
            Live study · {studyingCount} active
          </h2>
        </div>
      </div>

      <div id="member-timer-grid" className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {members.map((member, i) => (
          <MemberTimerCard
            key={member.id || member.userId || `member-${i}`}
            member={member}
            isCurrentUser={member.userId === currentUserId}
            onSyncRequest={setSyncTarget}
            onMemberClick={onMemberClick}
            onNudge={onNudge}
            nudgeCooldownUntil={nudgeCooldowns?.[member.userId] ?? 0}
            nowMs={tickNowMs}
          />
        ))}
      </div>

      {members.length === 0 && (
        <div className="rounded-[16px] border border-line/30 bg-surface-soft py-10 text-center text-sm text-ink-muted">
          No members yet. Share your room code to invite study partners.
        </div>
      )}

      <AlertDialog open={!!syncTarget} onOpenChange={(open) => !open && setSyncTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sync personal timer?</AlertDialogTitle>
            <AlertDialogDescription>
              Your personal timer will match <strong>{syncTarget?.displayName}</strong>&apos;s clock and start immediately.
              {!isIdle && " Your current active session will be saved first."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (syncTarget) {
                  doSync(syncTarget);
                  setSyncTarget(null);
                }
              }}
            >
              Sync timer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
