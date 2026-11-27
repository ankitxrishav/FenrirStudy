'use client';

import { useCallback, useMemo } from 'react';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { useDoc, useFirestore, useUser } from '@/firebase';
import type { BreakLog, DayMetaRecord, DdayItem, StudyTodo, User } from '@/lib/definitions';
import { addLocalDaysMs, formatLocalDateKey, pickMainDday, startOfLocalDayMs } from '@/lib/study-time';

export const BREAK_TAGS = ['Meal', 'Rest', 'Walk', 'Nap', 'Recharge', 'Other'] as const;

export function useYptExtras() {
  const { user } = useUser();
  const firestore = useFirestore();

  const userRef = useMemo(
    () => (user && firestore ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: userData } = useDoc<User>(userRef);

  const ddays = userData?.ddays ?? [];
  const mainDdayId = userData?.mainDdayId ?? null;
  const mainDday = useMemo(() => pickMainDday(ddays, mainDdayId), [ddays, mainDdayId]);
  const studyTodos = userData?.studyTodos ?? [];
  const dayMeta = userData?.dayMeta ?? {};

  const addDday = useCallback(async (title: string, targetDate: string) => {
    if (!userRef || !title.trim() || !targetDate) return;
    const item: DdayItem = {
      id: `dday_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: title.trim(),
      targetDate,
    };
    const next = [...ddays, item];
    await updateDoc(userRef, {
      ddays: next,
      mainDdayId: mainDdayId || item.id,
    });
  }, [userRef, ddays, mainDdayId]);

  const pinMainDday = useCallback(async (ddayId: string) => {
    if (!userRef) return;
    await updateDoc(userRef, { mainDdayId: ddayId });
  }, [userRef]);

  const deleteDday = useCallback(async (ddayId: string) => {
    if (!userRef) return;
    const next = ddays.filter((d) => d.id !== ddayId);
    const nextMain = mainDdayId === ddayId ? (next[0]?.id ?? null) : mainDdayId;
    await updateDoc(userRef, { ddays: next, mainDdayId: nextMain });
  }, [userRef, ddays, mainDdayId]);

  const addTodo = useCallback(async (subjectId: string, text: string, dateKey: string, estimatedMinutes?: number) => {
    if (!userRef || !text.trim()) return;
    const nextTodo: StudyTodo = {
      id: `todo_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      subjectId: subjectId || 'general',
      text: text.trim(),
      dateKey,
      completed: false,
      ...(estimatedMinutes && estimatedMinutes > 0 ? { estimatedMinutes } : {}),
      createdAt: new Date().toISOString(),
    };
    await updateDoc(userRef, { studyTodos: [...studyTodos, nextTodo] });
  }, [userRef, studyTodos]);

  const toggleTodo = useCallback(async (todoId: string) => {
    if (!userRef) return;
    const next = studyTodos.map((t) =>
      t.id === todoId
        ? {
            ...t,
            completed: !t.completed,
            completedAt: !t.completed ? new Date().toISOString() : undefined,
          }
        : t
    );
    await updateDoc(userRef, { studyTodos: next });
  }, [userRef, studyTodos]);

  const deleteTodo = useCallback(async (todoId: string) => {
    if (!userRef) return;
    await updateDoc(userRef, { studyTodos: studyTodos.filter((t) => t.id !== todoId) });
  }, [userRef, studyTodos]);

  const moveUnfinishedToTomorrow = useCallback(async (fromDateKey: string) => {
    if (!userRef) return 0;
    const [y, m, d] = fromDateKey.split('-').map(Number);
    const tomorrowKey = formatLocalDateKey(addLocalDaysMs(startOfLocalDayMs(new Date(y, m - 1, d).getTime()), 1));
    let moved = 0;
    const next = studyTodos.map((t) => {
      if (t.dateKey === fromDateKey && !t.completed) {
        moved++;
        return { ...t, dateKey: tomorrowKey };
      }
      return t;
    });
    if (moved > 0) {
      await updateDoc(userRef, { studyTodos: next });
    }
    return moved;
  }, [userRef, studyTodos]);

  const toggleDayOff = useCallback(async (dateKey: string, isDayOff: boolean, reason = '') => {
    if (!userRef) return;
    const prev: DayMetaRecord = dayMeta[dateKey] ?? {};
    const updated: Record<string, DayMetaRecord> = {
      ...dayMeta,
      [dateKey]: { ...prev, isDayOff, dayOffReason: isDayOff ? reason.trim() : '' },
    };
    await updateDoc(userRef, { dayMeta: updated });
  }, [userRef, dayMeta]);

  const saveClosingDiary = useCallback(async (dateKey: string, rating: number, comment: string) => {
    if (!userRef) return;
    const prev: DayMetaRecord = dayMeta[dateKey] ?? {};
    const updated: Record<string, DayMetaRecord> = {
      ...dayMeta,
      [dateKey]: { ...prev, closingRating: rating, closingComment: comment.trim() },
    };
    await updateDoc(userRef, { dayMeta: updated });
  }, [userRef, dayMeta]);

  const addBreakLog = useCallback(async (dateKey: string, startHhMm: string, endHhMm: string, tag: string) => {
    if (!userRef) return false;
    const [y, m, d] = dateKey.split('-').map(Number);
    const [sh, sm] = startHhMm.split(':').map(Number);
    const [eh, em] = endHhMm.split(':').map(Number);
    if (!y || Number.isNaN(sh) || Number.isNaN(eh)) return false;
    const sDate = new Date(y, m - 1, d, sh, sm || 0, 0);
    const eDate = new Date(y, m - 1, d, eh, em || 0, 0);
    const diffSec = Math.round((eDate.getTime() - sDate.getTime()) / 1000);
    if (diffSec < 60 || diffSec > 3 * 3600) return false;

    const log: BreakLog = {
      id: `brk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      dateKey,
      startTime: sDate.toISOString(),
      endTime: eDate.toISOString(),
      durationSeconds: diffSec,
      tag: tag || 'Rest',
    };
    const prev: DayMetaRecord = dayMeta[dateKey] ?? {};
    const nextBreaks = [...(prev.breaks ?? []), log];
    await updateDoc(userRef, {
      dayMeta: {
        ...dayMeta,
        [dateKey]: { ...prev, breaks: nextBreaks },
      },
    });
    return true;
  }, [userRef, dayMeta]);

  const addManualSession = useCallback(async (
    subjectId: string,
    dateKey: string,
    startHhMm: string,
    endHhMm: string
  ) => {
    if (!user || !firestore || !subjectId) return false;
    const [y, m, d] = dateKey.split('-').map(Number);
    const [sh, sm] = startHhMm.split(':').map(Number);
    const [eh, em] = endHhMm.split(':').map(Number);
    if (!y || Number.isNaN(sh) || Number.isNaN(eh)) return false;
    const startDate = new Date(y, m - 1, d, sh, sm || 0, 0);
    const endDate = new Date(y, m - 1, d, eh, em || 0, 0);
    const durationSec = Math.round((endDate.getTime() - startDate.getTime()) / 1000);
    if (durationSec < 60 || durationSec > 9 * 3600) return false;

    const manualId = `man_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const docId = `${user.uid}_${manualId}`;
    await setDoc(doc(firestore, 'sessions', docId), {
      userId: user.uid,
      subjectId,
      mode: 'stopwatch',
      source: 'manual',
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      duration: durationSec,
      pauseCount: 0,
      status: 'completed',
      focusScore: 100,
      segments: [{ startTime: startDate.toISOString(), endTime: endDate.toISOString() }],
      clientSessionId: manualId,
    });
    return true;
  }, [user, firestore]);

  return {
    userData,
    ddays,
    mainDday,
    mainDdayId,
    studyTodos,
    dayMeta,
    addDday,
    pinMainDday,
    deleteDday,
    addTodo,
    toggleTodo,
    deleteTodo,
    moveUnfinishedToTomorrow,
    toggleDayOff,
    saveClosingDiary,
    addBreakLog,
    addManualSession,
  };
}
