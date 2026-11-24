"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Plus, Trophy, Check } from "lucide-react";
import { differenceInDays } from "date-fns";
import { collection, query, where, addDoc, updateDoc, doc, arrayUnion } from "firebase/firestore";
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
    <Card className="border-line bg-surface">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-sm text-ink">{challenge.title}</p>
            {challenge.description && (
              <p className="text-xs text-ink-muted mt-0.5">{challenge.description}</p>
            )}
          </div>
          <Badge variant="outline" className="shrink-0">
            {daysLeft > 0 ? `${daysLeft}d left` : "Ended"}
          </Badge>
        </div>

        <div className="font-mono text-xs text-ink-muted timer-digit">
          Target: <span className="font-semibold text-ink">{challenge.targetHours}h</span>
        </div>

        {(progressDocs ?? []).map((p) => {
          const pct = Math.min(100, (p.hoursLogged / challenge.targetHours) * 100);
          const displayName =
            members.find((m) => m.userId === p.userId)?.displayName ?? p.userId.slice(0, 8);
          return (
            <div key={p.userId} className="space-y-1">
              <div className="flex justify-between font-mono text-[11px]">
                <span className="text-ink-muted">{p.userId === user?.uid ? "You" : displayName}</span>
                <span className="text-ink timer-digit">{p.hoursLogged.toFixed(1)}h</span>
              </div>
              <div className="h-1.5 bg-surface-muted rounded-full overflow-hidden">
                <div className="h-full bg-clay rounded-full" style={{ width: `${pct}%` }} />
              </div>
              {p.completedAt && (
                <Badge variant="highlight" className="gap-1">
                  <Check className="h-3 w-3" strokeWidth={2} /> Completed
                </Badge>
              )}
            </div>
          );
        })}

        {!isJoined ? (
          <Button size="sm" variant="outline" className="w-full" onClick={handleJoin}>
            Join challenge
          </Button>
        ) : (
          <div className="inline-flex items-center justify-center gap-1.5 w-full font-mono text-[11px] text-success pt-1">
            <Check className="h-3.5 w-3.5" strokeWidth={2} />
            <span>Joined</span>
          </div>
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
      setTitle("");
      setTargetHours(10);
      setStartDate("");
      setEndDate("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>New room challenge</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-1.5">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Study 50 hours this month"
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Target Hours</Label>
            <Input
              type="number"
              min={1}
              value={targetHours}
              onChange={(e) => setTargetHours(Number(e.target.value))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={loading || !title.trim()}>
            Create challenge
          </Button>
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
        <h3 className="font-mono text-xs uppercase tracking-wider text-ink-muted flex items-center gap-2">
          <Trophy className="h-3.5 w-3.5" strokeWidth={1.75} /> Challenges
        </h3>
        {isOwner && (
          <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)} className="h-9 gap-1.5">
            <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
            <span>New challenge</span>
          </Button>
        )}
      </div>

      {challenges.length === 0 ? (
        <div className="rounded-[16px] border border-line/30 bg-surface-soft py-8 text-center text-sm text-ink-muted">
          No active challenges. {isOwner ? "Create one for your room." : "Ask the room owner to create one."}
        </div>
      ) : (
        <div className="space-y-3">
          {challenges.map((c) => (
            <ChallengeCard key={c.id} challenge={c} roomId={roomId} members={members} />
          ))}
        </div>
      )}

      <CreateChallengeDialog isOpen={createOpen} onOpenChange={setCreateOpen} roomId={roomId} />
    </div>
  );
}
