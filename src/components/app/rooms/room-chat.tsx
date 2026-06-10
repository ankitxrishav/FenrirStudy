"use client";

import { useEffect, useRef, useState, KeyboardEvent } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";
import { useFirestore, useUser } from "@/firebase";
import { sendMessage } from "@/hooks/use-room";
import { RoomMessage } from "@/lib/definitions";

interface RoomChatProps {
  roomId: string;
  messages: RoomMessage[];
}

function dateSeparatorLabel(iso: string): string {
  const d = new Date(iso);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMMM d, yyyy");
}

export function RoomChat({ roomId, messages }: RoomChatProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = async () => {
    if (!firestore || !user || !text.trim()) return;
    setSending(true);
    try {
      await sendMessage(firestore, user, roomId, text.trim());
      setText("");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Group messages and inject date separators
  const rendered: Array<{ type: "separator"; label: string } | { type: "msg"; msg: RoomMessage }> = [];
  let lastDayLabel = "";
  for (const msg of messages) {
    const dayLabel = dateSeparatorLabel(msg.createdAt);
    if (dayLabel !== lastDayLabel) {
      rendered.push({ type: "separator", label: dayLabel });
      lastDayLabel = dayLabel;
    }
    rendered.push({ type: "msg", msg });
  }

  return (
    <Card className="glass border-white/10 shadow-xl flex flex-col h-[520px]">
      <CardHeader className="pb-3 border-b border-white/5 shrink-0">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-primary" />
          Room Chat
        </CardTitle>
      </CardHeader>

      {/* Messages */}
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
        {messages.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-8">
            No messages yet. Say hello! 👋
          </p>
        )}
        {rendered.map((item, i) => {
          if (item.type === "separator") {
            return (
              <div key={`sep-${i}`} className="flex items-center gap-2 my-3">
                <div className="flex-1 h-px bg-white/5" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.label}</span>
                <div className="flex-1 h-px bg-white/5" />
              </div>
            );
          }
          const { msg } = item;

          if (msg.type === "system") {
            return (
              <p key={msg.id} className="text-center text-[11px] italic text-muted-foreground/60 py-0.5">
                — {msg.text} —
              </p>
            );
          }

          const isOwn = msg.userId === user?.uid;
          const initials = (msg.displayName ?? "?").slice(0, 2).toUpperCase();

          return (
            <div
              key={msg.id}
              className={cn(
                "flex items-end gap-2 max-w-[85%]",
                isOwn ? "ml-auto flex-row-reverse" : "mr-auto"
              )}
            >
              <Avatar className="h-6 w-6 shrink-0">
                <AvatarImage src={msg.photoURL} />
                <AvatarFallback className="text-[9px]">{initials}</AvatarFallback>
              </Avatar>
              <div className={cn("flex flex-col gap-0.5", isOwn ? "items-end" : "items-start")}>
                <span className="text-[10px] font-bold text-muted-foreground">
                  {isOwn ? "You" : msg.displayName}
                </span>
                <div
                  className={cn(
                    "rounded-2xl px-3 py-2 text-sm leading-relaxed",
                    isOwn
                      ? "bg-primary text-primary-foreground rounded-br-none"
                      : "bg-white/8 rounded-bl-none"
                  )}
                >
                  {msg.text}
                </div>
                <span className="text-[9px] text-muted-foreground/50">
                  {format(new Date(msg.createdAt), "HH:mm")}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </CardContent>

      {/* Input */}
      <div className="p-3 border-t border-white/5 shrink-0">
        <div className="flex gap-2 items-end">
          <Textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message… (Enter to send)"
            rows={1}
            className="min-h-[38px] max-h-[100px] resize-none text-sm"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
