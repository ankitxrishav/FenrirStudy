
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
        updateDoc(timerStateRef.current, updateData).catch(err => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: timerStateRef.current!.path, operation: 'update', requestResourceData: updateData }));
        });
    };

    const stop = async (finalStatus: 'stopped' | 'completed') => {
        if (!firestore || !user || !timerStateRef.current || !timerState) return;
        if (intervalRef.current) clearInterval(intervalRef.current);

        let finalElapsedTime = timerState.accumulatedTime;
        if (timerState.status === 'running') {
            const startedAtMillis = toMillis(timerState.startedAt);
            if (startedAtMillis > 0) finalElapsedTime += (Date.now() - startedAtMillis) / 1000;
        }

        const finalDurationSeconds = Math.round(finalElapsedTime);
        if (finalDurationSeconds > 5 && toMillis(timerState.sessionStartTime) > 0) {
            const sessionPayload = {
                userId: user.uid,
                subjectId: timerState.subjectId,
                mode: timerState.mode,
                startTime: new Date(toMillis(timerState.sessionStartTime)).toISOString(),
                endTime: new Date().toISOString(),
                duration: finalDurationSeconds,
                pauseCount: 0,
                status: finalStatus,
                focusScore: 100,
            };
            addDoc(collection(firestore, 'sessions'), sessionPayload).catch(err => {
                errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `sessions/(new)`, operation: 'create', requestResourceData: sessionPayload }));
            });

            if (finalStatus === 'completed' || finalStatus === 'stopped') {
                toast({ title: "Session Saved!", description: `You studied for ${Math.round(finalDurationSeconds / 60)} minutes.` });
                const targetHours = userData?.settings?.studyTargetHours || 2;
                const sessionsRef = collection(firestore, 'sessions');
                const todayStart = startOfDay(new Date());
                const q = query(sessionsRef, where('userId', '==', user.uid));
                const snap = await getDocs(q);
                let totalSecondsToday = 0;
                snap.forEach(d => { if (new Date(d.data().startTime) >= todayStart) totalSecondsToday += d.data().duration; });

                if (totalSecondsToday >= targetHours * 3600) {
                    const today = format(new Date(), 'yyyy-MM-dd');
                    const lastUpdate = userData?.lastStreakUpdate;
                    if (lastUpdate !== today) {
                        let newStreak = lastUpdate === format(subDays(new Date(), 1), 'yyyy-MM-dd') ? (userData?.streak || 0) + 1 : 1;
                        updateDoc(userRef!, { streak: newStreak, lastStreakUpdate: today });
                        toast({ title: "Streak Updated!", description: `🔥 ${newStreak} day streak!` });
                    }
                }
            }
        }
        reset();
    };

    const reset = () => {
        if (!timerStateRef.current) return;
        if (intervalRef.current) clearInterval(intervalRef.current);
        const resetState = { status: 'stopped', accumulatedTime: 0, startedAt: null, initialDuration: mode === 'pomodoro' ? customDuration * 60 : 0 };
        updateDoc(timerStateRef.current, resetState);
    };

    const handleModeChange = (newMode: 'pomodoro' | 'stopwatch') => {
        if (isIdle) {
            setMode(newMode);
            if (timerStateRef.current) updateDoc(timerStateRef.current, { mode: newMode });
        }
    };

    const handleSubjectChange = (subjectId: string) => {
        if (isIdle) {
            setSelectedSubjectId(subjectId);
            if (timerStateRef.current) updateDoc(timerStateRef.current, { subjectId: subjectId });
        }
    };

    const handleDurationChange = (newDuration: number) => {
        if (isIdle && newDuration > 0 && newDuration <= 180) {
            setCustomDuration(newDuration);
            if (timerStateRef.current) updateDoc(timerStateRef.current, { initialDuration: newDuration * 60 });
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
