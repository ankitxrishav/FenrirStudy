"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { Play, Pause, RotateCcw, Minimize2, Square, SlidersHorizontal, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { TimerFaceStyle } from "@/lib/definitions";
import { useTimerStyle, FullscreenTone } from "@/hooks/use-timer-style";
import { usePewCat } from "@/hooks/use-pewcat";
import { AMBIENT_PRESETS, AmbientSoundPreset, ambientSoundEngine } from "@/lib/ambient-sound";
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
  { id: "progress", label: "Ring" },
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

  const [mounted, setMounted] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [confirmReset, setConfirmReset] = useState(false);
  const [styleOpen, setStyleOpen] = useState(false);
  const [ambientPreset, setAmbientPreset] = useState<AmbientSoundPreset>(() => ambientSoundEngine.getPreset());
  const [ambientVolume, setAmbientVolume] = useState(() => Math.round(ambientSoundEngine.getVolume() * 100));
  const [wakeStatus, setWakeStatus] = useState<"idle" | "active" | "unsupported">("idle");
  const [announcement, setAnnouncement] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const onCloseRef = useRef(onClose);
  const openRef = useRef(open);
  const mountedRef = useRef(true);
  const prevOpenRef = useRef(false);
  const enteredNativeFsRef = useRef(false);
  const unmountExitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevStateRef = useRef<{ isRunning: boolean; isPaused: boolean; isIdle: boolean }>({
    isRunning,
    isPaused,
    isIdle,
  });

  onCloseRef.current = onClose;
  openRef.current = open;

  useEffect(() => {
    mountedRef.current = true;
    setMounted(true);
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    setFullscreenActive(true);
    setAmbientPreset(ambientSoundEngine.getPreset());
    setAmbientVolume(Math.round(ambientSoundEngine.getVolume() * 100));
    const unsub = ambientSoundEngine.subscribe(() => {
      setAmbientPreset(ambientSoundEngine.getPreset());
      setAmbientVolume(Math.round(ambientSoundEngine.getVolume() * 100));
    });
    return () => {
      unsub();
      setFullscreenActive(false);
    };
  }, [open, setFullscreenActive]);

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

  useEffect(() => {
    if (unmountExitTimerRef.current) {
      clearTimeout(unmountExitTimerRef.current);
      unmountExitTimerRef.current = null;
    }

    if (!open) {
      if (prevOpenRef.current && document.fullscreenElement && enteredNativeFsRef.current) {
        enteredNativeFsRef.current = false;
        document.exitFullscreen().catch(() => {});
      }
      prevOpenRef.current = false;
      return;
    }

    prevOpenRef.current = true;
    let active = true;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    enteredNativeFsRef.current = Boolean(document.fullscreenElement);

    const rafId = requestAnimationFrame(() => {
      containerRef.current?.focus({ preventScroll: true });
    });

    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      document.documentElement
        .requestFullscreen()
        .then(() => {
          if (active && document.fullscreenElement) {
            enteredNativeFsRef.current = true;
          }
        })
        .catch(() => {});
    }

    const handleFullscreenChange = () => {
      if (document.fullscreenElement) {
        if (active) enteredNativeFsRef.current = true;
        return;
      }
      if (enteredNativeFsRef.current && openRef.current) {
        enteredNativeFsRef.current = false;
        onCloseRef.current();
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      active = false;
      cancelAnimationFrame(rafId);
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      // Defer native exit briefly so React StrictMode dev remounts cancel it cleanly
      unmountExitTimerRef.current = setTimeout(() => {
        if ((!mountedRef.current || !openRef.current) && document.fullscreenElement && enteredNativeFsRef.current) {
          enteredNativeFsRef.current = false;
          document.exitFullscreen().catch(() => {});
        }
      }, 60);
    };
  }, [open]);

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

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const revealControls = useCallback(() => {
    setControlsVisible(true);
    clearHideTimer();
    if (open && isRunning && !styleOpen && !confirmReset) {
      hideTimerRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, 3000);
    }
  }, [open, isRunning, styleOpen, confirmReset, clearHideTimer]);

  useEffect(() => {
    if (!open) {
      setStyleOpen(false);
      setConfirmReset(false);
      setControlsVisible(true);
      clearHideTimer();
      return;
    }
    revealControls();
    return clearHideTimer;
  }, [open, isRunning, styleOpen, confirmReset, revealControls, clearHideTimer]);

  const handleExit = useCallback(() => {
    enteredNativeFsRef.current = false;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    onCloseRef.current();
  }, []);

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
        if (tag === "BUTTON" || tag === "INPUT" || tag === "TEXTAREA") return;
        e.preventDefault();
        handlePrimaryToggle();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, canControl, confirmReset, styleOpen, handleExit, handlePrimaryToggle, revealControls]);

  if (!mounted || !open) return null;

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

  const overlay = (
    <div
      ref={containerRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Full-screen timer"
      onMouseMove={revealControls}
      onPointerDown={() => {
        if (styleOpen) setStyleOpen(false);
        revealControls();
      }}
      className={cn(
        "fixed inset-0 z-[90] flex h-[100dvh] w-screen flex-col justify-between overflow-y-auto px-4 py-4 sm:px-8 sm:py-7 transition-colors duration-200 select-none focus:outline-none",
        "pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]",
        bgClass,
        !controlsVisible && isRunning && "[@media(hover:hover)]:cursor-none"
      )}
    >
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>

      <div
        className={cn(
          "relative z-20 flex items-center justify-between gap-2 transition-opacity duration-200 shrink-0",
          controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={cn(
              "rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-wider truncate",
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

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setStyleOpen((v) => !v);
              revealControls();
            }}
            aria-expanded={styleOpen}
            className={cn(
              "inline-flex h-11 items-center gap-2 rounded-full border px-3.5 sm:px-4 text-xs font-medium transition-colors",
              surfaceBtnClass
            )}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={1.75} />
            <span>{STYLE_LABELS.find((s) => s.id === timerStyle)?.label}</span>
          </button>

          <button
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

      {styleOpen && controlsVisible && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className={cn(
            "fixed top-16 sm:top-20 right-4 sm:right-8 w-[calc(100vw-2rem)] max-w-sm rounded-[20px] border p-4 space-y-4 z-30",
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

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider opacity-70">
                <Volume2 className="h-3 w-3" />
                Ambient Sound
              </span>
              {ambientPreset !== "off" && (
                <span className="font-mono text-[11px] opacity-70">{ambientVolume}%</span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {AMBIENT_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => ambientSoundEngine.play(p.id, ambientVolume / 100)}
                  className={cn(
                    "min-h-[34px] rounded-[10px] border px-2 text-[11px] font-medium transition-colors truncate",
                    ambientPreset === p.id
                      ? "border-line bg-clay text-ink font-semibold"
                      : isCharcoal
                        ? "border-[#3E372F] bg-[#221F1B] text-[#A49B8F] hover:text-[#F2ECE1]"
                        : "border-line/30 bg-surface-soft text-ink-muted hover:text-ink"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {ambientPreset !== "off" && (
              <input
                type="range"
                min={5}
                max={100}
                value={ambientVolume}
                aria-label="Fullscreen ambient sound volume"
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setAmbientVolume(v);
                  ambientSoundEngine.setVolume(v / 100);
                }}
                className="w-full accent-[#D97745] h-1.5"
              />
            )}
          </div>
        </div>
      )}

      <div className="flex-1 flex items-center justify-center py-4 min-h-0">
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

      <div
        className={cn(
          "relative z-20 flex flex-col items-center gap-3 shrink-0 transition-opacity duration-200",
          controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onPointerDown={(e) => e.stopPropagation()}
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
                  onClick={() => {
                    revealControls();
                    handlePrimaryToggle();
                  }}
                  className="inline-flex h-12 min-w-[132px] items-center justify-center gap-2 rounded-full border border-line bg-clay px-6 text-sm font-semibold text-ink hover:bg-clay/90 transition-colors"
                >
                  {isRunning ? (
                    <>
                      <Pause className="h-4 w-4" strokeWidth={2} />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 fill-current" strokeWidth={2} />
                      <span>{isPaused ? "Resume" : "Start"}</span>
                    </>
                  )}
                </button>

                {onStop && !isIdle && (
                  <button
                    type="button"
                    onClick={() => {
                      revealControls();
                      onStop();
                    }}
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
                      revealControls();
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
                  "rounded-full border px-4 py-2 text-xs text-center",
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

  return createPortal(overlay, document.body);
}
