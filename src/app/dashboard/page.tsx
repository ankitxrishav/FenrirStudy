"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  TrendingUp,
  Clock,
  BarChart3,
  Calendar,
  PieChart,
  Flame,
  Sun,
  Moon,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Repeat2,
  Users,
  Timer as TimerIcon,
  ArrowRight,
} from "lucide-react";
import { collection, query, where, doc } from "firebase/firestore";
import { useUser, useFirestore, useCollection, useDoc } from "@/firebase";
import { Session, User, Subject } from "@/lib/definitions";
import { useMyRooms } from "@/hooks/use-room";
import { useDashboardStats } from "@/hooks/use-dashboard-stats";
import { useHabits } from "@/hooks/use-habits";
import { calculateUserLevel } from "@/lib/level";
import { cn } from "@/lib/utils";
import LoadingScreen from "@/components/app/loading-screen";
import { Overview } from "@/components/app/dashboard/overview";
import { RecentSessions } from "@/components/app/dashboard/recent-sessions";
import { HabitAnalytics } from "@/components/app/dashboard/habit-analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type DashboardTab = "overview" | "habits";

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return "0m";
}

export default function DashboardPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const userDocRef = useMemo(
    () => (user && firestore ? doc(firestore, "users", user.uid) : null),
    [user, firestore]
  );
  const { data: userData } = useDoc<User>(userDocRef);

  const [tab, setTab] = useState<DashboardTab>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("dashboard-tab");
      return stored === "habits" ? "habits" : "overview";
    }
    return "overview";
  });

  const handleTabChange = (newTab: DashboardTab) => {
    setTab(newTab);
    localStorage.setItem("dashboard-tab", newTab);
  };

  useEffect(() => {
    if (!userLoading && !user) {
      router.push("/login");
    }
  }, [user, userLoading, router]);

  const sessionsQuery = useMemo(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, "sessions"), where("userId", "==", user.uid));
  }, [user, firestore]);

  const subjectsQuery = useMemo(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, "subjects"), where("userId", "==", user.uid));
  }, [user, firestore]);

  const { data: allSessions, loading: sessionsLoading } =
    useCollection<Session>(sessionsQuery);
  const { data: allSubjects } = useCollection<Subject>(subjectsQuery);

  const stats = useDashboardStats(allSessions, allSubjects);
  const { analytics: habitAnalytics } = useHabits(new Date());
  const { rooms } = useMyRooms();

  const allTimeSeconds = allSessions?.reduce((acc, s) => acc + s.duration, 0) || 0;
  const allTimeSessions = allSessions?.length || 0;
  const userLevel = calculateUserLevel(allTimeSeconds, allTimeSessions);
  const streakDays = userData?.streak ?? 0;
  const firstName = userData?.displayName?.split(" ")[0] || user?.displayName?.split(" ")[0];
  const primaryRoom = rooms[0] ?? null;

  if (userLoading || sessionsLoading || !user || !stats) {
    return <LoadingScreen />;
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="rounded-3xl border border-line bg-surface p-5 sm:p-7 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-2 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-muted">
              Study Overview
            </span>
            <span className="font-mono text-[11px] px-2.5 py-0.5 rounded-full border border-line bg-highlight text-ink">
              Level {userLevel}
            </span>
            <span className="font-mono text-[11px] px-2.5 py-0.5 rounded-full border border-line/25 bg-surface-soft text-ink tabular-nums">
              {streakDays}d streak
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-ink">
            {firstName ? `Welcome back, ${firstName}` : "Your Study Desk"}
          </h1>
          <p className="text-sm text-ink-muted max-w-xl">
            {stats.insights[0] || "Track your daily study rhythm, subjects, and rooms from one place."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Button
            asChild
            className="min-h-[44px] rounded-full bg-clay text-ink border border-line hover:bg-clay/90 font-semibold gap-2 px-5"
          >
            <Link href={primaryRoom ? `/rooms/${primaryRoom.id}` : "/rooms"}>
              <Users className="h-4 w-4" />
              <span>{primaryRoom ? `Open ${primaryRoom.name}` : "Join a room"}</span>
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="min-h-[44px] rounded-full border-line bg-surface-soft hover:bg-highlight text-ink gap-2 px-5"
          >
            <Link href="/timer">
              <TimerIcon className="h-4 w-4" />
              <span>Open Timer</span>
            </Link>
          </Button>
        </div>
      </div>

      <div className="inline-flex rounded-full border border-line bg-surface p-1 gap-1">
        {(["overview", "habits"] as DashboardTab[]).map((t) => {
          const active = tab === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => handleTabChange(t)}
              className={cn(
                "min-h-[40px] px-5 rounded-full text-sm font-semibold capitalize flex items-center gap-2 transition-colors",
                active ? "bg-ink text-surface" : "text-ink-muted hover:text-ink"
              )}
            >
              {t === "overview" ? (
                <PieChart className="h-4 w-4" />
              ) : (
                <Repeat2 className="h-4 w-4" />
              )}
              <span>{t === "overview" ? "Overview" : "Habits"}</span>
            </button>
          );
        })}
      </div>

      {tab === "overview" ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <Card className="lg:col-span-5 border-line bg-surface flex flex-col justify-between">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
                    Focus Today
                  </span>
                  <Clock className="h-4 w-4 text-ink-muted" />
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <div className="text-4xl sm:text-5xl font-bold tracking-tight tabular-nums text-ink">
                    {formatDuration(stats.core.timeToday)}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center font-mono text-xs font-semibold px-2.5 py-0.5 rounded-full border border-line",
                        stats.core.momentum >= 0 ? "bg-highlight text-ink" : "bg-surface-soft text-ink"
                      )}
                    >
                      {stats.core.momentum >= 0 ? (
                        <ArrowUpRight className="h-3.5 w-3.5 mr-0.5" />
                      ) : (
                        <ArrowDownRight className="h-3.5 w-3.5 mr-0.5" />
                      )}
                      {Math.abs(Math.round(stats.core.momentum))}% vs last week
                    </span>
                    <span className="text-xs text-ink-muted tabular-nums">
                      {formatDuration(stats.core.timeThisWeek)} this week
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-line/15">
                  <div className="rounded-xl border border-line/15 bg-surface-soft p-3">
                    <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-ink-muted">
                      <span>Avg / Active Day</span>
                      <BarChart3 className="h-3 w-3" />
                    </div>
                    <p className="mt-1 text-lg font-bold tabular-nums text-ink">
                      {formatDuration(stats.core.avgTimePerWeek)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-line/15 bg-surface-soft p-3">
                    <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-ink-muted">
                      <span>30d Avg</span>
                      <Calendar className="h-3 w-3" />
                    </div>
                    <p className="mt-1 text-lg font-bold tabular-nums text-ink">
                      {formatDuration(stats.core.avgTimePerMonth)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-line/15 bg-surface-soft p-3">
                    <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-ink-muted">
                      <span>Avg Block</span>
                      <Activity className="h-3 w-3" />
                    </div>
                    <p className="mt-1 text-lg font-bold tabular-nums text-ink">
                      {formatDuration(stats.core.avgSessionDuration)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-line/15 bg-surface-soft p-3">
                    <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-ink-muted">
                      <span>Longest</span>
                      <Flame className="h-3 w-3" />
                    </div>
                    <p className="mt-1 text-lg font-bold tabular-nums text-ink">
                      {formatDuration(stats.core.longestSession)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-7 border-line bg-surface">
              <CardHeader className="pb-2 border-b border-line/15 flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2 text-ink">
                    <TrendingUp className="h-4 w-4 text-clay" />
                    Last 7 Days
                  </CardTitle>
                  <p className="text-xs text-ink-muted">Daily study minutes (today highlighted)</p>
                </div>
                <span className="font-mono text-[11px] uppercase tracking-wider px-2.5 py-1 rounded-full border border-line/20 bg-surface-soft text-ink-muted">
                  {stats.behavior.rhythm === "Night Owl" ? (
                    <Moon className="h-3 w-3 inline mr-1" />
                  ) : (
                    <Sun className="h-3 w-3 inline mr-1" />
                  )}
                  {stats.behavior.rhythm}
                </span>
              </CardHeader>
              <CardContent className="pt-5">
                <Overview sessions={allSessions} />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <Card className="lg:col-span-7 border-line bg-surface">
              <CardHeader className="pb-3 border-b border-line/15 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2 text-ink">
                    <PieChart className="h-4 w-4 text-clay" />
                    Subject Balance
                  </CardTitle>
                  <p className="text-xs text-ink-muted">Total time and 7-day consistency</p>
                </div>
                <Link
                  href="/subjects"
                  className="font-mono text-[11px] uppercase tracking-wider text-ink-muted hover:text-ink"
                >
                  Manage →
                </Link>
              </CardHeader>
              <CardContent className="pt-5 space-y-5">
                {stats.subjects.distribution.length === 0 ? (
                  <p className="text-sm text-ink-muted">
                    Add subjects to track where your focus hours go.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {stats.subjects.distribution.map((sub, i) => (
                      <div key={i} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="h-2.5 w-2.5 rounded-full border border-line/30 shrink-0"
                              style={{ backgroundColor: sub.color }}
                            />
                            <span className="text-sm font-medium text-ink truncate">
                              {sub.name}
                            </span>
                          </div>
                          <span className="font-mono text-xs tabular-nums text-ink shrink-0">
                            {formatDuration(sub.totalTime)}
                          </span>
                        </div>
                        <div className="h-2.5 w-full rounded-full border border-line/20 bg-surface-soft overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.min(100, Math.max(2, sub.consistency))}%`,
                              backgroundColor: sub.color,
                            }}
                          />
                        </div>
                        <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                          <span>{sub.sessionCount} sessions</span>
                          <span>{Math.round(sub.consistency)}% weekly consistency</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {stats.subjects.neglected.length > 0 && (
                  <div className="rounded-xl border border-line bg-accent-soft/50 p-3.5 flex items-start gap-2.5">
                    <AlertCircle className="h-4 w-4 text-ink shrink-0 mt-0.5" />
                    <div className="text-xs text-ink">
                      <p className="font-semibold">Needs attention</p>
                      <p className="text-ink-muted">
                        No recent sessions in {stats.subjects.neglected.join(", ")}.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-5 border-line bg-surface flex flex-col">
              <CardHeader className="pb-3 border-b border-line/15 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-semibold text-ink">
                  Recent Sessions
                </CardTitle>
                <Link
                  href="/history"
                  className="font-mono text-[11px] uppercase tracking-wider text-ink-muted hover:text-ink"
                >
                  All History →
                </Link>
              </CardHeader>
              <CardContent className="pt-5 flex-1">
                <RecentSessions />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <Card className="lg:col-span-8 border-line bg-surface">
              <CardHeader className="pb-3 border-b border-line/15 flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2 text-ink">
                    <Calendar className="h-4 w-4 text-clay" />
                    Hourly Distribution
                  </CardTitle>
                  <p className="text-xs text-ink-muted">When you typically study during the day</p>
                </div>
                <span className="font-mono text-[11px] px-2.5 py-1 rounded-full border border-line bg-highlight text-ink">
                  Peak: {stats.behavior.bestHour.label}
                </span>
              </CardHeader>
              <CardContent className="pt-5">
                <div className="flex flex-col gap-3 h-[190px] w-full">
                  <div className="flex-1 flex items-end justify-between gap-1 h-full">
                    {stats.behavior.hourHeatmap.map((h, i) => {
                      const maxTotal = stats.behavior.bestHour.total || 1;
                      const percentageHeight = (h.total / maxTotal) * 100;
                      const hasData = h.total > 0;
                      const isPeak = hasData && h.hour === stats.behavior.bestHour.hour;

                      return (
                        <div
                          key={i}
                          title={`${h.label}: ${formatDuration(h.total)}`}
                          className="flex-1 h-full flex flex-col justify-end"
                        >
                          <div
                            className={cn(
                              "w-full rounded-t-sm border",
                              isPeak
                                ? "bg-clay border-line"
                                : hasData
                                  ? "bg-accent-soft border-line/40"
                                  : "bg-surface-soft border-line/15"
                            )}
                            style={{
                              height: `${Math.max(hasData ? 12 : 6, percentageHeight)}%`,
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between border-t border-line/15 pt-2">
                    {[0, 4, 8, 12, 16, 20].map((hour) => (
                      <div key={hour} className="flex-1 text-center">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                          {stats.behavior.hourHeatmap[hour].label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-4 border-line bg-surface flex flex-col justify-between">
              <CardHeader className="pb-3 border-b border-line/15 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-ink">
                  <Users className="h-4 w-4 text-clay" />
                  Study Rooms
                </CardTitle>
                <Link
                  href="/rooms"
                  className="font-mono text-[11px] uppercase tracking-wider text-ink-muted hover:text-ink"
                >
                  All →
                </Link>
              </CardHeader>
              <CardContent className="pt-4 space-y-2.5 flex-1">
                {rooms.length === 0 ? (
                  <Link
                    href="/rooms"
                    className="flex items-center justify-between rounded-xl border border-line/25 bg-surface-soft p-4 text-sm text-ink hover:border-line transition-colors"
                  >
                    <span>Join a study room</span>
                    <ArrowRight className="h-4 w-4 text-ink-muted" />
                  </Link>
                ) : (
                  rooms.slice(0, 3).map((room) => (
                    <Link
                      key={room.id}
                      href={`/rooms/${room.id}`}
                      className="flex items-center justify-between rounded-xl border border-line/25 bg-surface-soft px-3.5 py-3 hover:border-line transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-ink truncate">
                          {room.name}
                        </p>
                        <p className="font-mono text-[11px] text-ink-muted">
                          {room.totalMemberCount} member
                          {room.totalMemberCount !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-ink shrink-0 ml-2" />
                    </Link>
                  ))
                )}

                {stats.insights.length > 0 && (
                  <div className="pt-2 border-t border-line/15 space-y-1.5">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                      Notes
                    </p>
                    {stats.insights.slice(0, 2).map((insight, idx) => (
                      <p key={idx} className="text-xs text-ink leading-relaxed">
                        · {insight}
                      </p>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <HabitAnalytics analytics={habitAnalytics} />
      )}
    </div>
  );
}
