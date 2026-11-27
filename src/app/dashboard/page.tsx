"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Calendar,
  CheckSquare,
  Clock,
  Coffee,
  Download,
  Flame,
  Moon,
  PieChart,
  Repeat2,
  Sparkles,
  Sun,
  Target,
  TrendingUp,
  Users,
  Zap,
  ZapOff,
} from "lucide-react";
import { collection, doc, query, where } from "firebase/firestore";
import { useUser, useFirestore, useCollection, useDoc } from "@/firebase";
import { Session, Subject, User } from "@/lib/definitions";
import { useMyRooms } from "@/hooks/use-room";
import { useDashboardStats } from "@/hooks/use-dashboard-stats";
import { useHabits } from "@/hooks/use-habits";
import { calculateUserLevel } from "@/lib/level";
import {
  buildStudyReportCsv,
  formatDdayBadge,
  formatMinuteOfDay,
  pickMainDday,
} from "@/lib/study-time";
import LoadingScreen from "@/components/app/loading-screen";
import { Overview } from "@/components/app/dashboard/overview";
import { RecentSessions } from "@/components/app/dashboard/recent-sessions";
import { HabitAnalytics } from "@/components/app/dashboard/habit-analytics";
import { YptInsights } from "@/components/app/dashboard/ypt-insights";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type DashboardTab = "overview" | "insights" | "habits";

function formatDuration(seconds: number) {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
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
      if (stored === "overview" || stored === "insights" || stored === "habits") {
        return stored;
      }
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

  const sessionsQuery = useMemo(
    () =>
      user && firestore
        ? query(collection(firestore, "sessions"), where("userId", "==", user.uid))
        : null,
    [user, firestore]
  );
  const subjectsQuery = useMemo(
    () =>
      user && firestore
        ? query(collection(firestore, "subjects"), where("userId", "==", user.uid))
        : null,
    [user, firestore]
  );

  const { data: allSessions, loading: sessionsLoading } = useCollection<Session>(sessionsQuery);
  const { data: allSubjects } = useCollection<Subject>(subjectsQuery);

  const dailyTarget = userData?.settings?.studyTargetHours ?? 2;
  const statsOptions = useMemo(
    () => ({
      dayMeta: userData?.dayMeta,
      todos: userData?.studyTodos,
    }),
    [userData?.dayMeta, userData?.studyTodos]
  );

  const stats = useDashboardStats(allSessions, allSubjects, dailyTarget, statsOptions);
  const { analytics: habitAnalytics } = useHabits(new Date());
  const { rooms } = useMyRooms();

  const mainDday = useMemo(
    () => pickMainDday(userData?.ddays, userData?.mainDdayId),
    [userData?.ddays, userData?.mainDdayId]
  );

  if (userLoading || sessionsLoading || !user || !stats) {
    return <LoadingScreen />;
  }

  const userLevel = calculateUserLevel(stats.core.timeAllTime, stats.core.totalSessions);
  const ddayBadge = mainDday
    ? formatDdayBadge(mainDday.targetDate, stats.periodKeys.todayDateKey)
    : null;

  const handleExportCsv = () => {
    const csv = buildStudyReportCsv(allSessions ?? [], allSubjects ?? [], userData?.dayMeta);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fenrirstudy-report-${stats.periodKeys.todayDateKey}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-7 pb-10">
      {/* Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-muted flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-clay" />
              Study Analytics
            </span>
            <Badge className="bg-highlight text-ink border border-line font-mono text-[11px]">
              Level {userLevel}
            </Badge>
            <Badge variant="outline" className="font-mono text-[11px] gap-1">
              <Flame className="h-3 w-3 text-clay" />
              {stats.core.currentStreak}d Streak
            </Badge>
            {mainDday && ddayBadge && (
              <Link href="/goals">
                <Badge className="bg-clay text-ink border border-line font-mono text-[11px]">
                  {ddayBadge.label} · {mainDday.title}
                </Badge>
              </Link>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-ink">
              Study Overview
            </h1>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="rounded-full border-line bg-surface hover:bg-surface-soft gap-1.5"
            >
              <Download className="h-3.5 w-3.5 text-clay" />
              <span>Export CSV</span>
            </Button>
          </div>

          <p className="text-sm text-ink-muted max-w-xl">
            Today, week, month, focus balance, and study rhythm — all explained clearly at a glance.
          </p>
        </div>

        {/* Dynamic Insights Stack */}
        {stats.insights.length > 0 && (
          <div className="flex flex-col gap-2 lg:max-w-sm w-full">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-clay" />
              Key Takeaways
            </span>
            {stats.insights.map((insight, i) => (
              <div
                key={i}
                className="rounded-2xl border border-line/25 bg-surface px-4 py-2.5 text-xs font-medium text-ink flex items-start gap-2.5"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-clay mt-1.5 shrink-0" />
                <span>{insight}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Editorial Pill Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex flex-wrap gap-1 rounded-full border border-line bg-surface p-1">
          {([
            { id: "overview", label: "Overview", icon: PieChart },
            { id: "insights", label: "Deep Analytics", icon: Sparkles },
            { id: "habits", label: "Habits & To-Dos", icon: Repeat2 },
          ] as const).map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => handleTabChange(t.id)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-colors",
                  active
                    ? "bg-ink text-surface"
                    : "text-ink-muted hover:text-ink hover:bg-surface-soft"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-ink-muted">
          <span>Today To-Dos:</span>
          <Badge variant="outline" className="font-mono text-xs gap-1">
            <CheckSquare className="h-3 w-3 text-clay" />
            {stats.todos.todayCompleted}/{stats.todos.todayTotal} ({stats.todos.todayAchievementPct}%)
          </Badge>
        </div>
      </div>

      {tab === "overview" && (
        <div className="space-y-6">
          {/* Primary Metric Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-line bg-surface rounded-3xl">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                  <span>Focus Today</span>
                  <Clock className="h-3.5 w-3.5 text-clay" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold tabular-nums text-ink">
                  {formatDuration(stats.core.timeToday)}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center font-mono text-[11px] font-semibold px-2 py-0.5 rounded-full border",
                      stats.core.dailyComparisonPct >= 0
                        ? "bg-highlight border-line text-ink"
                        : "bg-surface-soft border-line/30 text-ink-muted"
                    )}
                  >
                    {stats.core.dailyComparisonPct >= 0 ? (
                      <ArrowUpRight className="h-3 w-3 mr-0.5" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3 mr-0.5" />
                    )}
                    {Math.abs(Math.round(stats.core.dailyComparisonPct))}%
                  </span>
                  <span className="font-mono text-[11px] text-ink-muted">
                    Yest: {formatDuration(stats.core.timeYesterday)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-line bg-surface rounded-3xl">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                  <span>Daily Goal ({dailyTarget}h)</span>
                  <Target className="h-3.5 w-3.5 text-clay" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold tabular-nums text-ink">
                  {Math.round(stats.core.goalProgressPct)}%
                </div>
                <p className="font-mono text-[11px] text-ink-muted mt-3">
                  Streak {stats.core.currentStreak}d · Best {stats.core.bestStreak}d
                </p>
              </CardContent>
            </Card>

            <Card className="border-line bg-surface rounded-3xl">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                  <span>Daily Average (Excl. Rest Days)</span>
                  <BarChart3 className="h-3.5 w-3.5 text-clay" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold tabular-nums text-ink">
                  {formatDuration(stats.core.avgExclDayOffSeconds)}
                </div>
                <p className="font-mono text-[11px] text-ink-muted mt-3">
                  This week: {formatDuration(stats.core.timeThisWeek)} · Month: {formatDuration(stats.core.timeThisMonth)}
                </p>
              </CardContent>
            </Card>

            <Card className="border-line bg-surface rounded-3xl">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                  <span>Focus Quality &amp; Best Block</span>
                  <Coffee className="h-3.5 w-3.5 text-clay" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold tabular-nums text-ink">
                  {stats.breaks.focusEfficiencyPct}%
                </div>
                <p className="font-mono text-[11px] text-ink-muted mt-3">
                  Unbroken {formatDuration(stats.core.maxContinuousSeconds)} · All-time {formatDuration(stats.core.timeAllTime)}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-line/30 bg-surface-soft px-4 py-3 flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
                This Week
              </span>
              <span className="font-mono text-sm font-semibold text-ink tabular-nums">
                {formatDuration(stats.core.timeThisWeek)}
              </span>
            </div>
            <div className="rounded-2xl border border-line/30 bg-surface-soft px-4 py-3 flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
                This Month
              </span>
              <span className="font-mono text-sm font-semibold text-ink tabular-nums">
                {formatDuration(stats.core.timeThisMonth)}
              </span>
            </div>
            <div className="rounded-2xl border border-line/30 bg-surface-soft px-4 py-3 flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
                Typical Hours (30d)
              </span>
              <span className="font-mono text-sm font-semibold text-ink tabular-nums">
                {formatMinuteOfDay(stats.schedule.avgStartMinuteOfDay)} → {formatMinuteOfDay(stats.schedule.avgFinishMinuteOfDay)}
              </span>
            </div>
            <div className="rounded-2xl border border-line/30 bg-surface-soft px-4 py-3 flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
                Best Day / Rhythm
              </span>
              <span className="font-mono text-sm font-semibold text-ink flex items-center gap-1.5 tabular-nums">
                {stats.behavior.rhythm === "Night Owl" ? (
                  <Moon className="h-3.5 w-3.5 text-clay" />
                ) : (
                  <Sun className="h-3.5 w-3.5 text-clay" />
                )}
                {stats.core.bestDay ? formatDuration(stats.core.bestDay.seconds) : "0m"} · {stats.behavior.rhythm}
              </span>
            </div>
          </div>

          {/* Trend + Recent Sessions */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <Card className="lg:col-span-8 border-line bg-surface rounded-3xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold flex items-center gap-2 text-ink">
                    <TrendingUp className="h-4 w-4 text-clay" />
                    Last 7 Days Focus
                  </h3>
                  <p className="text-xs text-ink-muted">
                    Midnight-split daily focus duration (today in clay)
                  </p>
                </div>
                <Badge variant="outline" className="font-mono text-xs">
                  Week: {formatDuration(stats.core.timeThisWeek)}
                </Badge>
              </div>
              <Overview sessions={allSessions ?? []} />
            </Card>

            <Card className="lg:col-span-4 border-line bg-surface rounded-3xl overflow-hidden flex flex-col">
              <CardHeader className="border-b border-line/15 py-4 px-5">
                <CardTitle className="text-sm font-semibold text-ink">Recent Sessions</CardTitle>
              </CardHeader>
              <CardContent className="p-4 flex-1 overflow-y-auto max-h-[300px]">
                <RecentSessions />
              </CardContent>
              <div className="p-3 border-t border-line/15 text-center bg-surface-soft">
                <Link
                  href="/history"
                  className="font-mono text-[11px] font-semibold text-ink hover:text-clay uppercase tracking-wider"
                >
                  Open Calendar &amp; Timeline →
                </Link>
              </div>
            </Card>
          </div>

          {/* Subject Balance */}
          <Card className="border-line bg-surface rounded-3xl">
            <CardHeader className="border-b border-line/15 pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-ink">
                <PieChart className="h-4 w-4 text-clay" />
                Subject Focus Balance
              </CardTitle>
              <CardDescription className="text-xs text-ink-muted">
                All-time distribution &amp; 7-day stability per subject
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-5">
              {stats.subjects.distribution.length === 0 ? (
                <p className="text-sm text-ink-muted">Add subjects to view per-subject analytics.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {stats.subjects.distribution.map((sub) => (
                    <div key={sub.id} className="space-y-2 rounded-2xl border border-line/20 bg-surface-soft p-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="h-2.5 w-2.5 rounded-full border border-line/30 shrink-0"
                            style={{ backgroundColor: sub.color }}
                          />
                          <span className="text-sm font-semibold text-ink truncate">{sub.name}</span>
                        </div>
                        <span className="font-mono text-xs font-semibold text-ink tabular-nums">
                          {formatDuration(sub.totalTime)}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-surface border border-line/20 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${sub.consistency}%`, backgroundColor: sub.color }}
                        />
                      </div>
                      <div className="flex justify-between font-mono text-[10px] text-ink-muted">
                        <span>{sub.sessionCount} sessions · Today {formatDuration(sub.todayTime)}</span>
                        <span>{Math.round(sub.consistency)}% week</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {stats.subjects.neglected.length > 0 && (
                <div className="p-3.5 rounded-2xl border border-line/30 bg-accent-soft/40 flex items-center gap-3 text-xs text-ink">
                  <ZapOff className="h-4 w-4 text-clay shrink-0" />
                  <span>
                    Needs attention (inactive 3+ days):{" "}
                    <strong>{stats.subjects.neglected.join(", ")}</strong>
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 24-Hour Rhythm + Habit Study Band */}
          <Card className="border-line bg-surface rounded-3xl">
            <CardHeader className="border-b border-line/15 pb-3 flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-ink">
                  <Calendar className="h-4 w-4 text-clay" />
                  24-Hour Time Distribution
                </CardTitle>
                <CardDescription className="text-xs text-ink-muted">
                  Orange bottom band highlights hours studied on 50%+ of your active days
                </CardDescription>
              </div>
              <Badge className="bg-highlight text-ink border border-line font-mono text-xs">
                Peak: {stats.behavior.bestHour.label}
              </Badge>
            </CardHeader>
            <CardContent className="p-5">
              <div className="flex flex-col gap-2">
                <div className="h-40 flex items-end gap-1">
                  {stats.behavior.hourHeatmap.map((h, i) => {
                    const maxTotal = stats.behavior.bestHour.total || 1;
                    const pct = (h.total / maxTotal) * 100;
                    const hasData = h.total > 0;
                    const isHabit = stats.schedule.habitHourBand[i];
                    return (
                      <div key={i} className="flex-1 h-full flex flex-col justify-end items-center gap-1">
                        <div
                          className={cn(
                            "w-full rounded-t-md border transition-all",
                            hasData
                              ? i === stats.behavior.bestHour.hour
                                ? "bg-clay border-line"
                                : "bg-accent-soft border-line/40"
                              : "bg-surface-soft border-line/15"
                          )}
                          style={{ height: `${Math.max(hasData ? 10 : 5, pct)}%` }}
                          title={`${h.label}: ${formatDuration(h.total)} (${h.activeDayPct}% of studied days)`}
                        />
                        <div
                          className={cn(
                            "w-full h-1.5 rounded-full",
                            isHabit ? "bg-clay" : "bg-surface-muted"
                          )}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between font-mono text-[10px] text-ink-muted pt-1">
                  {[0, 4, 8, 12, 16, 20].map((hr) => (
                    <span key={hr}>{stats.behavior.hourHeatmap[hr].label}</span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active Rooms */}
          <div className="space-y-3">
            <h3 className="font-mono text-xs uppercase tracking-[0.14em] text-ink-muted flex items-center gap-2">
              <Users className="h-4 w-4 text-clay" />
              Study Rooms
            </h3>
            {rooms.length === 0 ? (
              <Link
                href="/rooms"
                className="block rounded-2xl border border-line bg-surface px-5 py-4 text-sm text-ink-muted hover:bg-surface-soft transition-colors"
              >
                Join or create a study room to study live with peers →
              </Link>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {rooms.map((room) => (
                  <Link
                    key={room.id}
                    href={`/rooms/${room.id}`}
                    className="rounded-2xl border border-line bg-surface px-4 py-3.5 flex items-center justify-between hover:bg-surface-soft transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-ink truncate">{room.name}</p>
                      <p className="text-xs text-ink-muted">
                        {room.totalMemberCount} member{room.totalMemberCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <span className="font-mono text-xs font-semibold text-clay shrink-0 ml-3">
                      Open →
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "insights" && (
        <YptInsights
          stats={stats}
          sessions={allSessions ?? []}
          subjects={allSubjects ?? []}
          dayMeta={userData?.dayMeta}
          todos={userData?.studyTodos}
        />
      )}

      {tab === "habits" && (
        <div className="space-y-6">
          <HabitAnalytics analytics={habitAnalytics} />
          <Card className="border-line bg-surface rounded-3xl">
            <CardContent className="p-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
                  Subject To-Dos &amp; Carry-Over
                </p>
                <p className="text-base font-semibold text-ink mt-1">
                  Today: {stats.todos.todayCompleted} / {stats.todos.todayTotal} tasks done ({stats.todos.todayAchievementPct}%)
                </p>
                <p className="text-xs text-ink-muted">
                  7-day achievement: {stats.todos.completed7d} / {stats.todos.total7d} completed
                </p>
              </div>
              <Button asChild className="rounded-full bg-clay text-ink border border-line hover:bg-clay/90 font-semibold">
                <Link href="/routine">Open Routine &amp; To-Dos →</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
