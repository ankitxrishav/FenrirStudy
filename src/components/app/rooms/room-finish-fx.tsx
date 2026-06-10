'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RoomMember } from '@/lib/definitions';

interface RoomFinishFxProps {
  members: RoomMember[];
  currentUserId: string;
}

function playChime() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.15;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.18, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      osc.start(t);
      osc.stop(t + 0.7);
    });
  } catch {
    // AudioContext may be blocked before user interaction — silent fail
  }
}

export function RoomFinishFx({ members, currentUserId }: RoomFinishFxProps) {
  const seenFinishes = useRef<Set<string>>(new Set());
  const [showEffect, setShowEffect] = useState<{ name: string; isCurrentUser: boolean } | null>(null);

  useEffect(() => {
    members.forEach(member => {
      if (!member.finishedAt) return;

      // Only trigger if this finishedAt is within the last 10 seconds
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

      // Clear after animation
      setTimeout(() => setShowEffect(null), 3500);
    });
  }, [members, currentUserId]);

  return (
    <AnimatePresence>
      {showEffect && (
        <motion.div
          key="finish-fx"
          className="absolute inset-0 z-50 flex flex-col items-center justify-center pointer-events-none overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Expanding rings */}
          {[0, 0.2, 0.4].map((delay, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full border-2 border-primary/40"
              initial={{ width: 80, height: 80, opacity: 0.8 }}
              animate={{ width: 400, height: 400, opacity: 0 }}
              transition={{ duration: 1.5, delay, ease: 'easeOut' }}
            />
          ))}

          {/* Name + message card */}
          <motion.div
            className="glass border border-primary/30 rounded-2xl px-8 py-5 flex flex-col items-center gap-2 text-center shadow-2xl"
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', bounce: 0.4, duration: 0.5 }}
          >
            <span className="text-3xl">🎯</span>
            <p className="text-sm font-bold text-foreground">
              {showEffect.isCurrentUser
                ? 'Session complete!'
                : `${showEffect.name} finished!`}
            </p>
            <p className="text-xs text-muted-foreground">Great focus. Take a break.</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
