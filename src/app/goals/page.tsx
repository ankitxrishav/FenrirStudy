"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Calendar, Flame, Loader2, Pin, Plus, Target, Trash2 } from "lucide-react";
import { collection, doc, query, updateDoc, where } from "firebase/firestore";
import { useCollection, useFirestore, useUser } from "@/firebase";
import { Session } from "@/lib/definitions";
import { useToast } from "@/hooks/use-toast";
import { useYptExtras } from "@/hooks/use-ypt-extras";
import { computePeriodicStats, computeStudyStatistics, formatDdayBadge } from "@/lib/study-time";
import LoadingScreen from "@/components/app/loading-screen";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

export default function GoalsPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const { userData, ddays, mainDdayId, addDday, pinMainDday, deleteDday } = useYptExtras();

  const userDocRef = useMemo(
    () => (user && firestore ? doc(firestore, "users", user.uid) : null),
    [user, firestore]
  );

  const sessionsQuery = useMemo(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, "sessions"), where("userId", "==", user.uid));
  }, [user, firestore]);
  const { data: allSessions } = useCollection<Session>(sessionsQuery);

  const statsSummary = useMemo(() => {
    if (!allSessions) return null;
    const target = userData?.settings?.studyTargetHours ?? 2;
    return computeStudyStatistics(allSessions, [], target, Date.now(), {
      dayMeta: userData?.dayMeta,
      todos: userData?.studyTodos,
    });
  }, [allSessions, userData?.settings?.studyTargetHours, userData?.dayMeta, userData?.studyTodos]);

  const todayStudySeconds = useMemo(() => {
    if (!allSessions) return 0;
    return computePeriodicStats(allSessions).today.seconds;
  }, [allSessions]);

  const [studyTarget, setStudyTarget] = useState(2);
  const [isSaving, setIsSaving] = useState(false);

  const [ddayTitle, setDdayTitle] = useState("");
  const [ddayDate, setDdayDate] = useState("");

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

  const handleAddDday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ddayTitle.trim() || !ddayDate) return;
    await addDday(ddayTitle, ddayDate);
    setDdayTitle("");
    setDdayDate("");
    toast({ title: "D-Day countdown added" });
  };

  if (userLoading || !user) {
    return <LoadingScreen />;
  }

  const studyProgress = Math.min(100, (todayStudySeconds / (studyTarget * 3600)) * 100);
  const loggedMinutes = Math.round(todayStudySeconds / 60);
  const todayKey = statsSummary?.periodKeys.todayDateKey;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-8">
      <div className="space-y-1">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-muted">
          Daily Target &amp; Exam Countdowns
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-ink">Goals, Streak &amp; D-Day</h1>
        <p className="text-sm text-ink-muted">
          Set your daily hours goal, protect streaks with Day Off days, and track exam countdowns.
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
                Day Streak {statsSummary?.core.bestStreak ? `· Best ${statsSummary.core.bestStreak}d` : ""}
              </p>
            </div>
            <p className="text-sm text-ink-muted max-w-xs">
              Log study time each day before midnight or mark rest dates as Day Off in History to protect your streak.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* D-Day Exam Countdowns */}
      <Card className="border-line bg-surface rounded-3xl">
        <CardHeader className="border-b border-line/15">
          <CardTitle className="flex items-center gap-2 text-lg text-ink">
            <Calendar className="h-5 w-5 text-clay" />
            D-Day Exam Countdowns
          </CardTitle>
          <CardDescription className="text-ink-muted">
            Pin your primary exam countdown to display it on Overview and Focus Timer across Web &amp; Android.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 space-y-5">
          <form onSubmit={handleAddDday} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            <Input
              value={ddayTitle}
              onChange={(e) => setDdayTitle(e.target.value)}
              placeholder="Exam or milestone (e.g. Finals, GATE)"
              className="sm:col-span-6 bg-surface-soft"
            />
            <Input
              type="date"
              value={ddayDate}
              onChange={(e) => setDdayDate(e.target.value)}
              className="sm:col-span-4 bg-surface-soft"
            />
            <Button
              type="submit"
              className="sm:col-span-2 rounded-full bg-clay text-ink border border-line hover:bg-clay/90 font-semibold gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>Add</span>
            </Button>
          </form>

          {ddays.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line/30 py-8 text-center text-sm text-ink-muted">
              No countdowns yet. Add your exam date above.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {ddays.map((item) => {
                const badge = formatDdayBadge(item.targetDate, todayKey);
                const isPinned = item.id === mainDdayId;
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "rounded-2xl border p-4 flex items-center justify-between gap-3",
                      isPinned ? "border-line bg-highlight/40" : "border-line/25 bg-surface-soft"
                    )}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-ink text-surface font-mono text-xs">
                          {badge.label}
                        </Badge>
                        {isPinned && (
                          <Badge variant="outline" className="font-mono text-[10px]">
                            Main
                          </Badge>
                        )}
                      </div>
                      <p className="font-semibold text-sm text-ink truncate mt-1.5">
                        {item.title}
                      </p>
                      <p className="font-mono text-[11px] text-ink-muted">
                        {item.targetDate}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!isPinned && (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          title="Pin as main D-Day"
                          onClick={() => pinMainDday(item.id)}
                          className="h-8 w-8 rounded-full text-ink-muted hover:text-ink"
                        >
                          <Pin className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        title="Delete countdown"
                        onClick={() => deleteDday(item.id)}
                        className="h-8 w-8 rounded-full text-ink-muted hover:text-danger"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
