'use client';

import { useEffect, useRef, useMemo } from 'react';
import { doc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { useTimer } from '@/hooks/use-timer';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { Subject, User } from '@/lib/definitions';

/**
 * useRoomPresence — runs on the room page.
 *
 * Every 2 seconds (and immediately on mount or timer change) it reads
 * the current user's live timer state from TimerContext and writes it
 * to rooms/{roomId}/members/{userId} in Firestore.
 *
 * This is what makes other members' cards update in real time.
 */
export function useRoomPresence(roomId: string, subjects: Subject[]) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { mode, isActive, isPaused, isIdle, selectedSubjectId } = useTimer();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const userDocRef = useMemo(() => (user && firestore ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
  const { data: userData } = useDoc<User>(userDocRef);
  const userDataRef = useRef<User | null>(null);
  userDataRef.current = userData;

  // Raw timerState from Firestore (needed for startedAt / accumulatedTime / initialDuration)
  // We subscribe via onSnapshot so we always have the freshest server-timestamp data.
  const timerStateRef = useRef<any>(null);
  const subjectsRef = useRef<Subject[]>(subjects);
  subjectsRef.current = subjects;

  // Subscribe to timerStates/{userId} to get server-timestamp fields
  useEffect(() => {
    if (!user || !firestore) return;
    const tsDoc = doc(firestore, 'timerStates', user.uid);
    const unsub = onSnapshot(tsDoc, snap => {
      timerStateRef.current = snap.exists() ? snap.data() : null;
    });
    return () => unsub();
  }, [user, firestore]);

  // Write presence on mount and whenever key timer state changes
  useEffect(() => {
    if (!user || !firestore || !roomId) return;

    const memberRef = doc(firestore, 'rooms', roomId, 'members', user.uid);

    const writePresence = async () => {
      const ts = timerStateRef.current;
      const currentSubjects = subjectsRef.current;
      const currentUserData = userDataRef.current;

      // Look up current subject name + color from subjects array
      const subject = currentSubjects.find(s => s.id === selectedSubjectId) ?? null;

      const timerStatus = isActive ? 'running' : isPaused ? 'paused' : 'stopped';

      // Compute startedAt from the Firestore timerState (it uses server timestamps)
      let startedAt: string | null = null;
      if (ts?.startedAt) {
        if (typeof ts.startedAt.toDate === 'function') {
          startedAt = ts.startedAt.toDate().toISOString();
        } else if (ts.startedAt.seconds != null) {
          startedAt = new Date(ts.startedAt.seconds * 1000).toISOString();
        }
      }

      // Map todaySubjectBreakdown
      const mappedBreakdown = [];
      if (currentUserData?.todaySubjectBreakdown) {
          for (const [subjId, secs] of Object.entries(currentUserData.todaySubjectBreakdown)) {
              const s = currentSubjects.find(sub => sub.id === subjId);
              if (s && secs > 0) {
                  mappedBreakdown.push({
                      id: subjId,
                      name: s.name,
                      color: s.color,
                      seconds: secs
                  });
              }
          }
          // Sort by seconds descending
          mappedBreakdown.sort((a, b) => b.seconds - a.seconds);
      }

      const update = {
        lastSeen: new Date().toISOString(),
        timerStatus,
        timerMode: mode ?? 'pomodoro',
        subjectId: selectedSubjectId ?? null,
        subjectName: subject?.name ?? null,
        subjectColor: subject?.color ?? null,
        startedAt,
        accumulatedTime: ts?.accumulatedTime ?? 0,
        initialDuration: ts?.initialDuration ?? 1500,
        finishedAt: null,
        todaySessions: currentUserData?.todaySessions ?? 0,
        todaySeconds: currentUserData?.todaySeconds ?? 0,
        weeklySessions: currentUserData?.weeklySessions ?? 0,
        weeklySeconds: currentUserData?.weeklySeconds ?? 0,
        monthlySessions: currentUserData?.monthlySessions ?? 0,
        monthlySeconds: currentUserData?.monthlySeconds ?? 0,
        allTimeSessions: currentUserData?.allTimeSessions ?? 0,
        allTimeSeconds: currentUserData?.allTimeSeconds ?? 0,
        currentSubjectTodaySeconds: currentUserData?.currentSubjectTodaySeconds ?? 0,
        todaySubjectBreakdown: mappedBreakdown,
      };

      try {
        await updateDoc(memberRef, update);
      } catch {
        // Silently ignore — user may have left the room
      }
    };

    // Write immediately on mount and whenever timer state changes
    writePresence();

    // Then write every 2 seconds to keep lastSeen fresh and time display smooth
    intervalRef.current = setInterval(writePresence, 2000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      // On unmount: mark as stopped + update lastSeen
      updateDoc(memberRef, {
        timerStatus: 'stopped',
        lastSeen: new Date().toISOString(),
      }).catch(() => {});
    };
  }, [
    user,
    firestore,
    roomId,
    isActive,
    isPaused,
    isIdle,
    selectedSubjectId,
    mode,
  ]);
  // Note: subjects is intentionally excluded from deps — we use subjectsRef instead
  // to avoid restarting the interval on every subjects change.
}

/**
 * useFinishBroadcast — detects when the current user's timer completes
 * and writes finishedAt to their member doc so other clients can fire
 * the finish effect.
 */
export function useFinishBroadcast(roomId: string) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { isActive, isIdle } = useTimer();
  const prevIsActive = useRef(false);

  useEffect(() => {
    if (!user || !firestore || !roomId) return;

    // Timer just completed: was active, now idle (not paused, not running)
    if (prevIsActive.current && isIdle) {
      const memberRef = doc(firestore, 'rooms', roomId, 'members', user.uid);
      updateDoc(memberRef, { finishedAt: new Date().toISOString() }).catch(() => {});

      // Clear finishedAt after 4 seconds so it doesn't re-trigger
      const t = setTimeout(() => {
        updateDoc(memberRef, { finishedAt: null }).catch(() => {});
      }, 4000);
      return () => clearTimeout(t);
    }

    prevIsActive.current = isActive;
  }, [isIdle, isActive, user, firestore, roomId]);
}
