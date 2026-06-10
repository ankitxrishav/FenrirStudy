"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Play, Pause, Square, Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import { doc, updateDoc } from "firebase/firestore";
import { useFirestore, useUser } from "@/firebase";
import { Room } from "@/lib/definitions";
import { useToast } from "@/hooks/use-toast";

interface SharedFocusPanelProps {
  roomId: string;
  room: Room | null;
}

function formatTime(seconds: number): string {
  const m = Math.floor(Math.max(0, seconds) / 60).toString().padStart(2, "0");
  const s = Math.floor(Math.max(0, seconds) % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function SharedFocusPanel({ roomId, room }: SharedFocusPanelProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const [workDur, setWorkDur] = useState(25);
  const [breakDur, setBreakDur] = useState(5);
  const [displaySeconds, setDisplaySeconds] = useState(25 * 60);

  const sf = room?.sharedFocus;
  const isOwner = user?.uid === room?.ownerId;
  const isRunning = sf?.status === "running";
  const isPaused = sf?.status === "paused";

  // Compute remaining time client-side
  useEffect(() => {
    const currentDur = sf
      ? (sf.mode === "work" ? sf.workDuration : sf.breakDuration) * 60
      : workDur * 60;

    if (!sf || sf.status === "stopped") {
      setDisplaySeconds(currentDur);
      return;
    }

    const tick = () => {
      const elapsed = (Date.now() - new Date(sf.startedAt).getTime()) / 1000;
      const remaining = currentDur - elapsed;
      setDisplaySeconds(remaining);

      // Auto-transition at 0
      if (remaining <= 0 && sf.status === "running" && isOwner && firestore) {
        const nextMode = sf.mode === "work" ? "break" : "work";
        const newCycles = sf.mode === "work" ? sf.cycleCount + 1 : sf.cycleCount;
        updateDoc(doc(firestore, "rooms", roomId), {
          "sharedFocus.mode": nextMode,
          "sharedFocus.startedAt": new Date().toISOString(),
          "sharedFocus.cycleCount": newCycles,
        });
        toast({ title: nextMode === "break" ? "Break time! 🌿" : "Back to work! 💪" });
      }
    };

    tick();
    if (sf.status === "running") {
      const id = setInterval(tick, 1000);
      return () => clearInterval(id);
    }
  }, [sf, workDur, isOwner, firestore, roomId, toast]);

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
      },
    });
  }, [firestore, user, roomId, workDur, breakDur]);

  const pauseFocus = useCallback(async () => {
    if (!firestore) return;
    await updateDoc(doc(firestore, "rooms", roomId), {
      "sharedFocus.status": "paused",
    });
  }, [firestore, roomId]);

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
        startedBy: sf?.startedBy ?? (user?.uid ?? ""),
      },
    });
  }, [firestore, roomId, workDur, breakDur, sf, user]);

  const noSession = !sf || sf.status === "stopped";

  return (
    <Card id="shared-focus-card" className={cn(
      "glass border-white/10 shadow-xl transition-all duration-500",
      isRunning && "border-primary/30 shadow-primary/10"
    )}>
      <CardHeader className="pb-3 border-b border-white/5">
        <CardTitle className="text-base flex items-center gap-2">
          <Timer className="h-4 w-4 text-primary" />
          Shared Focus
          {isRunning && <span className="ml-auto flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />}
        </CardTitle>
      </CardHeader>

      <CardContent className="p-5 flex flex-col items-center gap-4">
        {/* Phase label */}
        {!noSession && (
          <div className="text-[11px] uppercase font-black tracking-[0.3em] text-primary">
            {sf.mode === "work" ? "WORK" : "BREAK"} · Cycle {sf.cycleCount + 1}
          </div>
        )}

        {/* Timer display */}
        <div className={cn(
          "text-5xl font-black tracking-tighter tabular-nums",
          isRunning ? "text-primary" : "text-foreground/70"
        )}>
          {formatTime(noSession ? workDur * 60 : displaySeconds)}
        </div>

        {/* Owner duration settings */}
        {isOwner && noSession && (
          <div className="flex gap-4 w-full">
            <div className="flex-1">
              <Label className="text-[10px] uppercase tracking-wider">Work (min)</Label>
              <Input
                type="number"
                min={1}
                max={90}
                value={workDur}
                onChange={e => setWorkDur(Number(e.target.value))}
                className="h-8 text-sm mt-1"
              />
            </div>
            <div className="flex-1">
              <Label className="text-[10px] uppercase tracking-wider">Break (min)</Label>
              <Input
                type="number"
                min={1}
                max={30}
                value={breakDur}
                onChange={e => setBreakDur(Number(e.target.value))}
                className="h-8 text-sm mt-1"
              />
            </div>
          </div>
        )}

        {/* Controls (owner only) */}
        {isOwner && (
          <div className="flex gap-2 w-full">
            {noSession && (
              <Button onClick={startFocus} className="flex-1 gap-2">
                <Play className="h-4 w-4" /> Start Focus
              </Button>
            )}
            {isRunning && (
              <>
                <Button variant="outline" onClick={pauseFocus} className="flex-1 gap-2">
                  <Pause className="h-4 w-4" /> Pause
                </Button>
                <Button variant="outline" onClick={endFocus} className="gap-2">
                  <Square className="h-4 w-4" /> End
                </Button>
              </>
            )}
            {isPaused && (
              <>
                <Button onClick={resumeFocus} className="flex-1 gap-2">
                  <Play className="h-4 w-4" /> Resume
                </Button>
                <Button variant="outline" onClick={endFocus} className="gap-2">
                  <Square className="h-4 w-4" /> End
                </Button>
              </>
            )}
          </div>
        )}

        {!isOwner && noSession && (
          <p className="text-xs text-muted-foreground text-center">Waiting for the room owner to start a focus session…</p>
        )}
      </CardContent>
    </Card>
  );
}
