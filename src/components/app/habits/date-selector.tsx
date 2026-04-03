'use client';

import * as React from 'react';
import { format, addDays, subDays, isSameDay, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DateSelectorProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

const VISIBLE_DAYS = 7; // days on each side of selected

export function DateSelector({ selectedDate, onDateChange }: DateSelectorProps) {
  const [centerDate, setCenterDate] = React.useState(selectedDate);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Build a 15-day window around center
  const days = React.useMemo(() => {
    return Array.from({ length: 15 }, (_, i) => addDays(subDays(centerDate, 7), i));
  }, [centerDate]);

  const scrollBy = (dir: 'prev' | 'next') => {
    setCenterDate(d => dir === 'prev' ? subDays(d, 7) : addDays(d, 7));
  };

  return (
    <div className="flex items-center gap-2 w-full select-none">
      {/* Prev button */}
      <button
        onClick={() => scrollBy('prev')}
        className="shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {/* Date strip */}
      <div
        ref={scrollRef}
        className="flex-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar snap-x snap-mandatory scroll-smooth"
      >
        {days.map((day) => {
          const isSelected = isSameDay(day, selectedDate);
          const isT = isToday(day);

          return (
            <motion.button
              key={day.toISOString()}
              onClick={() => onDateChange(day)}
              whileTap={{ scale: 0.92 }}
              className={cn(
                'relative flex flex-col items-center justify-center rounded-2xl px-3 py-2.5 min-w-[52px] transition-all duration-200 shrink-0 snap-center',
                isSelected
                  ? 'text-primary-foreground'
                  : isT
                    ? 'text-primary border border-primary/30 bg-primary/5'
                    : 'text-muted-foreground hover:bg-accent/50'
              )}
            >
              {isSelected && (
                <motion.div
                  layoutId="date-selector-pill"
                  className="absolute inset-0 rounded-2xl bg-primary shadow-lg shadow-primary/20"
                  transition={{ type: 'spring', bounce: 0.25, duration: 0.5 }}
                />
              )}
              <span className={cn('relative z-10 text-[10px] font-bold uppercase tracking-wider', isSelected ? 'opacity-80' : 'opacity-60')}>
                {format(day, 'EEE')}
              </span>
              <span className="relative z-10 text-lg font-black leading-tight">
                {format(day, 'd')}
              </span>
              {isT && !isSelected && (
                <div className="relative z-10 h-1 w-1 rounded-full bg-primary mt-0.5" />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Next button */}
      <button
        onClick={() => scrollBy('next')}
        className="shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
