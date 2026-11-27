'use client';

import { useEffect, useMemo, useRef, useCallback } from 'react';
import { collection, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { useFirestore, useUser, useDoc, useCollection } from '@/firebase';
import { useMyRooms, checkAndUpdateCollectiveStreak } from '@/hooks/use-room';
import { Subject, TimerState, User } from '@/lib/definitions';
import { getPeriodKeys, parseIsoMs } from '@/lib/study-time';

/**
 * Syncs live timer state, status, and fresh periodic totals across ALL joined rooms
 * regardless of which page the user currently has open.
 */
export function useGlobalRoomPresence() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { rooms } = useMyRooms();

  const userDocRef = useMemo(
    () => (user && firestore ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: userData } = useDoc<User>(userDocRef);

  const subjectsQuery = useMemo(
    () => (user && firestore ? query(collection(firestore, 'subjects'), where('userId', '==', user.uid)) : null),
    [user, firestore]
  );
  const { data: subjects } = useCollection<Subject>(subjectsQuery);

  const timerStateRef = useRef<TimerState | null>(null);
  const prevTimerStatusRef = useRef<string>('stopped');
  const roomsRef = useRef(rooms);
  roomsRef.current = rooms;
  const userDataRef = useRef(userData);
  userDataRef.current = userData;
  const subjectsRef = useRef(subjects ?? []);
  subjectsRef.current = subjects ?? [];

  const buildPayload = useCallback((explicitStatus?: 'studying' | 'idle' | 'offline', finishedIso?: string | null) => {
    const ts = timerStateRef.current;
    const uData = userDataRef.current;
    const subs = subjectsRef.current;
    const nowMs = Date.now();
    const keys = getPeriodKeys(nowMs);

    const timerStatus = ts?.status === 'running' ? 'running' : ts?.status === 'paused' ? 'paused' : 'stopped';
    const subjectId = ts?.subjectId || null;
    const subject = subs.find((s) => s.id === subjectId) ?? null;

    const startedAtMs = ts?.status === 'running' ? (parseIsoMs(ts.startedAt) || ts.clientStartedAtMs || nowMs) : 0;
    const startedAtIso = startedAtMs > 0 ? new Date(startedAtMs).toISOString() : null;

    const mappedBreakdown: { id: string; name: string; color: string; seconds: number }[] = [];
    const breakdownFresh = !uData?.todayStatsDate || uData.todayStatsDate === keys.todayDateKey;
    if (breakdownFresh && uData?.todaySubjectBreakdown) {
      for (const [subId, secs] of Object.entries(uData.todaySubjectBreakdown)) {
        const subObj = subs.find((s) => s.id === subId);
        if (subObj && secs > 0) {
          mappedBreakdown.push({
            id: subId,
            name: subObj.name,
            color: subObj.color,
            seconds: secs,
          });
        }
      }
      mappedBreakdown.sort((a, b) => b.seconds - a.seconds);
    }

    const memberStatus = explicitStatus
      ?? (timerStatus === 'running' ? 'studying' : timerStatus === 'paused' ? 'break' : 'idle');

    const todayFresh = !uData?.todayStatsDate || uData.todayStatsDate === keys.todayDateKey;
    const weekFresh = !uData?.weeklyStatsKey || uData.weeklyStatsKey === keys.weekKey;
    const monthFresh = !uData?.monthlyStatsKey || uData.monthlyStatsKey === keys.monthKey;

    const update: Record<string, any> = {
      status: memberStatus,
      lastSeen: new Date(nowMs).toISOString(),
      timerStatus,
      timerMode: ts?.mode ?? 'pomodoro',
      subjectId,
      subjectName: subject?.name ?? null,
      subjectColor: subject?.color ?? null,
      startedAt: startedAtIso,
      clientStartedAtMs: startedAtMs || null,
      accumulatedTime: ts?.accumulatedTime ?? 0,
      initialDuration: ts?.initialDuration ?? 1500,
      todaySessions: todayFresh ? (uData?.todaySessions ?? 0) : 0,
      todaySeconds: todayFresh ? (uData?.todaySeconds ?? 0) : 0,
      weeklySessions: weekFresh ? (uData?.weeklySessions ?? 0) : 0,
      weeklySeconds: weekFresh ? (uData?.weeklySeconds ?? 0) : 0,
      monthlySessions: monthFresh ? (uData?.monthlySessions ?? 0) : 0,
      monthlySeconds: monthFresh ? (uData?.monthlySeconds ?? 0) : 0,
      allTimeSessions: uData?.allTimeSessions ?? 0,
      allTimeSeconds: uData?.allTimeSeconds ?? 0,
      currentSubjectTodaySeconds: todayFresh ? (uData?.currentSubjectTodaySeconds ?? 0) : 0,
      todaySubjectBreakdown: mappedBreakdown,
      todayStatsDate: keys.todayDateKey,
      weeklyStatsKey: keys.weekKey,
      monthlyStatsKey: keys.monthKey,
    };

    if (finishedIso !== undefined) {
      update.finishedAt = finishedIso;
    }
    return update;
  }, []);

  const broadcastNow = useCallback(
    async (explicitStatus?: 'studying' | 'idle' | 'offline', finishedIso?: string | null) => {
      if (!firestore || !user || roomsRef.current.length === 0) return;
      const payload = buildPayload(explicitStatus, finishedIso);
      await Promise.all(
        roomsRef.current.map((room) =>
          updateDoc(doc(firestore, 'rooms', room.id, 'members', user.uid), payload).catch(() => {})
        )
      );
    },
    [firestore, user, buildPayload]
  );

  // Instant push whenever timerStates/{uid} changes (start / pause / resume / stop / subject)
  useEffect(() => {
    if (!user || !firestore) return;
    const tsDoc = doc(firestore, 'timerStates', user.uid);
    const unsub = onSnapshot(tsDoc, (snap) => {
      const next = snap.exists() ? (snap.data() as TimerState) : null;
      const prevStatus = prevTimerStatusRef.current;
      const nextStatus = next?.status ?? 'stopped';
      timerStateRef.current = next;
      prevTimerStatusRef.current = nextStatus;

      const justFinished = prevStatus === 'running' && nextStatus === 'stopped';
      const finishIso = justFinished ? new Date().toISOString() : null;
      broadcastNow(undefined, finishIso);

      if (justFinished && roomsRef.current.length > 0) {
        roomsRef.current.forEach((r) => {
          checkAndUpdateCollectiveStreak(firestore, r.id).catch(() => {});
        });
        setTimeout(() => {
          broadcastNow(undefined, null);
        }, 4000);
      }
    });
    return () => unsub();
  }, [user, firestore, broadcastNow]);

  // Push updated stats whenever userData periodic totals or rooms membership change
  useEffect(() => {
    if (!user || !firestore || rooms.length === 0) return;
    broadcastNow(undefined, null);
  }, [
    user,
    firestore,
    rooms.length,
    userData?.todaySeconds,
    userData?.todaySessions,
    userData?.todayStatsDate,
    broadcastNow,
  ]);

  // 25s heartbeat + visibility / reconnect / unload listeners (never marks offline on window blur!)
  useEffect(() => {
    if (!user || !firestore || rooms.length === 0) return;

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        broadcastNow();
      }
    };
    const handleOnline = () => {
      broadcastNow();
    };
    const handlePageHide = () => {
      const payload = buildPayload('offline');
      roomsRef.current.forEach((room) => {
        updateDoc(doc(firestore, 'rooms', room.id, 'members', user.uid), payload).catch(() => {});
      });
    };

    const intervalId = setInterval(() => {
      broadcastNow();
    }, 25_000);

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('online', handleOnline);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [user, firestore, rooms.length, broadcastNow, buildPayload]);
}
