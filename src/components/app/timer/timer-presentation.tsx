"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { TimerFaceStyle } from "@/lib/definitions";

export interface TimerPresentationProps {
  seconds: number;
  totalSeconds?: number;
  styleId: TimerFaceStyle;
  modeLabel?: string;
  contextLabel?: string;
  isRunning?: boolean;
  isPaused?: boolean;
  size?: "embedded" | "fullscreen";
  isBreak?: boolean;
  tone?: "warm" | "cream" | "charcoal";
}

function splitTime(totalSec: number) {
  const s = Math.max(0, Math.floor(totalSec));
  const hours = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  return {
    showHours: hours > 0,
    hh: String(hours).padStart(2, "0"),
    mm: String(mins).padStart(2, "0"),
    ss: String(secs).padStart(2, "0"),
  };
}

function FlipTile({
  value,
  label,
  size,
  isCharcoal,
  isRunning,
}: {
  value: string;
  label: string;
  size: "embedded" | "fullscreen";
  isCharcoal: boolean;
  isRunning: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={cn(
          "relative flex items-center justify-center rounded-[14px] border select-none overflow-hidden transition-colors duration-200",
          isCharcoal
            ? "border-[#3E372F] bg-[#221F1B] text-[#F2ECE1]"
            : "border-line bg-surface-soft text-ink",
          size === "fullscreen"
            ? "w-[104px] h-[118px] min-[380px]:w-[122px] min-[380px]:h-[138px] sm:w-[164px] sm:h-[184px] md:w-[200px] md:h-[220px] rounded-[20px]"
            : "w-[78px] h-[88px] min-[380px]:w-[92px] min-[380px]:h-[104px] sm:w-[116px] sm:h-[128px]"
        )}
      >
        {/* Top/bottom subtle shade difference for split-flap depth */}
        <div
          className={cn(
            "absolute inset-x-0 top-0 h-1/2 pointer-events-none",
            isCharcoal ? "bg-white/[0.02]" : "bg-black/[0.02]"
          )}
        />
        <span
          className={cn(
            "relative z-10 font-mono font-semibold timer-digit tracking-tight leading-none",
            size === "fullscreen"
              ? "text-[54px] min-[380px]:text-[66px] sm:text-[96px] md:text-[118px]"
              : "text-[40px] min-[380px]:text-[48px] sm:text-[62px]"
          )}
        >
          {value}
        </span>
        {/* Split-flap horizontal hinge seam */}
        <div
          aria-hidden="true"
          className={cn(
            "absolute inset-x-0 top-1/2 -translate-y-px h-[2px] z-20 pointer-events-none",
            isCharcoal ? "bg-[#12100E]" : "bg-page"
          )}
        />
        {isRunning && (
          <span
            aria-hidden="true"
            className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-clay"
          />
        )}
      </div>
      <span
        className={cn(
          "font-mono text-[10px] uppercase tracking-wider",
          isCharcoal ? "text-[#A49B8F]" : "text-ink-muted"
        )}
      >
        {label}
      </span>
    </div>
  );
}

export function TimerPresentation({
  seconds,
  totalSeconds = 0,
  styleId,
  modeLabel = "Focus",
  contextLabel,
  isRunning = false,
  isPaused = false,
  size = "embedded",
  isBreak = false,
  tone = "cream",
}: TimerPresentationProps) {
  const { showHours, hh, mm, ss } = splitTime(seconds);
  const isCharcoal = size === "fullscreen" && tone === "charcoal";

  const progress =
    totalSeconds > 0 ? Math.max(0, Math.min(1, seconds / totalSeconds)) : 0;

  const textColor = isCharcoal ? "text-[#F2ECE1]" : "text-ink";
  const mutedColor = isCharcoal ? "text-[#A49B8F]" : "text-ink-muted";
  const accentStroke = isBreak ? "var(--success)" : "var(--accent)";

  return (
    <div className="flex flex-col items-center justify-center w-full select-none">
      {/* Status & Context Header */}
      <div className="mb-4 sm:mb-6 flex flex-wrap items-center justify-center gap-2 text-center">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-wider",
            isCharcoal
              ? "border-[#3E372F] bg-[#221F1B] text-[#F2ECE1]"
              : isRunning
                ? "border-line bg-accent-soft text-ink"
                : isPaused
                  ? "border-line bg-highlight text-ink"
                  : "border-line/35 bg-surface-soft text-ink-muted"
          )}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              isRunning
                ? isBreak
                  ? "bg-success"
                  : "bg-clay"
                : isPaused
                  ? "bg-ink"
                  : "bg-ink-muted/60"
            )}
          />
          {isPaused ? `${modeLabel} · Paused` : modeLabel}
        </span>

        {contextLabel && (
          <span className={cn("font-mono text-xs truncate max-w-[220px]", mutedColor)}>
            {contextLabel}
          </span>
        )}
      </div>

      {/* Style 1: Flip Clock */}
      {styleId === "flip" && (
        <div
          className={cn(
            "flex items-center justify-center",
            size === "fullscreen" ? "gap-2.5 sm:gap-4" : "gap-2 sm:gap-3"
          )}
        >
          {showHours && (
            <>
              <FlipTile
                value={hh}
                label="HRS"
                size={size}
                isCharcoal={isCharcoal}
                isRunning={false}
              />
              <span
                aria-hidden="true"
                className={cn(
                  "font-mono font-semibold pb-5",
                  size === "fullscreen" ? "text-3xl sm:text-5xl" : "text-2xl sm:text-3xl",
                  mutedColor
                )}
              >
                :
              </span>
            </>
          )}
          <FlipTile
            value={mm}
            label="MIN"
            size={size}
            isCharcoal={isCharcoal}
            isRunning={false}
          />
          <span
            aria-hidden="true"
            className={cn(
              "font-mono font-semibold pb-5",
              size === "fullscreen" ? "text-3xl sm:text-5xl" : "text-2xl sm:text-3xl",
              mutedColor
            )}
          >
            :
          </span>
          <FlipTile
            value={ss}
            label="SEC"
            size={size}
            isCharcoal={isCharcoal}
            isRunning={isRunning}
          />
        </div>
      )}

      {/* Style 2: Digital */}
      {styleId === "digital" && (
        <div className="flex flex-col items-center">
          <div
            className={cn(
              "font-mono font-semibold timer-digit tracking-tight leading-none",
              textColor,
              size === "fullscreen"
                ? "text-[64px] min-[380px]:text-[84px] sm:text-[126px] md:text-[160px]"
                : "text-[52px] min-[380px]:text-[64px] sm:text-[84px]"
            )}
          >
            {showHours ? `${hh}:${mm}:${ss}` : `${mm}:${ss}`}
          </div>
          {totalSeconds > 0 && (
            <div
              className={cn(
                "mt-5 h-[2px] w-48 sm:w-64 overflow-hidden rounded-full",
                isCharcoal ? "bg-[#3E372F]" : "bg-surface-muted"
              )}
            >
              <div
                className="h-full transition-[width] duration-300"
                style={{
                  width: `${progress * 100}%`,
                  backgroundColor: accentStroke,
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Style 3: Minimal */}
      {styleId === "minimal" && (
        <div className="flex flex-col items-center">
          <div
            className={cn(
              "font-sans font-bold timer-digit tracking-[-0.04em] leading-none",
              textColor,
              size === "fullscreen"
                ? "text-[68px] min-[380px]:text-[92px] sm:text-[140px] md:text-[176px]"
                : "text-[56px] min-[380px]:text-[68px] sm:text-[92px]"
            )}
          >
            {showHours ? `${hh}:${mm}:${ss}` : `${mm}:${ss}`}
          </div>
        </div>
      )}

      {/* Style 4: Progress */}
      {styleId === "progress" && (
        <div
          className={cn(
            "relative flex items-center justify-center",
            size === "fullscreen"
              ? "h-[248px] w-[248px] min-[380px]:h-[280px] min-[380px]:w-[280px] sm:h-[340px] sm:w-[340px]"
              : "h-[210px] w-[210px] sm:h-[236px] sm:w-[236px]"
          )}
        >
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke={isCharcoal ? "#3E372F" : "var(--surface-muted)"}
              strokeWidth="1.5"
            />
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke={totalSeconds > 0 ? accentStroke : "var(--ink)"}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 54}
              strokeDashoffset={
                totalSeconds > 0
                  ? 2 * Math.PI * 54 * (1 - progress)
                  : 0
              }
              className="transition-[stroke-dashoffset] duration-300"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className={cn(
                "font-mono font-semibold timer-digit tracking-tight",
                textColor,
                size === "fullscreen"
                  ? "text-4xl min-[380px]:text-5xl sm:text-6xl"
                  : "text-3xl sm:text-4xl"
              )}
            >
              {showHours ? `${hh}:${mm}:${ss}` : `${mm}:${ss}`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
