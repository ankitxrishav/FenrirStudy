"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar as CalendarIcon,
  Clock,
  Zap,
  BarChart3,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Trophy,
} from "lucide-react";
import { collection, query, where, orderBy } from "firebase/firestore";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  parseISO,
} from "date-fns";
import { useUser, useCollection, useFirestore, useDoc } from "@/firebase";
import { Subject, Session, User } from "@/lib/definitions";
import { doc } from "firebase/firestore";
import { computeStudyStatistics, CalendarSessionSlice } from "@/lib/study-time";
import LoadingScreen from "@/components/app/loading-screen";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function formatDuration(seconds: number) {
  const sTotal = Math.max(0, Math.round(seconds));
  const h = Math.floor(sTotal / 3600);
  const m = Math.floor((sTotal % 3600) / 60);
  const s = sTotal % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

const HEATMAP_STYLES = [
  "bg-surface-muted border-line/15",
  "bg-accent-soft/50 border-line/25",
  "bg-accent-soft border-line/35",
  "bg-clay/65 border-line/60",
  "bg-clay border-line",
];

export default function HistoryPage() {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => startOfMonth(new Date()));
  const [selectedCalDate, setSelectedCalDate] = useState<string>(() => format(new Date(), "yyyy-MM-dd"));

  const toggleDate = (date: string) => {
    setExpandedDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  const userDocRef = useMemo(
    () => (user && firestore ? doc(firestore, "users", user.uid) : null),
    [user, firestore]
  );
  const { data: userData } = useDoc<User>(userDocRef);

  const subjectsQuery = useMemo(
    () =>
      user && firestore
        ? query(collection(firestore, "subjects"), where("userId", "==", user.uid))
        : null,
    [user, firestore]
  );
  const { data: subjects, loading: subjectsLoading } =
    useCollection<Subject>(subjectsQuery);

  const sessionsQuery = useMemo(
    () =>
      user && firestore
        ? query(
            collection(firestore, "sessions"),
            where("userId", "==", user.uid),
            orderBy("startTime", "desc")
          )
        : null,
    [user, firestore]
  );
  const { data: sessions, loading: sessionsLoading } =
    useCollection<Session>(sessionsQuery);

  const subjectsMap = useMemo(() => {
    if (!subjects) return new Map<string, Subject>();
    return new Map(subjects.map((s) => [s.id, s]));
  }, [subjects]);

  const stats = useMemo(() => {
    if (!sessions) return null;
    return computeStudyStatistics(
      sessions,
      subjects ?? [],
      userData?.settings?.studyTargetHours ?? 2
    );
  }, [sessions, subjects, userData?.settings?.studyTargetHours]);

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(calendarMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(calendarMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [calendarMonth]);

  const todayKey = stats?.periodKeys.todayDateKey ?? format(new Date(), "yyyy-MM-dd");
  const todaySlices = stats?.calendarByDate[todayKey]?.slices ?? [];

  const pastDaysGrouped = useMemo(() => {
    if (!stats) return [];
    return Object.values(stats.calendarByDate)
      .filter((rec) => rec.dateKey !== todayKey && rec.totalSeconds > 0)
      .sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  }, [stats, todayKey]);

  const selectedDayRecord = stats?.calendarByDate[selectedCalDate] ?? null;

  useEffect(() => {
    if (!userLoading && !user) {
      router.push("/login");
    }
  }, [user, userLoading, router]);

  if (userLoading || subjectsLoading || sessionsLoading || !user || !stats) {
    return <LoadingScreen />;
  }

  const renderSliceCard = (slice: CalendarSessionSlice) => {
    const session = slice.session;
    const subject = subjectsMap.get(session.subjectId);
    const startLabel = format(new Date(slice.sliceStartMs), "p");
    const endLabel = slice.continuesIntoNextDay
      ? "12:00 AM"
      : format(new Date(slice.sliceEndMs), "p");

    return (
      <div
        key={`${session.id}_${slice.dateKey}_${slice.sliceStartMs}`}
        className="flex items-center justify-between gap-3 rounded-xl border border-line/20 bg-surface-soft px-4 py-3"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="h-3 w-3 rounded-full border border-line/40 shrink-0"
            style={{ backgroundColor: subject?.color || "var(--surface-muted)" }}
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-medium text-sm text-ink truncate">
                {subject?.name || "General Study"}
              </h4>
              <Badge variant="outline" className="font-mono text-[10px] uppercase">
                {session.mode}
              </Badge>
              {slice.isCrossMidnight && (
                <Badge variant="secondary" className="font-mono text-[10px]">
                  {slice.continuesFromPrevDay ? "From prev day" : "Crosses midnight"}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 font-mono text-[11px] text-ink-muted">
              <span className="flex items-center gap-1 tabular-nums">
                <Clock className="h-3 w-3" /> {formatDuration(slice.sliceSeconds)}
              </span>
              <span className="flex items-center gap-1 tabular-nums">
                <Zap className="h-3 w-3" /> {session.focusScore}%
              </span>
            </div>
          </div>
        </div>

        <div className="text-right shrink-0">
          <p className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
            {session.status}
          </p>
          <p className="font-mono text-[11px] text-ink tabular-nums">
            {startLabel} – {endLabel}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-7 pb-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-muted">
            Session Log &amp; Calendar
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-ink">History</h1>
          <p className="text-sm text-ink-muted mt-0.5">
            Calendar-accurate study history with automatic cross-midnight day splitting.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {stats.core.bestDay && (
            <div className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-soft px-3.5 py-1.5 text-xs">
              <Trophy className="h-3.5 w-3.5 text-clay" />
              <span className="text-ink-muted">Best day:</span>
              <span className="font-mono font-semibold text-ink">
                {formatDuration(stats.core.bestDay.seconds)}
              </span>
            </div>
          )}
          <div className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-soft px-3.5 py-1.5 text-xs">
            <span className="text-ink-muted">Total:</span>
            <span className="font-mono font-semibold text-ink">
              {formatDuration(stats.core.timeAllTime)}
            </span>
          </div>
        </div>
      </div>

      {/* YPT-Inspired Monthly Study Calendar + Selected Day Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <Card className="lg:col-span-7 border-line bg-surface rounded-3xl">
          <CardHeader className="pb-3 border-b border-line/15 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="font-mono text-xs uppercase tracking-[0.14em] flex items-center gap-2 text-ink">
              <CalendarIcon className="h-4 w-4 text-clay" />
              {format(calendarMonth, "MMMM yyyy")}
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={() => setCalendarMonth((m) => subMonths(m, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={() => setCalendarMonth((m) => addMonths(m, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-5">
            <div className="grid grid-cols-7 gap-1.5 mb-2 text-center font-mono text-[10px] uppercase text-ink-muted">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {calendarDays.map((day) => {
                const dk = format(day, "yyyy-MM-dd");
                const inMonth = isSameMonth(day, calendarMonth);
                const rec = stats.calendarByDate[dk];
                const sec = rec?.totalSeconds ?? 0;
                const selected = selectedCalDate === dk;
                const level = sec <= 0 ? 0 : sec < 3600 ? 1 : sec < 7200 ? 2 : sec < 14400 ? 3 : 4;
                return (
                  <button
                    key={dk}
                    type="button"
                    onClick={() => setSelectedCalDate(dk)}
                    className={cn(
                      "rounded-xl border p-1.5 min-h-[52px] flex flex-col items-center justify-between transition-all",
                      !inMonth && "opacity-35",
                      HEATMAP_STYLES[level],
                      selected && "ring-2 ring-ink ring-offset-1"
                    )}
                  >
                    <span className={cn("font-mono text-[11px]", level >= 3 ? "text-surface font-semibold" : "text-ink")}>
                      {format(day, "d")}
                    </span>
                    <span className={cn("font-mono text-[9px] tabular-nums", level >= 3 ? "text-surface/90" : "text-ink-muted")}>
                      {sec > 0 ? `${Math.round(sec / 60)}m` : "·"}
                    </span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-5 border-line bg-surface rounded-3xl flex flex-col">
          <CardHeader className="pb-3 border-b border-line/15">
            <CardTitle className="font-mono text-xs uppercase tracking-[0.14em] text-ink flex items-center justify-between">
              <span>{format(parseISO(selectedCalDate), "EEE, MMM d, yyyy")}</span>
              <span className="font-mono text-xs font-bold text-clay">
                {selectedDayRecord ? formatDuration(selectedDayRecord.totalSeconds) : "0m"}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-2.5 flex-1 overflow-y-auto max-h-[380px]">
            {selectedDayRecord && selectedDayRecord.slices.length > 0 ? (
              selectedDayRecord.slices.map(renderSliceCard)
            ) : (
              <div className="py-12 text-center text-sm text-ink-muted">
                No study sessions logged on this calendar date.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 30-Day Activity Strip */}
      <Card className="border-line bg-surface rounded-3xl">
        <CardHeader className="pb-3 border-b border-line/15">
          <CardTitle className="font-mono text-xs uppercase tracking-[0.14em] flex items-center gap-2 text-ink">
            <BarChart3 className="h-4 w-4 text-clay" />
            30-Day Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 overflow-x-auto">
          <div className="flex gap-1.5 min-w-max">
            {stats.trends.heatmap30Days.map((data, i) => (
              <div key={data.dateKey} className="flex flex-col gap-1.5 items-center">
                <button
                  type="button"
                  onClick={() => setSelectedCalDate(data.dateKey)}
                  className={cn(
                    "w-4 h-4 rounded-[4px] border transition-transform hover:scale-110",
                    HEATMAP_STYLES[data.level]
                  )}
                  title={`${format(parseISO(data.dateKey), "MMM d")}: ${Math.round(data.seconds / 60)} minutes`}
                />
                {i % 7 === 0 && (
                  <span className="font-mono text-[9px] text-ink-muted uppercase">
                    {format(parseISO(data.dateKey), "MMM d")}
                  </span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <Clock className="h-4 w-4 text-clay" />
              <h2 className="text-lg font-semibold text-ink">Today&apos;s Sessions</h2>
            </div>
            <span className="font-mono text-xs text-ink-muted">
              {formatDuration(stats.core.timeToday)}
            </span>
          </div>

          <div className="space-y-2.5">
            {todaySlices.length > 0 ? (
              todaySlices.map(renderSliceCard)
            ) : (
              <div className="py-10 text-center rounded-2xl border border-dashed border-line/30 bg-surface">
                <p className="text-sm text-ink-muted">No sessions completed today yet.</p>
              </div>
            )}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2.5">
            <CalendarIcon className="h-4 w-4 text-clay" />
            <h2 className="text-lg font-semibold text-ink">Past Activity</h2>
          </div>

          <div className="space-y-2.5">
            {pastDaysGrouped.length > 0 ? (
              pastDaysGrouped.map((rec) => {
                const isExpanded = expandedDates.has(rec.dateKey);
                return (
                  <div
                    key={rec.dateKey}
                    className="rounded-2xl border border-line bg-surface overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => toggleDate(rec.dateKey)}
                      className="w-full px-4 sm:px-5 py-3.5 flex items-center justify-between text-left hover:bg-surface-soft transition-colors"
                    >
                      <div>
                        <p className="font-semibold text-sm text-ink">
                          {format(parseISO(rec.dateKey), "EEEE, MMMM do")}
                        </p>
                        <p className="font-mono text-[11px] text-ink-muted mt-0.5 tabular-nums">
                          {rec.sessionCount} {rec.sessionCount === 1 ? "session" : "sessions"} ·{" "}
                          {formatDuration(rec.totalSeconds)}
                        </p>
                      </div>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 text-ink-muted transition-transform shrink-0",
                          isExpanded && "rotate-180 text-ink"
                        )}
                      />
                    </button>

                    {isExpanded && (
                      <div className="px-4 sm:px-5 pb-4 pt-2 border-t border-line/15 space-y-2">
                        {rec.slices.map(renderSliceCard)}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="py-10 text-center rounded-2xl border border-dashed border-line/30 bg-surface">
                <p className="text-sm text-ink-muted">No historical sessions logged yet.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
