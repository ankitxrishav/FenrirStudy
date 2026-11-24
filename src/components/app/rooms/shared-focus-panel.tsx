"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Play, Pause, Square, Maximize2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { doc, updateDoc } from "firebase/firestore";
import { useFirestore, useUser } from "@/firebase";
import { Room } from "@/lib/definitions";
import { useToast } from "@/hooks/use-toast";
import { useTimerStyle } from "@/hooks/use-timer-style";
import { TimerPresentation } from "@/components/app/timer/timer-presentation";

const FullscreenTimer = dynamic(
  () => import("@/components/app/timer/fullscreen-timer").then((m) => m.FullscreenTimer),
  { ssr: false }
);

interface SharedFocusPanelProps {
  roomId: string;
  room: Room | null;
}

export function SharedFocusPanel({ roomId, room }: SharedFocusPanelProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const { timerStyle } = useTimerStyle();

  const [workDur, setWorkDur] = useState(25);
  const [breakDur, setBreakDur] = useState(5);
  const [displaySeconds, setDisplaySeconds] = useState(25 * 60);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);

  const sf = room?.sharedFocus;
  const isOwner = user?.uid === room?.ownerId;
  const isRunning = sf?.status === "running";
  const isPaused = sf?.status === "paused";
  const isBreak = sf?.mode === "break";
  const noSession = !sf || sf.status === "stopped";

  const currentDur = sf
    ? (sf.mode === "work" ? sf.workDuration : sf.breakDuration) * 60
    : workDur * 60;

  useEffect(() => {
    if (!sf || sf.status === "stopped") {
      setDisplaySeconds(workDur * 60);
      return;
    }

    if (sf.status === "paused") {
      const pausedElapsed = sf.pausedElapsed ?? 0;
      setDisplaySeconds(Math.max(0, currentDur - pausedElapsed));
      return;
    }

    const tick = () => {
      const baseElapsed = sf.pausedElapsed ?? 0;
      const sinceStart = (Date.now() - new Date(sf.startedAt).getTime()) / 1000;
      const remaining = currentDur - (baseElapsed + sinceStart);
      setDisplaySeconds(Math.max(0, remaining));

      if (remaining <= 0 && sf.status === "running" && isOwner && firestore) {
        const nextMode = sf.mode === "work" ? "break" : "work";
        const newCycles = sf.mode === "work" ? sf.cycleCount + 1 : sf.cycleCount;
        updateDoc(doc(firestore, "rooms", roomId), {
          "sharedFocus.mode": nextMode,
          "sharedFocus.startedAt": new Date().toISOString(),
          "sharedFocus.cycleCount": newCycles,
          "sharedFocus.pausedElapsed": 0,
        }).catch(() => {});
        toast({
          title: nextMode === "break" ? "Break started" : "Focus cycle resumed",
        });
      }
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [sf, workDur, currentDur, isOwner, firestore, roomId, toast]);

  const startFocus = useCallback(async () => {
    if (!firestore || !user) return;
    await updateDoc(doc(firestore, "rooms", roomId), {
      sharedFocus: {
        status: "running",
        mode: "work",
        startedAt: new Date().toISOString(),
        workDuration: workDur,
        breakDuration: breakDur,
        cycleCount: 0,
        startedBy: user.uid,
        pausedElapsed: 0,
      },
    });
  }, [firestore, user, roomId, workDur, breakDur]);

  const pauseFocus = useCallback(async () => {
    if (!firestore || !sf) return;
    const elapsedSinceStart = (Date.now() - new Date(sf.startedAt).getTime()) / 1000;
    const totalElapsed = (sf.pausedElapsed ?? 0) + Math.max(0, elapsedSinceStart);
    await updateDoc(doc(firestore, "rooms", roomId), {
      "sharedFocus.status": "paused",
      "sharedFocus.pausedElapsed": totalElapsed,
    });
  }, [firestore, roomId, sf]);

  const resumeFocus = useCallback(async () => {
    if (!firestore) return;
    await updateDoc(doc(firestore, "rooms", roomId), {
      "sharedFocus.status": "running",
      "sharedFocus.startedAt": new Date().toISOString(),
    });
  }, [firestore, roomId]);

  const endFocus = useCallback(async () => {
    if (!firestore) return;
    await updateDoc(doc(firestore, "rooms", roomId), {
      sharedFocus: {
        status: "stopped",
        mode: "work",
        startedAt: new Date().toISOString(),
        workDuration: workDur,
        breakDuration: breakDur,
        cycleCount: sf?.cycleCount ?? 0,
        startedBy: sf?.startedBy ?? user?.uid ?? "",
        pausedElapsed: 0,
      },
    });
  }, [firestore, roomId, workDur, breakDur, sf, user]);

  const modeLabel = noSession
    ? "Shared Pomodoro"
    : `${isBreak ? "Break" : "Focus"} · Cycle ${(sf?.cycleCount ?? 0) + 1}`;

  return (
    <>
      <Card id="shared-focus-card" className="border-line bg-surface">
        <CardHeader className="pb-3 border-b border-line/15 flex flex-row items-center justify-between gap-2 space-y-0">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted block">
              Synchronized Room Clock
            </span>
            <CardTitle className="text-base font-semibold text-ink">
              Shared Room Focus
            </CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFullscreenOpen(true)}
            className="h-9 gap-1.5 rounded-full shrink-0"
            aria-label="Open full-screen room timer"
          >
            <Maximize2 className="h-3.5 w-3.5" strokeWidth={1.75} />
            <span>Full-screen timer</span>
          </Button>
        </CardHeader>

        <CardContent className="p-5 flex flex-col items-center gap-5">
          <TimerPresentation
            seconds={noSession ? workDur * 60 : displaySeconds}
            totalSeconds={currentDur}
            styleId={timerStyle}
            modeLabel={modeLabel}
            contextLabel={room?.name}
            isRunning={isRunning}
            isPaused={isPaused}
            isBreak={isBreak}
            size="embedded"
          />

          {isOwner && noSession && (
            <div className="grid grid-cols-2 gap-3 w-full">
              <div>
                <Label htmlFor="room-work-dur" className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
                  Focus (min)
                </Label>
                <Input
                  id="room-work-dur"
                  type="number"
                  min={1}
                  max={90}
                  value={workDur}
                  onChange={(e) => setWorkDur(Math.max(1, Number(e.target.value)))}
                  className="h-10 mt-1 bg-surface-soft"
                />
              </div>
              <div>
                <Label htmlFor="room-break-dur" className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
                  Break (min)
                </Label>
                <Input
                  id="room-break-dur"
                  type="number"
                  min={1}
                  max={30}
                  value={breakDur}
                  onChange={(e) => setBreakDur(Math.max(1, Number(e.target.value)))}
                  className="h-10 mt-1 bg-surface-soft"
                />
              </div>
            </div>
          )}

          {isOwner ? (
            <div className="flex gap-2 w-full">
              {noSession && (
                <Button onClick={startFocus} className="flex-1 h-11 gap-2">
                  <Play className="h-4 w-4" strokeWidth={2} />
                  <span>Start together</span>
                </Button>
              )}
              {isRunning && (
                <>
                  <Button variant="secondary" onClick={pauseFocus} className="flex-1 h-11 gap-2">
                    <Pause className="h-4 w-4" strokeWidth={2} />
                    <span>Pause</span>
                  </Button>
                  <Button variant="outline" onClick={endFocus} className="h-11 gap-2">
                    <Square className="h-4 w-4" strokeWidth={1.75} />
                    <span>End</span>
                  </Button>
                </>
              )}
              {isPaused && (
                <>
                  <Button onClick={resumeFocus} className="flex-1 h-11 gap-2">
                    <Play className="h-4 w-4" strokeWidth={2} />
                    <span>Resume</span>
                  </Button>
                  <Button variant="outline" onClick={endFocus} className="h-11 gap-2">
                    <RotateCcw className="h-4 w-4" strokeWidth={1.75} />
                    <span>Reset</span>
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="w-full rounded-md border border-line/20 bg-surface-soft px-3 py-2 text-center text-xs text-ink-muted">
              {noSession
                ? "Waiting for the room owner to start a shared session."
                : "Synced to the room owner's shared clock. Use Full-screen timer to focus distraction-free."}
            </div>
          )}
        </CardContent>
      </Card>

      <FullscreenTimer
        open={fullscreenOpen}
        onClose={() => setFullscreenOpen(false)}
        context="room-shared"
        seconds={noSession ? workDur * 60 : displaySeconds}
        totalSeconds={currentDur}
        modeLabel={modeLabel}
        contextLabel={room?.name}
        isRunning={isRunning}
        isPaused={isPaused}
        isIdle={noSession}
        isBreak={isBreak}
        canControl={isOwner}
        onStart={startFocus}
        onPause={pauseFocus}
        onResume={resumeFocus}
        onReset={endFocus}
        readOnlyHint="Shared clock is controlled by the room owner"
      />
    </>
  );
}
