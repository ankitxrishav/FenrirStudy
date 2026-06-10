
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { startOfDay, format, subDays } from 'date-fns';
import { doc, serverTimestamp, updateDoc, setDoc, addDoc, collection, Timestamp, query, where, getDocs } from 'firebase/firestore';
import { TimerState, Session, User } from '@/lib/definitions';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export type TimerFaceId = 'digital' | 'ring' | 'analog' | 'radial' | 'retro';

interface TimerContextType {
    displayTime: number;
    selectedSubjectId: string | null;
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

const toMillis = (timestamp: any): number => {
    if (timestamp instanceof Timestamp) return timestamp.toMillis();
    if (timestamp && typeof timestamp.seconds === 'number') {
        return timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000;
    }
    return 0;
};

export function TimerProvider({ children }: { children: React.ReactNode }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const router = useRouter();

    const [displayTime, setDisplayTime] = useState(0);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const timerStateRef = useRef<any>(null);

    useEffect(() => {
        timerStateRef.current = user && firestore ? doc(firestore, 'timerStates', user.uid) : null;
    }, [user, firestore]);

    const { data: timerState, loading: timerStateLoading } = useDoc<TimerState>(timerStateRef.current);
    const userRef = useMemo(() => (user && firestore ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
    const { data: userData } = useDoc<User>(userRef);

    const [customDuration, setCustomDuration] = useState(25);
    const [mode, setMode] = useState<'pomodoro' | 'stopwatch'>('pomodoro');
    const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
    const [activeFace, setActiveFace] = useState<TimerFaceId>('digital');
    const todayAccumulatedSecondsRef = useRef<number>(0);

    const getStudySecondsTodayExcludingCurrent = useCallback(async (): Promise<number> => {
        if (!firestore || !user) return 0;
        try {
            const sessionsRef = collection(firestore, 'sessions');
            const todayStart = startOfDay(new Date());
            const q = query(sessionsRef, where('userId', '==', user.uid));
            const snap = await getDocs(q);
            let total = 0;
            snap.forEach(d => {
                const data = d.data();
                if (data.startTime && new Date(data.startTime) >= todayStart) {
                    total += data.duration || 0;
                }
            });
            return total;
        } catch (e) {
            console.error("Error fetching study seconds today:", e);
            return 0;
        }
    }, [firestore, user]);

    useEffect(() => {
        if (user && firestore) {
            getStudySecondsTodayExcludingCurrent().then(total => {
                todayAccumulatedSecondsRef.current = total;
            });
        }
    }, [user, firestore, getStudySecondsTodayExcludingCurrent]);

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

            // Enforce limits:
            // 1. Single subject session limit (8 hours = 28800 seconds)
            const maxSessionTime = 28800;

            // 2. Daily limit (22 hours = 79200 seconds)
            const remainingDailyTime = Math.max(0, 79200 - todayAccumulatedSecondsRef.current);
            const effectiveLimit = Math.min(maxSessionTime, remainingDailyTime);

            if (totalElapsedTime >= effectiveLimit) {
                setDisplayTime(timerState.mode === 'pomodoro' ? Math.max(0, timerState.initialDuration - effectiveLimit) : effectiveLimit);
                stop('completed');
                return;
            }

            if (timerState.mode === 'pomodoro') {
                const remaining = Math.max(0, timerState.initialDuration - totalElapsedTime);
                setDisplayTime(remaining);
                if (remaining <= 0) stop('completed');
            } else {
                setDisplayTime(totalElapsedTime);
            }
        }
    }, [timerState, mode, customDuration]);

    useEffect(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (timerState?.status === 'running') {
            calculateDisplayTime();
            intervalRef.current = setInterval(calculateDisplayTime, 1000);
        } else {
            calculateDisplayTime();
        }
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [timerState, calculateDisplayTime]);

    const start = async () => {
        if (!firestore || !user || !timerStateRef.current) {
            toast({
                title: "Not Logged In",
                description: 'Log in to start tracking.',
                action: <Button onClick={() => router.push('/login')}>Login</Button>
            });
            return;
        }
        if (!selectedSubjectId) {
            toast({ title: 'No Subject Selected', description: 'Please select a subject.', variant: 'destructive' });
            return;
        }

        // Fetch and cache today's accumulated study seconds
        const accumulatedToday = await getStudySecondsTodayExcludingCurrent();
        todayAccumulatedSecondsRef.current = accumulatedToday;

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

        setDoc(timerStateRef.current, newState, { merge: true }).catch(err => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: timerStateRef.current!.path, operation: 'update', requestResourceData: newState }));
        });
    };

    const pause = async () => {
        if (!timerState || timerState.status !== 'running' || !timerStateRef.current) return;
        const startedAtMillis = toMillis(timerState.startedAt);
        if (startedAtMillis === 0) return;
        const elapsedSinceStart = (Date.now() - startedAtMillis) / 1000;
        const updateData = { status: 'paused', accumulatedTime: timerState.accumulatedTime + elapsedSinceStart, startedAt: null };
        setDoc(timerStateRef.current, updateData, { merge: true }).catch(err => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: timerStateRef.current!.path, operation: 'update', requestResourceData: updateData }));
        });
    };

    const isProcessingStop = useRef(false);

    const stop = async (finalStatus: 'stopped' | 'completed') => {
        if (!firestore || !user || !timerStateRef.current || !timerState) return;
        if (isProcessingStop.current) return;

        isProcessingStop.current = true;
        if (intervalRef.current) clearInterval(intervalRef.current);

        // Instantly transition UI state in Firestore to "stopped"
        const resetState = {
            status: 'stopped',
            accumulatedTime: 0,
            startedAt: null,
            initialDuration: mode === 'pomodoro' ? customDuration * 60 : 0
        };

        try {
            await setDoc(timerStateRef.current, resetState, { merge: true });

            let finalElapsedTime = timerState.accumulatedTime;
            if (timerState.status === 'running') {
                const startedAtMillis = toMillis(timerState.startedAt);
                if (startedAtMillis > 0) finalElapsedTime += (Date.now() - startedAtMillis) / 1000;
            }

            // Enforce capping limits when saving the session
            const maxSessionTime = 28800; // 8 hours
            const accumulatedToday = await getStudySecondsTodayExcludingCurrent();
            const remainingDailyTime = Math.max(0, 79200 - accumulatedToday);
            const effectiveLimit = Math.min(maxSessionTime, remainingDailyTime);

            let finalDurationSeconds = Math.round(finalElapsedTime);
            if (finalDurationSeconds > effectiveLimit) {
                finalDurationSeconds = Math.round(effectiveLimit);
            }

            // Only save session if it's substantial (> 5s)
            if (finalDurationSeconds > 5 && toMillis(timerState.sessionStartTime) > 0) {
                const startTimeMillis = toMillis(timerState.sessionStartTime);
                const durationMs = finalDurationSeconds * 1000;
                const endTimeISO = new Date(startTimeMillis + durationMs).toISOString();

                const sessionPayload = {
                    userId: user.uid,
                    subjectId: timerState.subjectId,
                    mode: timerState.mode,
                    startTime: new Date(startTimeMillis).toISOString(),
                    endTime: endTimeISO,
                    duration: finalDurationSeconds,
                    pauseCount: 0,
                    status: finalStatus,
                    focusScore: 100,
                };

                await addDoc(collection(firestore, 'sessions'), sessionPayload);

                // Update cache ref to include this saved session
                todayAccumulatedSecondsRef.current = accumulatedToday + finalDurationSeconds;

                if (finalStatus === 'completed' || finalStatus === 'stopped') {
                    toast({ title: "Session Saved!", description: `You studied for ${Math.round(finalDurationSeconds / 60)} minutes.` });

                    // Streak Logic
                    const targetHours = userData?.settings?.studyTargetHours || 2;
                    const sessionsRef = collection(firestore, 'sessions');
                    const todayStart = startOfDay(new Date());
                    const q = query(sessionsRef, where('userId', '==', user.uid));
                    const snap = await getDocs(q);

                    let totalSecondsToday = 0;
                    snap.forEach(d => {
                        const data = d.data();
                        if (new Date(data.startTime) >= todayStart) totalSecondsToday += data.duration;
                    });

                    if (totalSecondsToday >= targetHours * 3600) {
                        const today = format(new Date(), 'yyyy-MM-dd');
                        const lastUpdate = userData?.lastStreakUpdate;
                        if (lastUpdate !== today && userRef) {
                            let newStreak = lastUpdate === format(subDays(new Date(), 1), 'yyyy-MM-dd') ? (userData?.streak || 0) + 1 : 1;
                            await updateDoc(userRef, { streak: newStreak, lastStreakUpdate: today });
                            toast({ title: "Streak Updated!", description: `🔥 ${newStreak} day streak!` });
                        }
                    }
                }
            }
        } catch (err: any) {
            console.error("Stop ritual error:", err);
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: timerStateRef.current!.path,
                operation: 'update',
                requestResourceData: resetState
            }));
        } finally {
            isProcessingStop.current = false;
        }
    };

    const reset = () => {
        if (!timerStateRef.current) return;
        if (intervalRef.current) clearInterval(intervalRef.current);
        const resetState = { status: 'stopped', accumulatedTime: 0, startedAt: null, initialDuration: mode === 'pomodoro' ? customDuration * 60 : 0 };
        // Only update if the doc exists (timerState not null)
        if (timerState) setDoc(timerStateRef.current, resetState, { merge: true });
    };

    const handleModeChange = (newMode: 'pomodoro' | 'stopwatch') => {
        if (isIdle) {
            setMode(newMode);
            // Only persist if the timerState doc already exists
            if (timerStateRef.current && timerState) setDoc(timerStateRef.current, { mode: newMode }, { merge: true });
        }
    };

    const handleSubjectChange = (subjectId: string) => {
        if (isIdle) {
            setSelectedSubjectId(subjectId);
            if (timerStateRef.current && timerState) setDoc(timerStateRef.current, { subjectId: subjectId }, { merge: true });
        }
    };

    const handleDurationChange = (newDuration: number) => {
        if (isIdle && newDuration > 0 && newDuration <= 180) {
            setCustomDuration(newDuration);
            if (timerStateRef.current && timerState) setDoc(timerStateRef.current, { initialDuration: newDuration * 60 }, { merge: true });
        }
    };

    const value = {
        displayTime,
        selectedSubjectId,
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
        setSelectedSubjectId
    };

    return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
}

export function useTimer() {
    const context = useContext(TimerContext);
    if (context === undefined) {
        // Fallback for dev/HMR to prevent crash
        return {} as TimerContextType;
    }
    return context;
}
