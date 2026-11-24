"use client";

import * as React from "react";
import {
  Check,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  MoreHorizontal,
  Dumbbell,
  Heart,
  BookOpen,
  Briefcase,
  Leaf,
  CircleDot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Habit, HabitCategory, HabitLog, HABIT_CATEGORY_META } from "@/lib/definitions";

const CATEGORY_ICONS: Record<HabitCategory, React.ComponentType<{ className?: string }>> = {
  exercise: Dumbbell,
  health: Heart,
  learning: BookOpen,
  work: Briefcase,
  mindfulness: Leaf,
  custom: CircleDot,
};

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
  habit,
  log,
  isFirst,
  isLast,
  onToggle,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  disabled,
}: HabitItemProps) {
  const isCompleted = log?.status === "completed";
  const meta = HABIT_CATEGORY_META[habit.category] ?? HABIT_CATEGORY_META.custom;
  const Icon = CATEGORY_ICONS[habit.category] ?? CircleDot;
  const [showMobileActions, setShowMobileActions] = React.useState(false);

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border transition-colors",
        isCompleted
          ? "bg-surface-soft border-line/30"
          : disabled
            ? "bg-surface-soft/50 border-dashed border-line/25"
            : "bg-surface border-line"
      )}
    >
      <div className="flex items-center gap-3.5 p-3.5 sm:p-4">
        <div
          className={cn(
            "h-10 w-10 rounded-xl border border-line/20 bg-surface-soft flex items-center justify-center shrink-0 text-ink",
            isCompleted && "opacity-50"
          )}
        >
          <Icon className="h-4 w-4 stroke-[1.75]" />
        </div>

        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "font-medium text-sm text-ink leading-snug truncate",
              isCompleted && "line-through text-ink-muted"
            )}
          >
            {habit.name}
          </p>
          <p className="font-mono text-[10px] uppercase tracking-wider text-ink-muted mt-0.5 flex items-center gap-2">
            <span>{meta.label}</span>
            {habit.startTime && habit.endTime && (
              <>
                <span>·</span>
                <span className="text-ink">
                  {habit.startTime} - {habit.endTime}
                </span>
              </>
            )}
          </p>
        </div>

        <div
          className={cn(
            "shrink-0 flex items-center gap-1 transition-opacity",
            "md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100",
            showMobileActions ? "flex" : "hidden md:flex"
          )}
        >
          <button
            id={`move-up-${habit.id}`}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMoveUp();
            }}
            disabled={isFirst}
            aria-label="Move habit up"
            className="h-9 w-9 md:h-7 md:w-7 rounded-lg flex items-center justify-center text-ink-muted hover:bg-surface-soft hover:text-ink disabled:opacity-25"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            id={`move-down-${habit.id}`}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMoveDown();
            }}
            disabled={isLast}
            aria-label="Move habit down"
            className="h-9 w-9 md:h-7 md:w-7 rounded-lg flex items-center justify-center text-ink-muted hover:bg-surface-soft hover:text-ink disabled:opacity-25"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          <button
            id={`edit-${habit.id}`}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            aria-label="Edit habit"
            className="h-9 w-9 md:h-7 md:w-7 rounded-lg flex items-center justify-center text-ink-muted hover:bg-surface-soft hover:text-ink"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            id={`delete-${habit.id}`}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            aria-label="Delete habit"
            className="h-9 w-9 md:h-7 md:w-7 rounded-lg flex items-center justify-center text-ink-muted hover:bg-danger/10 hover:text-danger"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowMobileActions(!showMobileActions);
          }}
          aria-label="Habit actions"
          className={cn(
            "md:hidden h-10 w-10 rounded-full flex items-center justify-center transition-colors",
            showMobileActions
              ? "bg-surface-soft text-ink"
              : "text-ink-muted"
          )}
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>

        <button
          id={`toggle-${habit.id}`}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) onToggle();
          }}
          disabled={disabled}
          aria-label={isCompleted ? `Mark ${habit.name} incomplete` : `Complete ${habit.name}`}
          className={cn(
            "shrink-0 h-11 w-11 md:h-9 md:w-9 rounded-full border flex items-center justify-center transition-colors",
            disabled
              ? "border-line/20 bg-surface-soft opacity-50 cursor-not-allowed"
              : isCompleted
                ? "bg-clay border-line text-ink"
                : "border-line/40 bg-surface hover:border-line"
          )}
        >
          {isCompleted ? (
            <Check className="h-4 w-4 stroke-[2.75]" />
          ) : (
            <span className="h-2.5 w-2.5 rounded-full border border-line/40" />
          )}
        </button>
      </div>
    </div>
  );
}
