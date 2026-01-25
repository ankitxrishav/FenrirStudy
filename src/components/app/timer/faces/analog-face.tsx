
"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface FaceProps {
    duration: number;
    initialDuration: number;
    mode: 'pomodoro' | 'stopwatch';
    isActive: boolean;
    color?: string;
}

export function AnalogFace({ duration, initialDuration, mode, isActive, color }: FaceProps) {
    const totalSeconds = mode === 'pomodoro' ? initialDuration : 3600;
    const progress = (duration % totalSeconds) / totalSeconds;

    // Hand rotations
    const secondRotation = (duration % 60) * 6; // 360 / 60
    const minuteRotation = ((duration / 60) % 60) * 6;

    return (
        <div className="relative flex items-center justify-center p-8">
            <div className="w-64 h-64 rounded-full border-4 border-muted/20 relative glass">
                {/* Hour markings */}
                {[...Array(12)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-1 h-3 bg-muted-foreground/30 left-1/2 -ml-0.5 top-2 origin-[center_120px]"
                        style={{ transform: `rotate(${i * 30}deg)` }}
                    />
                ))}

                {/* Hands */}
                <motion.div
                    className="absolute w-1 h-24 bg-foreground/60 left-1/2 -ml-0.5 top-8 origin-bottom rounded-full"
                    animate={{ rotate: minuteRotation }}
                />
                <motion.div
                    className="absolute w-0.5 h-28 left-1/2 -ml-0.25 top-4 origin-bottom rounded-full"
                    style={{ backgroundColor: color || "hsl(var(--primary))" }}
                    animate={{ rotate: secondRotation }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />

                {/* Center dot */}
                <div className="absolute w-3 h-3 bg-foreground rounded-full left-1/2 top-1/2 -ml-1.5 -mt-1.5 shadow-xl" />
            </div>

            <div className="absolute top-[85%] flex flex-col items-center">
                <span className="text-2xl font-black timer-digit opacity-40 bg-white/5 backdrop-blur-md px-4 py-1.5 rounded-2xl border border-white/10 shadow-2xl tracking-widest">
                    {Math.floor(duration / 60)}:{Math.floor(duration % 60).toString().padStart(2, '0')}
                </span>
            </div>
        </div>
    );
}
