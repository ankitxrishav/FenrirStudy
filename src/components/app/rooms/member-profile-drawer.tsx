"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { formatDistanceToNow, startOfWeek } from "date-fns";
import { useFirestore } from "@/firebase";
import { RoomMember, Session } from "@/lib/definitions";
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
    <div className="glass border border-white/10 rounded-xl p-3 flex flex-col gap-1">
      <div className="text-muted-foreground">{icon}</div>
      <p className="text-xl font-black tabular-nums">{value}</p>
      <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">{label}</p>
    </div>
  );
}

export function MemberProfileDrawer({ member, onClose }: MemberProfileDrawerProps) {
  const firestore = useFirestore();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [stats, setStats] = useState({ allTime: 0, thisWeek: 0, sessionCount: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!member || !firestore) { setSessions([]); return; }

    setLoading(true);
    const fetchData = async () => {
      try {
        const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

        // Recent sessions (last 10)
        const recentSnap = await getDocs(
          query(
            collection(firestore, "sessions"),
            where("userId", "==", member.userId),
            orderBy("startTime", "desc"),
            limit(10)
          )
        );
        const recentSessions = recentSnap.docs.map(d => ({ id: d.id, ...d.data() } as Session));
        setSessions(recentSessions);

        // All-time total
        const allSnap = await getDocs(
          query(collection(firestore, "sessions"), where("userId", "==", member.userId))
        );
        let allTime = 0;
        let weekTime = 0;
        allSnap.docs.forEach(d => {
          const data = d.data();
          allTime += data.duration ?? 0;
          if (new Date(data.startTime) >= weekStart) weekTime += data.duration ?? 0;
        });

        setStats({ allTime, thisWeek: weekTime, sessionCount: allSnap.size });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [member?.userId, firestore]);

  const initials = (member?.displayName ?? "?").slice(0, 2).toUpperCase();
  const timerRunning = member?.timerStatus === "running";

  return (
    <Sheet open={!!member} onOpenChange={open => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md bg-background/80 backdrop-blur-2xl border-l border-white/10 overflow-y-auto"
      >
        <SheetHeader className="pb-0">
          <SheetTitle className="sr-only">Member Profile</SheetTitle>
        </SheetHeader>

        {member && (
          <div className="space-y-6 py-2">
            {/* Hero */}
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="relative">
                <Avatar className="h-20 w-20 ring-2 ring-white/10">
                  <AvatarImage src={member.photoURL} />
                  <AvatarFallback className="text-xl font-black">{initials}</AvatarFallback>
                </Avatar>
                <span
                  className={cn(
                    "absolute bottom-0.5 right-0.5 h-4 w-4 rounded-full border-2 border-background",
                    timerRunning ? "bg-green-500 animate-pulse" :
                    member.timerStatus === "paused" ? "bg-yellow-500" :
                    "bg-muted-foreground/30"
                  )}
                />
              </div>
              <div>
                <h2 className="text-lg font-black">{member.displayName}</h2>
                {timerRunning && member.subjectName && (
                  <div className="flex items-center gap-1.5 justify-center mt-1">
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: member.subjectColor ?? "hsl(var(--primary))" }}
                    />
                    <span className="text-xs text-muted-foreground">Studying {member.subjectName}</span>
                  </div>
                )}
                {!timerRunning && (
                  <Badge variant="outline" className="text-[10px] mt-1">
                    {member.timerStatus === "paused" ? "⏸ Paused" : "Idle"}
                  </Badge>
                )}
              </div>
            </div>

            {/* Stats grid */}
            {loading ? (
              <div className="grid grid-cols-2 gap-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="glass border border-white/10 rounded-xl p-3 h-20 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  icon={<TrendingUp className="h-3.5 w-3.5" />}
                  label="All time"
                  value={formatDuration(stats.allTime)}
                />
                <StatCard
                  icon={<Zap className="h-3.5 w-3.5" />}
                  label="This week"
                  value={formatDuration(stats.thisWeek)}
                />
                <StatCard
                  icon={<BookOpen className="h-3.5 w-3.5" />}
                  label="Sessions"
                  value={String(stats.sessionCount)}
                />
                <StatCard
                  icon={<Clock className="h-3.5 w-3.5" />}
                  label="Avg session"
                  value={stats.sessionCount > 0 ? formatDuration(Math.round(stats.allTime / stats.sessionCount)) : "—"}
                />
              </div>
            )}

            {/* Recent sessions */}
            <div className="space-y-2">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">
                Recent Sessions
              </h3>
              {loading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="glass border border-white/10 rounded-xl p-3 h-14 animate-pulse" />
                  ))}
                </div>
              ) : sessions.length === 0 ? (
                <div className="glass border border-white/10 rounded-xl p-6 text-center">
                  <p className="text-sm text-muted-foreground">No sessions yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sessions.map(session => (
                    <div
                      key={session.id}
                      className="glass border border-white/10 rounded-xl p-3 flex items-center justify-between gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">
                          {formatDuration(session.duration ?? 0)}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(session.startTime), { addSuffix: true })}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] shrink-0",
                          session.status === "completed" ? "text-green-400 border-green-400/30" : "text-muted-foreground"
                        )}
                      >
                        {session.status === "completed" ? "✓ Done" : "Stopped"}
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
