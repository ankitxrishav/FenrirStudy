
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { startOfDay, startOfWeek, startOfMonth, format, subDays } from 'date-fns';
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

    const getPeriodicStats = useCallback(async () => {
        const defaultStats = {
            today: { seconds: 0, sessions: 0 },
            weekly: { seconds: 0, sessions: 0 },
            monthly: { seconds: 0, sessions: 0 },
            allTime: { seconds: 0, sessions: 0 },
            currentSubjectTodaySeconds: 0,
            todaySubjectBreakdown: {} as Record<string, number>,
        };
        if (!firestore || !user) return defaultStats;
        
        try {
            const sessionsRef = collection(firestore, 'sessions');
            const now = new Date();
            const todayStart = startOfDay(now);
            const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday start
            const monthStart = startOfMonth(now);
            
            // We only need to query sessions from the start of the month (since month > week > day usually, or week if week started last month)
            const minStart = new Date(Math.min(weekStart.getTime(), monthStart.getTime()));
            
            const q = query(sessionsRef, where('userId', '==', user.uid));
            // In a real prod environment we'd use a where('startTime', '>=', minStart.toISOString()) but we might need an index.
            // Client side filtering for active users is okay for now.
            const snap = await getDocs(q);
            
            const stats = { ...defaultStats };
            // Initialize empty breakdown object explicitly to prevent undefined
            stats.todaySubjectBreakdown = {};
            
            snap.forEach(d => {
                const data = d.data();
                if (!data.startTime) return;
                const dDate = new Date(data.startTime);
                
                // All-time stats
                stats.allTime.seconds += data.duration || 0;
                stats.allTime.sessions += 1;

                if (dDate >= todayStart) {
                    stats.today.seconds += data.duration || 0;
                    stats.today.sessions += 1;
                    if (selectedSubjectId && data.subjectId === selectedSubjectId) {
                        stats.currentSubjectTodaySeconds += data.duration || 0;
                    }
                    if (data.subjectId) {
                        stats.todaySubjectBreakdown[data.subjectId] = (stats.todaySubjectBreakdown[data.subjectId] || 0) + (data.duration || 0);
                    }
                }
                if (dDate >= weekStart) {
                    stats.weekly.seconds += data.duration || 0;
                    stats.weekly.sessions += 1;
                }
                if (dDate >= monthStart) {
                    stats.monthly.seconds += data.duration || 0;
                    stats.monthly.sessions += 1;
                }
            });
            return stats;
        } catch (e) {
            console.error("Error fetching study stats:", e);
            return defaultStats;
        }
    }, [firestore, user, selectedSubjectId]);

    useEffect(() => {
        if (user && firestore) {
            getPeriodicStats().then(stats => {
                todayAccumulatedSecondsRef.current = stats.today.seconds;
                
                setDoc(doc(firestore, 'users', user.uid), {
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
                }, { merge: true }).catch(() => {});
            });
        }
    }, [user, firestore, getPeriodicStats, selectedSubjectId]);

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
        const stats = await getPeriodicStats();
        todayAccumulatedSecondsRef.current = stats.today.seconds;

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
            const stats = await getPeriodicStats();
            const remainingDailyTime = Math.max(0, 79200 - stats.today.seconds);
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

                // Re-fetch and update user doc with new stats after session save
                const newStats = await getPeriodicStats();
                await setDoc(doc(firestore, 'users', user.uid), {
                    todaySeconds: newStats.today.seconds,
                    todaySessions: newStats.today.sessions,
                    weeklySeconds: newStats.weekly.seconds,
                    weeklySessions: newStats.weekly.sessions,
                    monthlySeconds: newStats.monthly.seconds,
                    monthlySessions: newStats.monthly.sessions,
                }, { merge: true });

                // Update cache ref to include this saved session
                todayAccumulatedSecondsRef.current = newStats.today.seconds;

                if (finalStatus === 'completed' || finalStatus === 'stopped') {
                    toast({ title: "Session Saved!", description: `You studied for ${Math.round(finalDurationSeconds / 60)} minutes.` });

                    // Streak Logic
                    const targetHours = userData?.settings?.studyTargetHours || 2;
                    const sessionsRef = collection(firestore, 'sessions');
                    const todayStart = startOfDay(new Date());
                    const q = query(sessionsRef, where('userId', '==', user.uid));
                    const snap = await getDocs(q);

                    let totalSecondsToday = 0;
                    let totalSessionsToday = 0;
                    snap.forEach(d => {
                        const data = d.data();
                        if (new Date(data.startTime) >= todayStart) {
                            totalSecondsToday += data.duration;
                            totalSessionsToday += 1;
                        }
                    });

                    const today = format(new Date(), 'yyyy-MM-dd');
                    if (userRef) {
                        const updates: any = {
                            todaySessions: totalSessionsToday,
                            todaySeconds: totalSecondsToday,
                            todayStatsDate: today,
                        };

                        if (totalSecondsToday >= targetHours * 3600) {
                            const lastUpdate = userData?.lastStreakUpdate;
                            if (lastUpdate !== today) {
                                let newStreak = lastUpdate === format(subDays(new Date(), 1), 'yyyy-MM-dd') ? (userData?.streak || 0) + 1 : 1;
                                updates.streak = newStreak;
                                updates.lastStreakUpdate = today;
                                toast({ title: "Streak Updated!", description: `🔥 ${newStreak} day streak!` });
                            }
                        }
                        await updateDoc(userRef, updates);
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
