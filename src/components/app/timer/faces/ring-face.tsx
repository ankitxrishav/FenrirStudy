
'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface RingFaceProps {
    duration: number;
    initialDuration: number;
    mode: 'pomodoro' | 'stopwatch';
    isActive: boolean;
    color?: string;
}

const formatTime = (totalSeconds: number) => {
    const roundedSeconds = Math.floor(totalSeconds);
    const seconds = roundedSeconds % 60;
    const minutes = Math.floor(roundedSeconds / 60);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export function RingFace({ duration, initialDuration, mode, isActive, color }: RingFaceProps) {
    const circumference = 2 * Math.PI * 45; // r = 45

    let progress = 0;
    if (mode === 'pomodoro' && initialDuration > 0) {
        progress = duration / initialDuration;
    } else { // stopwatch
        const cycle = 60; // 60 seconds per ring cycle
        progress = (duration % cycle) / cycle;
    }

    const strokeDashoffset = circumference * (1 - Math.min(progress, 1));

    return (
        <div className="w-64 h-64 md:w-80 md:h-80 flex flex-col items-center justify-center relative">
            <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                {/* Background Ring */}
                <circle
                    cx="50"
                    cy="50"
                    r="45"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="transparent"
                    className="text-muted/10"
                />
                {/* Progress Ring */}
                <motion.circle
                    cx="50"
                    cy="50"
                    r="45"
                    stroke={color || "hsl(var(--primary))"}
                    strokeWidth="4"
                    fill="transparent"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    animate={{ strokeDashoffset }}
                    transition={{ duration: 1, ease: "linear" }}
                    className={cn(isActive && "breathing")}
                />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-mono font-bold text-6xl md:text-7xl text-foreground tracking-tighter timer-digit">
                    {formatTime(duration)}
                </span>
                <span className="mt-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground opacity-50">
                    {mode}
                </span>
            </div>
        </div>
    );
}
