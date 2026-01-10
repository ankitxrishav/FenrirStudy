
"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { doc, serverTimestamp, updateDoc, setDoc, addDoc, collection, Timestamp } from 'firebase/firestore';
import { TimerState, Session } from '@/lib/definitions';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

// Helper to convert Firestore Timestamp to milliseconds safely
const toMillis = (timestamp: any): number => {
  if (timestamp instanceof Timestamp) {
    return timestamp.toMillis();
  }
  if (timestamp && typeof timestamp.seconds === 'number' && typeof timestamp.nanoseconds === 'number') {
    return timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000;
  }
  return 0;
};

export function useTimer() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [displayTime, setDisplayTime] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const timerStateRef = useRef(user && firestore ? doc(firestore, 'timerStates', user.uid) : null);

  useEffect(() => {
    timerStateRef.current = user && firestore ? doc(firestore, 'timerStates', user.uid) : null;
  }, [user, firestore]);

  const { data: timerState, loading: timerStateLoading } = useDoc<TimerState>(timerStateRef.current);

  const userRef = useMemo(() => (user && firestore ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
  const { data: userData } = useDoc<User>(userRef);

  const [customDuration, setCustomDuration] = useState(25);
  const [mode, setMode] = useState<'pomodoro' | 'stopwatch'>('pomodoro');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  const isActive = timerState?.status === 'running';
  const isPaused = timerState?.status === 'paused';
  const isIdle = !timerState || timerState.status === 'stopped';

  useEffect(() => {
    if (userData?.settings?.pomodoroDuration && isIdle) {
      setCustomDuration(userData.settings.pomodoroDuration);
    }
  }, [userData, isIdle]);

  useEffect(() => {
    if (timerState) {
      setMode(timerState.mode);
      setSelectedSubjectId(timerState.subjectId);
      if (timerState.mode === 'pomodoro' && timerState.initialDuration > 0) {
        setCustomDuration(timerState.initialDuration / 60);
      }
    } else if (isIdle) {
      // When timerState is null/undefined (e.g., new user), set display to default
      setDisplayTime(mode === 'pomodoro' ? customDuration * 60 : 0);
    }
  }, [timerState, mode, customDuration, isIdle]);

  const calculateDisplayTime = useCallback(() => {
    if (!timerState) {
      setDisplayTime(mode === 'pomodoro' ? customDuration * 60 : 0);
      return;
    }

    const now = Date.now();

    if (timerState.status === 'stopped') {
      setDisplayTime(timerState.mode === 'pomodoro' ? timerState.initialDuration : 0);
      return;
    }

    if (timerState.status === 'paused') {
      const remaining = timerState.initialDuration - timerState.accumulatedTime;
      setDisplayTime(timerState.mode === 'pomodoro' ? remaining : timerState.accumulatedTime);
      return;
    }

    if (timerState.status === 'running') {
      const startedAtMillis = toMillis(timerState.startedAt);
      if (startedAtMillis === 0) return;

      const elapsedSinceStart = (now - startedAtMillis) / 1000;
      const totalElapsedTime = timerState.accumulatedTime + elapsedSinceStart;

      if (timerState.mode === 'pomodoro') {
        const remaining = Math.max(0, timerState.initialDuration - totalElapsedTime);
        setDisplayTime(remaining);
        if (remaining <= 0) {
          stop('completed');
        }
      } else {
        setDisplayTime(totalElapsedTime);
      }
    }
  }, [timerState, mode, customDuration]);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    if (timerState?.status === 'running') {
      calculateDisplayTime();
      intervalRef.current = setInterval(calculateDisplayTime, 1000);
    } else {
      calculateDisplayTime();
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [timerState, calculateDisplayTime]);

  const start = async () => {
    if (!firestore || !user || !timerStateRef.current) {
      toast({
        title: "You're not logged in",
        description: 'Log in to start the timer and track your progress.',
        action: <Button onClick={() => router.push('/login')}>Login</Button>
      });
      return;
    }
    if (!selectedSubjectId) {
      toast({
        title: 'No Subject Selected',
        description: 'Please select a subject before starting the timer.',
        variant: 'destructive',
      });
      return;
    }

    let accumulatedTime = 0;
    let sessionStartTime = serverTimestamp();
    let initialDuration = mode === 'pomodoro' ? customDuration * 60 : 0;

    if (timerState && timerState.status === 'paused') {
      accumulatedTime = timerState.accumulatedTime;
      sessionStartTime = timerState.sessionStartTime;
      initialDuration = timerState.initialDuration;
    }

    const newState = {
      userId: user.uid,
      status: 'running',
      mode,
      initialDuration,
      accumulatedTime,
      startedAt: serverTimestamp(),
      sessionStartTime,
      subjectId: selectedSubjectId,
    };

    setDoc(timerStateRef.current, newState, { merge: true }).catch(serverError => {
      const permissionError = new FirestorePermissionError({
        path: timerStateRef.current!.path,
        operation: 'update',
        requestResourceData: newState,
      });
      errorEmitter.emit('permission-error', permissionError);
    });
  };

  const pause = async () => {
    if (!timerState || timerState.status !== 'running' || !firestore || !timerStateRef.current) return;

    const startedAtMillis = toMillis(timerState.startedAt);
    if (startedAtMillis === 0) return;

    const now = Date.now();
    const elapsedSinceStart = (now - startedAtMillis) / 1000;
    const newAccumulatedTime = timerState.accumulatedTime + elapsedSinceStart;

    const updateData = {
      status: 'paused',
      accumulatedTime: newAccumulatedTime,
      startedAt: null,
    };

    updateDoc(timerStateRef.current, updateData).catch(serverError => {
      const permissionError = new FirestorePermissionError({
        path: timerStateRef.current!.path,
        operation: 'update',
        requestResourceData: updateData,
      });
      errorEmitter.emit('permission-error', permissionError);
    });
  };

  const stop = async (finalStatus: 'stopped' | 'completed') => {
    if (!firestore || !user || !timerStateRef.current) return;

    if (intervalRef.current) clearInterval(intervalRef.current);

    if (!timerState) {
      setDisplayTime(mode === 'pomodoro' ? customDuration * 60 : 0);
      return;
    }

    let finalElapsedTime = timerState.accumulatedTime;
    if (timerState.status === 'running') {
      const startedAtMillis = toMillis(timerState.startedAt);
      if (startedAtMillis > 0) {
        const elapsedSinceStart = (Date.now() - startedAtMillis) / 1000;
        finalElapsedTime += elapsedSinceStart;
      }
    }

    const finalDurationSeconds = Math.round(finalElapsedTime);

    if (finalDurationSeconds > 5 && toMillis(timerState.sessionStartTime) > 0) {
      const sessionPayload: Omit<Session, 'id'> = {
        userId: user.uid,
        subjectId: timerState.subjectId,
        mode: timerState.mode,
        startTime: new Date(toMillis(timerState.sessionStartTime)).toISOString(),
        endTime: new Date().toISOString(),
        duration: finalDurationSeconds,
        pauseCount: 0, // Placeholder
        status: finalStatus,
        focusScore: 100, // Placeholder
      }

      addDoc(collection(firestore, 'sessions'), sessionPayload).catch(serverError => {
        const permissionError = new FirestorePermissionError({
          path: `sessions/(new_id)`,
          operation: 'create',
          requestResourceData: sessionPayload,
        });
        errorEmitter.emit('permission-error', permissionError);
      });

      if (finalStatus === 'completed' || finalStatus === 'stopped') {
        toast({
          title: "Session Saved!",
          description: `You studied for ${Math.round(finalDurationSeconds / 60)} minutes.`,
        });
      }
    }

    reset();
  };

  const reset = () => {
    if (!firestore || !timerStateRef.current) return;
    if (intervalRef.current) clearInterval(intervalRef.current);

    const resetState = {
      status: 'stopped',
      accumulatedTime: 0,
      startedAt: null,
      initialDuration: mode === 'pomodoro' ? customDuration * 60 : 0
    };
    updateDoc(timerStateRef.current, resetState).catch(serverError => {
      const permissionError = new FirestorePermissionError({
        path: timerStateRef.current!.path,
        operation: 'update',
        requestResourceData: resetState,
      });
      errorEmitter.emit('permission-error', permissionError);
    });
  }

  const handleModeChange = (newMode: 'pomodoro' | 'stopwatch') => {
    if (isIdle) {
      setMode(newMode);
      if (timerStateRef.current) {
        updateDoc(timerStateRef.current, { mode: newMode });
      }
    }
  }

  const handleSubjectChange = (subjectId: string) => {
    if (isIdle) {
      setSelectedSubjectId(subjectId);
      if (timerStateRef.current) {
        updateDoc(timerStateRef.current, { subjectId: subjectId });
      }
    }
  };

  const handleDurationChange = (newDuration: number) => {
    if (isIdle) {
      if (newDuration > 0 && newDuration <= 180) {
        setCustomDuration(newDuration);
        if (timerStateRef.current) {
          updateDoc(timerStateRef.current, { initialDuration: newDuration * 60 });
        }
      }
    }
  };



  return {
    displayTime,
    selectedSubjectId,
    mode,
    customDuration,
    isActive,
    isPaused,
    isIdle,
    timerStateLoading,
    start,
    pause,
    stop,
    reset,
    handleModeChange,
    handleSubjectChange,
    handleDurationChange,
    setSelectedSubjectId
  };
}
