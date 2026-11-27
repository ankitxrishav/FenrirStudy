"use client";

import { useEffect, useState } from "react";
import { RoomMember } from "@/lib/definitions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { getEffectiveMemberPeriodStats } from "@/lib/study-time";

export function RoomLeaderboard({ members }: { members: RoomMember[] }) {
  const [period, setPeriod] = useState<"today" | "weekly" | "monthly">("today");
  const [nowMs, setNowMs] = useState(() => Date.now());
  const hasRunning = members.some((m) => m.timerStatus === "running");

  useEffect(() => {
    setNowMs(Date.now());
    if (!hasRunning) return;
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [hasRunning]);

  const sortedMembers = [...members]
    .map((member) => ({
      member,
      stats: getEffectiveMemberPeriodStats(member, period, nowMs),
    }))
    .filter((item) => item.stats.seconds > 0)
    .sort((a, b) => b.stats.seconds - a.stats.seconds);

  return (
    <Card id="leaderboard-panel" className="border-line bg-surface">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-4 border-b border-line/15 space-y-0">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-ink">
          <Trophy className="h-4 w-4 text-clay" strokeWidth={1.75} />
          Leaderboard
        </CardTitle>

        <div className="inline-flex rounded-full border border-line bg-surface-soft p-0.5 gap-0.5">
          {(
            [
              { id: "today", label: "Day" },
              { id: "weekly", label: "Week" },
              { id: "monthly", label: "Month" },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPeriod(item.id)}
              className={cn(
                "rounded-full px-3 py-1 font-mono text-[11px] transition-colors",
                period === item.id ? "bg-ink text-surface" : "text-ink-muted hover:text-ink"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {sortedMembers.length === 0 ? (
          <div className="py-10 text-center text-sm text-ink-muted">
            No logged study hours for this period yet.
          </div>
        ) : (
          <div className="divide-y divide-line/15">
            {sortedMembers.map(({ member: m, stats }, index) => {
              const hours = Math.floor(stats.seconds / 3600);
              const minutes = Math.floor((stats.seconds % 3600) / 60);

              return (
                <div
                  key={m.id || m.userId}
                  className={cn(
                    "flex items-center gap-3.5 px-5 py-3.5",
                    index === 0 && "bg-highlight/30"
                  )}
                >
                  <span
                    className={cn(
                      "w-6 text-center font-mono text-xs font-semibold shrink-0",
                      index === 0 ? "text-ink" : "text-ink-muted"
                    )}
                  >
                    #{index + 1}
                  </span>

                  <Avatar className="h-9 w-9 border border-line/40 shrink-0">
                    <AvatarImage src={m.photoURL} />
                    <AvatarFallback className="bg-surface-soft font-mono text-xs text-ink">
                      {m.displayName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{m.displayName}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-ink-muted">
                      {m.subjectName && (
                        <span className="inline-flex items-center gap-1 truncate max-w-[120px]">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: m.subjectColor || "var(--accent)" }}
                          />
                          <span className="truncate">{m.subjectName}</span>
                        </span>
                      )}
                      <span className="font-mono text-[11px]">{stats.sessions} sessions</span>
                      {m.timerStatus === "running" && (
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-success" />
                      )}
                    </div>
                  </div>

                  <div className="inline-flex items-center gap-1.5 font-mono text-sm font-semibold text-ink timer-digit shrink-0">
                    <Clock className="h-3.5 w-3.5 text-clay" strokeWidth={1.75} />
                    <span>
                      {hours > 0 ? `${hours}h ` : ""}
                      {minutes}m
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
