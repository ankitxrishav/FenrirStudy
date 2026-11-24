"use client";

import { RoomMember } from "@/lib/definitions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Activity, Clock } from "lucide-react";

export function RoomMemberStats({ members }: { members: RoomMember[] }) {
  if (members.length === 0) return null;

  return (
    <Card className="border-line bg-surface">
      <CardHeader className="pb-4 border-b border-line/15">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-ink">
          <Activity className="h-4 w-4 text-clay" strokeWidth={1.75} />
          Member Totals Today
        </CardTitle>
      </CardHeader>

      <CardContent className="p-4 sm:p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((m) => {
            let liveTime = 0;
            if (m.timerStatus === "running" && m.startedAt) {
              const start = new Date(m.startedAt).getTime();
              liveTime = Math.floor(Math.max(0, Date.now() - start) / 1000);
            }

            const todaySeconds = (m.todaySeconds || 0) + liveTime;
            const hours = Math.floor(todaySeconds / 3600);
            const minutes = Math.floor((todaySeconds % 3600) / 60);

            const subjSeconds = (m.currentSubjectTodaySeconds || 0) + liveTime;
            const subjHours = Math.floor(subjSeconds / 3600);
            const subjMins = Math.floor((subjSeconds % 3600) / 60);
            const subjTimeStr = subjHours > 0 ? `${subjHours}h ${subjMins}m` : `${subjMins}m`;

            const allTimeMins = Math.floor(((m.allTimeSeconds || 0) + liveTime) / 60);
            const xp = allTimeMins * 10 + (m.allTimeSessions || 0) * 50;
            const level = Math.max(1, Math.floor(Math.sqrt(xp) / 5));

            return (
              <div
                key={m.id || m.userId}
                className="flex flex-col p-4 rounded-[14px] border border-line/35 bg-surface-soft"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="relative">
                    <Avatar className="h-10 w-10 border border-line/40">
                      <AvatarImage src={m.photoURL} />
                      <AvatarFallback className="bg-surface font-mono text-xs text-ink">
                        {m.displayName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute -bottom-1 -right-1 rounded-sm border border-line bg-highlight px-1 py-0.5 font-mono text-[9px] font-semibold text-ink">
                      L{level}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-ink truncate">{m.displayName}</p>
                    {m.subjectName ? (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: m.subjectColor || "var(--accent)" }}
                        />
                        <span className="text-xs text-ink-muted truncate">
                          {m.subjectName} · {subjTimeStr}
                        </span>
                      </div>
                    ) : (
                      <p className="text-xs text-ink-muted truncate">Not active now</p>
                    )}
                  </div>
                </div>

                {m.todaySubjectBreakdown && m.todaySubjectBreakdown.length > 0 && (
                  <div className="mb-3 space-y-1">
                    {m.todaySubjectBreakdown.map((s) => {
                      const isCurrent = m.timerStatus === "running" && m.subjectName === s.name;
                      const sSeconds = s.seconds + (isCurrent ? liveTime : 0);
                      const sHrs = Math.floor(sSeconds / 3600);
                      const sMins = Math.floor((sSeconds % 3600) / 60);
                      if (sHrs === 0 && sMins === 0) return null;
                      return (
                        <div key={s.id} className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-2 min-w-0 flex-1 text-ink-muted">
                            <span
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: s.color || "var(--accent)" }}
                            />
                            <span className="truncate">{s.name}</span>
                          </span>
                          <span className="font-mono text-ink timer-digit shrink-0 ml-2">
                            {sHrs > 0 ? `${sHrs}h ` : ""}
                            {sMins}m
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex items-center justify-between mt-auto pt-3 border-t border-line/15">
                  <span className="font-mono text-xs text-ink-muted timer-digit">
                    {m.todaySessions || 0} sessions
                  </span>
                  <div className="inline-flex items-center gap-1.5 font-mono text-sm font-semibold text-ink timer-digit">
                    <Clock className="h-3.5 w-3.5 text-clay" strokeWidth={1.75} />
                    <span>
                      {hours > 0 ? `${hours}h ` : ""}
                      {minutes}m
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
