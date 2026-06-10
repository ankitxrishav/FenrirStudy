"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Trophy } from "lucide-react";
import { differenceInDays } from "date-fns";
import { collection, query, where, addDoc, updateDoc, doc } from "firebase/firestore";
import { arrayUnion } from "firebase/firestore";
import { useFirestore, useUser, useCollection } from "@/firebase";
import { RoomChallenge, RoomChallengeProgress, RoomMember } from "@/lib/definitions";

interface RoomChallengesProps {
  roomId: string;
  challenges: RoomChallenge[];
  isOwner: boolean;
  members: RoomMember[];
}

function ChallengeCard({
  challenge,
  roomId,
  members,
}: {
  challenge: RoomChallenge;
  roomId: string;
  members: RoomMember[];
}) {
  const firestore = useFirestore();
  const { user } = useUser();

  const progressQuery = useMemo(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, "rooms", roomId, "challengeProgress"),
      where("challengeId", "==", challenge.id)
    );
  }, [firestore, roomId, challenge.id]);

  const { data: progressDocs } = useCollection<RoomChallengeProgress>(progressQuery);
  const daysLeft = differenceInDays(new Date(challenge.endDate), new Date());
  const isJoined = challenge.participantIds.includes(user?.uid ?? "");

  const handleJoin = async () => {
    if (!firestore || !user) return;
    await updateDoc(doc(firestore, "rooms", roomId, "challenges", challenge.id), {
      participantIds: arrayUnion(user.uid),
    });
  };

  return (
    <Card className="glass border-white/10">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-sm">{challenge.title}</p>
            {challenge.description && (
              <p className="text-xs text-muted-foreground">{challenge.description}</p>
            )}
          </div>
          <Badge variant="outline" className="shrink-0 text-[10px]">
            {daysLeft > 0 ? `${daysLeft}d left` : "Ended"}
          </Badge>
        </div>

        <div className="text-xs text-muted-foreground">
          Target: <span className="font-bold text-foreground">{challenge.targetHours}h</span>
        </div>

        {/* Participant progress */}
        {(progressDocs ?? []).map(p => {
          const pct = Math.min(100, (p.hoursLogged / challenge.targetHours) * 100);
          const displayName = members.find(m => m.userId === p.userId)?.displayName ?? p.userId.slice(0, 8);
          return (
            <div key={p.userId} className="space-y-1">
              <div className="flex justify-between text-[10px]">
                <span className="text-muted-foreground">{p.userId === user?.uid ? "You" : displayName}</span>
                <span>{p.hoursLogged.toFixed(1)}h</span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
              </div>
              {p.completedAt && (
                <Badge className="text-[10px]">✅ Completed!</Badge>
              )}
            </div>
          );
        })}

        {!isJoined && (
          <Button size="sm" variant="outline" className="w-full" onClick={handleJoin}>
            Join Challenge
          </Button>
        )}
        {isJoined && (
          <p className="text-[10px] text-center text-primary font-semibold">✓ You&apos;re in!</p>
        )}
      </CardContent>
    </Card>
  );
}

function CreateChallengeDialog({
  isOpen,
  onOpenChange,
  roomId,
}: {
  isOpen: boolean;
  onOpenChange: (v: boolean) => void;
  roomId: string;
}) {
  const firestore = useFirestore();
  const { user } = useUser();
  const [title, setTitle] = useState("");
  const [targetHours, setTargetHours] = useState(10);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!firestore || !user || !title.trim() || !startDate || !endDate) return;
    setLoading(true);
    try {
      await addDoc(collection(firestore, "rooms", roomId, "challenges"), {
        roomId,
        createdBy: user.uid,
        title: title.trim(),
        targetHours,
        startDate,
        endDate,
        participantIds: [],
        status: "active",
      });
      onOpenChange(false);
      setTitle(""); setTargetHours(10); setStartDate(""); setEndDate("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader><DialogTitle>New Challenge</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-1.5">
            <Label>Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Study 50 hours this month" />
          </div>
          <div className="grid gap-1.5">
            <Label>Target Hours</Label>
            <Input type="number" min={1} value={targetHours} onChange={e => setTargetHours(Number(e.target.value))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>End Date</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={loading || !title.trim()}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RoomChallenges({ roomId, challenges, isOwner, members }: RoomChallengesProps) {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
          <Trophy className="h-3.5 w-3.5" /> Challenges
        </h3>
        {isOwner && (
          <Button size="sm" variant="ghost" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>

      {challenges.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No active challenges. {isOwner ? "Create one!" : "Ask the room owner to create one."}
        </p>
      ) : (
        <div className="space-y-3">
          {challenges.map(c => <ChallengeCard key={c.id} challenge={c} roomId={roomId} members={members} />)}
        </div>
      )}

      <CreateChallengeDialog isOpen={createOpen} onOpenChange={setCreateOpen} roomId={roomId} />
    </div>
  );
}
