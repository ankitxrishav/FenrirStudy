'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Repeat2 } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';

import { useUser } from '@/firebase';
import { useHabits } from '@/hooks/use-habits';
import { Habit } from '@/lib/definitions';

import { DateSelector } from '@/components/app/habits/date-selector';
import { HabitItem } from '@/components/app/habits/habit-item';
import { ProgressHeader } from '@/components/app/habits/progress-header';
import { AddEditHabitDialog } from '@/components/app/habits/add-edit-habit-dialog';
import { StarterGuide } from '@/components/app/habits/starter-guide';
import LoadingScreen from '@/components/app/loading-screen';
import { Card, CardContent } from '@/components/ui/card';

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------
function dateLabel(d: Date) {
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'EEE, MMM d');
}

// -------------------------------------------------------
// Page
// -------------------------------------------------------
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
    if (!userLoading && !user) router.push('/login');
  }, [user, userLoading, router]);

  if (userLoading || !user) return <LoadingScreen />;

  const completedCount = habits.filter(h => logsForDate[h.id]?.status === 'completed').length;

  const handleSave = async (data: Parameters<typeof addHabit>[0]) => {
    if (editTarget) {
      await editHabit(editTarget.id, data);
    } else {
      await addHabit(data);
    }
  };

  const openEdit = (habit: Habit) => { setEditTarget(habit); setDialogOpen(true); };
  const openAdd = () => { setEditTarget(null); setDialogOpen(true); };

  return (
    <div className="max-w-2xl mx-auto w-full px-4 py-6 space-y-6">

      {/* ---- Page Header ---- */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-primary mb-1">
            <Repeat2 className="h-4 w-4" />
            <span className="text-[10px] font-bold uppercase tracking-[0.4em]">Daily Routine</span>
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-gradient">Habits</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{dateLabel(selectedDate)}</p>
        </div>
        <button
          id="add-habit-fab"
          onClick={openAdd}
          className="h-11 w-11 rounded-2xl bg-primary shadow-lg shadow-primary/30 flex items-center justify-center text-primary-foreground hover:scale-105 active:scale-95 transition-transform"
        >
          <Plus className="h-5 w-5" strokeWidth={2.5} />
        </button>
      </div>

      <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Starter Guide */}
        <StarterGuide />

        {/* Date Selector */}
        <DateSelector selectedDate={selectedDate} onDateChange={setSelectedDate} />

        {/* Progress */}
        {habits.length > 0 && (
          <Card className="glass-card">
            <CardContent className="pt-5">
              <ProgressHeader completed={completedCount} total={habits.length} />
            </CardContent>
          </Card>
        )}

        {/* Habit List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-[72px] rounded-2xl bg-muted/20 animate-pulse" />
            ))}
          </div>
        ) : habits.length === 0 ? (
          <EmptyState onAdd={openAdd} />
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {habits.map((habit, idx) => {
                const now = new Date();
                const midnightToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const isNotToday = selectedDate.getTime() !== midnightToday.getTime();

                // Check time window if it exists and it IS today
                let isOutsideWindow = false;
                if (!isNotToday && habit.startTime && habit.endTime) {
                  const [startH, startM] = habit.startTime.split(':').map(Number);
                  const [endH, endM] = habit.endTime.split(':').map(Number);
                  const startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), startH, startM);
                  const endTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endH, endM);
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
                    onMoveUp={() => moveHabit(habit.id, 'up')}
                    onMoveDown={() => moveHabit(habit.id, 'down')}
                  />
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Add / Edit Dialog */}
      <AddEditHabitDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultValues={editTarget}
        onSave={handleSave}
      />
    </div>
  );
}

// -------------------------------------------------------
// Empty State
// -------------------------------------------------------
function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-16 gap-4 text-center"
    >
      <div className="text-6xl">📋</div>
      <div>
        <p className="font-bold text-lg tracking-tight">No habits for this day</p>
        <p className="text-muted-foreground text-sm mt-1">Build your routine by adding your first habit.</p>
      </div>
      <button
        onClick={onAdd}
        className="mt-2 px-6 py-2.5 rounded-2xl bg-primary text-primary-foreground font-bold text-sm shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-transform"
      >
        + Add First Habit
      </button>
    </motion.div>
  );
}
