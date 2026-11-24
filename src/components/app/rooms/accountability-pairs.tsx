"use client";

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Users } from "lucide-react";
import { addDoc, collection, query, where, updateDoc, doc } from "firebase/firestore";
import { useFirestore, useUser, useCollection } from "@/firebase";
import { AccountabilityPair, RoomMember } from "@/lib/definitions";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface AccountabilityPairsProps {
  roomId: string;
  members: RoomMember[];
}

const STATUS_DOT: Record<string, string> = {
  studying: "bg-success",
  break: "bg-clay",
  idle: "bg-ink-muted/50",
  offline: "bg-line/30",
};

export function AccountabilityPairs({ roomId, members }: AccountabilityPairsProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  // Query all pairs in room
  const pairsQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, "rooms", roomId, "pairs"),
      where("userIds", "array-contains", user.uid),
      where("active", "==", true)
    );
  }, [firestore, roomId, user]);

  const { data: myPairs } = useCollection<AccountabilityPair>(pairsQuery);
  const activePair = myPairs?.[0] ?? null;

  // Get all active pairs to detect paired members
  const allPairsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, "rooms", roomId, "pairs"), where("active", "==", true));
  }, [firestore, roomId]);
  const { data: allPairs } = useCollection<AccountabilityPair>(allPairsQuery);

  const pairedUserIds = useMemo(() => {
    const set = new Set<string>();
    (allPairs ?? []).forEach(p => p.userIds.forEach(uid => set.add(uid)));
    return set;
  }, [allPairs]);

  const unpairedMembers = useMemo(
    () => members.filter(m => m.userId !== user?.uid && !pairedUserIds.has(m.userId)),
    [members, user?.uid, pairedUserIds]
  );

  // Partner info
  const partnerId = activePair?.userIds.find(uid => uid !== user?.uid);
  const partner = members.find(m => m.userId === partnerId);

  const handlePairUp = async (targetMember: RoomMember) => {
    if (!firestore || !user) return;
    try {
      await addDoc(collection(firestore, "rooms", roomId, "pairs"), {
        roomId,
        userIds: [user.uid, targetMember.userId],
        checkInTime: "21:00",
        createdAt: new Date().toISOString(),
        active: true,
      });
      toast({ title: `Paired with ${targetMember.displayName}!`, description: "You'll remind each other to study." });
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Could not create pair." });
    }
  };

  const handleUnpair = async () => {
    if (!firestore || !activePair) return;
    await updateDoc(doc(firestore, "rooms", roomId, "pairs", activePair.id), { active: false });
  };

  const handleUpdateCheckInTime = async (time: string) => {
    if (!firestore || !activePair) return;
    await updateDoc(doc(firestore, "rooms", roomId, "pairs", activePair.id), { checkInTime: time });
  };

  useEffect(() => {
    if (
      !activePair ||
      !partner ||
      typeof window === "undefined" ||
      !("Notification" in window)
    ) {
      return;
    }
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }
    if (Notification.permission !== "granted") return;

    const [h, m] = activePair.checkInTime.split(":").map(Number);
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
    if (next <= now) next.setDate(next.getDate() + 1);
    const ms = next.getTime() - now.getTime();

    const storageKey = `fenrir_checkin_${activePair.id}_${activePair.checkInTime}`;
    if (localStorage.getItem(storageKey)) return; // already scheduled

    const tid = setTimeout(() => {
      new Notification("Fenrir Study Rooms", {
        body: `Hey! Time to check in with ${partner.displayName}. Are you both studying?`,
      });
      localStorage.removeItem(storageKey);
    }, ms);

    localStorage.setItem(storageKey, "1");
    return () => { clearTimeout(tid); localStorage.removeItem(storageKey); };
  }, [activePair, partner]);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full flex items-center justify-between h-auto py-2 px-0 hover:bg-transparent">
          <span className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
            <Users className="h-3.5 w-3.5" /> Accountability Pairs
          </span>
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3 pt-2">
        {activePair && partner ? (
          <Card className="border-line bg-surface">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border border-line/20">
                  <AvatarImage src={partner.photoURL} />
                  <AvatarFallback>{(partner.displayName ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-ink truncate">{partner.displayName}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={cn("h-2 w-2 rounded-full", STATUS_DOT[partner.status] ?? "bg-line/30")} />
                    <span className="text-xs text-ink-muted capitalize">{partner.status}</span>
                  </div>
                </div>
                <Badge variant="secondary">Partner</Badge>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-ink-muted">Check-in time:</label>
                <input
                  type="time"
                  value={activePair.checkInTime}
                  onChange={e => handleUpdateCheckInTime(e.target.value)}
                  className="h-9 text-xs rounded-lg border border-line/30 bg-surface-soft text-ink px-2 font-mono"
                />
              </div>
              <Button variant="ghost" size="sm" className="text-danger hover:text-danger" onClick={handleUnpair}>
                Unpair
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-ink-muted">Find an accountability partner:</p>
            {unpairedMembers.length === 0 ? (
              <p className="text-xs text-ink-muted text-center py-2">All members are already paired.</p>
            ) : (
              unpairedMembers.map(m => (
                <div key={m.userId} className="flex items-center gap-2.5 rounded-xl px-3 py-2 bg-surface-soft border border-line/20">
                  <Avatar className="h-7 w-7 border border-line/20">
                    <AvatarImage src={m.photoURL} />
                    <AvatarFallback className="text-[9px]">{(m.displayName ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="flex-1 text-sm text-ink truncate">{m.displayName}</span>
                  <Button size="sm" variant="outline" className="h-9 text-xs shrink-0" onClick={() => handlePairUp(m)}>
                    Pair Up
                  </Button>
                </div>
              ))
            )}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
