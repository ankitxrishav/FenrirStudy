"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Flame, Target, Loader2, Award } from "lucide-react";
import { doc, updateDoc, query, collection, where } from "firebase/firestore";
import { useUser, useFirestore, useDoc, useCollection } from "@/firebase";
import { User, Session } from "@/lib/definitions";
import { useToast } from "@/hooks/use-toast";
import LoadingScreen from "@/components/app/loading-screen";
import { computePeriodicStats, computeStudyStatistics } from "@/lib/study-time";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

export default function GoalsPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const userDocRef = useMemo(
    () => (user && firestore ? doc(firestore, "users", user.uid) : null),
    [user, firestore]
  );
  const { data: userData, loading: docLoading } = useDoc<User>(userDocRef);

  const sessionsQuery = useMemo(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, "sessions"), where("userId", "==", user.uid));
  }, [user, firestore]);
  const { data: allSessions } = useCollection<Session>(sessionsQuery);

  const statsSummary = useMemo(() => {
    if (!allSessions) return null;
    const target = userData?.settings?.studyTargetHours ?? 2;
    return computeStudyStatistics(allSessions, [], target);
  }, [allSessions, userData?.settings?.studyTargetHours]);

  const todayStudySeconds = useMemo(() => {
    if (!allSessions) return 0;
    return computePeriodicStats(allSessions).today.seconds;
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
        "settings.studyTargetHours": studyTarget,
      });
      toast({
        title: "Target saved",
        description: `Daily study goal updated to ${studyTarget} ${studyTarget === 1 ? "hour" : "hours"}.`,
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to save study target.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (userLoading || docLoading || !user) {
    return <LoadingScreen />;
  }

  const studyProgress = Math.min(100, (todayStudySeconds / (studyTarget * 3600)) * 100);
  const loggedMinutes = Math.round(todayStudySeconds / 60);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-8">
      <div className="space-y-1">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-muted">
          Daily Target
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-ink">Goals & Streak</h1>
        <p className="text-sm text-ink-muted">
          Set your daily hours goal and maintain consistency.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Card className="border-line bg-surface rounded-3xl flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-ink">
              <Target className="h-5 w-5 text-clay" />
              Daily Study Goal
            </CardTitle>
            <CardDescription className="text-ink-muted">
              Choose between 1 and 12 focused hours per day.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="flex items-baseline justify-between gap-2">
              <div>
                <span className="text-3xl font-bold tabular-nums text-ink">
                  {studyTarget}
                </span>
                <span className="ml-1.5 text-sm text-ink-muted">
                  {studyTarget === 1 ? "hour / day" : "hours / day"}
                </span>
              </div>
              <span className="font-mono text-xs px-2.5 py-1 rounded-full border border-line/20 bg-surface-soft text-ink tabular-nums">
                {loggedMinutes}m logged today
              </span>
            </div>

            <Slider
              value={[studyTarget]}
              onValueChange={(val) => setStudyTarget(val[0])}
              min={1}
              max={12}
              step={0.5}
              className="py-2"
            />

            <div className="space-y-2">
              <div className="flex justify-between font-mono text-xs text-ink-muted">
                <span>Today&apos;s progress</span>
                <span className="tabular-nums text-ink font-semibold">
                  {Math.round(studyProgress)}%
                </span>
              </div>
              <div className="h-3 w-full rounded-full border border-line bg-surface-soft overflow-hidden">
                <div
                  className="h-full bg-clay transition-all duration-300"
                  style={{ width: `${studyProgress}%` }}
                />
              </div>
            </div>
          </CardContent>

          <CardFooter>
            <Button
              type="button"
              onClick={handleSaveTarget}
              disabled={isSaving}
              className="w-full min-h-[44px] rounded-full bg-clay text-ink border border-line hover:bg-clay/90 font-semibold"
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Daily Target
            </Button>
          </CardFooter>
        </Card>

        <Card className="border-line bg-surface rounded-3xl flex flex-col justify-center">
          <CardContent className="p-8 flex flex-col items-center text-center gap-4">
            <div className="h-16 w-16 rounded-2xl border border-line bg-highlight flex items-center justify-center text-ink">
              <Flame className="h-8 w-8" />
            </div>
            <div>
              <div className="text-5xl font-bold tracking-tight tabular-nums text-ink">
                {statsSummary?.core.currentStreak ?? userData?.streak ?? 0}
              </div>
              <p className="font-mono text-xs uppercase tracking-[0.16em] text-ink-muted mt-1">
                Day Streak {statsSummary?.core.bestStreak ? `· Best ${statsSummary.core.bestStreak}d` : ''}
              </p>
            </div>
            <p className="text-sm text-ink-muted max-w-xs">
              Log study time each day before midnight to keep your streak active.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
