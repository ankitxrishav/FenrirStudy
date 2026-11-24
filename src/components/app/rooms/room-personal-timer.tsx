"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Play, Pause, Square, PlusCircle, RefreshCw, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTimer } from "@/hooks/use-timer";
import { useTimerStyle, requestBrowserFullscreen } from "@/hooks/use-timer-style";
import { Subject } from "@/lib/definitions";
import { AddSubjectDialog } from "@/components/app/timer/add-subject-dialog";
import { TimerPresentation } from "@/components/app/timer/timer-presentation";
import { useUser, useFirestore } from "@/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

const FullscreenTimer = dynamic(
  () => import("@/components/app/timer/fullscreen-timer").then((m) => m.FullscreenTimer),
  { ssr: false }
);

interface RoomPersonalTimerProps {
  subjects: Subject[];
}

export function RoomPersonalTimer({ subjects }: RoomPersonalTimerProps) {
  const {
    displayTime,
    selectedSubjectId,
    mode,
    customDuration,
    isActive,
    isPaused,
    isIdle,
    timerStateLoading,
    start,
    pause,
    stop,
    reset,
    handleModeChange,
    handleSubjectChange,
    handleDurationChange,
    setSelectedSubjectId,
  } = useTimer();

  const { timerStyle } = useTimerStyle();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isAddSubjectOpen, setAddSubjectOpen] = useState(false);
  const [localDuration, setLocalDuration] = useState(customDuration);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);

  useEffect(() => {
    if (isIdle) setLocalDuration(customDuration);
  }, [customDuration, isIdle]);

  useEffect(() => {
    if (isIdle && !selectedSubjectId && subjects.length > 0) {
      setSelectedSubjectId(subjects[0].id);
      handleSubjectChange(subjects[0].id);
    }
  }, [isIdle, selectedSubjectId, subjects, setSelectedSubjectId, handleSubjectChange]);

  const openFullscreen = useCallback(() => {
    requestBrowserFullscreen();
    setFullscreenOpen(true);
  }, []);

  const closeFullscreen = useCallback(() => {
    setFullscreenOpen(false);
  }, []);

  const handleAddSubject = async (
    newSubject: Omit<Subject, "id" | "archived" | "userId" | "createdAt">
  ) => {
    if (!user || !firestore) return;
    try {
      const docRef = await addDoc(collection(firestore, "subjects"), {
        ...newSubject,
        userId: user.uid,
        archived: false,
        createdAt: serverTimestamp(),
      });
      setSelectedSubjectId(docRef.id);
      handleSubjectChange(docRef.id);
      toast({
        title: "Subject added",
        description: `"${newSubject.name}" is ready for your session.`,
      });
    } catch {
      toast({
        title: "Error",
        description: "Could not add subject.",
        variant: "destructive",
      });
    }
  };

  const handleDurationBlur = () => {
    const clamped = Math.max(1, Math.min(180, localDuration));
    setLocalDuration(clamped);
    handleDurationChange(clamped);
  };

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId) ?? null;
  const totalSeconds = mode === "pomodoro" ? customDuration * 60 : 0;
  const modeLabel = mode === "pomodoro" ? "Personal Pomodoro" : "Personal Stopwatch";

  const handleStart = useCallback(async () => {
    await start();
  }, [start]);

  const handlePause = useCallback(async () => {
    await pause();
  }, [pause]);

  const handleStop = useCallback(async () => {
    await stop("stopped");
  }, [stop]);

  return (
    <>
      <Card className="border-line bg-surface">
        <CardHeader className="pb-3 border-b border-line/15 flex flex-row items-center justify-between gap-2 space-y-0">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted block">
              Broadcasts to room peers
            </span>
            <CardTitle className="text-base font-semibold text-ink">
              My Room Timer
            </CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={openFullscreen}
            className="h-9 gap-1.5 rounded-full shrink-0"
            aria-label="Open full-screen personal timer"
          >
            <Maximize2 className="h-3.5 w-3.5" strokeWidth={1.75} />
            <span>Full-screen timer</span>
          </Button>
        </CardHeader>

        <CardContent className="p-5 flex flex-col gap-4">
          {/* Mode toggle */}
          <div className="grid grid-cols-2 rounded-full border border-line bg-surface-soft p-1 gap-1">
            {(["pomodoro", "stopwatch"] as const).map((m) => (
              <button
                key={m}
                type="button"
                disabled={!isIdle}
                onClick={() => handleModeChange(m)}
                className={cn(
                  "min-h-[36px] rounded-full text-xs font-medium capitalize transition-colors",
                  mode === m
                    ? "bg-highlight border border-line text-ink font-semibold"
                    : "text-ink-muted hover:text-ink disabled:opacity-45 disabled:cursor-not-allowed"
                )}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Subject picker */}
          <div className="space-y-1.5">
            <Label className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
              Subject
            </Label>
            <div className="flex gap-2">
              <div className="flex-1 min-w-0">
                <Select
                  value={selectedSubjectId ?? ""}
                  onValueChange={(val) => {
                    if (isIdle) {
                      setSelectedSubjectId(val || null);
                      handleSubjectChange(val);
                    }
                  }}
                  disabled={!isIdle}
                >
                  <SelectTrigger className="h-10 bg-surface-soft">
                    <SelectValue placeholder="Select a subject">
                      {selectedSubject ? (
                        <span className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: selectedSubject.color }}
                          />
                          <span className="truncate">{selectedSubject.name}</span>
                        </span>
                      ) : (
                        <span className="text-ink-muted">Select a subject</span>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.length === 0 && (
                      <p className="text-xs text-ink-muted px-3 py-2">No subjects yet.</p>
                    )}
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <span className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: s.color }}
                          />
                          {s.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setAddSubjectOpen(true)}
                disabled={!isIdle}
                className="h-10 w-10 shrink-0"
                aria-label="Add subject"
              >
                <PlusCircle className="h-4 w-4" strokeWidth={1.75} />
              </Button>
            </div>
          </div>

          {mode === "pomodoro" && isIdle && (
            <div>
              <Label htmlFor="room-personal-duration" className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
                Duration (minutes)
              </Label>
              <Input
                id="room-personal-duration"
                type="number"
                min={1}
                max={180}
                value={localDuration}
                onChange={(e) => setLocalDuration(Number(e.target.value))}
                onBlur={handleDurationBlur}
                className="h-10 mt-1 bg-surface-soft"
              />
            </div>
          )}

          {/* Shared Timer Presentation */}
          <div className="py-2">
            <TimerPresentation
              seconds={displayTime}
              totalSeconds={totalSeconds}
              styleId={timerStyle}
              modeLabel={modeLabel}
              contextLabel={selectedSubject?.name}
              isRunning={isActive}
              isPaused={isPaused}
              size="embedded"
            />
          </div>

          {/* Controls */}
          {timerStateLoading ? (
            <div className="flex items-center justify-center py-2">
              <RefreshCw className="h-4 w-4 animate-spin text-ink-muted" />
            </div>
          ) : (
            <div className="flex gap-2">
              {isIdle && (
                <Button
                  onClick={handleStart}
                  className="flex-1 h-11 gap-2"
                  disabled={!selectedSubjectId}
                >
                  <Play className="h-4 w-4" strokeWidth={2} />
                  <span>Start</span>
                </Button>
              )}

              {isActive && (
                <>
                  <Button variant="secondary" onClick={handlePause} className="flex-1 h-11 gap-2">
                    <Pause className="h-4 w-4" strokeWidth={2} />
                    <span>Pause</span>
                  </Button>
                  <Button variant="outline" onClick={handleStop} className="h-11 gap-2">
                    <Square className="h-4 w-4" strokeWidth={1.75} />
                    <span>Save</span>
                  </Button>
                </>
              )}

              {isPaused && (
                <>
                  <Button onClick={handleStart} className="flex-1 h-11 gap-2">
                    <Play className="h-4 w-4" strokeWidth={2} />
                    <span>Resume</span>
                  </Button>
                  <Button variant="outline" onClick={handleStop} className="h-11 gap-2">
                    <Square className="h-4 w-4" strokeWidth={1.75} />
                    <span>Save</span>
                  </Button>
                </>
              )}
            </div>
          )}

          {isIdle && !selectedSubjectId && subjects.length > 0 && (
            <p className="text-xs text-center text-ink-muted">
              Select a subject above to start your timer.
            </p>
          )}
        </CardContent>
      </Card>

      <AddSubjectDialog
        isOpen={isAddSubjectOpen}
        onOpenChange={setAddSubjectOpen}
        onAddSubject={handleAddSubject}
      />

      <FullscreenTimer
        open={fullscreenOpen}
        onClose={closeFullscreen}
        context="room-personal"
        seconds={displayTime}
        totalSeconds={totalSeconds}
        modeLabel={mode === "pomodoro" ? "Focus" : "Stopwatch"}
        contextLabel={selectedSubject?.name}
        isRunning={isActive}
        isPaused={isPaused}
        isIdle={isIdle}
        canControl={Boolean(selectedSubjectId) || !isIdle}
        readOnlyHint="Add or select a subject in My Room Timer first"
        onStart={handleStart}
        onPause={handlePause}
        onResume={handleStart}
        onStop={handleStop}
        onReset={reset}
      />
    </>
  );
}
