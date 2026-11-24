"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Repeat2, CheckSquare } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";

import { useUser } from "@/firebase";
import { useHabits } from "@/hooks/use-habits";
import { Habit } from "@/lib/definitions";

import { DateSelector } from "@/components/app/habits/date-selector";
import { HabitItem } from "@/components/app/habits/habit-item";
import { ProgressHeader } from "@/components/app/habits/progress-header";
import { AddEditHabitDialog } from "@/components/app/habits/add-edit-habit-dialog";
import { StarterGuide } from "@/components/app/habits/starter-guide";
import LoadingScreen from "@/components/app/loading-screen";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function dateLabel(d: Date) {
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEE, MMM d");
}

export default function RoutinePage() {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();

  const [selectedDate, setSelectedDate] = React.useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  });
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<Habit | null>(null);

  const {
    habits,
    logsForDate,
    loading,
    toggleHabit,
    addHabit,
    editHabit,
    deleteHabit,
    moveHabit,
  } = useHabits(selectedDate);

  React.useEffect(() => {
    if (!userLoading && !user) router.push("/login");
  }, [user, userLoading, router]);

  if (userLoading || !user) return <LoadingScreen />;

  const completedCount = habits.filter(
    (h) => logsForDate[h.id]?.status === "completed"
  ).length;

  const handleSave = async (data: Parameters<typeof addHabit>[0]) => {
    if (editTarget) {
      await editHabit(editTarget.id, data);
    } else {
      await addHabit(data);
    }
  };

  const openEdit = (habit: Habit) => {
    setEditTarget(habit);
    setDialogOpen(true);
  };
  const openAdd = () => {
    setEditTarget(null);
    setDialogOpen(true);
  };

  return (
    <div className="max-w-2xl mx-auto w-full space-y-6 pb-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-muted flex items-center gap-1.5">
            <Repeat2 className="h-3.5 w-3.5 text-clay" />
            Daily Routine
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-ink mt-0.5">
            Habits
          </h1>
          <p className="text-sm text-ink-muted mt-0.5">{dateLabel(selectedDate)}</p>
        </div>

        <Button
          id="add-habit-fab"
          type="button"
          onClick={openAdd}
          className="min-h-[44px] rounded-full bg-clay text-ink border border-line hover:bg-clay/90 font-semibold gap-1.5 px-4"
        >
          <Plus className="h-4 w-4" />
          <span>Add Habit</span>
        </Button>
      </div>

      <StarterGuide />

      <DateSelector selectedDate={selectedDate} onDateChange={setSelectedDate} />

      {habits.length > 0 && (
        <Card className="border-line bg-surface rounded-2xl">
          <CardContent className="p-5">
            <ProgressHeader completed={completedCount} total={habits.length} />
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-[72px] rounded-2xl border border-line/15 bg-surface-soft"
            />
          ))}
        </div>
      ) : habits.length === 0 ? (
        <EmptyState onAdd={openAdd} />
      ) : (
        <div className="space-y-3">
          {habits.map((habit, idx) => {
            const now = new Date();
            const midnightToday = new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate()
            );
            const isNotToday = selectedDate.getTime() !== midnightToday.getTime();

            let isOutsideWindow = false;
            if (!isNotToday && habit.startTime && habit.endTime) {
              const [startH, startM] = habit.startTime.split(":").map(Number);
              const [endH, endM] = habit.endTime.split(":").map(Number);
              const startTime = new Date(
                now.getFullYear(),
                now.getMonth(),
                now.getDate(),
                startH,
                startM
              );
              const endTime = new Date(
                now.getFullYear(),
                now.getMonth(),
                now.getDate(),
                endH,
                endM
              );
              isOutsideWindow = now < startTime || now > endTime;
            }

            return (
              <HabitItem
                key={habit.id}
                habit={habit}
                log={logsForDate[habit.id]}
                isFirst={idx === 0}
                isLast={idx === habits.length - 1}
                disabled={isNotToday || isOutsideWindow}
                onToggle={() => toggleHabit(habit.id)}
                onEdit={() => openEdit(habit)}
                onDelete={() => deleteHabit(habit.id)}
                onMoveUp={() => moveHabit(habit.id, "up")}
                onMoveDown={() => moveHabit(habit.id, "down")}
              />
            );
          })}
        </div>
      )}

      <AddEditHabitDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultValues={editTarget}
        onSave={handleSave}
      />
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-3xl border border-dashed border-line/40 bg-surface py-12 px-6 flex flex-col items-center justify-center gap-3 text-center">
      <div className="h-12 w-12 rounded-2xl border border-line bg-surface-soft flex items-center justify-center text-ink">
        <CheckSquare className="h-5 w-5 stroke-[1.5]" />
      </div>
      <div>
        <p className="font-semibold text-base text-ink">No habits scheduled</p>
        <p className="text-ink-muted text-sm mt-1">
          Build your daily routine by adding your first habit.
        </p>
      </div>
      <Button
        type="button"
        onClick={onAdd}
        className="mt-2 min-h-[44px] px-6 rounded-full bg-clay text-ink border border-line hover:bg-clay/90 font-semibold"
      >
        + Add First Habit
      </Button>
    </div>
  );
}
