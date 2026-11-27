"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coffee,
  Download,
  Moon,
  Plus,
  Star,
  Trophy,
  Zap,
} from "lucide-react";
import { collection, orderBy, query, where } from "firebase/firestore";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { useCollection, useFirestore, useUser } from "@/firebase";
import { Session, Subject } from "@/lib/definitions";
import { BREAK_TAGS, useYptExtras } from "@/hooks/use-ypt-extras";
import {
  buildStudyReportCsv,
  CalendarSessionSlice,
  computeStudyStatistics,
  formatDdayBadge,
} from "@/lib/study-time";
import { useToast } from "@/hooks/use-toast";
import LoadingScreen from "@/components/app/loading-screen";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  const { toast } = useToast();

  const {
    userData,
    ddays,
    dayMeta,
    toggleDayOff,
    saveClosingDiary,
    addBreakLog,
    addManualSession,
  } = useYptExtras();

  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => startOfMonth(new Date()));
  const [selectedCalDate, setSelectedCalDate] = useState<string>(() => format(new Date(), "yyyy-MM-dd"));

  const [manualOpen, setManualOpen] = useState(false);
  const [manualSubId, setManualSubId] = useState("");
  const [manualStart, setManualStart] = useState("09:00");
  const [manualEnd, setManualEnd] = useState("10:00");

  const [breakOpen, setBreakOpen] = useState(false);
  const [breakStart, setBreakStart] = useState("12:00");
  const [breakEnd, setBreakEnd] = useState("12:20");
  const [breakTag, setBreakTag] = useState<string>(BREAK_TAGS[0]);

  const [closingRating, setClosingRating] = useState(0);
  const [closingComment, setClosingComment] = useState("");

  const selectedMeta = dayMeta[selectedCalDate];
  useEffect(() => {
    setClosingRating(selectedMeta?.closingRating ?? 0);
    setClosingComment(selectedMeta?.closingComment ?? "");
  }, [selectedCalDate, selectedMeta?.closingRating, selectedMeta?.closingComment]);

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
  const { data: subjects, loading: subjectsLoading } = useCollection<Subject>(subjectsQuery);

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
  const { data: sessions, loading: sessionsLoading } = useCollection<Session>(sessionsQuery);

  const activeSubjects = useMemo(
    () => (subjects ?? []).filter((s) => !s.archived),
    [subjects]
  );

  useEffect(() => {
    if (!manualSubId && activeSubjects.length > 0) {
      setManualSubId(activeSubjects[0].id);
    }
  }, [activeSubjects, manualSubId]);

  const subjectsMap = useMemo(() => {
    if (!subjects) return new Map<string, Subject>();
    return new Map(subjects.map((s) => [s.id, s]));
  }, [subjects]);

  const ddayDatesSet = useMemo(
    () => new Set(ddays.map((d) => d.targetDate)),
    [ddays]
  );

  const stats = useMemo(() => {
    if (!sessions) return null;
    return computeStudyStatistics(
      sessions,
      subjects ?? [],
      userData?.settings?.studyTargetHours ?? 2,
      Date.now(),
      { dayMeta, todos: userData?.studyTodos }
    );
  }, [sessions, subjects, userData?.settings?.studyTargetHours, dayMeta, userData?.studyTodos]);

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

  const handleSaveManual = async () => {
    const ok = await addManualSession(manualSubId, selectedCalDate, manualStart, manualEnd);
    if (ok) {
      toast({ title: "Manual study log saved" });
      setManualOpen(false);
    } else {
      toast({
        title: "Invalid range",
        description: "End time must be 1 minute to 9 hours after start time.",
        variant: "destructive",
      });
    }
  };

  const handleSaveBreak = async () => {
    const ok = await addBreakLog(selectedCalDate, breakStart, breakEnd, breakTag);
    if (ok) {
      toast({ title: `${breakTag} break logged` });
      setBreakOpen(false);
    } else {
      toast({
        title: "Invalid break range",
        description: "Break must be between 1 minute and 3 hours.",
        variant: "destructive",
      });
    }
  };

  const handleExportCsv = () => {
    const csv = buildStudyReportCsv(sessions ?? [], subjects ?? [], dayMeta);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fenrirstudy-history-${todayKey}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Visual 24-hour timeline geometry for selected date
  const selectedDayStartMs = (() => {
    const [y, m, d] = selectedCalDate.split("-").map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
  })();

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
                {session.source === "manual" ? "manual" : session.mode}
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

  const selectedDayDdays = ddays.filter((d) => d.targetDate === selectedCalDate);

  return (
    <div className="space-y-7 pb-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-muted">
            Calendar, 24h Timeline &amp; Daily Closing
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-ink">History &amp; Planner</h1>
          <p className="text-sm text-ink-muted mt-0.5">
            Automatic cross-midnight day splitting, manual study/break logs, Day Off protection &amp; closing reflection.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {stats.core.bestDay && (
            <div className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-soft px-3.5 py-1.5 text-xs">
              <Trophy className="h-3.5 w-3.5 text-clay" />
              <span className="text-ink-muted">Best day:</span>
              <span className="font-mono font-semibold text-ink">
                {formatDuration(stats.core.bestDay.seconds)}
              </span>
            </div>
          )}
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
      </div>

      {/* Calendar + Selected Day Timeline, Closing Diary & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <Card className="lg:col-span-6 border-line bg-surface rounded-3xl h-fit">
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
                const meta = dayMeta[dk];
                const isDayOff = Boolean(meta?.isDayOff);
                const hasDday = ddayDatesSet.has(dk);
                const selected = selectedCalDate === dk;
                const level = sec <= 0 ? 0 : sec < 3600 ? 1 : sec < 7200 ? 2 : sec < 14400 ? 3 : 4;
                return (
                  <button
                    key={dk}
                    type="button"
                    onClick={() => setSelectedCalDate(dk)}
                    className={cn(
                      "rounded-xl border p-1.5 min-h-[54px] flex flex-col items-center justify-between transition-all relative",
                      !inMonth && "opacity-35",
                      isDayOff && sec === 0 ? "bg-highlight/70 border-line/40" : HEATMAP_STYLES[level],
                      selected && "ring-2 ring-ink ring-offset-1"
                    )}
                  >
                    <span className={cn("font-mono text-[11px]", level >= 3 ? "text-surface font-semibold" : "text-ink")}>
                      {format(day, "d")}
                    </span>
                    <span className={cn("font-mono text-[9px] tabular-nums", level >= 3 ? "text-surface/90" : "text-ink-muted")}>
                      {sec > 0 ? `${Math.round(sec / 60)}m` : isDayOff ? "OFF" : "·"}
                    </span>
                    {hasDday && (
                      <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-danger" />
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-6 border-line bg-surface rounded-3xl flex flex-col">
          <CardHeader className="pb-3 border-b border-line/15 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="font-mono text-xs uppercase tracking-[0.14em] text-ink">
                  {format(parseISO(selectedCalDate), "EEE, MMM d, yyyy")}
                </CardTitle>
                <p className="font-mono text-xs text-ink-muted mt-0.5">
                  Focus {selectedDayRecord ? formatDuration(selectedDayRecord.totalSeconds) : "0m"} · Break {selectedDayRecord ? formatDuration(selectedDayRecord.breakSeconds) : "0m"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {selectedDayDdays.map((d) => (
                  <Badge key={d.id} className="bg-danger text-surface font-mono text-[10px]">
                    {formatDdayBadge(d.targetDate, todayKey).label} · {d.title}
                  </Badge>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant={selectedMeta?.isDayOff ? "default" : "outline"}
                  onClick={() => toggleDayOff(selectedCalDate, !selectedMeta?.isDayOff)}
                  className={cn(
                    "h-8 rounded-full text-xs gap-1",
                    selectedMeta?.isDayOff
                      ? "bg-highlight text-ink border border-line hover:bg-highlight/90"
                      : "border-line"
                  )}
                >
                  <Moon className="h-3 w-3" />
                  <span>{selectedMeta?.isDayOff ? "Day Off Active" : "Set Day Off"}</span>
                </Button>
              </div>
            </div>

            {/* 24-Hour Visual Study Timeline Bar */}
            <div className="space-y-1 pt-1">
              <div className="relative h-5 w-full rounded-full border border-line/30 bg-surface-soft overflow-hidden">
                {(selectedDayRecord?.slices ?? []).map((sl) => {
                  const sub = subjectsMap.get(sl.session.subjectId);
                  const leftPct = Math.max(0, Math.min(100, ((sl.sliceStartMs - selectedDayStartMs) / 86_400_000) * 100));
                  const widthPct = Math.max(0.8, ((sl.sliceEndMs - sl.sliceStartMs) / 86_400_000) * 100);
                  return (
                    <div
                      key={`${sl.session.id}_${sl.sliceStartMs}`}
                      className="absolute top-0 bottom-0"
                      style={{
                        left: `${leftPct}%`,
                        width: `${widthPct}%`,
                        backgroundColor: sub?.color || "var(--accent)",
                      }}
                      title={`${sub?.name || "Study"}: ${formatDuration(sl.sliceSeconds)}`}
                    />
                  );
                })}
                {(selectedMeta?.breaks ?? []).map((b) => {
                  const bs = Date.parse(b.startTime);
                  const be = Date.parse(b.endTime);
                  if (!bs || be <= bs) return null;
                  const leftPct = Math.max(0, Math.min(100, ((bs - selectedDayStartMs) / 86_400_000) * 100));
                  const widthPct = Math.max(0.8, ((be - bs) / 86_400_000) * 100);
                  return (
                    <div
                      key={b.id}
                      className="absolute top-0 bottom-0 bg-highlight/85"
                      style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                      title={`Break (${b.tag}): ${formatDuration(b.durationSeconds)}`}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between font-mono text-[9px] text-ink-muted">
                <span>00:00</span>
                <span>06:00</span>
                <span>12:00</span>
                <span>18:00</span>
                <span>24:00</span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-5 space-y-4">
            {/* Manual Study Log & Tagged Break Triggers */}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setManualOpen((v) => !v);
                  setBreakOpen(false);
                }}
                className="rounded-full border-line text-xs gap-1.5"
              >
                <Plus className="h-3.5 w-3.5 text-clay" />
                <span>Log Manual Study</span>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setBreakOpen((v) => !v);
                  setManualOpen(false);
                }}
                className="rounded-full border-line text-xs gap-1.5"
              >
                <Coffee className="h-3.5 w-3.5 text-clay" />
                <span>Log Break Tag</span>
              </Button>
            </div>

            {manualOpen && (
              <div className="rounded-2xl border border-line bg-surface-soft p-3.5 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <select
                    value={manualSubId}
                    onChange={(e) => setManualSubId(e.target.value)}
                    className="h-9 rounded-xl border border-line bg-surface px-2.5 text-xs text-ink"
                  >
                    {activeSubjects.length === 0 && <option value="general">General Study</option>}
                    {activeSubjects.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <Input
                    type="time"
                    value={manualStart}
                    onChange={(e) => setManualStart(e.target.value)}
                    className="h-9 text-xs bg-surface"
                  />
                  <Input
                    type="time"
                    value={manualEnd}
                    onChange={(e) => setManualEnd(e.target.value)}
                    className="h-9 text-xs bg-surface"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" size="sm" variant="ghost" onClick={() => setManualOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSaveManual}
                    className="rounded-full bg-clay text-ink border border-line"
                  >
                    Save Session
                  </Button>
                </div>
              </div>
            )}

            {breakOpen && (
              <div className="rounded-2xl border border-line bg-surface-soft p-3.5 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <select
                    value={breakTag}
                    onChange={(e) => setBreakTag(e.target.value)}
                    className="h-9 rounded-xl border border-line bg-surface px-2.5 text-xs text-ink"
                  >
                    {BREAK_TAGS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <Input
                    type="time"
                    value={breakStart}
                    onChange={(e) => setBreakStart(e.target.value)}
                    className="h-9 text-xs bg-surface"
                  />
                  <Input
                    type="time"
                    value={breakEnd}
                    onChange={(e) => setBreakEnd(e.target.value)}
                    className="h-9 text-xs bg-surface"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" size="sm" variant="ghost" onClick={() => setBreakOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSaveBreak}
                    className="rounded-full bg-clay text-ink border border-line"
                  >
                    Save Break
                  </Button>
                </div>
              </div>
            )}

            {/* Slices for Selected Date */}
            <div className="space-y-2 max-h-[240px] overflow-y-auto">
              {selectedDayRecord && selectedDayRecord.slices.length > 0 ? (
                selectedDayRecord.slices.map(renderSliceCard)
              ) : (
                <div className="py-6 text-center text-xs text-ink-muted rounded-2xl border border-dashed border-line/30">
                  No study sessions logged on {selectedCalDate}.
                </div>
              )}
              {(selectedMeta?.breaks ?? []).map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between rounded-xl border border-line/20 bg-highlight/25 px-3.5 py-2 text-xs"
                >
                  <span className="font-medium text-ink flex items-center gap-1.5">
                    <Coffee className="h-3.5 w-3.5 text-clay" /> Break · {b.tag}
                  </span>
                  <span className="font-mono text-ink-muted tabular-nums">
                    {formatDuration(b.durationSeconds)}
                  </span>
                </div>
              ))}
            </div>

            {/* Daily Closing Reflection & Rating */}
            <div className="rounded-2xl border border-line/25 bg-surface-soft p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                  Daily Closing Diary
                </span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setClosingRating(star)}
                      className="p-0.5"
                      aria-label={`Rate ${star} stars`}
                    >
                      <Star
                        className={cn(
                          "h-4 w-4 transition-colors",
                          star <= closingRating ? "fill-clay text-clay" : "text-ink-muted"
                        )}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Input
                  value={closingComment}
                  onChange={(e) => setClosingComment(e.target.value)}
                  placeholder="Closing note for today..."
                  className="h-9 text-xs bg-surface flex-1"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={async () => {
                    await saveClosingDiary(selectedCalDate, closingRating, closingComment);
                    toast({ title: "Closing reflection saved" });
                  }}
                  className="h-9 rounded-full bg-ink text-surface text-xs px-4"
                >
                  Save
                </Button>
              </div>
            </div>
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
                    data.isDayOff && data.seconds === 0 ? "bg-highlight border-line/40" : HEATMAP_STYLES[data.level]
                  )}
                  title={`${format(parseISO(data.dateKey), "MMM d")}: ${Math.round(data.seconds / 60)} minutes${data.isDayOff ? " (Day Off)" : ""}`}
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
