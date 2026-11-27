"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Plus,
  Maximize2,
  Users,
  ArrowRight,
  Clock,
  Volume2,
  CalendarClock,
  CheckSquare,
  Square as UncheckedSquare,
} from "lucide-react";
import { useTimer } from "@/hooks/use-timer";
import { useTimerStyle, requestBrowserFullscreen } from "@/hooks/use-timer-style";
import { useMyRooms } from "@/hooks/use-room";
import { useYptExtras } from "@/hooks/use-ypt-extras";
import { useUser, useFirestore, useCollection } from "@/firebase";
import { addDoc, collection, query, serverTimestamp, where } from "firebase/firestore";
import type { Subject, TimerFaceStyle } from "@/lib/definitions";
import { AMBIENT_PRESETS, AmbientSoundPreset, ambientSoundEngine } from "@/lib/ambient-sound";
import { formatDdayBadge, formatLocalDateKey } from "@/lib/study-time";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { AddSubjectDialog } from "./add-subject-dialog";
import { TimerPresentation } from "./timer-presentation";

const FullscreenTimer = dynamic(
  () => import("./fullscreen-timer").then((m) => m.FullscreenTimer),
  { ssr: false }
);

const PRESET_DURATIONS = [15, 25, 45, 60];

const TIMER_STYLES: { id: TimerFaceStyle; label: string }[] = [
  { id: "flip", label: "Flip" },
  { id: "digital", label: "Digital" },
  { id: "minimal", label: "Minimal" },
  { id: "progress", label: "Ring" },
];

export default function Timer() {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [isAddSubjectOpen, setAddSubjectOpen] = useState(false);
  const [isFullscreenOpen, setFullscreenOpen] = useState(false);
  const [isResetDialogOpen, setResetDialogOpen] = useState(false);

  const { rooms, loading: roomsLoading } = useMyRooms();
  const { timerStyle, setTimerStyle } = useTimerStyle();
  const { mainDday, studyTodos, toggleTodo } = useYptExtras();

  const [ambientPreset, setAmbientPreset] = useState<AmbientSoundPreset>(() => ambientSoundEngine.getPreset());
  const [ambientVolume, setAmbientVolume] = useState(() => Math.round(ambientSoundEngine.getVolume() * 100));

  useEffect(() => {
    return ambientSoundEngine.subscribe(() => {
      setAmbientPreset(ambientSoundEngine.getPreset());
      setAmbientVolume(Math.round(ambientSoundEngine.getVolume() * 100));
    });
  }, []);

  const subjectsQuery = useMemo(() => {
    return user && firestore
      ? query(
          collection(firestore, "subjects"),
          where("userId", "==", user.uid),
          where("archived", "==", false)
        )
      : null;
  }, [user, firestore]);
  const { data: subjects, loading: subjectsLoading } = useCollection<Subject>(subjectsQuery);

  const {
    displayTime,
    selectedSubjectId,
    mode,
    customDuration,
    isActive,
    isPaused,
    isIdle,
    start,
    pause,
    stop,
    reset,
    handleModeChange,
    handleSubjectChange,
    handleDurationChange,
    setSelectedSubjectId,
  } = useTimer();

  useEffect(() => {
    if (isIdle && !selectedSubjectId && subjects && subjects.length > 0) {
      handleSubjectChange(subjects[0].id);
    }
  }, [isIdle, selectedSubjectId, subjects, handleSubjectChange]);

  const selectedSubject = useMemo(() => {
    if (!subjects || !selectedSubjectId) return null;
    return subjects.find((s) => s.id === selectedSubjectId) || null;
  }, [subjects, selectedSubjectId]);

  const handleAddSubject = async (
    newSubject: Omit<Subject, "id" | "archived" | "userId" | "createdAt">
  ) => {
    if (!user) {
      toast({
        title: "Please Sign In",
        description: "You need an account to create study subjects.",
        action: <Button onClick={() => router.push("/login")}>Sign In</Button>,
      });
      return;
    }
    if (!firestore) return;

    try {
      const docRef = await addDoc(collection(firestore, "subjects"), {
        ...newSubject,
        userId: user.uid,
        archived: false,
        createdAt: serverTimestamp(),
      });
      setSelectedSubjectId(docRef.id);
      setAddSubjectOpen(false);
    } catch {
      toast({
        title: "Error",
        description: "Could not add subject.",
        variant: "destructive",
      });
    }
  };

  const activeRoom = rooms[0] ?? null;

  const openFullscreen = useCallback(() => {
    requestBrowserFullscreen();
    setFullscreenOpen(true);
  }, []);

  const closeFullscreen = useCallback(() => {
    setFullscreenOpen(false);
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-muted">
              Personal Session
            </p>
            {mainDday && (
              <Link
                href="/goals"
                className="inline-flex items-center gap-1 rounded-full border border-line bg-highlight px-2.5 py-0.5 font-mono text-[11px] font-semibold text-ink hover:bg-highlight/80 transition-colors"
              >
                <CalendarClock className="h-3 w-3 text-clay" />
                <span>{formatDdayBadge(mainDday.targetDate).label}</span>
                <span className="text-ink-muted font-normal truncate max-w-[140px]">
                  {mainDday.title}
                </span>
              </Link>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink">
            Focus Timer
          </h1>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={openFullscreen}
          className="min-h-[44px] gap-2 rounded-full border-line bg-surface hover:bg-surface-soft text-ink"
        >
          <Maximize2 className="h-4 w-4" />
          <span>Full-screen</span>
        </Button>
      </div>

      <Card className="border-line bg-surface rounded-3xl">
        <CardContent className="p-5 sm:p-8 space-y-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div
              role="group"
              aria-label="Timer mode"
              className="inline-flex rounded-full border border-line bg-surface-soft p-1"
            >
              {(["pomodoro", "stopwatch"] as const).map((m) => {
                const active = mode === m;
                return (
                  <button
                    key={m}
                    type="button"
                    disabled={!isIdle}
                    onClick={() => handleModeChange(m)}
                    className={cn(
                      "min-h-[40px] px-4 rounded-full text-xs sm:text-sm font-semibold capitalize transition-colors",
                      active
                        ? "bg-ink text-surface"
                        : "text-ink-muted hover:text-ink",
                      !isIdle && !active && "opacity-45 cursor-not-allowed"
                    )}
                  >
                    {m}
                  </button>
                );
              })}
            </div>

            <div
              role="group"
              aria-label="Clock style"
              className="inline-flex flex-wrap rounded-full border border-line/25 bg-surface-soft p-1 gap-0.5"
            >
              {TIMER_STYLES.map((s) => {
                const active = timerStyle === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setTimerStyle(s.id)}
                    className={cn(
                      "min-h-[36px] px-3 rounded-full font-mono text-[11px] font-medium transition-colors",
                      active
                        ? "bg-highlight text-ink border border-line"
                        : "text-ink-muted hover:text-ink"
                    )}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="py-2 sm:py-4 flex flex-col items-center justify-center">
            <TimerPresentation
              seconds={displayTime}
              totalSeconds={mode === "pomodoro" ? customDuration * 60 : 0}
              styleId={timerStyle}
              modeLabel={mode === "pomodoro" ? "Pomodoro Focus" : "Open Stopwatch"}
              contextLabel={selectedSubject?.name || undefined}
              isRunning={isActive}
              isPaused={isPaused}
              size="embedded"
            />
          </div>

          <div className="space-y-3 border-t border-line/15 pt-5">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
              <div className="space-y-1.5 min-w-0">
                <label className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
                  Subject
                </label>
                <div className="flex gap-2 items-center">
                  <Select
                    onValueChange={handleSubjectChange}
                    disabled={!isIdle || !user}
                    value={selectedSubjectId || ""}
                  >
                    <SelectTrigger className="h-11 rounded-xl border-line/30 bg-surface-soft text-ink">
                      <SelectValue
                        placeholder={
                          user
                            ? subjectsLoading
                              ? "Loading subjects..."
                              : "Select subject"
                            : "Sign in to select subject"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {user &&
                        subjects &&
                        subjects.map((subject) => (
                          <SelectItem key={subject.id} value={subject.id}>
                            <div className="flex items-center gap-2">
                              <span
                                className="h-2.5 w-2.5 rounded-full shrink-0 border border-line/30"
                                style={{ backgroundColor: subject.color }}
                              />
                              <span className="truncate">{subject.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setAddSubjectOpen(true)}
                    disabled={!isIdle}
                    title="Add subject"
                    aria-label="Add subject"
                    className="h-11 px-3.5 rounded-xl border-line/30 bg-surface-soft shrink-0 gap-1.5"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline text-xs font-medium">New</span>
                  </Button>
                </div>
              </div>

              {mode === "pomodoro" && (
                <div className="space-y-1.5">
                  <label
                    htmlFor="custom-duration"
                    className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted block"
                  >
                    Minutes
                  </label>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-ink-muted shrink-0" />
                    <Input
                      id="custom-duration"
                      type="number"
                      min={1}
                      max={240}
                      value={customDuration}
                      onChange={(e) => handleDurationChange(Number(e.target.value))}
                      className="w-24 h-11 rounded-xl border-line/30 bg-surface-soft font-mono tabular-nums text-center"
                      disabled={!isIdle}
                    />
                  </div>
                </div>
              )}
            </div>

            {user && !subjectsLoading && subjects && subjects.length === 0 && (
              <div className="rounded-xl border border-line bg-accent-soft/50 px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs text-ink">
                <span>Create a subject before starting a focus session.</span>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setAddSubjectOpen(true)}
                  className="bg-clay text-ink border border-line shrink-0 h-8"
                >
                  Add subject
                </Button>
              </div>
            )}

            {mode === "pomodoro" && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted mr-1">
                  Presets:
                </span>
                {PRESET_DURATIONS.map((mins) => {
                  const selected = customDuration === mins;
                  return (
                    <button
                      key={mins}
                      type="button"
                      disabled={!isIdle}
                      onClick={() => handleDurationChange(mins)}
                      className={cn(
                        "min-h-[36px] px-3.5 rounded-full font-mono text-xs border transition-colors",
                        selected
                          ? "bg-highlight border-line text-ink font-semibold"
                          : "bg-surface-soft border-line/20 text-ink-muted hover:border-line hover:text-ink",
                        !isIdle && "opacity-45 cursor-not-allowed"
                      )}
                    >
                      {mins}m
                    </button>
                  );
                })}
              </div>
            )}

            <div className="pt-2 border-t border-line/10 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-ink-muted">
                  <Volume2 className="h-3.5 w-3.5 text-clay" />
                  Ambient Sound
                </span>
                {ambientPreset !== "off" && (
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-ink-muted timer-digit">
                      {ambientVolume}%
                    </span>
                    <input
                      type="range"
                      min={5}
                      max={100}
                      value={ambientVolume}
                      aria-label="Ambient sound volume"
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setAmbientVolume(v);
                        ambientSoundEngine.setVolume(v / 100);
                      }}
                      className="w-24 accent-[var(--clay)] h-1.5"
                    />
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {AMBIENT_PRESETS.map((p) => {
                  const active = ambientPreset === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => ambientSoundEngine.play(p.id, ambientVolume / 100)}
                      className={cn(
                        "min-h-[32px] px-3 rounded-full font-mono text-[11px] border transition-colors",
                        active
                          ? "bg-ink border-line text-surface font-semibold"
                          : "bg-surface-soft border-line/20 text-ink-muted hover:border-line hover:text-ink"
                      )}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {isIdle ? (
              <Button
                type="button"
                size="lg"
                onClick={start}
                className="min-h-[48px] min-w-[168px] rounded-full bg-clay text-ink border border-line hover:bg-clay/90 font-semibold gap-2"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>Start Focus</span>
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  size="lg"
                  onClick={isActive ? pause : start}
                  className="min-h-[48px] min-w-[140px] rounded-full bg-clay text-ink border border-line hover:bg-clay/90 font-semibold gap-2"
                >
                  {isActive ? (
                    <>
                      <Pause className="h-4 w-4" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 fill-current" />
                      <span>Resume</span>
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  onClick={() => stop("stopped")}
                  className="min-h-[48px] rounded-full border-line bg-surface hover:bg-surface-soft text-ink gap-2"
                >
                  <Square className="h-4 w-4" />
                  <span>Finish & Save</span>
                </Button>

                <Button
                  type="button"
                  size="lg"
                  variant="ghost"
                  onClick={() => setResetDialogOpen(true)}
                  className="min-h-[48px] rounded-full text-ink-muted hover:text-danger gap-1.5"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Reset</span>
                </Button>
              </>
            )}

            <Button
              type="button"
              size="lg"
              variant="outline"
              onClick={openFullscreen}
              className="min-h-[48px] rounded-full border-line bg-surface-soft hover:bg-highlight text-ink gap-2"
            >
              <Maximize2 className="h-4 w-4" />
              <span>Full-screen timer</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {user && (
        <div className="rounded-2xl border border-line bg-surface px-4 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-xl border border-line/20 bg-surface-soft flex items-center justify-center shrink-0">
              <Users className="h-4 w-4 text-ink" />
            </div>
            <div className="min-w-0">
              {roomsLoading ? (
                <p className="text-xs text-ink-muted">Checking active rooms...</p>
              ) : activeRoom ? (
                <>
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">
                    Active Room Preserved
                  </p>
                  <p className="text-sm font-semibold text-ink truncate">
                    {activeRoom.name}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-ink">Study with others</p>
                  <p className="text-xs text-ink-muted">
                    Join or create a room for shared timers and chat.
                  </p>
                </>
              )}
            </div>
          </div>

          {!roomsLoading && (
            <Button
              asChild
              variant="outline"
              className="min-h-[40px] rounded-full border-line bg-surface-soft hover:bg-highlight text-ink gap-1.5 shrink-0"
            >
              <Link href={activeRoom ? `/rooms/${activeRoom.id}` : "/rooms"}>
                <span>{activeRoom ? "Return to room" : "Browse rooms"}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
        </div>
      )}

      {(() => {
        const todayKey = formatLocalDateKey(Date.now());
        const todayTasks = studyTodos.filter((t) => t.dateKey === todayKey);
        const subMap = new Map((subjects ?? []).map((s) => [s.id, s]));
        return (
          <Card className="border-line bg-surface rounded-2xl">
            <CardContent className="p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-clay" />
                  <span className="font-mono text-xs uppercase tracking-wider text-ink-muted">
                    Today&apos;s Subject To-Dos
                  </span>
                  {todayTasks.length > 0 && (
                    <span className="font-mono text-[11px] text-ink-muted timer-digit">
                      {todayTasks.filter((t) => t.completed).length}/{todayTasks.length}
                    </span>
                  )}
                </div>
                <Link
                  href="/routine"
                  className="font-mono text-[11px] text-clay hover:underline"
                >
                  Manage tasks
                </Link>
              </div>
              {todayTasks.length === 0 ? (
                <p className="text-xs text-ink-muted">
                  No subject tasks queued for today. Add checklists in Routines &rarr; To-Dos.
                </p>
              ) : (
                <div className="divide-y divide-line/10">
                  {todayTasks.slice(0, 6).map((todo) => {
                    const sub = subMap.get(todo.subjectId);
                    return (
                      <button
                        key={todo.id}
                        type="button"
                        onClick={() => toggleTodo(todo.id)}
                        className="w-full flex items-center gap-2.5 py-2 text-left hover:bg-surface-soft/50 rounded-lg px-1.5 transition-colors"
                      >
                        {todo.completed ? (
                          <CheckSquare className="h-4 w-4 text-success shrink-0" />
                        ) : (
                          <UncheckedSquare className="h-4 w-4 text-ink-muted shrink-0" />
                        )}
                        {sub && (
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: sub.color }}
                          />
                        )}
                        <span
                          className={cn(
                            "text-sm flex-1 truncate",
                            todo.completed ? "line-through text-ink-muted" : "text-ink"
                          )}
                        >
                          {todo.text}
                        </span>
                        {sub && (
                          <span className="font-mono text-[10px] text-ink-muted shrink-0">
                            {sub.name}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })()}

      <AddSubjectDialog
        isOpen={isAddSubjectOpen}
        onOpenChange={setAddSubjectOpen}
        onAddSubject={handleAddSubject}
      />

      <AlertDialog open={isResetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset active timer?</AlertDialogTitle>
            <AlertDialogDescription>
              This clears the current elapsed time without saving it as a completed session.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                reset();
                setResetDialogOpen(false);
              }}
              className="bg-danger text-surface hover:bg-danger/90"
            >
              Reset Timer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FullscreenTimer
        open={isFullscreenOpen}
        onClose={closeFullscreen}
        context="personal"
        seconds={displayTime}
        totalSeconds={mode === "pomodoro" ? customDuration * 60 : 0}
        modeLabel={mode === "pomodoro" ? "Pomodoro" : "Stopwatch"}
        contextLabel={selectedSubject?.name || "Personal Focus"}
        isRunning={isActive}
        isPaused={isPaused}
        isIdle={isIdle}
        canControl={Boolean(selectedSubjectId) || !isIdle}
        readOnlyHint="Create or select a subject on the timer card first"
        onStart={start}
        onPause={pause}
        onResume={start}
        onStop={() => stop("stopped")}
        onReset={reset}
      />
    </div>
  );
}
