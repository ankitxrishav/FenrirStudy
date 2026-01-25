
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface FaceProps {
    duration: number;
    initialDuration: number;
    mode: 'pomodoro' | 'stopwatch';
    isActive: boolean;
    color?: string;
}

export function RadialFace({ duration, initialDuration, mode, isActive, color }: FaceProps) {
    const progress = mode === 'pomodoro'
        ? (duration / initialDuration)
        : 1;

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="relative flex items-center justify-center p-8">
            <svg className="w-64 h-64 -rotate-90">
                {/* Background Track */}
                <circle
                    cx="128"
                    cy="128"
                    r="120"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    className="text-muted/20"
                />
                {/* Progress Circle */}
                <motion.circle
                    cx="128"
                    cy="128"
                    r="120"
                    fill="none"
                    stroke={color || "hsl(var(--primary))"}
                    strokeWidth="8"
                    strokeLinecap="round"
                    animate={{ strokeDasharray: `${progress * 754} 754` }}
                    transition={{ duration: 1, ease: "linear" }}
                    className={cn(isActive && "breathing")}
                />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
                <motion.span
                    key={duration}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-6xl font-bold tracking-tighter timer-digit"
                >
                    {formatTime(duration)}
                </motion.span>
                <div className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground mt-2">
                    {mode}
                </div>
            </div>
        </div>
    );
}
