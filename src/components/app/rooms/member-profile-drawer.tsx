"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { formatDistanceToNow } from "date-fns";
import { useFirestore } from "@/firebase";
import { RoomMember, Session } from "@/lib/definitions";
import { computePeriodicStats } from "@/lib/study-time";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Clock, BookOpen, Zap, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface MemberProfileDrawerProps {
  member: RoomMember | null;
  onClose: () => void;
}

function formatDuration(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-[12px] border border-line bg-surface-soft p-3.5 flex flex-col gap-1">
      <div className="text-ink-muted">{icon}</div>
      <p className="text-xl font-bold font-mono timer-digit text-ink">{value}</p>
      <p className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">{label}</p>
    </div>
  );
}

export function MemberProfileDrawer({ member, onClose }: MemberProfileDrawerProps) {
  const firestore = useFirestore();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [stats, setStats] = useState({ allTime: 0, thisWeek: 0, sessionCount: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!member || !firestore) {
      setSessions([]);
      return;
    }

    setLoading(true);
    const fetchData = async () => {
      try {
        const recentSnap = await getDocs(
          query(
            collection(firestore, "sessions"),
            where("userId", "==", member.userId),
            orderBy("startTime", "desc"),
            limit(10)
          )
        );
        setSessions(recentSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Session)));

        const allSnap = await getDocs(
          query(collection(firestore, "sessions"), where("userId", "==", member.userId))
        );
        const allSess = allSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Session, "id">) }));
        const summary = computePeriodicStats(allSess);

        setStats({
          allTime: summary.allTime.seconds,
          thisWeek: summary.weekly.seconds,
          sessionCount: summary.allTime.sessions,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [member?.userId, firestore]);

  const initials = (member?.displayName ?? "?").slice(0, 2).toUpperCase();
  const timerRunning = member?.timerStatus === "running";

  return (
    <Sheet open={!!member} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md border-l border-line bg-surface overflow-y-auto">
        <SheetHeader className="pb-0">
          <SheetTitle className="sr-only">Member Profile</SheetTitle>
        </SheetHeader>

        {member && (
          <div className="space-y-6 py-4">
            <div className="flex flex-col items-center gap-3 py-4 text-center border-b border-line/15">
              <div className="relative">
                <Avatar className="h-20 w-20 border border-line">
                  <AvatarImage src={member.photoURL} />
                  <AvatarFallback className="bg-surface-soft font-mono text-xl font-semibold text-ink">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span
                  className={cn(
                    "absolute bottom-0.5 right-0.5 h-4 w-4 rounded-full border border-line",
                    timerRunning
                      ? "bg-success"
                      : member.timerStatus === "paused"
                        ? "bg-highlight"
                        : "bg-surface-muted"
                  )}
                />
              </div>
              <div>
                <h2 className="text-xl font-bold text-ink">{member.displayName}</h2>
                {timerRunning && member.subjectName ? (
                  <div className="flex items-center gap-1.5 justify-center mt-1">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: member.subjectColor ?? "var(--accent)" }}
                    />
                    <span className="text-xs text-ink-muted">Studying {member.subjectName}</span>
                  </div>
                ) : (
                  <Badge variant="secondary" className="mt-1.5">
                    {member.timerStatus === "paused" ? "Paused" : "Idle"}
                  </Badge>
                )}
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 gap-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="rounded-[12px] border border-line/20 bg-surface-soft h-20 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  icon={<TrendingUp className="h-4 w-4" strokeWidth={1.75} />}
                  label="All time"
                  value={formatDuration(stats.allTime)}
                />
                <StatCard
                  icon={<Zap className="h-4 w-4" strokeWidth={1.75} />}
                  label="This week"
                  value={formatDuration(stats.thisWeek)}
                />
                <StatCard
                  icon={<BookOpen className="h-4 w-4" strokeWidth={1.75} />}
                  label="Sessions"
                  value={String(stats.sessionCount)}
                />
                <StatCard
                  icon={<Clock className="h-4 w-4" strokeWidth={1.75} />}
                  label="Avg session"
                  value={
                    stats.sessionCount > 0
                      ? formatDuration(Math.round(stats.allTime / stats.sessionCount))
                      : "—"
                  }
                />
              </div>
            )}

            <div className="space-y-2.5">
              <h3 className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
                Recent Sessions
              </h3>
              {loading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="rounded-[12px] border border-line/20 bg-surface-soft h-14 animate-pulse" />
                  ))}
                </div>
              ) : sessions.length === 0 ? (
                <div className="rounded-[12px] border border-line/25 bg-surface-soft p-6 text-center text-sm text-ink-muted">
                  No sessions recorded yet
                </div>
              ) : (
                <div className="rounded-[14px] border border-line bg-surface divide-y divide-line/15 overflow-hidden">
                  {sessions.map((session) => (
                    <div key={session.id} className="p-3.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold font-mono timer-digit text-ink">
                          {formatDuration(session.duration ?? 0)}
                        </p>
                        <p className="text-xs text-ink-muted">
                          {formatDistanceToNow(new Date(session.startTime), { addSuffix: true })}
                        </p>
                      </div>
                      <Badge variant={session.status === "completed" ? "highlight" : "secondary"}>
                        {session.status === "completed" ? "Completed" : "Stopped"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
