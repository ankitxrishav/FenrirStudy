
'use client';

import { motion } from 'framer-motion';

interface RingFaceProps {
  time: number;
  subjectName?: string;
  mode: 'pomodoro' | 'stopwatch';
  totalDuration: number;
  isActive: boolean;
}

const formatTime = (totalSeconds: number) => {
  const roundedSeconds = Math.floor(totalSeconds);
  const seconds = roundedSeconds % 60;
  const minutes = Math.floor(roundedSeconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export function RingFace({ time, subjectName, mode, totalDuration, isActive }: RingFaceProps) {
    const circumference = 2 * Math.PI * 45; // r = 45

    let progress = 0;
    if (mode === 'pomodoro' && totalDuration > 0) {
        progress = (totalDuration - time) / totalDuration;
    } else { // stopwatch
        const cycle = 60; // 60 seconds per ring cycle
        progress = (time % cycle) / cycle;
    }

    const strokeDashoffset = circumference * (1 - Math.min(progress, 1));
  
  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative">
        <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
            {/* Background Ring */}
            <circle
                cx="50"
                cy="50"
                r="45"
                stroke="hsl(var(--muted))"
                strokeWidth="5"
                fill="transparent"
            />
            {/* Progress Ring */}
            <motion.circle
                cx="50"
                cy="50"
                r="45"
                stroke="hsl(var(--primary))"
                strokeWidth="5"
                fill="transparent"
                strokeLinecap="round"
                strokeDasharray={circumference}
                animate={{ strokeDashoffset }}
                transition={{ duration: 0.5, ease: "linear" }}
                className={isActive ? 'animate-pulse-slow' : ''}
            />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono font-bold text-6xl md:text-7xl text-foreground tracking-tighter">
                {formatTime(time)}
            </span>
            <span className="mt-2 text-base font-medium text-muted-foreground truncate max-w-[80%] px-4 text-center">
                {subjectName || "No Subject"}
            </span>
        </div>
    </div>
  );
}
