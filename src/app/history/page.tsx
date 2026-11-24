"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  Zap,
  BarChart3,
  ChevronDown,
} from "lucide-react";
import { collection, query, where, orderBy } from "firebase/firestore";
import { format, subDays, isSameDay, eachDayOfInterval } from "date-fns";
import { useUser, useCollection, useFirestore } from "@/firebase";
import { Subject, Session } from "@/lib/definitions";
import LoadingScreen from "@/components/app/loading-screen";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
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

  const toggleDate = (date: string) => {
    setExpandedDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

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

  const heatmapData = useMemo(() => {
    if (!sessions) return [];
    const last30Days = eachDayOfInterval({
      start: subDays(new Date(), 29),
      end: new Date(),
    });

    return last30Days.map((day) => {
      const daySessions = sessions.filter((s) =>
        isSameDay(new Date(s.startTime), day)
      );
      const totalDuration = daySessions.reduce((acc, s) => acc + s.duration, 0);
      return {
        day,
        totalDuration,
        level:
          totalDuration === 0
            ? 0
            : totalDuration < 3600
              ? 1
              : totalDuration < 7200
                ? 2
                : totalDuration < 14400
                  ? 3
                  : 4,
      };
    });
  }, [sessions]);

  const { todaySessions, pastSessionsGrouped } = useMemo(() => {
    if (!sessions) return { todaySessions: [], pastSessionsGrouped: [] };

    const today = new Date();
    const todayList: Session[] = [];
    const pastGroups: Record<string, Session[]> = {};

    sessions.forEach((s) => {
      const sessionDate = new Date(s.startTime);
      if (isSameDay(sessionDate, today)) {
        todayList.push(s);
      } else {
        const dateKey = format(sessionDate, "yyyy-MM-dd");
        if (!pastGroups[dateKey]) pastGroups[dateKey] = [];
        pastGroups[dateKey].push(s);
      }
    });

    return {
      todaySessions: todayList,
      pastSessionsGrouped: Object.entries(pastGroups).sort((a, b) =>
        b[0].localeCompare(a[0])
      ),
    };
  }, [sessions]);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push("/login");
    }
  }, [user, userLoading, router]);

  if (userLoading || subjectsLoading || sessionsLoading || !user) {
    return <LoadingScreen />;
  }

  const renderSessionCard = (session: Session) => {
    const subject = subjectsMap.get(session.subjectId);
    return (
      <div
        key={session.id}
        className="flex items-center justify-between gap-3 rounded-xl border border-line/20 bg-surface-soft px-4 py-3"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="h-3 w-3 rounded-full border border-line/40 shrink-0"
            style={{ backgroundColor: subject?.color || "var(--surface-muted)" }}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-sm text-ink truncate">
                {subject?.name || "General Study"}
              </h4>
              <Badge variant="outline" className="font-mono text-[10px] uppercase">
                {session.mode}
              </Badge>
            </div>
            <div className="flex items-center gap-3 mt-1 font-mono text-[11px] text-ink-muted">
              <span className="flex items-center gap-1 tabular-nums">
                <Clock className="h-3 w-3" /> {formatDuration(session.duration)}
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
          <p className="font-mono text-[11px] text-ink">
            {format(new Date(session.startTime), "p")}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-7 pb-8">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-muted">
          Session Log
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-ink">History</h1>
        <p className="text-sm text-ink-muted mt-0.5">
          Review the past 30 days of focus intensity and session records.
        </p>
      </div>

      <Card className="border-line bg-surface rounded-3xl">
        <CardHeader className="pb-3 border-b border-line/15">
          <CardTitle className="font-mono text-xs uppercase tracking-[0.14em] flex items-center gap-2 text-ink">
            <BarChart3 className="h-4 w-4 text-clay" />
            30-Day Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 overflow-x-auto">
          <div className="flex gap-1.5 min-w-max">
            {heatmapData.map((data, i) => (
              <div key={i} className="flex flex-col gap-1.5 items-center">
                <div
                  className={cn(
                    "w-4 h-4 rounded-[4px] border",
                    HEATMAP_STYLES[data.level]
                  )}
                  title={`${format(data.day, "MMM d")}: ${Math.round(
                    data.totalDuration / 60
                  )} minutes`}
                />
                {i % 7 === 0 && (
                  <span className="font-mono text-[9px] text-ink-muted uppercase">
                    {format(data.day, "MMM d")}
                  </span>
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-end gap-2 mt-4 font-mono text-[10px] text-ink-muted uppercase tracking-wider">
            <span>Less</span>
            <div className="flex gap-1">
              {HEATMAP_STYLES.map((cls, idx) => (
                <div key={idx} className={cn("w-2.5 h-2.5 rounded-[3px] border", cls)} />
              ))}
            </div>
            <span>More</span>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <section className="space-y-3">
          <div className="flex items-center gap-2.5">
            <Clock className="h-4 w-4 text-clay" />
            <h2 className="text-lg font-semibold text-ink">Today&apos;s Sessions</h2>
          </div>

          <div className="space-y-2.5">
            {todaySessions.length > 0 ? (
              todaySessions.map(renderSessionCard)
            ) : (
              <div className="py-8 text-center rounded-2xl border border-dashed border-line/30 bg-surface">
                <p className="text-sm text-ink-muted">No sessions recorded today yet.</p>
              </div>
            )}
          </div>
        </section>

        <section className="space-y-3 pt-2 border-t border-line/15">
          <div className="flex items-center gap-2.5">
            <Calendar className="h-4 w-4 text-ink-muted" />
            <h2 className="text-lg font-semibold text-ink">Previous Days</h2>
          </div>

          <div className="space-y-2.5">
            {pastSessionsGrouped.length > 0 ? (
              pastSessionsGrouped.map(([dateKey, entries]) => {
                const isExpanded = expandedDates.has(dateKey);
                const totalDay = entries.reduce((acc, s) => acc + s.duration, 0);

                return (
                  <div
                    key={dateKey}
                    className="rounded-2xl border border-line bg-surface overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => toggleDate(dateKey)}
                      className="w-full flex items-center justify-between px-4 sm:px-5 py-3.5 text-left hover:bg-surface-soft transition-colors min-h-[56px]"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={cn(
                            "h-9 w-9 rounded-xl border border-line/20 flex items-center justify-center shrink-0",
                            isExpanded ? "bg-clay text-ink border-line" : "bg-surface-soft text-ink-muted"
                          )}
                        >
                          <Calendar className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-ink truncate">
                            {format(new Date(dateKey), "EEEE, MMMM d")}
                          </h3>
                          <p className="font-mono text-[11px] text-ink-muted tabular-nums">
                            {entries.length} {entries.length === 1 ? "session" : "sessions"} ·{" "}
                            {formatDuration(totalDay)}
                          </p>
                        </div>
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
                        {entries.map(renderSessionCard)}
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
