
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { useUser, useFirestore, useDoc, useCollection } from '@/firebase';
import { doc, updateDoc, setDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { User, DailyActivity, Session, Habit } from '@/lib/definitions';
import { startOfDay, format, subDays } from 'date-fns';
import { Flame, Target, CheckCircle2, Plus, Trash2, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import LoadingScreen from "@/components/app/loading-screen";

export default function GoalsPage() {
    const { user, loading: userLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const today = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

    // Fetch User Doc for settings and streak
    const userDocRef = useMemo(() => (user && firestore ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
    const { data: userData, loading: docLoading } = useDoc<User>(userDocRef);

    // Fetch Daily Activity for Today
    const activityDocRef = useMemo(() => (user && firestore ? doc(firestore, 'dailyActivities', `${user.uid}_${today}`) : null), [user, firestore, today]);
    const { data: activityData, loading: activityLoading } = useDoc<DailyActivity>(activityDocRef);

    // Fetch Today's Sessions to calculate study time
    const sessionsQuery = useMemo(() => {
        if (!user || !firestore) return null;
        return query(
            collection(firestore, 'sessions'),
            where('userId', '==', user.uid)
        );
    }, [user, firestore]);
    const { data: allSessions } = useCollection<Session>(sessionsQuery);

    const todayStudySeconds = useMemo(() => {
        if (!allSessions) return 0;
        const todayStart = startOfDay(new Date());
        return allSessions
            .filter(s => new Date(s.startTime) >= todayStart)
            .reduce((acc, s) => acc + s.duration, 0);
    }, [allSessions]);

    const [studyTarget, setStudyTarget] = useState(1);
    const [newHabitName, setNewHabitName] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (userData?.settings?.studyTargetHours) {
            setStudyTarget(userData.settings.studyTargetHours);
        }
    }, [userData]);

    const handleSaveTarget = async () => {
        if (!userDocRef || !userData) return;
        setIsSaving(true);
        try {
            await updateDoc(userDocRef, {
                'settings.studyTargetHours': studyTarget
            });
            toast({ title: "Target Saved", description: `Your daily study goal is now ${studyTarget} hours.` });
        } catch (error) {
            toast({ title: "Error", description: "Failed to save study target.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddHabit = async () => {
        if (!activityDocRef || !newHabitName.trim()) return;
        const newHabit: Habit = {
            id: crypto.randomUUID(),
            name: newHabitName.trim(),
            completed: false
        };
        const currentHabits = activityData?.habits || [];
        try {
            await setDoc(activityDocRef, {
                date: today,
                habits: [...currentHabits, newHabit],
                studyTimeSeconds: todayStudySeconds,
                studyTargetMet: todayStudySeconds >= (studyTarget * 3600)
            }, { merge: true });
            setNewHabitName('');
        } catch (error) {
            toast({ title: "Error", description: "Failed to add habit.", variant: "destructive" });
        }
    };

    const toggleHabit = async (habitId: string) => {
        if (!activityDocRef || !activityData) return;
        const updatedHabits = activityData.habits.map(h =>
            h.id === habitId ? { ...h, completed: !h.completed } : h
        );
        try {
            await updateDoc(activityDocRef, { habits: updatedHabits });
        } catch (error) {
            toast({ title: "Error", description: "Failed to update habit.", variant: "destructive" });
        }
    };

    const deleteHabit = async (habitId: string) => {
        if (!activityDocRef || !activityData) return;
        const updatedHabits = activityData.habits.filter(h => h.id !== habitId);
        try {
            await updateDoc(activityDocRef, { habits: updatedHabits });
        } catch (error) {
            toast({ title: "Error", description: "Failed to delete habit.", variant: "destructive" });
        }
    };

    const studyProgress = Math.min(100, (todayStudySeconds / (studyTarget * 3600)) * 100);

    return (
        <div className="container max-w-4xl py-10 space-y-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Goals & Habits</h1>
                <p className="text-muted-foreground">Set your daily targets and track your progress.</p>
            </div>

            {(userLoading || docLoading || !user) ? (
                <LoadingScreen />
            ) : (
                <>
                    <div className="grid gap-6 md:grid-cols-2">
                        {/* Study Target Section */}
                        <Card className="border-t-4 border-t-orange-500">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Target className="h-5 w-5 text-orange-500" />
                                    Daily Study Goal
                                </CardTitle>
                                <CardDescription>Aim for 1 to 12 hours of focused study.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center text-sm font-medium">
                                        <span>Target: {studyTarget} {studyTarget === 1 ? 'hour' : 'hours'}</span>
                                        <span className="text-muted-foreground">{Math.round(todayStudySeconds / 60)}m logged today</span>
                                    </div>
                                    <Slider
                                        value={[studyTarget]}
                                        onValueChange={(val) => setStudyTarget(val[0])}
                                        min={1}
                                        max={12}
                                        step={0.5}
                                        className="py-4"
                                    />
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs text-muted-foreground">
                                            <span>Progress</span>
                                            <span>{Math.round(studyProgress)}%</span>
                                        </div>
                                        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-orange-500 transition-all duration-500"
                                                style={{ width: `${studyProgress}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button onClick={handleSaveTarget} disabled={isSaving} className="w-full">
                                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Set Target
                                </Button>
                            </CardFooter>
                        </Card>

                        {/* Streak Card */}
                        <Card className="border-t-4 border-t-yellow-500 flex flex-col justify-center text-center">
                            <CardContent className="pt-6">
                                <div className="inline-flex items-center justify-center p-4 rounded-full bg-yellow-100 dark:bg-yellow-900/30 mb-4">
                                    <Flame className="h-10 w-10 text-yellow-600" />
                                </div>
                                <div className="text-4xl font-bold mb-1">{userData?.streak || 0}</div>
                                <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Day Streak</div>
                                <p className="mt-4 text-xs text-muted-foreground">
                                    Maintain your study target daily to grow your streak!
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Habits Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                                Daily Habits
                            </CardTitle>
                            <CardDescription>Add personal habits and tick them off when done. (Doesn't affect study streak)</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex gap-2">
                                <Input
                                    placeholder="e.g. 15 min exercise"
                                    value={newHabitName}
                                    onChange={(e) => setNewHabitName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddHabit()}
                                />
                                <Button onClick={handleAddHabit} size="icon">
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>

                            <div className="space-y-2 pt-2">
                                {(activityData?.habits || []).map((habit) => (
                                    <div key={habit.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <Checkbox
                                                checked={habit.completed}
                                                onCheckedChange={() => toggleHabit(habit.id)}
                                            />
                                            <span className={habit.completed ? 'line-through text-muted-foreground' : ''}>
                                                {habit.name}
                                            </span>
                                        </div>
                                        <Button variant="ghost" size="icon" onClick={() => deleteHabit(habit.id)}>
                                            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                                        </Button>
                                    </div>
                                ))}
                                {(!activityData?.habits || activityData.habits.length === 0) && (
                                    <div className="text-center py-6 text-muted-foreground text-sm">
                                        No habits added for today.
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}
