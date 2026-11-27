'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useUser, useFirestore, useDoc, useCollection } from '@/firebase';
import {
  doc,
  serverTimestamp,
  updateDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  runTransaction,
} from 'firebase/firestore';
import { TimerState, Session, User, Subject, StudySegment } from '@/lib/definitions';
import {
  computePeriodicStats,
  computeRunningTimerTodaySeconds,
  computeStudyStatistics,
  parseIsoMs,
  startOfNextLocalDayMs,
} from '@/lib/study-time';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export type TimerFaceId = 'digital' | 'ring' | 'analog' | 'radial' | 'retro';

interface TimerContextType {
  displayTime: number;
  selectedSubjectId: string | null;
  selectedSubjectName: string | null;
  selectedSubjectColor: string | null;
  mode: 'pomodoro' | 'stopwatch';
  customDuration: number;
  isActive: boolean;
  isPaused: boolean;
  isIdle: boolean;
  timerStateLoading: boolean;
  activeFace: TimerFaceId;
  start: () => Promise<void>;
  pause: () => Promise<void>;
  stop: (finalStatus: 'stopped' | 'completed') => Promise<void>;
  reset: () => void;
  handleModeChange: (newMode: 'pomodoro' | 'stopwatch') => void;
  handleSubjectChange: (subjectId: string) => void;
  handleDurationChange: (newDuration: number) => void;
  handleFaceChange: (face: TimerFaceId) => void;
  setSelectedSubjectId: (id: string | null) => void;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

function generateSessionToken(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  }
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [displayTime, setDisplayTime] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingStop = useRef(false);

  const timerStateDoc = useMemo(
    () => (user && firestore ? doc(firestore, 'timerStates', user.uid) : null),
    [user, firestore]
  );
  const timerStateRef = useRef(timerStateDoc);
  timerStateRef.current = timerStateDoc;

  const { data: timerState, loading: timerStateLoading } = useDoc<TimerState>(timerStateDoc);
  const userRef = useMemo(() => (user && firestore ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
  const { data: userData } = useDoc<User>(userRef);

  const subjectsQuery = useMemo(
    () => (user && firestore ? query(collection(firestore, 'subjects'), where('userId', '==', user.uid)) : null),
    [user, firestore]
  );
  const { data: userSubjects } = useCollection<Subject>(subjectsQuery);

  const [customDuration, setCustomDuration] = useState(25);
  const [mode, setMode] = useState<'pomodoro' | 'stopwatch'>('pomodoro');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [activeFace, setActiveFace] = useState<TimerFaceId>('digital');
  const todayAccumulatedSecondsRef = useRef<number>(0);
  const todaySubjectAccumulatedSecondsRef = useRef<number>(0);

  const syncPeriodicStats = useCallback(
    async (subjectOverride?: string | null) => {
      if (!firestore || !user) return null;
      try {
        const snap = await getDocs(query(collection(firestore, 'sessions'), where('userId', '==', user.uid)));
        const sessions: Session[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Session, 'id'>) }));
        const nowMs = Date.now();
        const subId = subjectOverride !== undefined ? subjectOverride : selectedSubjectId;
        const stats = computePeriodicStats(sessions, subId, nowMs);
        const full = computeStudyStatistics(sessions, userSubjects ?? [], userData?.settings?.studyTargetHours ?? 2, nowMs);

        todayAccumulatedSecondsRef.current = stats.today.seconds;
        todaySubjectAccumulatedSecondsRef.current = stats.currentSubjectTodaySeconds;

        await setDoc(
          doc(firestore, 'users', user.uid),
          {
            todaySeconds: stats.today.seconds,
            todaySessions: stats.today.sessions,
            weeklySeconds: stats.weekly.seconds,
            weeklySessions: stats.weekly.sessions,
            monthlySeconds: stats.monthly.seconds,
            monthlySessions: stats.monthly.sessions,
            allTimeSeconds: stats.allTime.seconds,
            allTimeSessions: stats.allTime.sessions,
            currentSubjectTodaySeconds: stats.currentSubjectTodaySeconds,
            todaySubjectBreakdown: stats.todaySubjectBreakdown,
            todayStatsDate: stats.periodKeys.todayDateKey,
            weeklyStatsKey: stats.periodKeys.weekKey,
            monthlyStatsKey: stats.periodKeys.monthKey,
            streak: full.core.currentStreak,
            lastStreakUpdate: full.core.bestDay && full.core.currentStreak > 0
              ? stats.today.seconds >= (userData?.settings?.studyTargetHours ?? 2) * 3600
                ? stats.periodKeys.todayDateKey
                : userData?.lastStreakUpdate || stats.periodKeys.yesterdayDateKey
              : userData?.lastStreakUpdate || '',
          },
          { merge: true }
        ).catch(() => {});

        return stats;
      } catch (e) {
        console.error('Error syncing periodic stats:', e);
        return null;
      }
    },
    [firestore, user, selectedSubjectId, userSubjects, userData?.settings?.studyTargetHours, userData?.lastStreakUpdate]
  );

  useEffect(() => {
    if (user && firestore) {
      syncPeriodicStats();
    }
  }, [user, firestore, syncPeriodicStats]);

  // Automatic local midnight rollover so daily/weekly/monthly counters & caps reset cleanly at 00:00
  useEffect(() => {
    if (!user || !firestore) return;
    let timeoutId: NodeJS.Timeout | null = null;
    const scheduleRollover = () => {
      const nowMs = Date.now();
      const delayMs = Math.min(startOfNextLocalDayMs(nowMs) - nowMs + 1200, 2_147_483_000);
      timeoutId = setTimeout(async () => {
        await syncPeriodicStats();
        scheduleRollover();
      }, delayMs);
    };
    scheduleRollover();
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [user, firestore, syncPeriodicStats]);

  useEffect(() => {
    const savedFace = localStorage.getItem('timerFace') as TimerFaceId;
    if (savedFace) setActiveFace(savedFace);
  }, []);

  const handleFaceChange = (face: TimerFaceId) => {
    setActiveFace(face);
    localStorage.setItem('timerFace', face);
  };

  const isActive = timerState?.status === 'running';
  const isPaused = timerState?.status === 'paused';
  const isIdle = !timerState || timerState.status === 'stopped';

  const selectedSubject = useMemo(
    () => userSubjects?.find((s) => s.id === selectedSubjectId) ?? null,
    [userSubjects, selectedSubjectId]
  );

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (isActive) {
      const total = Math.max(0, Math.floor(displayTime));
      const mins = String(Math.floor(total / 60)).padStart(2, '0');
      const secs = String(total % 60).padStart(2, '0');
      const label = selectedSubject?.name || 'Focus';
      document.title = `${mins}:${secs} · ${label} — fenrirstudy`;
    } else {
      document.title = 'fenrirstudy';
    }
  }, [isActive, displayTime, selectedSubject?.name]);

  useEffect(() => {
    if (userData?.settings?.pomodoroDuration && isIdle) {
      setCustomDuration(userData.settings.pomodoroDuration);
    }
  }, [userData?.settings?.pomodoroDuration, isIdle]);

  useEffect(() => {
    if (timerState) {
      setMode(timerState.mode);
      if (timerState.subjectId) setSelectedSubjectId(timerState.subjectId);
      if (timerState.mode === 'pomodoro' && timerState.initialDuration > 0 && timerState.status !== 'stopped') {
        setCustomDuration(Math.max(1, Math.round(timerState.initialDuration / 60)));
      }
    } else if (isIdle) {
      setDisplayTime(mode === 'pomodoro' ? customDuration * 60 : 0);
    }
  }, [timerState, mode, customDuration, isIdle]);

  const stopRef = useRef<(finalStatus: 'stopped' | 'completed') => Promise<void>>(async () => {});

  const calculateDisplayTime = useCallback(() => {
    if (!timerState) {
      setDisplayTime(mode === 'pomodoro' ? customDuration * 60 : 0);
      return;
    }

    const nowMs = Date.now();
    if (timerState.status === 'stopped') {
      setDisplayTime(timerState.mode === 'pomodoro' ? timerState.initialDuration : 0);
      return;
    }
    if (timerState.status === 'paused') {
      const remaining = Math.max(0, timerState.initialDuration - timerState.accumulatedTime);
      setDisplayTime(timerState.mode === 'pomodoro' ? remaining : timerState.accumulatedTime);
      return;
    }
    if (timerState.status === 'running') {
      const startedAtMillis = parseIsoMs(timerState.startedAt) || timerState.clientStartedAtMs || 0;
      if (startedAtMillis === 0) return;
      const elapsedSinceStart = Math.max(0, (nowMs - startedAtMillis) / 1000);
      const totalElapsedTime = timerState.accumulatedTime + elapsedSinceStart;

      const todayDelta = computeRunningTimerTodaySeconds(
        {
          status: timerState.status,
          startedAtMs: startedAtMillis,
          currentSegmentStartMs: parseIsoMs(timerState.currentSegmentStart) || startedAtMillis,
          sessionStartTimeMs: parseIsoMs(timerState.sessionStartTime),
          accumulatedTimeSec: timerState.accumulatedTime,
          completedSegments: timerState.completedSegments,
        },
        nowMs
      );

      const remainingSubjectToday = Math.max(0, 21600 - todaySubjectAccumulatedSecondsRef.current);
      const remainingDailyToday = Math.max(0, 79200 - todayAccumulatedSecondsRef.current);
      const effectiveTodayLimit = Math.min(remainingSubjectToday, remainingDailyToday);

      if (todayDelta >= effectiveTodayLimit && effectiveTodayLimit > 0 && !isProcessingStop.current) {
        stopRef.current('completed');
        return;
      }

      if (timerState.mode === 'pomodoro') {
        const remaining = Math.max(0, timerState.initialDuration - totalElapsedTime);
        const nextSec = remaining <= 0 ? 0 : Math.ceil(remaining);
        setDisplayTime((prev) => (prev === nextSec ? prev : nextSec));
        if (remaining <= 0 && !isProcessingStop.current) {
          stopRef.current('completed');
        }
      } else {
        const nextSec = Math.floor(Math.max(0, totalElapsedTime));
        setDisplayTime((prev) => (prev === nextSec ? prev : nextSec));
      }
    }
  }, [timerState, mode, customDuration]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timerState?.status === 'running') {
      calculateDisplayTime();
      intervalRef.current = setInterval(calculateDisplayTime, 200);
    } else {
      calculateDisplayTime();
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timerState, calculateDisplayTime]);

  const start = async () => {
    if (!firestore || !user || !timerStateRef.current) {
      toast({
        title: 'Not Logged In',
        description: 'Log in to start tracking.',
        action: <Button onClick={() => router.push('/login')}>Login</Button>,
      });
      return;
    }
    if (!selectedSubjectId) {
      toast({ title: 'No Subject Selected', description: 'Please select a subject.', variant: 'destructive' });
      return;
    }

    await syncPeriodicStats(selectedSubjectId);
    const nowMs = Date.now();
    const fallbackSessionId = generateSessionToken();
    const docRef = timerStateRef.current;

    try {
      await runTransaction(firestore, async (tx) => {
        const snap = await tx.get(docRef);
        const cur = snap.exists() ? (snap.data() as TimerState) : null;
        if (cur?.status === 'running') return;

        const isResuming = cur?.status === 'paused';
        const accumulatedTime = isResuming ? (cur.accumulatedTime || 0) : 0;
        const initialDuration = isResuming
          ? (cur.initialDuration || (mode === 'pomodoro' ? customDuration * 60 : 0))
          : (mode === 'pomodoro' ? customDuration * 60 : 0);
        const activeSessionId = (isResuming && cur.activeSessionId) ? cur.activeSessionId : fallbackSessionId;
        const completedSegments: StudySegment[] = isResuming && Array.isArray(cur.completedSegments)
          ? cur.completedSegments
          : [];
        const pauseCount = isResuming ? (cur.pauseCount || 0) : 0;

        tx.set(
          docRef,
          {
            userId: user.uid,
            status: 'running',
            mode,
            initialDuration,
            accumulatedTime,
            startedAt: serverTimestamp(),
            currentSegmentStart: serverTimestamp(),
            clientStartedAtMs: nowMs,
            sessionStartTime: isResuming && cur?.sessionStartTime ? cur.sessionStartTime : serverTimestamp(),
            subjectId: selectedSubjectId,
            activeSessionId,
            pauseCount,
            completedSegments,
          },
          { merge: true }
        );
      });
    } catch (err) {
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: docRef.path,
          operation: 'update',
          requestResourceData: { status: 'running', subjectId: selectedSubjectId },
        })
      );
    }
  };

  const pause = async () => {
    if (!firestore || !timerStateRef.current) return;
    const docRef = timerStateRef.current;
    const nowMs = Date.now();

    try {
      await runTransaction(firestore, async (tx) => {
        const snap = await tx.get(docRef);
        if (!snap.exists()) return;
        const cur = snap.data() as TimerState;
        if (cur.status !== 'running') return;

        const startedAtMs = parseIsoMs(cur.startedAt) || cur.clientStartedAtMs || 0;
        if (startedAtMs <= 0) return;

        const segStartMs = parseIsoMs(cur.currentSegmentStart) || startedAtMs;
        const elapsedSinceStart = Math.max(0, (nowMs - startedAtMs) / 1000);
        const existingSegs = Array.isArray(cur.completedSegments) ? cur.completedSegments : [];
        const nextSegs: StudySegment[] = nowMs > segStartMs
          ? [...existingSegs, { startTime: new Date(segStartMs).toISOString(), endTime: new Date(nowMs).toISOString() }]
          : existingSegs;

        tx.set(
          docRef,
          {
            status: 'paused',
            accumulatedTime: (cur.accumulatedTime || 0) + elapsedSinceStart,
            startedAt: null,
            currentSegmentStart: null,
            clientStartedAtMs: null,
            pauseCount: (cur.pauseCount || 0) + 1,
            completedSegments: nextSegs,
          },
          { merge: true }
        );
      });
    } catch (err) {
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({ path: docRef.path, operation: 'update', requestResourceData: { status: 'paused' } })
      );
    }
  };

  const stop = useCallback(
    async (finalStatus: 'stopped' | 'completed') => {
      if (!firestore || !user || !timerStateRef.current) return;
      if (isProcessingStop.current) return;
      isProcessingStop.current = true;
      if (intervalRef.current) clearInterval(intervalRef.current);

      const docRef = timerStateRef.current;
      const nowMs = Date.now();

      try {
        const claimed = await runTransaction(firestore, async (tx) => {
          const snap = await tx.get(docRef);
          if (!snap.exists()) return null;
          const cur = snap.data() as TimerState;
          if (cur.status === 'stopped') return null;

          let totalElapsed = cur.accumulatedTime || 0;
          const segs: StudySegment[] = Array.isArray(cur.completedSegments) ? [...cur.completedSegments] : [];

          if (cur.status === 'running') {
            const startedAtMs = parseIsoMs(cur.startedAt) || cur.clientStartedAtMs || 0;
            const segStartMs = parseIsoMs(cur.currentSegmentStart) || startedAtMs;
            if (startedAtMs > 0 && nowMs > startedAtMs) {
              totalElapsed += (nowMs - startedAtMs) / 1000;
            }
            if (segStartMs > 0 && nowMs > segStartMs) {
              segs.push({
                startTime: new Date(segStartMs).toISOString(),
                endTime: new Date(nowMs).toISOString(),
              });
            }
          }

          const resolvedMode = cur.mode || mode;
          tx.set(
            docRef,
            {
              status: 'stopped',
              accumulatedTime: 0,
              startedAt: null,
              currentSegmentStart: null,
              clientStartedAtMs: null,
              activeSessionId: null,
              pauseCount: 0,
              completedSegments: [],
              initialDuration: resolvedMode === 'pomodoro' ? customDuration * 60 : 0,
            },
            { merge: true }
          );

          return {
            sessionId: cur.activeSessionId || generateSessionToken(),
            subjectId: cur.subjectId,
            mode: resolvedMode,
            sessionStartMs: parseIsoMs(cur.sessionStartTime) || (segs[0] ? parseIsoMs(segs[0].startTime) : nowMs),
            totalElapsed,
            pauseCount: cur.pauseCount || 0,
            segments: segs,
          };
        });

        if (!claimed) return;

        let finalDurationSeconds = Math.round(claimed.totalElapsed);
        const snap = await getDocs(query(collection(firestore, 'sessions'), where('userId', '==', user.uid)));
        const existingSessions: Session[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Session, 'id'>) }));
        const statsBeforeSave = computePeriodicStats(existingSessions, claimed.subjectId, nowMs);

        // Enforce 6h/subject and 22h/day caps against today's accrued study
        const todaySliceRatio = claimed.segments.length > 0
          ? Math.max(
              0,
              Math.min(
                1,
                computeRunningTimerTodaySeconds(
                  {
                    status: 'paused',
                    startedAtMs: 0,
                    sessionStartTimeMs: claimed.sessionStartMs,
                    accumulatedTimeSec: finalDurationSeconds,
                    completedSegments: claimed.segments,
                  },
                  nowMs
                ) / Math.max(1, finalDurationSeconds)
              )
            )
          : 1;

        if (todaySliceRatio > 0) {
          const remainingSub = Math.max(0, 21600 - statsBeforeSave.currentSubjectTodaySeconds);
          const remainingDay = Math.max(0, 79200 - statsBeforeSave.today.seconds);
          const maxTodaySeconds = Math.min(remainingSub, remainingDay);
          const cappedTotal = Math.round(maxTodaySeconds / todaySliceRatio);
          if (finalDurationSeconds > cappedTotal) {
            finalDurationSeconds = cappedTotal;
          }
        }

        if (finalDurationSeconds > 5 && claimed.sessionStartMs > 0) {
          const endMs = claimed.segments.length > 0
            ? parseIsoMs(claimed.segments[claimed.segments.length - 1].endTime) || nowMs
            : claimed.sessionStartMs + finalDurationSeconds * 1000;
          const startMs = claimed.segments.length > 0
            ? parseIsoMs(claimed.segments[0].startTime) || claimed.sessionStartMs
            : claimed.sessionStartMs;

          const deterministicDocId = `${user.uid}_${claimed.sessionId}`;
          const sessionPayload = {
            userId: user.uid,
            subjectId: claimed.subjectId,
            mode: claimed.mode,
            startTime: new Date(startMs).toISOString(),
            endTime: new Date(endMs).toISOString(),
            duration: finalDurationSeconds,
            pauseCount: claimed.pauseCount,
            status: finalStatus,
            focusScore: 100,
            segments: claimed.segments,
            clientSessionId: claimed.sessionId,
          };

          await setDoc(doc(firestore, 'sessions', deterministicDocId), sessionPayload);
          const updated = await syncPeriodicStats(claimed.subjectId);
          const targetHours = userData?.settings?.studyTargetHours || 2;
          if (updated && updated.today.seconds >= targetHours * 3600) {
            toast({
              title: 'Session Saved & Goal Reached',
              description: `Logged ${Math.round(finalDurationSeconds / 60)}m focus time.`,
            });
          } else {
            toast({
              title: 'Session Saved',
              description: `You studied for ${Math.round(finalDurationSeconds / 60)} minutes.`,
            });
          }
        }
      } catch (err: any) {
        console.error('Stop session error:', err);
        errorEmitter.emit(
          'permission-error',
          new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: { status: 'stopped' },
          })
        );
      } finally {
        isProcessingStop.current = false;
      }
    },
    [firestore, user, mode, customDuration, syncPeriodicStats, toast, userData?.settings?.studyTargetHours]
  );

  stopRef.current = stop;

  const reset = () => {
    if (!timerStateRef.current) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    const resetState = {
      status: 'stopped',
      accumulatedTime: 0,
      startedAt: null,
      currentSegmentStart: null,
      clientStartedAtMs: null,
      activeSessionId: null,
      pauseCount: 0,
      completedSegments: [],
      initialDuration: mode === 'pomodoro' ? customDuration * 60 : 0,
    };
    if (timerState) setDoc(timerStateRef.current, resetState, { merge: true });
  };

  const handleModeChange = (newMode: 'pomodoro' | 'stopwatch') => {
    if (isIdle) {
      setMode(newMode);
      if (timerStateRef.current && timerState) setDoc(timerStateRef.current, { mode: newMode }, { merge: true });
    }
  };

  const handleSubjectChange = (subjectId: string) => {
    if (isIdle) {
      setSelectedSubjectId(subjectId);
      if (timerStateRef.current && timerState) setDoc(timerStateRef.current, { subjectId }, { merge: true });
    }
  };

  const handleDurationChange = (newDuration: number) => {
    if (isIdle && newDuration > 0 && newDuration <= 180) {
      setCustomDuration(newDuration);
      if (timerStateRef.current && timerState) {
        setDoc(timerStateRef.current, { initialDuration: newDuration * 60 }, { merge: true });
      }
    }
  };

  const value = {
    displayTime,
    selectedSubjectId,
    selectedSubjectName: selectedSubject?.name ?? null,
    selectedSubjectColor: selectedSubject?.color ?? null,
    mode,
    customDuration,
    isActive,
    isPaused,
    isIdle,
    timerStateLoading,
    activeFace,
    start,
    pause,
    stop,
    reset,
    handleModeChange,
    handleSubjectChange,
    handleDurationChange,
    handleFaceChange,
    setSelectedSubjectId,
  };

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
}

export function useTimer() {
  const context = useContext(TimerContext);
  if (context === undefined) {
    return {} as TimerContextType;
  }
  return context;
}
