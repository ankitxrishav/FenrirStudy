"use client";

import { useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { RoomMember, Subject } from "@/lib/definitions";
import { useFirestore, useUser } from "@/firebase";
import { addDoc, collection } from "firebase/firestore";
import { Flame, CheckCircle2, BookOpen, Zap } from "lucide-react";
import { parseIsoMs } from "@/lib/study-time";

interface MemberGridProps {
  roomId: string;
  members: RoomMember[];
  subjects?: Subject[];
}

const STATUS_CONFIG = {
  studying: { dot: "bg-success", label: "Studying" },
  break: { dot: "bg-highlight", label: "On break" },
  idle: { dot: "bg-surface-muted", label: "Idle" },
  offline: { dot: "bg-ink-muted/30", label: "Offline" },
};

const KUDOS = [
  { key: "🔥", label: "Focus", icon: Flame },
  { key: "✅", label: "Done", icon: CheckCircle2 },
  { key: "📚", label: "Study", icon: BookOpen },
  { key: "⚡", label: "Pace", icon: Zap },
];

export function MemberGrid({ roomId, members, subjects }: MemberGridProps) {
  const firestore = useFirestore();
  const { user } = useUser();

  const subjectMap = useMemo(() => {
    const m = new Map<string, string>();
    (subjects ?? []).forEach((s) => m.set(s.id, s.name));
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
    } catch {
      // ignore
    }
  };

  if (members.length === 0) {
    return (
      <div className="rounded-[16px] border border-line/30 bg-surface-soft py-10 text-center text-sm text-ink-muted">
        No participants yet.
      </div>
    );
  }

  return (
    <div className="rounded-[16px] border border-line bg-surface divide-y divide-line/15 overflow-hidden">
      {members.map((member, idx) => {
        const lastSeenMs = parseIsoMs(member.lastSeen);
        const isStale = lastSeenMs > 0 && Date.now() - lastSeenMs > 120_000;
        const effectiveStatus: keyof typeof STATUS_CONFIG =
          member.timerStatus === "running"
            ? "studying"
            : member.timerStatus === "paused"
              ? "break"
              : member.status === "offline" || isStale
                ? "offline"
                : "idle";
        const cfg = STATUS_CONFIG[effectiveStatus] ?? STATUS_CONFIG.idle;
        const initials = (member.displayName ?? "?").slice(0, 2).toUpperCase();
        const subjectName = member.subjectName || (member.currentSubjectId ? subjectMap.get(member.currentSubjectId) : null);
        const isMe = member.userId === user?.uid;

        return (
          <div
            key={member.userId ?? idx}
            className={cn(
              "flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 px-4 py-3",
              isMe && "bg-surface-soft/70"
            )}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="relative shrink-0">
                <Avatar className={cn("h-10 w-10 border border-line/40", effectiveStatus === "offline" && "opacity-60")}>
                  <AvatarImage src={member.photoURL} alt={member.displayName} />
                  <AvatarFallback className="bg-surface-soft font-mono text-xs text-ink">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span
                  className={cn(
                    "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border border-line",
                    cfg.dot
                  )}
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm text-ink truncate">
                  {member.displayName}
                  {isMe && <span className="text-ink-muted font-normal"> (you)</span>}
                </p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted mt-0.5">
                  <span className="font-mono text-[11px]">{cfg.label}</span>
                  {subjectName && (
                    <>
                      <span>·</span>
                      <span className="truncate">{subjectName}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {!isMe && (
              <div className="flex items-center gap-1 shrink-0">
                {KUDOS.map((k) => {
                  const Icon = k.icon;
                  return (
                    <button
                      key={k.key}
                      type="button"
                      onClick={() => handleReaction(member, k.key)}
                      title={`Send ${k.label} kudos`}
                      aria-label={`Send ${k.label} kudos to ${member.displayName}`}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line/20 bg-surface text-ink-muted hover:border-line hover:bg-highlight hover:text-ink transition-colors"
                    >
                      <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
