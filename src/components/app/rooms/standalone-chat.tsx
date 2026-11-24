"use client";

import {
  useEffect,
  useRef,
  useState,
  KeyboardEvent,
  useCallback,
} from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  Send,
  ImagePlus,
  X,
  Reply,
  Trash2,
  Copy,
  Smile,
  Check,
  ChevronDown,
  Hash,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";
import { useFirestore, useUser } from "@/firebase";
import { sendMessage } from "@/hooks/use-room";
import { RoomMessage } from "@/lib/definitions";
import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { CHAT_THEMES, ChatThemeId } from "@/hooks/use-room-theme";

interface StandaloneChatProps {
  roomId: string;
  roomName: string;
  messages: RoomMessage[];
  roomOwnerId?: string;
  chatTheme?: string;
}

const QUICK_EMOJIS = ["👍", "❤️", "😂", "🔥", "😮", "🎯"];

function dateSeparatorLabel(iso: string): string {
  const d = new Date(iso);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMMM d, yyyy");
}

export function StandaloneChat({
  roomId,
  roomName,
  messages,
  roomOwnerId,
  chatTheme: firestoreTheme,
}: StandaloneChatProps) {
  const firestore = useFirestore();
  const { user } = useUser();

  const themeId: ChatThemeId = CHAT_THEMES.find((t) => t.id === firestoreTheme)
    ? (firestoreTheme as ChatThemeId)
    : "default";
  const theme = CHAT_THEMES.find((t) => t.id === themeId) ?? CHAT_THEMES[0];

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<RoomMessage | null>(null);
  const [fullImage, setFullImage] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeMsgId, setActiveMsgId] = useState<string | null>(null);
  const [emojiPickerMsgId, setEmojiPickerMsgId] = useState<string | null>(null);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevLenRef = useRef(messages.length);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    setIsAtBottom(atBottom);
    if (atBottom) setUnreadCount(0);
  }, []);

  useEffect(() => {
    const newMsgs = messages.length - prevLenRef.current;
    prevLenRef.current = messages.length;
    if (newMsgs > 0) {
      if (isAtBottom && scrollRef.current) {
        scrollRef.current.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: "smooth",
        });
      } else {
        setUnreadCount((c) => c + newMsgs);
      }
    }
  }, [messages.length, isAtBottom]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    if (!firestore) return;
    const now = Date.now();
    messages.forEach((msg) => {
      if (msg.imageUrl && !msg.imageDeleted) {
        const age = now - new Date(msg.createdAt).getTime();
        if (age > 24 * 60 * 60 * 1000) {
          if (msg.cloudinaryPublicId) {
            fetch("/api/delete", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ publicId: msg.cloudinaryPublicId }),
            }).catch(() => { });
          }
          updateDoc(doc(firestore, "rooms", roomId, "messages", msg.id), {
            imageUrl: null,
            imageDeleted: true,
            cloudinaryPublicId: null,
          }).catch(() => { });
        }
      }
    });
  }, [messages, firestore, roomId]);

  const handleDeleteImage = useCallback(
    async (msg: RoomMessage) => {
      if (!firestore || !user) return;
      setDeletingImageId(msg.id);
      try {
        if (msg.cloudinaryPublicId) {
          await fetch("/api/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ publicId: msg.cloudinaryPublicId }),
          });
        }
        await updateDoc(doc(firestore, "rooms", roomId, "messages", msg.id), {
          imageUrl: null,
          imageDeleted: true,
          cloudinaryPublicId: null,
        });
      } finally {
        setDeletingImageId(null);
        setConfirmDeleteId(null);
      }
    },
    [firestore, roomId, user]
  );

  const handleReact = useCallback(
    async (msgId: string, emoji: string) => {
      if (!firestore || !user) return;
      setEmojiPickerMsgId(null);
      const msg = messages.find((m) => m.id === msgId);
      const reactors = msg?.reactions?.[emoji] ?? [];
      const hasReacted = reactors.includes(user.uid);
      await updateDoc(doc(firestore, "rooms", roomId, "messages", msgId), {
        [`reactions.${emoji}`]: hasReacted ? arrayRemove(user.uid) : arrayUnion(user.uid),
      }).catch(() => { });
    },
    [firestore, user, roomId, messages]
  );

  const handleCopy = useCallback((msg: RoomMessage) => {
    if (!msg.text) return;
    navigator.clipboard.writeText(msg.text).then(() => {
      setCopiedMsgId(msg.id);
      setTimeout(() => setCopiedMsgId(null), 1500);
    });
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const selected = e.target.files[0];
      if (selected.size > 10 * 1024 * 1024) {
        alert("File must be less than 10MB");
        return;
      }
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
    }
  };

  const clearAttachment = () => {
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSend = async () => {
    if (!firestore || !user || (!text.trim() && !file)) return;
    setSending(true);
    try {
      let uploadedUrl: string | undefined;
      let cloudinaryPublicId: string | undefined;
      if (file) {
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          const fd = new FormData();
          fd.append("file", file);
          xhr.upload.addEventListener("progress", (ev) => {
            if (ev.lengthComputable) setUploadProgress((ev.loaded / ev.total) * 100);
          });
          xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              const res = JSON.parse(xhr.responseText);
              uploadedUrl = res.url;
              cloudinaryPublicId = res.publicId;
              resolve();
            } else {
              reject(new Error(`Upload failed: ${xhr.status}`));
            }
          });
          xhr.addEventListener("error", () => reject(new Error("Network error")));
          xhr.open("POST", "/api/upload");
          xhr.send(fd);
        });
      }
      const messageText = text.trim();
      await sendMessage(
        firestore,
        user,
        roomId,
        messageText,
        uploadedUrl,
        replyingTo
          ? {
            id: replyingTo.id,
            displayName: replyingTo.displayName,
            text: replyingTo.text,
            imageUrl: replyingTo.imageUrl,
          }
          : undefined,
        cloudinaryPublicId
      );
      setText("");
      clearAttachment();
      setReplyingTo(null);
      setUploadProgress(0);

      fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          senderId: user.uid,
          senderName: user.displayName || "Someone",
          text: messageText || (uploadedUrl ? "Sent a photo" : "New message"),
        }),
      }).catch((e) => console.error("FCM broadcast trigger failed:", e));
    } catch {
      alert("Failed to send.");
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
    <>
      <div className="flex flex-col h-full min-h-0 bg-surface overflow-hidden">
        <div
          className="flex flex-col flex-1 min-h-0 relative"
          style={{ background: theme.chatBg }}
        >
          <div className="flex items-center gap-3 px-4 sm:px-5 py-3 shrink-0 border-b border-line/15 bg-surface-soft">
            <Hash className="h-4 w-4 text-ink-muted shrink-0 stroke-[1.75]" />
            <span className="font-semibold text-sm text-ink truncate flex-1">{roomName}</span>
            <div className="flex items-center gap-1.5 text-ink-muted font-mono text-[11px] shrink-0">
              <span className="h-2 w-2 rounded-full bg-success" />
              Live
            </div>
          </div>

          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto min-h-0 px-4 sm:px-5 py-4 space-y-1.5 relative"
          >
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-3 py-14 text-center">
                <div className="w-12 h-12 rounded-2xl border border-line bg-surface-soft flex items-center justify-center text-ink">
                  <MessageSquare className="h-5 w-5 stroke-[1.5]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink">No messages yet</p>
                  <p className="text-xs text-ink-muted mt-1">
                    Share what you are studying or check in with the room.
                  </p>
                </div>
              </div>
            )}

            {rendered.map((item, i) => {
              if (item.type === "separator") {
                return (
                  <div key={`sep-${i}`} className="flex items-center gap-3 my-5">
                    <div className="flex-1 h-px bg-line/15" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted px-2.5 py-0.5 rounded-full border border-line/15 bg-surface-soft">
                      {item.label}
                    </span>
                    <div className="flex-1 h-px bg-line/15" />
                  </div>
                );
              }

              const { msg } = item;

              if (msg.type === "system") {
                return (
                  <div key={msg.id} className="flex items-center justify-center py-1">
                    <span className="text-[11px] text-ink-muted px-3 py-0.5 rounded-full border border-line/15 bg-surface-soft">
                      {msg.text}
                    </span>
                  </div>
                );
              }

              const isOwn = msg.userId === user?.uid;
              const isRoomOwner = user?.uid === roomOwnerId;
              const canDeleteImage = (isOwn || isRoomOwner) && !!msg.imageUrl && !msg.imageDeleted;
              const initials = (msg.displayName ?? "?").slice(0, 2).toUpperCase();
              const isActionsOpen = activeMsgId === msg.id;

              return (
                <div
                  key={msg.id}
                  className={cn("flex gap-2.5 group relative py-1", isOwn ? "flex-row-reverse" : "flex-row")}
                  onMouseEnter={() => setActiveMsgId(msg.id)}
                  onMouseLeave={() => {
                    setActiveMsgId(null);
                    if (emojiPickerMsgId === msg.id) setEmojiPickerMsgId(null);
                  }}
                >
                  <Avatar className="h-8 w-8 shrink-0 mt-1 border border-line/25">
                    <AvatarImage src={msg.photoURL} />
                    <AvatarFallback
                      className="text-[10px] font-semibold"
                      style={
                        isOwn
                          ? { background: theme.ownBubbleBg, color: theme.ownBubbleText }
                          : undefined
                      }
                    >
                      {initials}
                    </AvatarFallback>
                  </Avatar>

                  <div className={cn("flex flex-col gap-1 min-w-0 max-w-[78%] sm:max-w-[72%]", isOwn ? "items-end" : "items-start")}>
                    <div className={cn("flex items-baseline gap-2 px-1", isOwn && "flex-row-reverse")}>
                      <span className="text-[11px] font-semibold text-ink">
                        {isOwn ? "You" : msg.displayName}
                      </span>
                      <span className="font-mono text-[10px] text-ink-muted">
                        {format(new Date(msg.createdAt), "HH:mm")}
                      </span>
                    </div>

                    {msg.replyTo && (
                      <div
                        className="flex items-start gap-1.5 px-3 py-1.5 rounded-xl text-[11px] border border-line/20 border-l-2 border-l-clay bg-surface-soft max-w-full"
                      >
                        <Reply className="h-3 w-3 shrink-0 mt-0.5 text-ink-muted" />
                        <div className="min-w-0">
                          <p className="font-semibold text-ink truncate">{msg.replyTo.displayName}</p>
                          <p className="text-ink-muted truncate">
                            {msg.replyTo.imageUrl ? "Photo attachment" : msg.replyTo.text}
                          </p>
                        </div>
                      </div>
                    )}

                    <div
                      onClick={() => setActiveMsgId((cur) => (cur === msg.id ? null : msg.id))}
                      className={cn(
                        "relative rounded-2xl overflow-hidden border",
                        isOwn ? "border-line" : "border-line/25 bg-surface-soft text-ink"
                      )}
                      style={
                        isOwn
                          ? {
                            background: theme.ownBubbleBg,
                            color: theme.ownBubbleText,
                            borderRadius: "18px 18px 4px 18px",
                          }
                          : {
                            borderRadius: "18px 18px 18px 4px",
                          }
                      }
                    >
                      {msg.imageDeleted && (
                        <div className="px-4 py-2 text-xs italic opacity-75">
                          Photo deleted
                        </div>
                      )}
                      {msg.imageUrl && !msg.imageDeleted && (
                        <div className="p-1.5">
                          <img
                            src={msg.imageUrl}
                            alt="Photo attachment"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFullImage(msg.imageUrl!);
                            }}
                            className="max-w-[220px] max-h-[180px] w-auto h-auto rounded-xl cursor-zoom-in object-cover"
                          />
                        </div>
                      )}
                      {msg.text && (
                        <div className="px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words">
                          {msg.text}
                        </div>
                      )}
                    </div>

                    {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-0.5 px-1">
                        {Object.entries(msg.reactions)
                          .filter(([, uids]) => uids.length > 0)
                          .map(([emoji, uids]) => {
                            const iMine = user && uids.includes(user.uid);
                            return (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => handleReact(msg.id, emoji)}
                                className={cn(
                                  "flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border transition-colors",
                                  iMine
                                    ? "bg-highlight border-line text-ink"
                                    : "bg-surface-soft border-line/20 text-ink-muted hover:border-line"
                                )}
                              >
                                <span>{emoji}</span>
                                <span className="font-mono font-semibold">{uids.length}</span>
                              </button>
                            );
                          })}
                      </div>
                    )}
                  </div>

                  {isActionsOpen && (
                    <div
                      className={cn(
                        "absolute -top-3 flex items-center gap-0.5 rounded-xl px-1.5 py-1 z-20 border border-line bg-surface",
                        isOwn ? "right-10" : "left-10"
                      )}
                    >
                      <HoverBtn
                        title="Reply"
                        onClick={() => setReplyingTo(msg)}
                        icon={<Reply className="h-3.5 w-3.5" />}
                      />
                      <div className="relative">
                        <HoverBtn
                          title="React"
                          onClick={() =>
                            setEmojiPickerMsgId(emojiPickerMsgId === msg.id ? null : msg.id)
                          }
                          icon={<Smile className="h-3.5 w-3.5" />}
                        />
                        {emojiPickerMsgId === msg.id && (
                          <div
                            className={cn(
                              "absolute top-8 flex gap-1.5 px-2.5 py-1.5 rounded-2xl border border-line bg-surface z-30",
                              isOwn ? "right-0" : "left-0"
                            )}
                          >
                            {QUICK_EMOJIS.map((e) => (
                              <button
                                key={e}
                                type="button"
                                onClick={() => handleReact(msg.id, e)}
                                className="text-lg leading-none px-1 py-0.5 rounded hover:bg-surface-soft transition-colors"
                              >
                                {e}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      {msg.text && (
                        <HoverBtn
                          title="Copy"
                          onClick={() => handleCopy(msg)}
                          icon={
                            copiedMsgId === msg.id ? (
                              <Check className="h-3.5 w-3.5 text-success" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )
                          }
                        />
                      )}
                      {canDeleteImage &&
                        (confirmDeleteId === msg.id ? (
                          <span className="flex items-center gap-1 px-1">
                            <button
                              type="button"
                              onClick={() => handleDeleteImage(msg)}
                              disabled={deletingImageId === msg.id}
                              className="px-2 py-0.5 bg-danger text-surface rounded-lg text-[10px] font-semibold"
                            >
                              {deletingImageId === msg.id ? "…" : "Delete"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-0.5 border border-line/20 bg-surface-soft text-ink rounded-lg text-[10px]"
                            >
                              Cancel
                            </button>
                          </span>
                        ) : (
                          <HoverBtn
                            title="Delete photo"
                            danger
                            onClick={() => setConfirmDeleteId(msg.id)}
                            icon={<Trash2 className="h-3.5 w-3.5 text-danger" />}
                          />
                        ))}
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {!isAtBottom && (
            <button
              type="button"
              onClick={() => {
                if (scrollRef.current) {
                  scrollRef.current.scrollTo({
                    top: scrollRef.current.scrollHeight,
                    behavior: "smooth",
                  });
                }
                setUnreadCount(0);
              }}
              className="absolute bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full border border-line z-20"
              style={{ background: theme.ownBubbleBg, color: theme.ownBubbleText }}
            >
              {unreadCount > 0 && (
                <span className="font-mono text-[11px]">{unreadCount} new</span>
              )}
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          )}

          <div className="shrink-0 px-3 sm:px-4 py-3 border-t border-line/15 bg-surface-soft">
            {replyingTo && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-line/20 bg-surface text-xs mb-2">
                <Reply className="h-3 w-3 text-ink-muted shrink-0" />
                <span className="font-semibold text-ink">{replyingTo.displayName}:</span>
                <span className="text-ink-muted truncate flex-1">
                  {replyingTo.imageUrl ? "Photo attachment" : replyingTo.text}
                </span>
                <button
                  type="button"
                  onClick={() => setReplyingTo(null)}
                  className="p-1 hover:bg-surface-soft rounded"
                  aria-label="Cancel reply"
                >
                  <X className="h-3 w-3 text-ink-muted" />
                </button>
              </div>
            )}

            {previewUrl && (
              <div className="relative p-2 rounded-xl border border-line/20 bg-surface mb-2 inline-block">
                <img src={previewUrl} className="h-16 w-auto rounded-lg" alt="Preview" />
                <button
                  type="button"
                  onClick={clearAttachment}
                  aria-label="Remove image"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full border border-line bg-surface text-ink flex items-center justify-center"
                >
                  <X className="h-3 w-3" />
                </button>
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div
                    className="absolute bottom-0 left-0 h-1 rounded-full bg-clay transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                )}
              </div>
            )}

            <div className="flex gap-2 items-end">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={sending}
                title="Attach photo"
                aria-label="Attach photo"
                className="shrink-0 h-11 w-11 rounded-xl border border-line/25 bg-surface flex items-center justify-center text-ink-muted hover:text-ink hover:border-line transition-colors"
              >
                <ImagePlus className="h-4 w-4" />
              </button>

              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Write a message..."
                rows={1}
                className="flex-1 min-h-[44px] max-h-[110px] resize-none text-sm rounded-xl border-line/25 bg-surface text-ink placeholder:text-ink-muted"
              />

              <button
                type="button"
                onClick={handleSend}
                disabled={(!text.trim() && !file) || sending}
                aria-label="Send message"
                className="shrink-0 h-11 w-11 rounded-xl border border-line flex items-center justify-center transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: theme.ownBubbleBg, color: theme.ownBubbleText }}
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {fullImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-page/95 p-4"
          onClick={() => setFullImage(null)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 h-11 w-11 rounded-full border border-line bg-surface text-ink flex items-center justify-center"
            onClick={() => setFullImage(null)}
            aria-label="Close image preview"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={fullImage}
            className="max-w-full max-h-full object-contain rounded-2xl border border-line bg-surface"
            alt="Full size"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

function HoverBtn({
  icon,
  title,
  onClick,
  danger = false,
}: {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "p-1.5 rounded-lg transition-colors",
        danger
          ? "hover:bg-danger/10 text-danger"
          : "hover:bg-surface-soft text-ink-muted hover:text-ink"
      )}
    >
      {icon}
    </button>
  );
}
