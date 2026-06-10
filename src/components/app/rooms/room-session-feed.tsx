"use client";

import { useState, useEffect, useMemo, memo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { formatDistanceToNow } from "date-fns";
import { useFirestore } from "@/firebase";
import { RoomMember, Session } from "@/lib/definitions";
import { SessionReactionBar } from "./session-reaction-bar";

interface RoomSessionFeedProps {
  roomId: string;
  members: RoomMember[];
}

interface SessionWithMember extends Session {
  member: RoomMember;
}

function formatDuration(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export const RoomSessionFeed = memo(function RoomSessionFeed({ roomId, members }: RoomSessionFeedProps) {
  const firestore = useFirestore();
  const [sessions, setSessions] = useState<SessionWithMember[]>([]);
  const [loading, setLoading] = useState(true);

  const memberMap = useMemo(() => {
    const m = new Map<string, RoomMember>();
    members.forEach(mem => m.set(mem.userId, mem));
    return m;
  }, [members]);

  useEffect(() => {
    if (!firestore || members.length === 0) { setLoading(false); return; }

    const memberIds = members.map(m => m.userId).filter(Boolean) as string[];
    const chunks: string[][] = [];
    for (let i = 0; i < memberIds.length; i += 30) chunks.push(memberIds.slice(i, i + 30));

    const fetchSessions = async () => {
      try {
        const allSessions: SessionWithMember[] = [];
        await Promise.all(
          chunks.map(async chunk => {
            const snap = await getDocs(
              query(
                collection(firestore, "sessions"),
                where("userId", "in", chunk),
                orderBy("startTime", "desc"),
                limit(20)
              )
            );
            snap.docs.forEach(d => {
              const data = { id: d.id, ...d.data() } as Session;
              const member = memberMap.get(data.userId);
              if (member) allSessions.push({ ...data, member });
            });
          })
        );
        allSessions.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
        setSessions(allSessions.slice(0, 20));
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, [firestore, members, memberMap]);

  return (
    <Card className="glass border-white/10 shadow-xl">
      <CardHeader className="pb-3 border-b border-white/5">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Activity Feed
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {loading && <p className="text-muted-foreground text-sm text-center py-4">Loading…</p>}
        {!loading && sessions.length === 0 && (
          <p className="text-muted-foreground text-sm text-center py-4">No sessions yet in this room.</p>
        )}
        {sessions.map(session => (
          <div key={session.id} className="flex gap-3">
            <Avatar className="h-8 w-8 shrink-0 mt-0.5">
              <AvatarFallback className="text-[10px]">
                {(session.member.displayName ?? "?").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold truncate">{session.member.displayName}</span>
                <span className="text-muted-foreground shrink-0">
                  {formatDistanceToNow(new Date(session.startTime), { addSuffix: true })}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Studied for <span className="font-medium text-foreground">{formatDuration(session.duration)}</span>
              </p>
              <SessionReactionBar session={session} roomId={roomId} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
});
