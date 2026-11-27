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
  compact,
  isCharcoal,
  isRunning,
}: {
  value: string;
  label: string;
  size: "embedded" | "fullscreen";
  compact: boolean;
  isCharcoal: boolean;
  isRunning: boolean;
}) {
  const [flipState, setFlipState] = React.useState({ curr: value, prev: value, seq: 0 });
  const [flipping, setFlipping] = React.useState(false);

  React.useEffect(() => {
    setFlipState((prev) => {
      if (prev.curr === value) return prev;
      return { curr: value, prev: prev.curr, seq: prev.seq + 1 };
    });
  }, [value]);

  React.useEffect(() => {
    if (flipState.seq === 0) return;
    setFlipping(true);
    const id = setTimeout(() => setFlipping(false), 370);
    return () => clearTimeout(id);
  }, [flipState.seq]);

  const cardBg = isCharcoal ? "bg-[#221F1B] text-[#F2ECE1]" : "bg-surface-soft text-ink";
  const digitCls = cn(
    "font-mono font-semibold timer-digit tracking-tight leading-none select-none",
    size === "fullscreen"
      ? compact
        ? "text-[38px] min-[420px]:text-[52px] sm:text-[82px] md:text-[100px]"
        : "text-[54px] min-[380px]:text-[66px] sm:text-[96px] md:text-[118px]"
      : compact
        ? "text-[32px] min-[380px]:text-[38px] sm:text-[48px]"
        : "text-[40px] min-[380px]:text-[48px] sm:text-[62px]"
  );

  const staticBottomValue = flipping ? flipState.prev : flipState.curr;

  return (
    <div className="flex flex-col items-center gap-1.5 sm:gap-2">
      <div
        className={cn(
          "relative border select-none overflow-hidden transition-colors duration-200",
          isCharcoal ? "border-[#3E372F] bg-[#221F1B]" : "border-line bg-surface-soft",
          size === "fullscreen"
            ? compact
              ? "w-[74px] h-[86px] min-[420px]:w-[96px] min-[420px]:h-[110px] sm:w-[144px] sm:h-[164px] md:w-[172px] md:h-[192px] rounded-[16px] sm:rounded-[20px]"
              : "w-[104px] h-[118px] min-[380px]:w-[122px] min-[380px]:h-[138px] sm:w-[164px] sm:h-[184px] md:w-[200px] md:h-[220px] rounded-[20px]"
            : compact
              ? "w-[64px] h-[74px] min-[380px]:w-[74px] min-[380px]:h-[86px] sm:w-[94px] sm:h-[106px] rounded-[12px]"
              : "w-[78px] h-[88px] min-[380px]:w-[92px] min-[380px]:h-[104px] sm:w-[116px] sm:h-[128px] rounded-[14px]"
        )}
      >
        <div
          className={cn("absolute inset-0 flex items-center justify-center", cardBg)}
          style={{ clipPath: "inset(0 0 50% 0)" }}
        >
          <span className={digitCls}>{flipState.curr}</span>
        </div>

        <div
          className={cn("absolute inset-0 flex items-center justify-center", cardBg)}
          style={{ clipPath: "inset(50% 0 0 0)" }}
        >
          <span className={digitCls}>{staticBottomValue}</span>
        </div>

        {flipping && (
          <>
            <div
              key={`top-${flipState.seq}`}
              className={cn("absolute inset-0 z-10 flex items-center justify-center animate-flip-top", cardBg)}
              style={{ clipPath: "inset(0 0 50% 0)" }}
            >
              <span className={digitCls}>{flipState.prev}</span>
            </div>
            <div
              key={`bot-${flipState.seq}`}
              className={cn("absolute inset-0 z-10 flex items-center justify-center animate-flip-bottom", cardBg)}
              style={{ clipPath: "inset(50% 0 0 0)" }}
            >
              <span className={digitCls}>{flipState.curr}</span>
            </div>
          </>
        )}

        <div
          aria-hidden="true"
          className={cn(
            "absolute inset-x-0 top-0 h-1/2 pointer-events-none z-20",
            isCharcoal ? "bg-white/[0.03]" : "bg-black/[0.025]"
          )}
        />
        <div
          aria-hidden="true"
          className={cn(
            "absolute inset-x-0 top-1/2 -translate-y-px h-[2px] z-30 pointer-events-none",
            isCharcoal ? "bg-[#12100E]" : "bg-page"
          )}
        />
        {isRunning && (
          <span
            aria-hidden="true"
            className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-clay z-30"
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
    totalSeconds > 0
      ? Math.max(0, Math.min(1, seconds / totalSeconds))
      : Math.max(0.02, (seconds % 60) / 60);

  const textColor = isCharcoal ? "text-[#F2ECE1]" : "text-ink";
  const mutedColor = isCharcoal ? "text-[#A49B8F]" : "text-ink-muted";
  const accentStroke = isBreak ? "var(--success)" : "var(--accent)";

  return (
    <div className="flex flex-col items-center justify-center w-full select-none">
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

      {styleId === "flip" && (
        <div
          className={cn(
            "flex items-center justify-center",
            size === "fullscreen" ? "gap-1.5 sm:gap-4" : "gap-1.5 sm:gap-3"
          )}
        >
          {showHours && (
            <>
              <FlipTile
                value={hh}
                label="HRS"
                size={size}
                compact={showHours}
                isCharcoal={isCharcoal}
                isRunning={false}
              />
              <span
                aria-hidden="true"
                className={cn(
                  "font-mono font-semibold pb-5",
                  size === "fullscreen" ? "text-2xl sm:text-5xl" : "text-xl sm:text-3xl",
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
            compact={showHours}
            isCharcoal={isCharcoal}
            isRunning={false}
          />
          <span
            aria-hidden="true"
            className={cn(
              "font-mono font-semibold pb-5",
              size === "fullscreen" ? "text-2xl sm:text-5xl" : "text-xl sm:text-3xl",
              mutedColor
            )}
          >
            :
          </span>
          <FlipTile
            value={ss}
            label="SEC"
            size={size}
            compact={showHours}
            isCharcoal={isCharcoal}
            isRunning={isRunning}
          />
        </div>
      )}

      {styleId === "digital" && (
        <div className="flex flex-col items-center">
          <div
            className={cn(
              "font-mono font-semibold timer-digit tracking-tight leading-none",
              textColor,
              size === "fullscreen"
                ? "text-[56px] min-[380px]:text-[76px] sm:text-[120px] md:text-[154px]"
                : "text-[46px] min-[380px]:text-[60px] sm:text-[82px]"
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

      {styleId === "minimal" && (
        <div className="flex flex-col items-center">
          <div
            className={cn(
              "font-sans font-bold timer-digit tracking-[-0.04em] leading-none",
              textColor,
              size === "fullscreen"
                ? "text-[60px] min-[380px]:text-[84px] sm:text-[134px] md:text-[170px]"
                : "text-[50px] min-[380px]:text-[64px] sm:text-[90px]"
            )}
          >
            {showHours ? `${hh}:${mm}:${ss}` : `${mm}:${ss}`}
          </div>
        </div>
      )}

      {styleId === "progress" && (
        <div
          className={cn(
            "relative flex items-center justify-center",
            size === "fullscreen"
              ? "h-[244px] w-[244px] min-[380px]:h-[276px] min-[380px]:w-[276px] sm:h-[336px] sm:w-[336px]"
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
              stroke={accentStroke}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 54}
              strokeDashoffset={2 * Math.PI * 54 * (1 - progress)}
              className="transition-[stroke-dashoffset] duration-300"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className={cn(
                "font-mono font-semibold timer-digit tracking-tight",
                textColor,
                size === "fullscreen"
                  ? showHours
                    ? "text-3xl min-[380px]:text-4xl sm:text-5xl"
                    : "text-4xl min-[380px]:text-5xl sm:text-6xl"
                  : showHours
                    ? "text-2xl sm:text-3xl"
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
