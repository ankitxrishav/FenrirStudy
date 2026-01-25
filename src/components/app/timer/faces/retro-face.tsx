
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

export function RetroFace({ duration, mode, isActive }: FaceProps) {
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="relative flex flex-col items-center justify-center p-12 glass-card rounded-xl border-primary/20 shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden">
            {/* Scanline effect */}
            <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] z-10 bg-[length:100%_2px,3px_100%]" />

            <div className="relative z-0">
                <div className="text-xs font-mono text-primary/50 mb-2 tracking-[0.3em] font-bold">
                    SYSTEM.STATUS: {isActive ? 'RUNNING' : 'IDLE'}
                </div>

                <motion.div
                    key={duration}
                    initial={{ opacity: 0.8 }}
                    animate={{ opacity: 1 }}
                    className="text-8xl font-black font-mono tracking-tighter text-primary drop-shadow-[0_0_15px_rgba(var(--primary),0.5)]"
                    style={{ textShadow: "0 0 20px hsl(var(--primary)/0.5)" }}
                >
                    {formatTime(duration)}
                </motion.div>

                <div className="flex justify-between mt-4 text-[10px] font-mono text-primary/40">
                    <span>MODE_{mode.toUpperCase()}</span>
                    <span>SESSION_FLX_01</span>
                </div>
            </div>

            {/* Flickering glow */}
            <motion.div
                className="absolute inset-0 bg-primary/5"
                animate={{ opacity: [0.05, 0.1, 0.05] }}
                transition={{ duration: 0.1, repeat: Infinity }}
            />
        </div>
    );
}
