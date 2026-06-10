"use client";

import { useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { RoomMember, Subject } from "@/lib/definitions";
import { useFirestore, useUser } from "@/firebase";
import { addDoc, collection } from "firebase/firestore";

interface MemberGridProps {
  roomId: string;
  members: RoomMember[];
  subjects?: Subject[];
}

const STATUS_CONFIG = {
  studying: { ring: "ring-2 ring-green-500", dot: "bg-green-500", label: "Studying", animate: true },
  break: { ring: "ring-2 ring-yellow-500", dot: "bg-yellow-500", label: "On break", animate: false },
  idle: { ring: "ring-2 ring-gray-400", dot: "bg-gray-400", label: "Idle", animate: false },
  offline: { ring: "ring-2 ring-transparent opacity-50", dot: "bg-gray-500", label: "Offline", animate: false },
};

const EMOJIS = ["🔥", "✅", "📚", "💪", "⚡"];

export function MemberGrid({ roomId, members, subjects }: MemberGridProps) {
  const firestore = useFirestore();
  const { user } = useUser();

  const subjectMap = useMemo(() => {
    const m = new Map<string, string>();
    (subjects ?? []).forEach(s => m.set(s.id, s.name));
    return m;
  }, [subjects]);

  const handleReaction = async (toMember: RoomMember, emoji: string) => {
    if (!firestore || !user || toMember.userId === user.uid) return;
    try {
      await addDoc(collection(firestore, "sessionReactions"), {
        sessionId: `kudos_${toMember.userId}`,
        roomId,
        fromUserId: user.uid,
        fromDisplayName: user.displayName ?? "",
        emoji,
        createdAt: new Date().toISOString(),
      });
    } catch (e) {
      console.error("Reaction error", e);
    }
  };

  if (members.length === 0) {
    return (
      <div className="py-10 text-center glass border-dashed border border-white/10 rounded-xl">
        <p className="text-muted-foreground text-sm">No members yet.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {members.map((member, idx) => {
        const cfg = STATUS_CONFIG[member.status] ?? STATUS_CONFIG.idle;
        const initials = (member.displayName ?? "?").slice(0, 2).toUpperCase();
        const subjectName = member.currentSubjectId ? subjectMap.get(member.currentSubjectId) : null;
        const isMe = member.userId === user?.uid;

        return (
          <Card
            key={member.userId ?? idx}
            className={cn(
              "glass border-white/10 shadow-lg transition-all duration-300",
              isMe && "border-primary/30"
            )}
          >
            <CardContent className="p-4 flex flex-col items-center gap-3">
              {/* Avatar with status ring */}
              <div className="relative">
                <Avatar className={cn("h-14 w-14", member.status !== "offline" && cfg.ring)}>
                  <AvatarImage src={member.photoURL} alt={member.displayName} />
                  <AvatarFallback className="text-sm font-bold">{initials}</AvatarFallback>
                </Avatar>
                {member.status !== "offline" && (
                  <span
                    className={cn(
                      "absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full border-2 border-background",
                      cfg.dot,
                      cfg.animate && "animate-pulse"
                    )}
                  />
                )}
              </div>

              {/* Name */}
              <div className="text-center w-full">
                <p className="font-semibold text-sm truncate w-full text-center">
                  {member.displayName}{isMe && " (you)"}
                </p>
                {/* Status badge */}
                <span className="inline-flex items-center gap-1 mt-1 text-[10px] uppercase font-bold tracking-wide text-muted-foreground">
                  <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
                  {cfg.label}
                </span>
                {subjectName && (
                  <p className="text-[10px] text-muted-foreground/70 mt-0.5 truncate">{subjectName}</p>
                )}
              </div>

              {/* Reaction emojis (hide for self) */}
              {!isMe && (
                <div className="flex gap-1 flex-wrap justify-center">
                  {EMOJIS.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => handleReaction(member, emoji)}
                      className="text-base hover:scale-125 transition-transform active:scale-95"
                      title={`Send ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
