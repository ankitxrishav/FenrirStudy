'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Circle, Pencil, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Habit, HabitLog, HABIT_CATEGORY_META } from '@/lib/definitions';

interface HabitItemProps {
  habit: Habit;
  log: HabitLog | undefined;
  isFirst: boolean;
  isLast: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  disabled?: boolean;
}

export function HabitItem({
  habit, log, isFirst, isLast,
  onToggle, onEdit, onDelete, onMoveUp, onMoveDown,
  disabled
}: HabitItemProps) {
  const isCompleted = log?.status === 'completed';
  const meta = HABIT_CATEGORY_META[habit.category] ?? HABIT_CATEGORY_META.custom;
  const [showMobileActions, setShowMobileActions] = React.useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className={cn(
        'group relative overflow-hidden rounded-2xl border transition-all duration-300',
        isCompleted
          ? 'bg-muted/30 border-border/50'
          : disabled
            ? 'bg-muted/5 border-dashed border-border/40'
            : 'bg-card border-border hover:border-primary/40 hover:shadow-sm'
      )}
    >
      {/* Left accent bar */}
      <div
        className="absolute left-0 inset-y-0 w-1 rounded-r-full transition-all duration-300"
        style={{ backgroundColor: isCompleted ? 'transparent' : meta.color }}
      />

      <div className="flex items-center gap-4 p-4 pl-5">
        {/* Category icon */}
        <motion.div
          animate={{ scale: isCompleted ? 0.85 : 1, opacity: isCompleted ? 0.5 : 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="shrink-0 text-2xl leading-none"
        >
          {meta.icon}
        </motion.div>

        {/* Name */}
        <div className="flex-1 min-w-0">
          <motion.p
            animate={{ opacity: isCompleted ? 0.45 : 1 }}
            className={cn(
              'font-semibold text-sm leading-snug truncate transition-all duration-300',
              isCompleted && 'line-through'
            )}
          >
            {habit.name}
          </motion.p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mt-0.5 flex items-center gap-2">
            <span>{meta.label}</span>
            {habit.startTime && habit.endTime && (
              <>
                <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                <span className="text-primary/60 lowercase font-medium">{habit.startTime} - {habit.endTime}</span>
              </>
            )}
          </p>
        </div>

        {/* Reorder + Actions (Desktop: hover, Mobile: tap toggle) */}
        <div className={cn(
          "shrink-0 flex items-center gap-1 transition-all duration-300",
          "md:opacity-0 md:group-hover:opacity-100", // Desktop hover
          showMobileActions ? "opacity-100 translate-x-0" : "max-md:hidden max-md:opacity-0 max-md:translate-x-4" // Mobile toggle
        )}>
          <button
            id={`move-up-${habit.id}`}
            onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
            disabled={isFirst}
            className="h-8 w-8 md:h-6 md:w-6 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-20 transition-colors"
          >
            <ChevronUp className="h-4 w-4 md:h-3.5 md:w-3.5" />
          </button>
          <button
            id={`move-down-${habit.id}`}
            onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
            disabled={isLast}
            className="h-8 w-8 md:h-6 md:w-6 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-20 transition-colors"
          >
            <ChevronDown className="h-4 w-4 md:h-3.5 md:w-3.5" />
          </button>
          <button
            id={`edit-${habit.id}`}
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="h-8 w-8 md:h-6 md:w-6 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <Pencil className="h-4 w-4 md:h-3 md:w-3" />
          </button>
          <button
            id={`delete-${habit.id}`}
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="h-8 w-8 md:h-6 md:w-6 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <Trash2 className="h-4 w-4 md:h-3 md:w-3" />
          </button>
        </div>

        {/* Mobile Options Toggle */}
        <button
          onClick={(e) => { e.stopPropagation(); setShowMobileActions(!showMobileActions); }}
          className={cn(
            "md:hidden h-8 w-8 rounded-full flex items-center justify-center transition-colors",
            showMobileActions ? "bg-accent text-foreground" : "text-muted-foreground"
          )}
        >
          <div className="flex gap-0.5">
            <div className="h-1 w-1 rounded-full bg-current" />
            <div className="h-1 w-1 rounded-full bg-current" />
            <div className="h-1 w-1 rounded-full bg-current" />
          </div>
        </button>

        {/* Toggle button */}
        <motion.button
          id={`toggle-${habit.id}`}
          whileTap={disabled ? {} : { scale: 0.85 }}
          onClick={(e) => { e.stopPropagation(); if (!disabled) onToggle(); }}
          disabled={disabled}
          className={cn(
            'shrink-0 h-10 w-10 md:h-8 md:w-8 rounded-full border-2 flex items-center justify-center transition-all duration-300',
            disabled
              ? 'border-muted-foreground/20 bg-muted/10 opacity-50 cursor-not-allowed'
              : isCompleted
                ? 'bg-primary border-primary shadow-lg shadow-primary/30'
                : 'border-muted-foreground/30 hover:border-primary/60 hover:bg-primary/5'
          )}
        >
          <AnimatePresence mode="wait" initial={false}>
            {isCompleted ? (
              <motion.div
                key="check"
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 90 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                <Check className="h-4 w-4 text-primary-foreground" strokeWidth={3} />
              </motion.div>
            ) : (
              <motion.div
                key="circle"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <Circle className="h-3.5 w-3.5 text-muted-foreground/30" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* Completion shimmer overlay */}
      <AnimatePresence>
        {isCompleted && (
          <motion.div
            initial={{ scaleX: 0, opacity: 0.5 }}
            animate={{ scaleX: 1, opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            style={{ originX: 0 }}
            className="absolute inset-0 bg-primary/10 pointer-events-none"
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
