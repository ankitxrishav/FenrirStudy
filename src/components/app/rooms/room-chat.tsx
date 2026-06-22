"use client";

import { useEffect, useRef, useState, KeyboardEvent, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Send, ImagePlus, X, Reply, Trash2, Copy, Smile, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";
import { useFirestore, useUser } from "@/firebase";
import { sendMessage } from "@/hooks/use-room";
import { RoomMessage } from "@/lib/definitions";
import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { AnimatePresence, motion } from "framer-motion";

interface RoomChatProps {
  roomId: string;
  messages: RoomMessage[];
  roomOwnerId?: string;
}

const QUICK_EMOJIS = ["👍", "❤️", "😂", "🔥", "😮"];

function dateSeparatorLabel(iso: string): string {
  const d = new Date(iso);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMMM d, yyyy");
}

export function RoomChat({ roomId, messages, roomOwnerId }: RoomChatProps) {
  const firestore = useFirestore();
  const { user } = useUser();

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<RoomMessage | null>(null);
  const [fullImage, setFullImage] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);
  const [emojiPickerMsgId, setEmojiPickerMsgId] = useState<string | null>(null);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, previewUrl, replyingTo]);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setEmojiPickerMsgId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // 24-Hour Decentralized Cleanup Engine (auto-delete only, no manual permission check)
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
            }).catch(() => {});
          }
          updateDoc(doc(firestore, "rooms", roomId, "messages", msg.id), {
            imageUrl: null,
            imageDeleted: true,
            cloudinaryPublicId: null,
          }).catch(() => {});
        }
      }
    });
  }, [messages, firestore, roomId]);

  // Manual image deletion (sender or room owner only)
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
      } catch (e) {
        console.error("Delete image error:", e);
      } finally {
        setDeletingImageId(null);
        setConfirmDeleteId(null);
      }
    },
    [firestore, roomId, user]
  );

  // Emoji reaction toggle
  const handleReact = useCallback(
    async (msgId: string, emoji: string) => {
      if (!firestore || !user) return;
      setEmojiPickerMsgId(null);
      const msg = messages.find((m) => m.id === msgId);
      const reactors = msg?.reactions?.[emoji] ?? [];
      const hasReacted = reactors.includes(user.uid);
      const msgRef = doc(firestore, "rooms", roomId, "messages", msgId);
      try {
        await updateDoc(msgRef, {
          [`reactions.${emoji}`]: hasReacted
            ? arrayRemove(user.uid)
            : arrayUnion(user.uid),
        });
      } catch (e) {
        console.error("Reaction error:", e);
      }
    },
    [firestore, user, roomId, messages]
  );

  // Copy message text
  const handleCopy = useCallback((msg: RoomMessage) => {
    if (!msg.text) return;
    navigator.clipboard.writeText(msg.text).then(() => {
      setCopiedMsgId(msg.id);
      setTimeout(() => setCopiedMsgId(null), 1500);
    });
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
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
            if (ev.lengthComputable)
              setUploadProgress((ev.loaded / ev.total) * 100);
          });
          xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              const res = JSON.parse(xhr.responseText);
              uploadedUrl = res.url;
              cloudinaryPublicId = res.publicId;
              resolve();
            } else reject(new Error(`Upload failed: ${xhr.status}`));
          });
          xhr.addEventListener("error", () => reject(new Error("Network error")));
          xhr.open("POST", "/api/upload");
          xhr.send(fd);
        });
      }

      const replyPayload = replyingTo
        ? {
            id: replyingTo.id,
            displayName: replyingTo.displayName,
            text: replyingTo.text,
            imageUrl: replyingTo.imageUrl,
          }
        : undefined;

      await sendMessage(
        firestore,
        user,
        roomId,
        text.trim(),
        uploadedUrl,
        replyPayload,
        cloudinaryPublicId
      );

      setText("");
      clearAttachment();
      setReplyingTo(null);
      setUploadProgress(0);
    } catch (e) {
      console.error("Send error:", e);
      alert("Failed to send. Please try again.");
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

  // Build date-separated render list
  const rendered: Array<
    { type: "separator"; label: string } | { type: "msg"; msg: RoomMessage }
  > = [];
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
      <Card className="glass border-white/10 shadow-xl flex flex-col h-[580px]">
        <CardHeader className="pb-3 border-b border-white/5 shrink-0">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-primary" />
            Room Chat
            <span className="ml-auto text-[10px] font-normal text-muted-foreground">
              {messages.length} messages
            </span>
          </CardTitle>
        </CardHeader>

        {/* ── Messages ── */}
        <CardContent className="flex-1 overflow-y-auto p-3 space-y-1 min-h-0 scroll-smooth">
          {messages.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-12">
              No messages yet. Say hello! 👋
            </p>
          )}

          <AnimatePresence initial={false}>
            {rendered.map((item, i) => {
              if (item.type === "separator") {
                return (
                  <div key={`sep-${i}`} className="flex items-center gap-2 my-4">
                    <div className="flex-1 h-px bg-white/5" />
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider px-2">
                      {item.label}
                    </span>
                    <div className="flex-1 h-px bg-white/5" />
                  </div>
                );
              }

              const { msg } = item;

              if (msg.type === "system") {
                return (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    key={msg.id}
                    className="text-center text-[11px] italic text-muted-foreground/60 py-1"
                  >
                    — {msg.text} —
                  </motion.p>
                );
              }

              const isOwn = msg.userId === user?.uid;
              const isRoomOwner = user?.uid === roomOwnerId;
              const canDeleteImage =
                (isOwn || isRoomOwner) && !!msg.imageUrl && !msg.imageDeleted;
              const initials = (msg.displayName ?? "?").slice(0, 2).toUpperCase();
              const isHovered = hoveredMsgId === msg.id;

              return (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  key={msg.id}
                  className={cn(
                    "flex items-end gap-2 max-w-[88%] group relative",
                    isOwn ? "ml-auto flex-row-reverse" : "mr-auto"
                  )}
                  onMouseEnter={() => setHoveredMsgId(msg.id)}
                  onMouseLeave={() => {
                    setHoveredMsgId(null);
                    if (emojiPickerMsgId === msg.id) setEmojiPickerMsgId(null);
                  }}
                >
                  <Avatar className="h-6 w-6 shrink-0 shadow-sm self-end">
                    <AvatarImage src={msg.photoURL} />
                    <AvatarFallback className="text-[9px]">{initials}</AvatarFallback>
                  </Avatar>

                  <div className={cn("flex flex-col gap-0.5 min-w-0", isOwn ? "items-end" : "items-start")}>
                    <span className="text-[10px] font-bold text-muted-foreground px-1">
                      {isOwn ? "You" : msg.displayName}
                    </span>

                    {/* ── Bubble ── */}
                    <div
                      className={cn(
                        "relative rounded-2xl shadow-sm backdrop-blur-sm transition-all duration-150",
                        isOwn
                          ? "bg-primary/90 text-primary-foreground rounded-br-none border border-primary/20"
                          : "bg-white/10 dark:bg-black/20 rounded-bl-none border border-white/5"
                      )}
                    >
                      {/* Reply block */}
                      {msg.replyTo && (
                        <div
                          className={cn(
                            "text-[10px] p-2 m-1 mb-0 rounded-xl opacity-75 border-l-2",
                            isOwn
                              ? "bg-black/15 border-white/40"
                              : "bg-black/20 border-primary/50"
                          )}
                        >
                          <p className="font-bold mb-0.5">{msg.replyTo.displayName}</p>
                          {msg.replyTo.imageUrl && <p className="italic">📷 Photo</p>}
                          {msg.replyTo.text && (
                            <p className="truncate max-w-[140px]">{msg.replyTo.text}</p>
                          )}
                        </div>
                      )}

                      {/* Deleted placeholder */}
                      {msg.imageDeleted && (
                        <div className="px-3 py-2 text-xs italic text-muted-foreground/70 flex items-center gap-1.5">
                          <span>🗑️</span> Photo deleted (24h limit)
                        </div>
                      )}

                      {/* Image */}
                      {msg.imageUrl && !msg.imageDeleted && (
                        <div className="relative p-1">
                          <img
                            src={msg.imageUrl}
                            alt="Shared photo"
                            onClick={() => setFullImage(msg.imageUrl!)}
                            className="max-w-full sm:max-w-[210px] h-auto rounded-xl cursor-zoom-in object-cover hover:opacity-95 transition-opacity"
                          />
                        </div>
                      )}

                      {/* Text */}
                      {msg.text && (
                        <div className="px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words">
                          {msg.text}
                        </div>
                      )}
                    </div>

                    {/* ── Reaction badges ── */}
                    {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                      <div className="flex flex-wrap gap-1 px-1 mt-0.5">
                        {Object.entries(msg.reactions)
                          .filter(([, uids]) => uids.length > 0)
                          .map(([emoji, uids]) => {
                            const iMine = user && uids.includes(user.uid);
                            return (
                              <button
                                key={emoji}
                                onClick={() => handleReact(msg.id, emoji)}
                                className={cn(
                                  "flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border transition-all duration-150",
                                  iMine
                                    ? "bg-primary/20 border-primary/40 text-primary"
                                    : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10"
                                )}
                              >
                                <span>{emoji}</span>
                                <span className="font-semibold">{uids.length}</span>
                              </button>
                            );
                          })}
                      </div>
                    )}

                    <span className="text-[9px] text-muted-foreground/50 px-1">
                      {format(new Date(msg.createdAt), "HH:mm")}
                    </span>
                  </div>

                  {/* ── Hover Action Bar ── */}
                  <AnimatePresence>
                    {isHovered && (
                      <motion.div
                        ref={emojiPickerMsgId === msg.id ? emojiRef : undefined}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.1 }}
                        className={cn(
                          "absolute top-0 flex items-center gap-0.5 bg-black/60 backdrop-blur-md border border-white/10 rounded-xl px-1.5 py-1 shadow-lg z-20",
                          isOwn ? "right-8" : "left-8"
                        )}
                      >
                        {/* Reply */}
                        <ActionBtn
                          title="Reply"
                          onClick={() => setReplyingTo(msg)}
                          icon={<Reply className="h-3.5 w-3.5" />}
                        />

                        {/* React (emoji picker) */}
                        <div className="relative">
                          <ActionBtn
                            title="React"
                            onClick={() =>
                              setEmojiPickerMsgId(
                                emojiPickerMsgId === msg.id ? null : msg.id
                              )
                            }
                            icon={<Smile className="h-3.5 w-3.5" />}
                          />
                          <AnimatePresence>
                            {emojiPickerMsgId === msg.id && (
                              <motion.div
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 4 }}
                                className={cn(
                                  "absolute top-8 flex gap-1 bg-black/80 backdrop-blur-md border border-white/10 rounded-2xl px-2 py-1.5 shadow-xl z-30",
                                  isOwn ? "right-0" : "left-0"
                                )}
                              >
                                {QUICK_EMOJIS.map((e) => (
                                  <button
                                    key={e}
                                    onClick={() => handleReact(msg.id, e)}
                                    className="text-lg hover:scale-125 transition-transform duration-100 leading-none"
                                  >
                                    {e}
                                  </button>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Copy */}
                        {msg.text && (
                          <ActionBtn
                            title="Copy text"
                            onClick={() => handleCopy(msg)}
                            icon={
                              copiedMsgId === msg.id ? (
                                <Check className="h-3.5 w-3.5 text-green-400" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )
                            }
                          />
                        )}

                        {/* Delete Image */}
                        {canDeleteImage && (
                          confirmDeleteId === msg.id ? (
                            <span className="flex items-center gap-1 text-[10px]">
                              <button
                                onClick={() => handleDeleteImage(msg)}
                                disabled={deletingImageId === msg.id}
                                className="px-1.5 py-0.5 bg-red-500/80 hover:bg-red-500 text-white rounded-lg text-[10px] font-semibold transition-colors"
                              >
                                {deletingImageId === msg.id ? "…" : "Confirm"}
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-1.5 py-0.5 bg-white/10 hover:bg-white/20 rounded-lg text-[10px] transition-colors"
                              >
                                Cancel
                              </button>
                            </span>
                          ) : (
                            <ActionBtn
                              title="Delete image"
                              onClick={() => setConfirmDeleteId(msg.id)}
                              icon={<Trash2 className="h-3.5 w-3.5 text-red-400" />}
                              danger
                            />
                          )
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
          <div ref={bottomRef} />
        </CardContent>

        {/* ── Input Area ── */}
        <div className="p-3 border-t border-white/5 shrink-0 bg-background/40 backdrop-blur-md">
          <AnimatePresence>
            {/* Reply preview */}
            {replyingTo && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="flex items-center justify-between bg-primary/10 text-primary border border-primary/20 px-3 py-1.5 rounded-t-xl text-xs overflow-hidden"
              >
                <div className="truncate">
                  <span className="font-bold">↩ {replyingTo.displayName}: </span>
                  {replyingTo.imageUrl ? "📷 Photo" : replyingTo.text}
                </div>
                <button
                  onClick={() => setReplyingTo(null)}
                  className="p-1 hover:bg-black/10 rounded-full ml-2 shrink-0"
                >
                  <X className="h-3 w-3" />
                </button>
              </motion.div>
            )}

            {/* Image preview */}
            {previewUrl && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="relative p-2 bg-black/20 border border-white/10 rounded-t-xl overflow-hidden"
              >
                <img
                  src={previewUrl}
                  className="h-20 w-auto rounded-lg object-cover"
                  alt="Preview"
                />
                <button
                  onClick={clearAttachment}
                  className="absolute top-1.5 left-1.5 p-1 bg-black/60 hover:bg-red-500/80 rounded-full text-white transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div
                    className="absolute bottom-0 left-0 h-0.5 bg-primary transition-all duration-300 rounded-full"
                    style={{ width: `${uploadProgress}%` }}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-2 items-end pt-2">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileSelect}
            />
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending}
              title="Attach photo"
            >
              <ImagePlus className="h-5 w-5" />
            </Button>

            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message…"
              rows={1}
              className={cn(
                "min-h-[40px] max-h-[100px] resize-none text-sm rounded-2xl bg-white/5 border-white/10 focus-visible:ring-primary/50",
                (replyingTo || previewUrl) && "rounded-tl-none rounded-tr-none border-t-0"
              )}
            />

            <Button
              size="icon"
              onClick={handleSend}
              disabled={(!text.trim() && !file) || sending}
              className="shrink-0 rounded-full shadow-lg"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* ── Full Screen Lightbox ── */}
      <AnimatePresence>
        {fullImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/92 backdrop-blur-md p-4"
            onClick={() => setFullImage(null)}
          >
            <button
              className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
              onClick={() => setFullImage(null)}
            >
              <X className="h-6 w-6" />
            </button>
            <motion.img
              initial={{ scale: 0.88, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.88, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              src={fullImage}
              className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
              alt="Full size"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ── Small helper component for action bar buttons ──
function ActionBtn({
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
      title={title}
      onClick={onClick}
      className={cn(
        "p-1.5 rounded-lg transition-colors",
        danger
          ? "hover:bg-red-500/20 text-red-400"
          : "hover:bg-white/10 text-muted-foreground hover:text-white"
      )}
    >
      {icon}
    </button>
  );
}
