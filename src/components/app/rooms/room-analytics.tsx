"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { BarChart2 } from "lucide-react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { subDays, startOfDay } from "date-fns";
import { useFirestore } from "@/firebase";
import { RoomMember, Session } from "@/lib/definitions";
import { cn } from "@/lib/utils";
import { resolveSessionIntervals, splitIntervalByLocalDays, formatLocalDateKey, startOfLocalDayMs, addLocalDaysMs } from "@/lib/study-time";

interface RoomAnalyticsProps {
  roomId: string;
  members: RoomMember[];
}

interface DayData {
  date: string;
  totalSeconds: number;
}

interface SubjectData {
  subjectId: string;
  totalSeconds: number;
  name: string;
  color?: string;
}

function getHeatLevel(hours: number): string {
  if (hours === 0) return "bg-surface-muted";
  if (hours < 1) return "bg-clay/25";
  if (hours < 3) return "bg-clay/50";
  if (hours < 6) return "bg-clay/75";
  return "bg-clay";
}

const FOCUS_BUCKETS = [
  { label: "0–20m", minSec: 0, maxSec: 1200 },
  { label: "20–40m", minSec: 1200, maxSec: 2400 },
  { label: "40–60m", minSec: 2400, maxSec: 3600 },
  { label: "60–80m", minSec: 3600, maxSec: 4800 },
  { label: "80–100m", minSec: 4800, maxSec: 6000 },
  { label: "100–120m", minSec: 6000, maxSec: 7200 },
  { label: "120m+", minSec: 7200, maxSec: Number.POSITIVE_INFINITY },
];

export function RoomAnalytics({ members }: RoomAnalyticsProps) {
  const firestore = useFirestore();
  const [dayData, setDayData] = useState<DayData[]>([]);
  const [subjectData, setSubjectData] = useState<SubjectData[]>([]);
  const [histogram, setHistogram] = useState<{ label: string; count: number; totalSeconds: number }[]>([]);
  const [summaryStats, setSummaryStats] = useState({ totalSeconds: 0, avgDailySec: 0, avgBlockSec: 0, longestBlockSec: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firestore || members.length === 0) {
      setLoading(false);
      return;
    }

    const memberIds = members.map((m) => m.userId).filter(Boolean) as string[];
    const chunks: string[][] = [];
    for (let i = 0; i < memberIds.length; i += 30) chunks.push(memberIds.slice(i, i + 30));

    const since84 = subDays(new Date(), 83);
    const queryLookback = subDays(new Date(), 85);

    const fetchAnalytics = async () => {
      try {
        const allSessions: Session[] = [];
        const subjectsMap = new Map<string, { name: string; color: string }>();

        await Promise.all(
          chunks.map(async (chunk) => {
            const [subSnap, sessSnap] = await Promise.all([
              getDocs(query(collection(firestore, "subjects"), where("userId", "in", chunk))),
              getDocs(
                query(
                  collection(firestore, "sessions"),
                  where("userId", "in", chunk),
                  where("startTime", ">=", startOfDay(queryLookback).toISOString())
                )
              ),
            ]);

            subSnap.docs.forEach((d) => {
              const data = d.data();
              subjectsMap.set(d.id, { name: data.name, color: data.color });
            });

            sessSnap.docs.forEach((d) => {
              allSessions.push({ id: d.id, ...(d.data() as Omit<Session, "id">) });
            });
          })
        );

        const todayStart = startOfLocalDayMs(Date.now());
        const start84 = startOfLocalDayMs(since84.getTime());
        const dayMap = new Map<string, number>();
        for (let i = 0; i < 84; i++) {
          dayMap.set(formatLocalDateKey(addLocalDaysMs(start84, i)), 0);
        }

        const bucketCounts = FOCUS_BUCKETS.map((b) => ({ label: b.label, count: 0, totalSeconds: 0 }));
        let totalFocusMs = 0;
        let sessionCount = 0;
        let longestBlockSec = 0;

        const subjectMap = new Map<string, number>();
        allSessions.forEach((s) => {
          const intervals = resolveSessionIntervals(s);
          let sessMs = 0;
          for (const iv of intervals) {
            const slices = splitIntervalByLocalDays(iv.startMs, iv.endMs);
            for (const sl of slices) {
              if (sl.startMs >= start84 && sl.startMs <= todayStart + 86_400_000) {
                dayMap.set(sl.dateKey, (dayMap.get(sl.dateKey) ?? 0) + sl.durationMs);
                subjectMap.set(s.subjectId, (subjectMap.get(s.subjectId) ?? 0) + sl.durationMs);
                sessMs += sl.durationMs;
                totalFocusMs += sl.durationMs;
              }
            }
          }
          if (sessMs > 0) {
            const sec = Math.round(sessMs / 1000);
            sessionCount++;
            if (sec > longestBlockSec) longestBlockSec = sec;
            const bIdx = FOCUS_BUCKETS.findIndex((b) => sec >= b.minSec && sec < b.maxSec);
            if (bIdx >= 0) {
              bucketCounts[bIdx].count++;
              bucketCounts[bIdx].totalSeconds += sec;
            }
          }
        });

        const dayEntries = Array.from(dayMap.entries()).map(([date, ms]) => ({
          date,
          totalSeconds: Math.round(ms / 1000),
        }));
        setDayData(dayEntries);
        setHistogram(bucketCounts);

        const activeDays = dayEntries.filter((d) => d.totalSeconds > 0).length;
        const totalSeconds = Math.round(totalFocusMs / 1000);
        setSummaryStats({
          totalSeconds,
          avgDailySec: activeDays > 0 ? Math.round(totalSeconds / activeDays) : 0,
          avgBlockSec: sessionCount > 0 ? Math.round(totalSeconds / sessionCount) : 0,
          longestBlockSec,
        });

        const sorted = Array.from(subjectMap.entries())
          .map(([subjectId, totalMs]) => {
            const subInfo = subjectsMap.get(subjectId) ?? {
              name: "Other Subject",
              color: "var(--accent)",
            };
            return {
              subjectId,
              totalSeconds: Math.round(totalMs / 1000),
              name: subInfo.name,
              color: subInfo.color,
            };
          })
          .sort((a, b) => b.totalSeconds - a.totalSeconds);
        setSubjectData(sorted);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [firestore, members]);

  const grid = useMemo(() => {
    if (dayData.length === 0) return [];
    const weeks: DayData[][] = [];
    for (let i = 0; i < dayData.length; i += 7) {
      weeks.push(dayData.slice(i, i + 7));
    }
    return weeks;
  }, [dayData]);

  const totalAll = subjectData.reduce((s, d) => s + d.totalSeconds, 0) || 1;
  const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

  return (
    <div className="space-y-5">
      {loading ? (
        <p className="text-center text-ink-muted text-sm py-8">Loading analytics...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Room Total (84d)", val: `${(summaryStats.totalSeconds / 3600).toFixed(1)}h` },
              { label: "Active Daily Avg", val: `${(summaryStats.avgDailySec / 3600).toFixed(1)}h` },
              { label: "Avg Focus Block", val: `${Math.round(summaryStats.avgBlockSec / 60)}m` },
              { label: "Longest Block", val: `${Math.round(summaryStats.longestBlockSec / 60)}m` },
            ].map((k) => (
              <Card key={k.label} className="border-line bg-surface">
                <CardContent className="p-3.5">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                    {k.label}
                  </p>
                  <p className="font-mono text-xl font-bold text-ink timer-digit mt-1">{k.val}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {histogram.some((b) => b.count > 0) && (() => {
            const maxCount = Math.max(1, ...histogram.map((b) => b.count));
            return (
              <Card className="border-line bg-surface">
                <CardHeader className="pb-3 border-b border-line/15">
                  <CardTitle className="font-mono text-xs uppercase tracking-wider text-ink-muted">
                    20-Min Continuous Focus Histogram
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="grid grid-cols-7 gap-2 items-end h-28 pt-2">
                    {histogram.map((b) => {
                      const pct = Math.max(6, Math.round((b.count / maxCount) * 100));
                      return (
                        <div key={b.label} className="flex flex-col items-center gap-1.5 h-full justify-end">
                          <span className="font-mono text-[10px] text-ink timer-digit">
                            {b.count > 0 ? b.count : ""}
                          </span>
                          <div className="w-full flex items-end justify-center h-16">
                            <div
                              className={cn(
                                "w-full max-w-[32px] rounded-t-md border border-line/30",
                                b.count > 0 ? "bg-clay" : "bg-surface-muted"
                              )}
                              style={{ height: `${b.count > 0 ? pct : 10}%` }}
                            />
                          </div>
                          <span className="font-mono text-[9px] text-ink-muted whitespace-nowrap">
                            {b.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          <Card id="analytics-panel" className="border-line bg-surface">
            <CardHeader className="pb-3 border-b border-line/15">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-ink">
                <BarChart2 className="h-4 w-4 text-clay" strokeWidth={1.75} />
                Room Activity (12 weeks)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 overflow-x-auto">
              <TooltipProvider>
                <div className="flex gap-1.5">
                  <div className="flex flex-col gap-1.5 mr-1">
                    {DAY_LABELS.map((d, i) => (
                      <div
                        key={i}
                        className="h-3.5 w-3 flex items-center justify-center font-mono text-[9px] text-ink-muted"
                      >
                        {i % 2 === 0 ? d : ""}
                      </div>
                    ))}
                  </div>
                  {grid.map((week, wi) => (
                    <div key={wi} className="flex flex-col gap-1.5">
                      {week.map((day, di) => {
                        const hours = day.totalSeconds / 3600;
                        return (
                          <Tooltip key={di}>
                            <TooltipTrigger asChild>
                              <div
                                className={cn(
                                  "h-3.5 w-3.5 rounded-[3px] border border-line/15 cursor-default",
                                  getHeatLevel(hours)
                                )}
                              />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="font-mono text-xs">
                                {hours.toFixed(1)}h — {day.date}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </TooltipProvider>
            </CardContent>
          </Card>

          {subjectData.length > 0 && (
            <Card className="border-line bg-surface">
              <CardHeader className="pb-3 border-b border-line/15">
                <CardTitle className="font-mono text-xs uppercase tracking-wider text-ink-muted">
                  Subject Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="flex h-3.5 rounded-full border border-line/30 overflow-hidden gap-0.5 bg-surface-soft">
                  {subjectData.map((s) => {
                    const pct = (s.totalSeconds / totalAll) * 100;
                    return (
                      <div
                        key={s.subjectId}
                        className="h-full"
                        style={{ width: `${pct}%`, backgroundColor: s.color || "var(--accent)" }}
                      />
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                  {subjectData.map((s) => {
                    const hours = (s.totalSeconds / 3600).toFixed(1);
                    return (
                      <div key={s.subjectId} className="flex items-center gap-1.5 text-xs">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: s.color || "var(--accent)" }}
                        />
                        <span className="text-ink-muted">{s.name}</span>
                        <span className="font-mono font-semibold text-ink timer-digit">
                          {hours}h
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
