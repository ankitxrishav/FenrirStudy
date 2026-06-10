"use client";

import { useState, useEffect, useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy } from "lucide-react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { startOfWeek } from "date-fns";
import { useFirestore, useUser } from "@/firebase";
import { RoomMember } from "@/lib/definitions";
import { cn } from "@/lib/utils";

interface LeaderboardEntry {
  member: RoomMember;
  totalSeconds: number;
}

interface RoomLeaderboardProps {
  roomId: string;
  members: RoomMember[];
}

function formatHours(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

async function fetchLeaderboardData(
  firestore: ReturnType<typeof useFirestore>,
  members: RoomMember[],
  since?: Date
): Promise<LeaderboardEntry[]> {
  if (!firestore || members.length === 0) return [];

  const memberIds = members.map(m => m.userId).filter(Boolean) as string[];
  const chunks: string[][] = [];
  for (let i = 0; i < memberIds.length; i += 30) chunks.push(memberIds.slice(i, i + 30));

  const totals = new Map<string, number>();
  members.forEach(m => totals.set(m.userId, 0));

  await Promise.all(
    chunks.map(async chunk => {
      const q = since
        ? query(
            collection(firestore!, "sessions"),
            where("userId", "in", chunk),
            where("startTime", ">=", since.toISOString())
          )
        : query(collection(firestore!, "sessions"), where("userId", "in", chunk));

      const snap = await getDocs(q);
      snap.docs.forEach(d => {
        const { userId, duration } = d.data();
        totals.set(userId, (totals.get(userId) ?? 0) + (duration ?? 0));
      });
    })
  );

  return members
    .map(m => ({ member: m, totalSeconds: totals.get(m.userId) ?? 0 }))
    .sort((a, b) => b.totalSeconds - a.totalSeconds);
}

const MEDAL = ["🥇", "🥈", "🥉"];
const MEDAL_COLOR = ["text-yellow-400", "text-gray-300", "text-amber-700"];

export function RoomLeaderboard({ members }: RoomLeaderboardProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const [weekData, setWeekData] = useState<LeaderboardEntry[]>([]);
  const [allData, setAllData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firestore || members.length === 0) { setLoading(false); return; }
    const since = startOfWeek(new Date(), { weekStartsOn: 1 });
    Promise.all([
      fetchLeaderboardData(firestore, members, since),
      fetchLeaderboardData(firestore, members),
    ]).then(([w, a]) => {
      setWeekData(w);
      setAllData(a);
      setLoading(false);
    });
  }, [firestore, members]);

  const maxWeek = useMemo(() => weekData[0]?.totalSeconds || 1, [weekData]);
  const maxAll = useMemo(() => allData[0]?.totalSeconds || 1, [allData]);

  const renderList = (data: LeaderboardEntry[], max: number) => (
    <div className="space-y-2">
      {data.map((entry, i) => {
        const isMe = entry.member.userId === user?.uid;
        const pct = (entry.totalSeconds / max) * 100;
        return (
          <div
            key={entry.member.userId}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors",
              isMe && "bg-primary/10"
            )}
          >
            <span className={cn("w-6 text-center text-sm font-bold shrink-0", MEDAL_COLOR[i] ?? "text-muted-foreground")}>
              {i < 3 ? MEDAL[i] : `${i + 1}`}
            </span>
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarImage src={entry.member.photoURL} />
              <AvatarFallback className="text-[9px]">{(entry.member.displayName ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{entry.member.displayName}{isMe && " (you)"}</p>
              <div className="h-1 w-full bg-white/5 rounded-full mt-1 overflow-hidden">
                <div className="h-full bg-primary/60 rounded-full" style={{ width: `${pct}%` }} />
              </div>
            </div>
            <span className="text-xs font-bold text-muted-foreground shrink-0">{formatHours(entry.totalSeconds)}</span>
          </div>
        );
      })}
      {data.every(d => d.totalSeconds === 0) && (
        <p className="text-center text-muted-foreground text-sm py-4">No sessions recorded yet.</p>
      )}
    </div>
  );

  return (
    <Card id="leaderboard-panel" className="glass border-white/10 shadow-xl">
      <CardHeader className="pb-3 border-b border-white/5">
        <CardTitle className="text-base flex items-center gap-2">
          <Trophy className="h-4 w-4 text-yellow-400" />
          Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {loading ? (
          <div className="py-6 text-center text-muted-foreground text-sm">Loading…</div>
        ) : (
          <Tabs defaultValue="week">
            <TabsList className="w-full mb-4">
              <TabsTrigger value="week" className="flex-1">This Week</TabsTrigger>
              <TabsTrigger value="all" className="flex-1">All Time</TabsTrigger>
            </TabsList>
            <TabsContent value="week">{renderList(weekData, maxWeek)}</TabsContent>
            <TabsContent value="all">{renderList(allData, maxAll)}</TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
