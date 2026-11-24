"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Play, Pause, RotateCcw, Minimize2, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { TimerFaceStyle } from "@/lib/definitions";
import { useTimerStyle, FullscreenTone } from "@/hooks/use-timer-style";
import { usePewCat } from "@/hooks/use-pewcat";
import { TimerPresentation } from "./timer-presentation";

export interface FullscreenTimerProps {
  open: boolean;
  onClose: () => void;
  context: "personal" | "room-shared" | "room-personal";
  seconds: number;
  totalSeconds?: number;
  modeLabel: string;
  contextLabel?: string;
  isRunning: boolean;
  isPaused: boolean;
  isIdle: boolean;
  isBreak?: boolean;
  canControl?: boolean;
  onStart?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onStop?: () => void;
  onReset?: () => void;
  readOnlyHint?: string;
}

const STYLE_LABELS: { id: TimerFaceStyle; label: string }[] = [
  { id: "flip", label: "Flip" },
  { id: "digital", label: "Digital" },
  { id: "minimal", label: "Minimal" },
  { id: "progress", label: "Progress" },
];

const TONE_LABELS: { id: FullscreenTone; label: string }[] = [
  { id: "cream", label: "Cream" },
  { id: "warm", label: "Sand" },
  { id: "charcoal", label: "Dark" },
];

export function FullscreenTimer({
  open,
  onClose,
  context,
  seconds,
  totalSeconds = 0,
  modeLabel,
  contextLabel,
  isRunning,
  isPaused,
  isIdle,
  isBreak = false,
  canControl = true,
  onStart,
  onPause,
  onResume,
  onStop,
  onReset,
  readOnlyHint,
}: FullscreenTimerProps) {
  const { timerStyle, setTimerStyle, fullscreenTone, setFullscreenTone } = useTimerStyle();
  const { setFullscreenActive } = usePewCat();

  const [controlsVisible, setControlsVisible] = useState(true);
  const [confirmReset, setConfirmReset] = useState(false);
  const [styleOpen, setStyleOpen] = useState(false);
  const [wakeStatus, setWakeStatus] = useState<"idle" | "active" | "unsupported">("idle");
  const [announcement, setAnnouncement] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const exitBtnRef = useRef<HTMLButtonElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const prevStateRef = useRef<{ isRunning: boolean; isPaused: boolean; isIdle: boolean }>({
    isRunning,
    isPaused,
    isIdle,
  });

  // Hide PewCat while fullscreen overlay is active
  useEffect(() => {
    if (!open) return;
    setFullscreenActive(true);
    return () => setFullscreenActive(false);
  }, [open, setFullscreenActive]);

  // Announce meaningful transitions (start, pause, complete) without announcing every second
  useEffect(() => {
    if (!open) return;
    const prev = prevStateRef.current;
    if (!prev.isRunning && isRunning) {
      setAnnouncement(`${modeLabel} started`);
    } else if (!prev.isPaused && isPaused) {
      setAnnouncement(`${modeLabel} paused`);
    } else if (prev.isRunning && isIdle) {
      setAnnouncement(`${modeLabel} finished`);
    }
    prevStateRef.current = { isRunning, isPaused, isIdle };
  }, [open, isRunning, isPaused, isIdle, modeLabel]);

  // Request / sync native Fullscreen API + handle native Esc / fullscreenchange
  useEffect(() => {
    if (!open) return;

    const enterFullscreen = async () => {
      try {
        if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
        }
      } catch {
        // Fallback: fixed full-viewport overlay remains active (e.g. iOS Safari)
      }
    };

    enterFullscreen();
    exitBtnRef.current?.focus();

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        onClose();
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, [open, onClose]);

  // Screen Wake Lock management
  const acquireWakeLock = useCallback(async () => {
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) {
      setWakeStatus("unsupported");
      return;
    }
    try {
      const sentinel = await navigator.wakeLock.request("screen");
      wakeLockRef.current = sentinel;
      setWakeStatus("active");
      sentinel.addEventListener("release", () => {
        if (wakeLockRef.current === sentinel) {
          wakeLockRef.current = null;
        }
      });
    } catch {
      setWakeStatus("unsupported");
    }
  }, []);

  const releaseWakeLock = useCallback(() => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {});
      wakeLockRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!open) {
      releaseWakeLock();
      return;
    }

    if (isRunning) {
      acquireWakeLock();
    } else {
      releaseWakeLock();
    }

    const handleVisibility = () => {
      if (document.visibilityState === "visible" && open && isRunning) {
        acquireWakeLock();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      releaseWakeLock();
    };
  }, [open, isRunning, acquireWakeLock, releaseWakeLock]);

  // Auto-hide controls after 3s inactivity
  const revealControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      if (!styleOpen && !confirmReset) {
        setControlsVisible(false);
      }
    }, 3000);
  }, [styleOpen, confirmReset]);

  useEffect(() => {
    if (!open) return;
    revealControls();
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [open, revealControls]);

  const handleExit = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    onClose();
  }, [onClose]);

  const handlePrimaryToggle = useCallback(() => {
    if (!canControl) return;
    if (isRunning) {
      onPause?.();
    } else if (isPaused) {
      (onResume ?? onStart)?.();
    } else {
      onStart?.();
    }
  }, [canControl, isRunning, isPaused, onPause, onResume, onStart]);

  // Keyboard shortcuts: Space to start/pause, Esc to exit
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      revealControls();
      if (e.key === "Escape") {
        e.preventDefault();
        if (confirmReset) {
          setConfirmReset(false);
        } else if (styleOpen) {
          setStyleOpen(false);
        } else {
          handleExit();
        }
      } else if (e.code === "Space" && canControl) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "BUTTON" || tag === "INPUT") return;
        e.preventDefault();
        handlePrimaryToggle();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, canControl, confirmReset, styleOpen, handleExit, handlePrimaryToggle, revealControls]);

  if (!open) return null;

  const isCharcoal = fullscreenTone === "charcoal";
  const bgClass =
    fullscreenTone === "charcoal"
      ? "bg-[#12100E] text-[#F2ECE1]"
      : fullscreenTone === "warm"
        ? "bg-page text-ink"
        : "bg-surface text-ink";

  const surfaceBtnClass = isCharcoal
    ? "border-[#3E372F] bg-[#1F1C18] text-[#F2ECE1] hover:bg-[#2B2621]"
    : "border-line bg-surface-soft text-ink hover:bg-surface-muted";

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label="Full-screen timer"
      onMouseMove={revealControls}
      onClick={() => {
        if (!controlsVisible) {
          revealControls();
        }
      }}
      className={cn(
        "fixed inset-0 z-[100] flex h-[100dvh] w-full flex-col justify-between px-4 py-5 sm:px-8 sm:py-7 transition-colors duration-200 select-none",
        "pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))]",
        bgClass,
        !controlsVisible && "cursor-none"
      )}
    >
      {/* Screen reader status announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>

      {/* Top minimal bar */}
      <div
        className={cn(
          "flex items-center justify-between gap-3 transition-opacity duration-200",
          controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-wider",
              isCharcoal
                ? "border-[#3E372F] bg-[#1F1C18] text-[#A49B8F]"
                : "border-line/35 bg-surface-soft text-ink-muted"
            )}
          >
            {context === "room-shared"
              ? "Room Focus"
              : context === "room-personal"
                ? "Room · Personal Timer"
                : "Personal Timer"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setStyleOpen((v) => !v);
              revealControls();
            }}
            className={cn(
              "inline-flex h-11 items-center gap-2 rounded-full border px-4 text-xs font-medium transition-colors",
              surfaceBtnClass
            )}
          >
            <span>Style: {STYLE_LABELS.find((s) => s.id === timerStyle)?.label}</span>
          </button>

          <button
            ref={exitBtnRef}
            type="button"
            onClick={handleExit}
            aria-label="Exit full-screen timer"
            className={cn(
              "inline-flex h-11 min-w-[44px] items-center justify-center gap-2 rounded-full border px-3.5 text-xs font-medium transition-colors",
              surfaceBtnClass
            )}
          >
            <Minimize2 className="h-4 w-4" strokeWidth={1.75} />
            <span className="hidden sm:inline">Exit</span>
          </button>
        </div>
      </div>

      {/* Temporary Style & Tone Chooser Popover */}
      {styleOpen && controlsVisible && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "mx-auto mt-2 w-full max-w-md rounded-[18px] border p-4 space-y-4 z-20",
            isCharcoal
              ? "border-[#3E372F] bg-[#1A1714] text-[#F2ECE1]"
              : "border-line bg-surface text-ink"
          )}
        >
          <div className="space-y-2">
            <span className="font-mono text-[11px] uppercase tracking-wider opacity-70">
              Timer style
            </span>
            <div className="grid grid-cols-4 gap-1.5">
              {STYLE_LABELS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setTimerStyle(s.id)}
                  className={cn(
                    "min-h-[40px] rounded-[10px] border px-2 text-xs font-medium transition-colors",
                    timerStyle === s.id
                      ? "border-line bg-highlight text-ink font-semibold"
                      : isCharcoal
                        ? "border-[#3E372F] bg-[#221F1B] text-[#A49B8F] hover:text-[#F2ECE1]"
                        : "border-line/30 bg-surface-soft text-ink-muted hover:text-ink"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <span className="font-mono text-[11px] uppercase tracking-wider opacity-70">
              Backdrop tone
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {TONE_LABELS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setFullscreenTone(t.id)}
                  className={cn(
                    "min-h-[40px] rounded-[10px] border px-2 text-xs font-medium transition-colors",
                    fullscreenTone === t.id
                      ? "border-line bg-clay text-ink font-semibold"
                      : isCharcoal
                        ? "border-[#3E372F] bg-[#221F1B] text-[#A49B8F] hover:text-[#F2ECE1]"
                        : "border-line/30 bg-surface-soft text-ink-muted hover:text-ink"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Center Minimal Timer Face */}
      <div className="flex-1 flex items-center justify-center">
        <TimerPresentation
          seconds={seconds}
          totalSeconds={totalSeconds}
          styleId={timerStyle}
          modeLabel={modeLabel}
          contextLabel={contextLabel}
          isRunning={isRunning}
          isPaused={isPaused}
          isBreak={isBreak}
          size="fullscreen"
          tone={fullscreenTone}
        />
      </div>

      {/* Bottom auto-hide control cluster */}
      <div
        className={cn(
          "flex flex-col items-center gap-3 transition-opacity duration-200",
          controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {confirmReset ? (
          <div
            className={cn(
              "inline-flex flex-wrap items-center justify-center gap-2 rounded-full border px-4 py-2",
              isCharcoal
                ? "border-[#3E372F] bg-[#1F1C18]"
                : "border-line bg-surface-soft"
            )}
          >
            <span className="text-xs font-medium">Reset active timer?</span>
            <button
              type="button"
              onClick={() => {
                onReset?.();
                setConfirmReset(false);
              }}
              className="min-h-[36px] rounded-full border border-line bg-danger px-3.5 text-xs font-semibold text-surface"
            >
              Confirm reset
            </button>
            <button
              type="button"
              onClick={() => setConfirmReset(false)}
              className={cn(
                "min-h-[36px] rounded-full border px-3.5 text-xs font-medium",
                surfaceBtnClass
              )}
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {canControl ? (
              <>
                <button
                  type="button"
                  onClick={handlePrimaryToggle}
                  className="inline-flex h-12 min-w-[128px] items-center justify-center gap-2 rounded-full border border-line bg-clay px-6 text-sm font-semibold text-ink hover:bg-clay/90 transition-colors"
                >
                  {isRunning ? (
                    <>
                      <Pause className="h-4 w-4" strokeWidth={2} />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" strokeWidth={2} />
                      <span>{isPaused ? "Resume" : "Start"}</span>
                    </>
                  )}
                </button>

                {onStop && !isIdle && (
                  <button
                    type="button"
                    onClick={onStop}
                    className={cn(
                      "inline-flex h-12 min-w-[44px] items-center justify-center gap-2 rounded-full border px-5 text-sm font-medium transition-colors",
                      surfaceBtnClass
                    )}
                  >
                    <Square className="h-4 w-4" strokeWidth={1.75} />
                    <span>Finish & save</span>
                  </button>
                )}

                {onReset && !isIdle && (
                  <button
                    type="button"
                    onClick={() => {
                      if (isRunning || isPaused) {
                        setConfirmReset(true);
                      } else {
                        onReset();
                      }
                    }}
                    aria-label="Reset timer"
                    className={cn(
                      "inline-flex h-12 min-w-[44px] items-center justify-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors",
                      surfaceBtnClass
                    )}
                  >
                    <RotateCcw className="h-4 w-4" strokeWidth={1.75} />
                    <span className="hidden sm:inline">Reset</span>
                  </button>
                )}
              </>
            ) : (
              <span
                className={cn(
                  "rounded-full border px-4 py-2 text-xs",
                  isCharcoal
                    ? "border-[#3E372F] bg-[#1F1C18] text-[#A49B8F]"
                    : "border-line/30 bg-surface-soft text-ink-muted"
                )}
              >
                {readOnlyHint || "Controlled by room owner"}
              </span>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] font-mono opacity-70">
          {canControl && <span className="hidden sm:inline">Space: Start / Pause</span>}
          <span className="hidden sm:inline">Esc: Exit</span>
          {wakeStatus === "unsupported" && (
            <span>Display sleep depends on your device settings</span>
          )}
        </div>
      </div>
    </div>
  );
}
