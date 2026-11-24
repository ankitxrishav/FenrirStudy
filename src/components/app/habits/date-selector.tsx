"use client";

import * as React from "react";
import { format, addDays, subDays, isSameDay, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface DateSelectorProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export function DateSelector({ selectedDate, onDateChange }: DateSelectorProps) {
  const [centerDate, setCenterDate] = React.useState(selectedDate);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const days = React.useMemo(() => {
    return Array.from({ length: 15 }, (_, i) => addDays(subDays(centerDate, 7), i));
  }, [centerDate]);

  const scrollBy = (dir: "prev" | "next") => {
    setCenterDate((d) => (dir === "prev" ? subDays(d, 7) : addDays(d, 7)));
  };

  return (
    <div className="flex items-center gap-2 w-full select-none">
      <button
        type="button"
        onClick={() => scrollBy("prev")}
        aria-label="Previous week"
        className="shrink-0 h-11 w-11 rounded-full border border-line/20 bg-surface flex items-center justify-center text-ink-muted hover:text-ink hover:border-line transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div
        ref={scrollRef}
        className="flex-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar snap-x snap-mandatory scroll-smooth py-0.5"
      >
        {days.map((day) => {
          const isSelected = isSameDay(day, selectedDate);
          const isT = isToday(day);

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onDateChange(day)}
              className={cn(
                "flex flex-col items-center justify-center rounded-2xl px-3 py-2 min-w-[52px] min-h-[56px] border transition-colors shrink-0 snap-center",
                isSelected
                  ? "bg-ink text-surface border-line"
                  : isT
                    ? "bg-highlight/70 text-ink border-line"
                    : "bg-surface text-ink-muted border-line/20 hover:border-line hover:text-ink"
              )}
            >
              <span className="font-mono text-[10px] uppercase tracking-wider opacity-75">
                {format(day, "EEE")}
              </span>
              <span className="text-base font-bold leading-tight tabular-nums">
                {format(day, "d")}
              </span>
              {isT && !isSelected && (
                <span className="h-1 w-1 rounded-full bg-clay mt-0.5" />
              )}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => scrollBy("next")}
        aria-label="Next week"
        className="shrink-0 h-11 w-11 rounded-full border border-line/20 bg-surface flex items-center justify-center text-ink-muted hover:text-ink hover:border-line transition-colors"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
