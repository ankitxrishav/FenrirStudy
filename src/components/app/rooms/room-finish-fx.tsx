"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { RoomMember } from "@/lib/definitions";

interface RoomFinishFxProps {
  members: RoomMember[];
  currentUserId: string;
}

function playChime() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const notes = [523.25, 659.25, 783.99, 1046.5];

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.14;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.12, t + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
      osc.start(t);
      osc.stop(t + 0.65);
    });
  } catch {
    // Silent fail if blocked before interaction
  }
}

export function RoomFinishFx({ members, currentUserId }: RoomFinishFxProps) {
  const seenFinishes = useRef<Set<string>>(new Set());
  const [showEffect, setShowEffect] = useState<{ name: string; isCurrentUser: boolean } | null>(null);

  useEffect(() => {
    members.forEach((member) => {
      if (!member.finishedAt) return;
      const finishedMs = new Date(member.finishedAt).getTime();
      if (Date.now() - finishedMs > 10_000) return;

      const key = `${member.userId}-${member.finishedAt}`;
      if (seenFinishes.current.has(key)) return;

      seenFinishes.current.add(key);
      playChime();
      setShowEffect({
        name: member.displayName,
        isCurrentUser: member.userId === currentUserId,
      });

      setTimeout(() => setShowEffect(null), 3200);
    });
  }, [members, currentUserId]);

  return (
    <AnimatePresence>
      {showEffect && (
        <motion.div
          key="finish-fx"
          className="fixed inset-0 z-[110] flex flex-col items-center justify-center pointer-events-none px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <motion.div
            className="absolute rounded-full border border-clay/50"
            initial={{ width: 96, height: 96, opacity: 0.7 }}
            animate={{ width: 320, height: 320, opacity: 0 }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          />

          <motion.div
            className="rounded-[20px] border border-line bg-surface px-8 py-6 flex flex-col items-center gap-2 text-center shadow-[0_12px_32px_rgba(23,21,19,0.14)]"
            initial={{ scale: 0.94, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-highlight text-ink">
              <CheckCircle2 className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <p className="text-lg font-bold tracking-tight text-ink">
              {showEffect.isCurrentUser ? "Session complete" : `${showEffect.name} finished`}
            </p>
            <p className="text-xs text-ink-muted">Great focus. Take a quiet breather.</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
