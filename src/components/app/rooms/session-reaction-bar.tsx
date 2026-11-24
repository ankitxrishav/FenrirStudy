"use client";

import { useMemo } from "react";
import { collection, query, where, addDoc, deleteDoc, doc } from "firebase/firestore";
import { useFirestore, useUser, useCollection } from "@/firebase";
import { SessionReaction, Session } from "@/lib/definitions";
import { cn } from "@/lib/utils";

const EMOJIS = ["🔥", "✅", "📚", "💪", "⚡"];

interface SessionReactionBarProps {
  session: Session;
  roomId: string;
  authorName?: string;
}

export function SessionReactionBar({ session, roomId }: SessionReactionBarProps) {
  const firestore = useFirestore();
  const { user } = useUser();

  const reactionsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, "sessionReactions"),
      where("sessionId", "==", session.id)
    );
  }, [firestore, session.id]);

  const { data: reactions } = useCollection<SessionReaction>(reactionsQuery);

  const grouped = useMemo(() => {
    const map = new Map<string, { count: number; myReactionId: string | null }>();
    EMOJIS.forEach(e => map.set(e, { count: 0, myReactionId: null }));
    (reactions ?? []).forEach(r => {
      const cur = map.get(r.emoji) ?? { count: 0, myReactionId: null };
      map.set(r.emoji, {
        count: cur.count + 1,
        myReactionId: r.fromUserId === user?.uid ? r.id : cur.myReactionId,
      });
    });
    return map;
  }, [reactions, user?.uid]);

  const handleClick = async (emoji: string) => {
    if (!firestore || !user) return;
    const cur = grouped.get(emoji);

    if (cur?.myReactionId) {
      // Remove reaction
      await deleteDoc(doc(firestore, "sessionReactions", cur.myReactionId));
    } else {
      // Add reaction
      await addDoc(collection(firestore, "sessionReactions"), {
        sessionId: session.id,
        roomId,
        fromUserId: user.uid,
        fromDisplayName: user.displayName ?? "",
        emoji,
        createdAt: new Date().toISOString(),
      });
    }
  };

  return (
    <div className="flex gap-1 flex-wrap mt-1.5">
      {EMOJIS.map(emoji => {
        const { count, myReactionId } = grouped.get(emoji) ?? { count: 0, myReactionId: null };
        const isOwn = !!myReactionId;
        return (
          <button
            key={emoji}
            onClick={() => handleClick(emoji)}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs border transition-colors active:scale-95",
              isOwn
                ? "bg-highlight border-line text-ink"
                : "bg-surface-soft border-line/20 text-ink-muted hover:border-line/60 hover:text-ink"
            )}
          >
            <span>{emoji}</span>
            {count > 0 && <span className="font-semibold">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
