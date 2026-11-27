'use client';

import { useEffect, useMemo } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { useTimer } from '@/hooks/use-timer';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { Subject, User } from '@/lib/definitions';
import { getPeriodKeys } from '@/lib/study-time';

/**
 * Lightweight immediate sync on room entry. Global state transitions & heartbeats
 * are managed continuously by useGlobalRoomPresence in AppShell so navigating
 * between /rooms/[roomId] and /timer never interrupts live peer clocks.
 */
export function useRoomPresence(roomId: string, subjects: Subject[]) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { mode, isActive, isPaused, selectedSubjectId } = useTimer();

  const userDocRef = useMemo(
    () => (user && firestore ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: userData } = useDoc<User>(userDocRef);

  useEffect(() => {
    if (!user || !firestore || !roomId) return;
    const memberRef = doc(firestore, 'rooms', roomId, 'members', user.uid);
    const keys = getPeriodKeys();
    const subject = subjects.find((s) => s.id === selectedSubjectId) ?? null;
    const timerStatus = isActive ? 'running' : isPaused ? 'paused' : 'stopped';
    const memberStatus = isActive ? 'studying' : isPaused ? 'break' : 'idle';

    updateDoc(memberRef, {
      status: memberStatus,
      lastSeen: new Date().toISOString(),
      timerStatus,
      timerMode: mode ?? 'pomodoro',
      subjectId: selectedSubjectId ?? null,
      subjectName: subject?.name ?? null,
      subjectColor: subject?.color ?? null,
      todayStatsDate: keys.todayDateKey,
      weeklyStatsKey: keys.weekKey,
      monthlyStatsKey: keys.monthKey,
      todaySessions: userData?.todayStatsDate === keys.todayDateKey || !userData?.todayStatsDate ? (userData?.todaySessions ?? 0) : 0,
      todaySeconds: userData?.todayStatsDate === keys.todayDateKey || !userData?.todayStatsDate ? (userData?.todaySeconds ?? 0) : 0,
    }).catch(() => {});
  }, [user, firestore, roomId, mode, isActive, isPaused, selectedSubjectId, subjects, userData?.todaySeconds, userData?.todaySessions, userData?.todayStatsDate]);
}

export function useFinishBroadcast(_roomId: string) {
  // Handled atomically in useGlobalRoomPresence across all joined rooms
}
