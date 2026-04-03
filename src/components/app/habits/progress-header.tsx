'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProgressHeaderProps {
  completed: number;
  total: number;
}

export function ProgressHeader({ completed, total }: ProgressHeaderProps) {
  const pct = total > 0 ? (completed / total) * 100 : 0;
  const allDone = total > 0 && completed === total;

  return (
    <div className="space-y-3">
      {/* Fraction row */}
      <div className="flex items-end justify-between">
        <div className="flex items-baseline gap-1.5">
          <motion.span
            key={completed}
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-4xl font-black tracking-tighter tabular-nums"
          >
            {completed}
          </motion.span>
          <span className="text-lg font-semibold text-muted-foreground/60">/{total}</span>
          <span className="text-sm font-bold text-muted-foreground/60 ml-1">completed</span>
        </div>

        {allDone && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-1.5 text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span className="text-[10px] font-black uppercase tracking-widest">All done!</span>
          </motion.div>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
        <motion.div
          className={cn(
            'h-full rounded-full',
            allDone ? 'bg-emerald-500' : 'bg-primary'
          )}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 18 }}
        />
      </div>

      {/* Percentage */}
      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
        <span>Daily Progress</span>
        <motion.span
          key={Math.round(pct)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {Math.round(pct)}%
        </motion.span>
      </div>
    </div>
  );
}
