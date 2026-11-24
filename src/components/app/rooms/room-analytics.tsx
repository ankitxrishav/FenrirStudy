"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { BarChart2 } from "lucide-react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { format, subDays, eachDayOfInterval, startOfDay } from "date-fns";
import { useFirestore } from "@/firebase";
import { RoomMember } from "@/lib/definitions";
import { cn } from "@/lib/utils";

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

export function RoomAnalytics({ members }: RoomAnalyticsProps) {
  const firestore = useFirestore();
  const [dayData, setDayData] = useState<DayData[]>([]);
  const [subjectData, setSubjectData] = useState<SubjectData[]>([]);
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

    const fetchAnalytics = async () => {
      try {
        const allSessions: { startTime: string; duration: number; subjectId: string }[] = [];
        const subjectsMap = new Map<string, { name: string; color: string }>();

        await Promise.all(
          chunks.map(async (chunk) => {
            const [subSnap, sessSnap] = await Promise.all([
              getDocs(query(collection(firestore, "subjects"), where("userId", "in", chunk))),
              getDocs(
                query(
                  collection(firestore, "sessions"),
                  where("userId", "in", chunk),
                  where("startTime", ">=", startOfDay(since84).toISOString())
                )
              ),
            ]);

            subSnap.docs.forEach((d) => {
              const data = d.data();
              subjectsMap.set(d.id, { name: data.name, color: data.color });
            });

            sessSnap.docs.forEach((d) => {
              const data = d.data();
              allSessions.push({
                startTime: data.startTime,
                duration: data.duration ?? 0,
                subjectId: data.subjectId,
              });
            });
          })
        );

        const days = eachDayOfInterval({ start: since84, end: new Date() });
        const dayMap = new Map<string, number>();
        days.forEach((d) => dayMap.set(format(d, "yyyy-MM-dd"), 0));

        allSessions.forEach((s) => {
          const key = format(new Date(s.startTime), "yyyy-MM-dd");
          dayMap.set(key, (dayMap.get(key) ?? 0) + s.duration);
        });

        setDayData(
          days.map((d) => ({
            date: format(d, "yyyy-MM-dd"),
            totalSeconds: dayMap.get(format(d, "yyyy-MM-dd")) ?? 0,
          }))
        );

        const subjectMap = new Map<string, number>();
        allSessions.forEach((s) => {
          subjectMap.set(s.subjectId, (subjectMap.get(s.subjectId) ?? 0) + s.duration);
        });
        const sorted = Array.from(subjectMap.entries())
          .map(([subjectId, totalSeconds]) => {
            const subInfo = subjectsMap.get(subjectId) ?? {
              name: "Other Subject",
              color: "var(--accent)",
            };
            return {
              subjectId,
              totalSeconds,
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
