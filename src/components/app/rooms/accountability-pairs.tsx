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
  studying: "bg-green-500",
  break: "bg-yellow-500",
  idle: "bg-gray-400",
  offline: "bg-gray-600",
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

  // Browser notification scheduling
  useEffect(() => {
    if (!activePair || !partner || typeof window === "undefined") return;
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
          // Has active pair
          <Card className="glass border-primary/20">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={partner.photoURL} />
                  <AvatarFallback>{(partner.displayName ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{partner.displayName}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[partner.status] ?? "bg-gray-500")} />
                    <span className="text-xs text-muted-foreground capitalize">{partner.status}</span>
                  </div>
                </div>
                <Badge variant="secondary">Partner</Badge>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground">Check-in time:</label>
                <input
                  type="time"
                  value={activePair.checkInTime}
                  onChange={e => handleUpdateCheckInTime(e.target.value)}
                  className="h-7 text-xs rounded border border-input bg-background px-2"
                />
              </div>
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={handleUnpair}>
                Unpair
              </Button>
            </CardContent>
          </Card>
        ) : (
          // No pair — show list of unpaired members
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Find an accountability partner:</p>
            {unpairedMembers.length === 0 ? (
              <p className="text-xs text-muted-foreground/60 text-center py-2">All members are already paired.</p>
            ) : (
              unpairedMembers.map(m => (
                <div key={m.userId} className="flex items-center gap-2 rounded-lg px-3 py-2 bg-white/[0.02] border border-white/5">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={m.photoURL} />
                    <AvatarFallback className="text-[9px]">{(m.displayName ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="flex-1 text-sm">{m.displayName}</span>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handlePairUp(m)}>
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
