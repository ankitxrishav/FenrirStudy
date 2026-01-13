
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
import { User, Session } from '@/lib/definitions';
import { startOfDay, format, subDays } from 'date-fns';
import { Flame, Target, CheckCircle2, Plus, Trash2, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import LoadingScreen from "@/components/app/loading-screen";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function GoalsPage() {
    const { user, loading: userLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const today = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

    // Fetch User Doc for settings and streak
    const userDocRef = useMemo(() => (user && firestore ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
    const { data: userData, loading: docLoading } = useDoc<User>(userDocRef);

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

    const studyProgress = Math.min(100, (todayStudySeconds / (studyTarget * 3600)) * 100);

    return (
        <div className="container max-w-4xl py-10 space-y-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Daily Goals</h1>
                <p className="text-muted-foreground">Set your daily study target and track your streak.</p>
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
                </>
            )}
        </div>
    );
}
