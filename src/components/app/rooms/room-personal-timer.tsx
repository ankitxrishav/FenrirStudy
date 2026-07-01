"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
import {
  Play,
  Pause,
  Square,
  Timer,
  BookOpen,
  RefreshCw,
  PlusCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTimer } from "@/hooks/use-timer";
import { Subject } from "@/lib/definitions";
import { motion, AnimatePresence } from "framer-motion";
import { AddSubjectDialog } from "@/components/app/timer/add-subject-dialog";
import { useUser, useFirestore } from "@/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

interface RoomPersonalTimerProps {
  subjects: Subject[];
}

const formatTime = (seconds: number): string => {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

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
    handleModeChange,
    handleSubjectChange,
    handleDurationChange,
    setSelectedSubjectId,
  } = useTimer();

  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isAddSubjectOpen, setAddSubjectOpen] = useState(false);

  const handleAddSubject = async (newSubject: Omit<Subject, 'id' | 'archived' | 'userId' | 'createdAt'>) => {
    if (!user) {
      toast({
        title: 'Please Log In',
        description: 'You need to be logged in to add subjects.'
      });
      return;
    }
    if (!firestore) return;

    try {
      const docRef = await addDoc(collection(firestore, "subjects"), {
        ...newSubject,
        userId: user.uid,
        archived: false,
        createdAt: serverTimestamp()
      });
      setSelectedSubjectId(docRef.id);
      handleSubjectChange(docRef.id);
      toast({
        title: 'Subject Added',
        description: `Subject "${newSubject.name}" created successfully.`
      });
    } catch (e) {
      console.error("Error adding document: ", e);
      toast({
        title: 'Error',
        description: 'Could not add subject.',
        variant: 'destructive'
      });
    }
  };

  const [localDuration, setLocalDuration] = useState(customDuration);
  const [isStopping, setIsStopping] = useState(false);
  const prevIsIdleRef = useRef(isIdle);

  // Sync duration input from context when idle
  useEffect(() => {
    if (isIdle) setLocalDuration(customDuration);
  }, [customDuration, isIdle]);

  // Flash effect: detect when timer just stopped
  useEffect(() => {
    if (prevIsIdleRef.current === false && isIdle) {
      setIsStopping(true);
      const t = setTimeout(() => setIsStopping(false), 800);
      return () => clearTimeout(t);
    }
    prevIsIdleRef.current = isIdle;
  }, [isIdle]);

  const handleStart = useCallback(async () => {
    await start();
  }, [start]);

  const handlePause = useCallback(async () => {
    await pause();
  }, [pause]);

  const handleStop = useCallback(async () => {
    await stop("stopped");
  }, [stop]);

  const handleDurationBlur = () => {
    const clamped = Math.max(1, Math.min(180, localDuration));
    setLocalDuration(clamped);
    handleDurationChange(clamped);
  };

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);

  // Progress for pomodoro arc (0..1)
  const progress =
    mode === "pomodoro" && customDuration > 0
      ? Math.max(0, Math.min(1, displayTime / (customDuration * 60)))
      : 1;

  const statusColor = isActive
    ? "text-green-400"
    : isPaused
    ? "text-amber-400"
    : "text-muted-foreground/50";

  const glowClass = isActive
    ? "border-green-500/30 shadow-green-500/10"
    : isPaused
    ? "border-amber-400/30 shadow-amber-400/10"
    : isStopping
    ? "border-primary/20"
    : "border-white/10";

  return (
    <>
    <Card
      className={cn(
        "glass shadow-xl transition-all duration-500",
        glowClass
      )}
    >
      <CardHeader className="pb-2 border-b border-white/5">
        <CardTitle className="text-sm flex items-center gap-2">
          <Timer className="h-4 w-4 text-primary" />
          My Timer
          {/* Status dot */}
          <span
            className={cn(
              "ml-auto h-2 w-2 rounded-full transition-colors duration-300",
              isActive
                ? "bg-green-500 animate-pulse"
                : isPaused
                ? "bg-amber-400"
                : "bg-muted-foreground/20"
            )}
          />
        </CardTitle>
      </CardHeader>

      <CardContent className="p-4 flex flex-col gap-4">
        {/* ── Mode toggle ── */}
        <div className="flex bg-white/5 rounded-xl p-0.5 gap-0.5">
          {(["pomodoro", "stopwatch"] as const).map((m) => (
            <button
              key={m}
              disabled={!isIdle}
              onClick={() => handleModeChange(m)}
              className={cn(
                "flex-1 py-1.5 text-[11px] font-bold rounded-lg capitalize transition-all duration-200",
                mode === m
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
              )}
            >
              {m === "pomodoro" ? "🍅 Pomodoro" : "⏱ Stopwatch"}
            </button>
          ))}
        </div>

        {/* ── Subject selector ── */}
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <BookOpen className="h-3 w-3" />
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
                <SelectTrigger
                  className={cn(
                    "h-9 text-sm bg-white/5 border-white/10 w-full",
                    !isIdle && "opacity-60 cursor-not-allowed"
                  )}
                >
                  <SelectValue placeholder="Select a subject…">
                    {selectedSubject ? (
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: selectedSubject.color }}
                        />
                        {selectedSubject.name}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Select a subject…</span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {subjects.length === 0 && (
                    <p className="text-xs text-muted-foreground px-3 py-2">
                      No subjects yet.
                    </p>
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
              variant="outline"
              size="icon"
              onClick={() => setAddSubjectOpen(true)}
              disabled={!isIdle}
              className="h-9 w-9 bg-white/5 border-white/10 shrink-0"
            >
              <PlusCircle className="h-4 w-4" />
            </Button>
          </div>
          {!isIdle && (
            <p className="text-[10px] text-muted-foreground/60">
              Stop timer to change subject
            </p>
          )}
        </div>

        {/* ── Duration input (pomodoro + idle only) ── */}
        <AnimatePresence>
          {mode === "pomodoro" && isIdle && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Duration (minutes)
              </Label>
              <Input
                type="number"
                min={1}
                max={180}
                value={localDuration}
                onChange={(e) => setLocalDuration(Number(e.target.value))}
                onBlur={handleDurationBlur}
                className="h-8 text-sm mt-1 bg-white/5 border-white/10"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Timer display ── */}
        <div className="flex flex-col items-center gap-2 py-2 relative">
          {/* Circular progress ring (pomodoro only) */}
          {mode === "pomodoro" && (
            <svg
              className="absolute -top-1"
              width="88"
              height="88"
              viewBox="0 0 88 88"
            >
              <circle
                cx="44"
                cy="44"
                r="40"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-white/5"
              />
              <circle
                cx="44"
                cy="44"
                r="40"
                fill="none"
                stroke={
                  isActive ? "#22c55e" : isPaused ? "#fbbf24" : "hsl(var(--primary))"
                }
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 40}`}
                strokeDashoffset={`${2 * Math.PI * 40 * (1 - progress)}`}
                transform="rotate(-90 44 44)"
                className="transition-all duration-1000"
              />
            </svg>
          )}

          <motion.span
            key={`${isActive}-${isPaused}`}
            initial={{ scale: 0.9, opacity: 0.5 }}
            animate={{ scale: 1, opacity: 1 }}
            className={cn(
              "text-4xl font-black tracking-tighter tabular-nums mt-2 transition-colors duration-300",
              statusColor
            )}
          >
            {formatTime(displayTime)}
          </motion.span>

          <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground/40 font-bold">
            {isActive
              ? "Running"
              : isPaused
              ? "Paused"
              : mode === "pomodoro"
              ? "Ready"
              : "Stopwatch"}
          </span>
        </div>

        {/* ── Controls ── */}
        {timerStateLoading ? (
          <div className="flex items-center justify-center py-2">
            <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex gap-2">
            {/* START (idle) */}
            {isIdle && (
              <Button
                onClick={handleStart}
                className="flex-1 gap-2 h-10 font-bold"
                disabled={!selectedSubjectId}
                title={!selectedSubjectId ? "Select a subject first" : "Start timer"}
              >
                <Play className="h-4 w-4" />
                Start
              </Button>
            )}

            {/* PAUSE (running) */}
            {isActive && (
              <>
                <Button
                  variant="outline"
                  onClick={handlePause}
                  className="flex-1 gap-2 h-10 border-white/10 hover:bg-amber-500/10 hover:text-amber-400 hover:border-amber-400/30"
                >
                  <Pause className="h-4 w-4" />
                  Pause
                </Button>
                <Button
                  variant="outline"
                  onClick={handleStop}
                  className="gap-2 h-10 border-white/10 hover:bg-red-500/10 hover:text-red-400 hover:border-red-400/30"
                  title="Stop & save session"
                >
                  <Square className="h-4 w-4" />
                </Button>
              </>
            )}

            {/* RESUME / STOP (paused) */}
            {isPaused && (
              <>
                <Button
                  onClick={handleStart}
                  className="flex-1 gap-2 h-10 font-bold"
                >
                  <Play className="h-4 w-4" />
                  Resume
                </Button>
                <Button
                  variant="outline"
                  onClick={handleStop}
                  className="gap-2 h-10 border-white/10 hover:bg-red-500/10 hover:text-red-400 hover:border-red-400/30"
                  title="Stop & save session"
                >
                  <Square className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        )}

        {/* No subject warning */}
        <AnimatePresence>
          {isIdle && !selectedSubjectId && subjects.length > 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-[11px] text-center text-amber-400/80"
            >
              ↑ Select a subject to start
            </motion.p>
          )}
        </AnimatePresence>

        {/* Current subject active pill */}
        <AnimatePresence>
          {(isActive || isPaused) && selectedSubject && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/5"
            >
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: selectedSubject.color }}
              />
              <span className="text-xs font-semibold truncate">
                {selectedSubject.name}
              </span>
              <span className="text-[10px] text-muted-foreground ml-auto">
                studying
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>

    <AddSubjectDialog
      isOpen={isAddSubjectOpen}
      onOpenChange={setAddSubjectOpen}
      onAddSubject={handleAddSubject}
    />
    </>
  );
}
