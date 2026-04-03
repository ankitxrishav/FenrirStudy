'use client';

import * as React from 'react';
import { useMemo, useCallback } from 'react';
import {
  collection,
  query,
  where,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { format, subDays, eachDayOfInterval, getDay } from 'date-fns';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { Habit, HabitLog, HabitCategory, HABIT_CATEGORY_META } from '@/lib/definitions';

export interface AddHabitInput {
  name: string;
  category: HabitCategory;
  frequencyType: 'daily' | 'weekly';
  weekDays: number[];
  reminderTime: string | null;
  startTime?: string | null;
  endTime?: string | null;
}

export interface HabitAnalytics {
  completionRateToday: number;        // 0-100
  weeklyAvgRate: number;              // 0-100
  streakByHabit: Record<string, { current: number; longest: number }>;
  dailyCompletions: { date: string; count: number; total: number }[]; // last 30 days
  heatmapData: { date: string; level: number }[];                     // last 84 days (12 weeks)
  todaySummary: { total: number; completed: number; missed: number };
}

// ---------------------------------------------------------
// Helpers
// ---------------------------------------------------------
function dateKey(d: Date) {
  return format(d, 'yyyy-MM-dd');
}

function isHabitScheduledForDate(habit: Habit, d: Date): boolean {
  if (habit.frequencyType === 'daily') return true;
  return (habit.weekDays ?? []).includes(getDay(d));
}

function isWithinTimeWindow(habit: Habit): boolean {
  if (!habit.startTime || !habit.endTime) return true;

  const now = new Date();
  const [startH, startM] = habit.startTime.split(':').map(Number);
  const [endH, endM] = habit.endTime.split(':').map(Number);

  const startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), startH, startM);
  const endTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endH, endM);

  return now >= startTime && now <= endTime;
}

// ---------------------------------------------------------
// Hook
// ---------------------------------------------------------
export function useHabits(selectedDate: Date) {
  const { user } = useUser();
  const firestore = useFirestore();

  // --- Real-time collections ---
  const habitsQuery = useMemo(() => {
    if (!user || !firestore) return null;
    // No orderBy here — avoids composite index requirement. Sort client-side.
    return query(
      collection(firestore, 'habits'),
      where('userId', '==', user.uid)
    );
  }, [user, firestore]);

  // Fetch logs for a rolling 90-day window to support analytics
  const logsQuery = useMemo(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, 'habitLogs'),
      where('userId', '==', user.uid)
    );
  }, [user, firestore]);

  const { data: allHabits, loading: habitsLoading } = useCollection<Habit>(habitsQuery);
  const { data: allLogs, loading: logsLoading } = useCollection<HabitLog>(logsQuery);

  // --- Seed default habits for new users ---
  const seedDefaultHabits = useCallback(async () => {
    if (!user || !firestore) return;
    const defaults: AddHabitInput[] = [
      { name: 'Deep Work Session', category: 'work', frequencyType: 'daily', weekDays: [], reminderTime: '09:00', startTime: null, endTime: null },
      { name: 'Stay Hydrated', category: 'health', frequencyType: 'daily', weekDays: [], reminderTime: null, startTime: null, endTime: null },
      { name: 'Physical Activity', category: 'exercise', frequencyType: 'daily', weekDays: [], reminderTime: null, startTime: null, endTime: null },
    ];

    for (let i = 0; i < defaults.length; i++) {
        await addDoc(collection(firestore, 'habits'), {
            ...defaults[i],
            userId: user.uid,
            order: i + 1,
            createdAt: new Date().toISOString(),
        });
    }
  }, [user, firestore]);

  React.useEffect(() => {
    if (!habitsLoading && allHabits && allHabits.length === 0) {
        // Only seed if we are sure there are NO habits
        // Using a flag in localStorage to prevent multiple triggers during sync lag
        const seedFlag = `seeded_${user?.uid}`;
        if (typeof window !== 'undefined' && !localStorage.getItem(seedFlag)) {
            seedDefaultHabits();
            localStorage.setItem(seedFlag, 'true');
        }
    }
  }, [allHabits, habitsLoading, seedDefaultHabits, user?.uid]);

  // --- Derived: habits scheduled for selectedDate ---
  const selectedDateKey = dateKey(selectedDate);

  const scheduledHabits = useMemo(() => {
    if (!allHabits) return [];
    return allHabits
      .filter(h => isHabitScheduledForDate(h, selectedDate))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)); // client-side sort
  }, [allHabits, selectedDate]);

  // --- Derived: log map for selected date (habitId -> HabitLog) ---
  const logsForDate = useMemo(() => {
    if (!allLogs) return {} as Record<string, HabitLog>;
    return allLogs
      .filter(l => l.date === selectedDateKey)
      .reduce((acc, l) => { acc[l.habitId] = l; return acc; }, {} as Record<string, HabitLog>);
  }, [allLogs, selectedDateKey]);

  // --- Actions ---

  /** Toggle a habit's completion status for selectedDate */
  const toggleHabit = useCallback(async (habitId: string) => {
    if (!user || !firestore) return;

    // Prevent toggling for any day that is not today
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (selectedDate.getTime() !== today.getTime()) return;

    // Check time window
    const habit = allHabits?.find(h => h.id === habitId);
    if (habit && !isWithinTimeWindow(habit)) return;

    const existing = logsForDate[habitId];

    if (existing) {
      // Flip status
      const newStatus = existing.status === 'completed' ? 'pending' : 'completed';
      await updateDoc(doc(firestore, 'habitLogs', existing.id), {
        status: newStatus,
        timestamp: new Date().toISOString(),
      });
    } else {
      // Create a completed log
      await addDoc(collection(firestore, 'habitLogs'), {
        habitId,
        userId: user.uid,
        date: selectedDateKey,
        status: 'completed',
        timestamp: new Date().toISOString(),
      } satisfies Omit<HabitLog, 'id'>);
    }
  }, [user, firestore, logsForDate, selectedDateKey]);

  /** Add a new habit */
  const addHabit = useCallback(async (input: AddHabitInput) => {
    if (!user || !firestore) return;
    const maxOrder = (allHabits ?? []).reduce((m, h) => Math.max(m, h.order ?? 0), 0);
    await addDoc(collection(firestore, 'habits'), {
      ...input,
      userId: user.uid,
      order: maxOrder + 1,
      createdAt: new Date().toISOString(),
    } satisfies Omit<Habit, 'id'>);
  }, [user, firestore, allHabits]);

  /** Edit an existing habit */
  const editHabit = useCallback(async (id: string, input: Partial<AddHabitInput>) => {
    if (!firestore) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await updateDoc(doc(firestore, 'habits', id), input as any);
  }, [firestore]);

  /** Delete a habit (and its logs) */
  const deleteHabit = useCallback(async (id: string) => {
    if (!firestore) return;
    await deleteDoc(doc(firestore, 'habits', id));
    // Delete associated logs
    const logsToDelete = (allLogs ?? []).filter(l => l.habitId === id);
    await Promise.all(logsToDelete.map(l => deleteDoc(doc(firestore, 'habitLogs', l.id))));
  }, [firestore, allLogs]);

  /** Reorder habit (swap order values) */
  const moveHabit = useCallback(async (id: string, direction: 'up' | 'down') => {
    if (!firestore || !allHabits) return;
    const idx = allHabits.findIndex(h => h.id === id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= allHabits.length) return;
    const a = allHabits[idx];
    const b = allHabits[swapIdx];
    await Promise.all([
      updateDoc(doc(firestore, 'habits', a.id), { order: b.order }),
      updateDoc(doc(firestore, 'habits', b.id), { order: a.order }),
    ]);
  }, [firestore, allHabits]);

  // --- Analytics ---
  const analytics = useMemo((): HabitAnalytics | null => {
    if (!allHabits || !allLogs) return null;

    const today = new Date();
    const todayKey = dateKey(today);

    // Helper: habits scheduled on a given date
    const habitsOnDate = (d: Date) => allHabits.filter(h => isHabitScheduledForDate(h, d));

    // Completion rate today
    const todayHabits = habitsOnDate(today);
    const todayCompleted = todayHabits.filter(h => {
      const log = allLogs.find(l => l.habitId === h.id && l.date === todayKey);
      return log?.status === 'completed';
    }).length;
    const completionRateToday = todayHabits.length > 0
      ? Math.round((todayCompleted / todayHabits.length) * 100)
      : 0;

    // Daily completions for last 30 days
    const last30 = eachDayOfInterval({ start: subDays(today, 29), end: today });
    const dailyCompletions = last30.map(d => {
      const dk = dateKey(d);
      const scheduled = habitsOnDate(d);
      const completed = scheduled.filter(h => {
        const log = allLogs.find(l => l.habitId === h.id && l.date === dk);
        return log?.status === 'completed';
      }).length;
      return { date: dk, count: completed, total: scheduled.length };
    });

    // Weekly average completion rate
    const lastWeekData = dailyCompletions.slice(-7);
    const weeklyAvgRate = lastWeekData.length > 0
      ? Math.round(
          lastWeekData.reduce((sum, d) => sum + (d.total > 0 ? (d.count / d.total) * 100 : 0), 0)
          / lastWeekData.filter(d => d.total > 0).length || 0
        )
      : 0;

    // Streak per habit
    const streakByHabit: Record<string, { current: number; longest: number }> = {};
    for (const habit of allHabits) {
      let current = 0;
      let longest = 0;
      let streak = 0;
      // Walk backwards from today
      for (let i = 0; i < 90; i++) {
        const d = subDays(today, i);
        if (!isHabitScheduledForDate(habit, d)) continue;
        const dk = dateKey(d);
        const log = allLogs.find(l => l.habitId === habit.id && l.date === dk);
        if (log?.status === 'completed') {
          streak++;
          if (i === 0 || current > 0) current = streak; // ongoing streak
          longest = Math.max(longest, streak);
        } else {
          if (i === 0) current = 0; // broke today
          streak = 0;
        }
      }
      streakByHabit[habit.id] = { current, longest };
    }

    // Heatmap: last 84 days (12 weeks)
    const last84 = eachDayOfInterval({ start: subDays(today, 83), end: today });
    const heatmapData = last84.map(d => {
      const dk = dateKey(d);
      const scheduled = habitsOnDate(d);
      if (scheduled.length === 0) return { date: dk, level: 0 };
      const completed = scheduled.filter(h => {
        const log = allLogs.find(l => l.habitId === h.id && l.date === dk);
        return log?.status === 'completed';
      }).length;
      const ratio = completed / scheduled.length;
      const level = ratio === 0 ? 0 : ratio < 0.25 ? 1 : ratio < 0.5 ? 2 : ratio < 0.75 ? 3 : 4;
      return { date: dk, level };
    });

    return {
      completionRateToday,
      weeklyAvgRate,
      streakByHabit,
      dailyCompletions,
      heatmapData,
      todaySummary: {
        total: todayHabits.length,
        completed: todayCompleted,
        missed: todayHabits.length - todayCompleted,
      },
    };
  }, [allHabits, allLogs]);

  return {
    habits: scheduledHabits,
    allHabits: allHabits ?? [],
    logsForDate,
    loading: habitsLoading || logsLoading,
    analytics,
    toggleHabit,
    addHabit,
    editHabit,
    deleteHabit,
    moveHabit,
  };
}
