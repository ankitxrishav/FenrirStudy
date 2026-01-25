
'use client';

import { cn } from "@/lib/utils";

interface DigitalFaceProps {
  duration: number;
  mode: 'pomodoro' | 'stopwatch';
  isActive: boolean;
}

const formatTime = (totalSeconds: number) => {
  const roundedSeconds = Math.floor(totalSeconds);
  const seconds = roundedSeconds % 60;
  const minutes = Math.floor(roundedSeconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export function DigitalFace({ duration, mode, isActive }: DigitalFaceProps) {
  return (
    <div className="w-full h-full flex items-center justify-center py-12">
      <div className={cn("relative w-full max-w-md", isActive && "breathing")}>
        <span className="font-mono font-bold text-8xl md:text-9xl text-foreground tracking-tighter block text-center timer-digit">
          {formatTime(duration)}
        </span>
        <span className="mt-4 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground text-center block opacity-50">
          {mode} Mode
        </span>
      </div>
    </div>
  );
}
