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
  Send, ImagePlus, X, Reply, Trash2, Copy,
  Smile, Check, ChevronDown, Hash,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";
import { useFirestore, useUser } from "@/firebase";
import { sendMessage } from "@/hooks/use-room";
import { RoomMessage } from "@/lib/definitions";
import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { AnimatePresence, motion } from "framer-motion";
import { CHAT_THEMES, ChatThemeId } from "@/hooks/use-room-theme";

interface StandaloneChatProps {
  roomId: string;
  roomName: string;
  messages: RoomMessage[];
  roomOwnerId?: string;
  chatTheme?: string; // from room Firestore doc — shared across all members
}

const QUICK_EMOJIS = ["👍", "❤️", "😂", "🔥", "😮", "🎯"];

function dateSeparatorLabel(iso: string): string {
  const d = new Date(iso);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMMM d, yyyy");
}

export function StandaloneChat({ roomId, roomName, messages, roomOwnerId, chatTheme: firestoreTheme }: StandaloneChatProps) {
  const firestore = useFirestore();
  const { user } = useUser();

  // Derive theme from Firestore room doc (shared). Falls back to "default".
  const themeId: ChatThemeId = (CHAT_THEMES.find(t => t.id === firestoreTheme) ? firestoreTheme as ChatThemeId : "default");
  const theme = CHAT_THEMES.find(t => t.id === themeId) ?? CHAT_THEMES[0];
  const isThemed = themeId !== "default";

  // Write theme change to Firestore so ALL members see it immediately
  const handleThemeChange = useCallback(async (newId: ChatThemeId) => {
    if (!firestore) return;
    try {
      await updateDoc(doc(firestore, "rooms", roomId), { chatTheme: newId });
    } catch { /* ignore */ }
  }, [firestore, roomId]);

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
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevLenRef = useRef(messages.length);

  // Scroll tracking
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    setIsAtBottom(atBottom);
    if (atBottom) setUnreadCount(0);
  }, []);

  // Auto-scroll or badge
  useEffect(() => {
    const newMsgs = messages.length - prevLenRef.current;
    prevLenRef.current = messages.length;
    if (newMsgs > 0) {
      if (isAtBottom) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      else setUnreadCount((c) => c + newMsgs);
    }
  }, [messages.length, isAtBottom]);

  // Initial scroll
  useEffect(() => { bottomRef.current?.scrollIntoView(); }, []);

  // 24h auto-cleanup
  useEffect(() => {
    if (!firestore) return;
    const now = Date.now();
    messages.forEach((msg) => {
      if (msg.imageUrl && !msg.imageDeleted) {
        const age = now - new Date(msg.createdAt).getTime();
        if (age > 24 * 60 * 60 * 1000) {
          if (msg.cloudinaryPublicId) {
            fetch("/api/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ publicId: msg.cloudinaryPublicId }) }).catch(() => {});
          }
          updateDoc(doc(firestore, "rooms", roomId, "messages", msg.id), { imageUrl: null, imageDeleted: true, cloudinaryPublicId: null }).catch(() => {});
        }
      }
    });
  }, [messages, firestore, roomId]);

  const handleDeleteImage = useCallback(async (msg: RoomMessage) => {
    if (!firestore || !user) return;
    setDeletingImageId(msg.id);
    try {
      if (msg.cloudinaryPublicId) {
        await fetch("/api/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ publicId: msg.cloudinaryPublicId }) });
      }
      await updateDoc(doc(firestore, "rooms", roomId, "messages", msg.id), { imageUrl: null, imageDeleted: true, cloudinaryPublicId: null });
    } finally {
      setDeletingImageId(null);
      setConfirmDeleteId(null);
    }
  }, [firestore, roomId, user]);

  const handleReact = useCallback(async (msgId: string, emoji: string) => {
    if (!firestore || !user) return;
    setEmojiPickerMsgId(null);
    const msg = messages.find((m) => m.id === msgId);
    const reactors = msg?.reactions?.[emoji] ?? [];
    const hasReacted = reactors.includes(user.uid);
    await updateDoc(doc(firestore, "rooms", roomId, "messages", msgId), {
      [`reactions.${emoji}`]: hasReacted ? arrayRemove(user.uid) : arrayUnion(user.uid),
    }).catch(() => {});
  }, [firestore, user, roomId, messages]);

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
      if (selected.size > 10 * 1024 * 1024) { alert("File must be less than 10MB"); return; }
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
          xhr.upload.addEventListener("progress", (ev) => { if (ev.lengthComputable) setUploadProgress((ev.loaded / ev.total) * 100); });
          xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) { const res = JSON.parse(xhr.responseText); uploadedUrl = res.url; cloudinaryPublicId = res.publicId; resolve(); }
            else reject(new Error(`Upload failed: ${xhr.status}`));
          });
          xhr.addEventListener("error", () => reject(new Error("Network error")));
          xhr.open("POST", "/api/upload");
          xhr.send(fd);
        });
      }
      await sendMessage(firestore, user, roomId, text.trim(), uploadedUrl,
        replyingTo ? { id: replyingTo.id, displayName: replyingTo.displayName, text: replyingTo.text, imageUrl: replyingTo.imageUrl } : undefined,
        cloudinaryPublicId
      );
      setText(""); clearAttachment(); setReplyingTo(null); setUploadProgress(0);
    } catch { alert("Failed to send."); }
    finally { setSending(false); }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // Build date-grouped render list
  const rendered: Array<{ type: "separator"; label: string } | { type: "msg"; msg: RoomMessage }> = [];
  let lastDayLabel = "";
  for (const msg of messages) {
    const dayLabel = dateSeparatorLabel(msg.createdAt);
    if (dayLabel !== lastDayLabel) { rendered.push({ type: "separator", label: dayLabel }); lastDayLabel = dayLabel; }
    rendered.push({ type: "msg", msg });
  }

  return (
    <>
      {/* ── Chat Panel ── */}
      <div
        className="flex flex-col h-full min-h-0 rounded-b-2xl overflow-hidden"
        style={{ background: isThemed ? "transparent" : undefined }}
      >

        {/* ── Chat inner with themed background ── */}
        <div
          className="flex flex-col flex-1 min-h-0 relative"
          style={{ background: theme.chatBg, transition: "background 0.6s ease" }}
        >
          {/* Chat header bar */}
          <div className="flex items-center gap-3 px-5 py-3 shrink-0 relative z-10"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(0,0,0,0.2)", backdropFilter: "blur(12px)" }}>
            <Hash className="h-4 w-4 text-white/40 shrink-0" />
            <span className="font-bold text-sm text-white/80 truncate flex-1">{roomName}</span>
            <div className="flex items-center gap-1.5 text-white/30 text-[11px] mr-2">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              Live
            </div>
          </div>
          {/* Themed gradient overlay when active (adds depth) */}
          {isThemed && (
            <div
              className="absolute inset-0 pointer-events-none z-0 rounded-b-2xl"
              style={{
                background: `radial-gradient(ellipse at top right, rgba(255,255,255,0.03) 0%, transparent 60%),
                             radial-gradient(ellipse at bottom left, rgba(255,255,255,0.02) 0%, transparent 60%)`,
              }}
            />
          )}

          {/* Messages area */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto min-h-0 px-5 py-4 space-y-1 relative z-10"
            style={{
              scrollbarWidth: "thin",
              scrollbarColor: "rgba(255,255,255,0.08) transparent",
            }}
          >
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-4 py-16">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
                  style={{ background: theme.ownBubbleBg, boxShadow: `0 8px 32px ${isThemed ? "rgba(0,0,0,0.4)" : "rgba(59,130,246,0.2)"}` }}>
                  💬
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-white/60">No messages yet</p>
                  <p className="text-xs text-white/30 mt-1">Be the first to say something! 👋</p>
                </div>
              </div>
            )}

            <AnimatePresence initial={false}>
              {rendered.map((item, i) => {
                if (item.type === "separator") {
                  return (
                    <div key={`sep-${i}`} className="flex items-center gap-3 my-6">
                      <div className="flex-1 h-px" style={{ background: isThemed ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.06)" }} />
                      <span className="text-[10px] uppercase tracking-[0.15em] font-semibold px-3 py-1 rounded-full"
                        style={{ background: isThemed ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.4)" }}>
                        {item.label}
                      </span>
                      <div className="flex-1 h-px" style={{ background: isThemed ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.06)" }} />
                    </div>
                  );
                }

                const { msg } = item;

                if (msg.type === "system") {
                  return (
                    <motion.div key={msg.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="flex items-center justify-center py-1">
                      <span className="text-[11px] italic px-3 py-0.5 rounded-full"
                        style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.35)" }}>
                        {msg.text}
                      </span>
                    </motion.div>
                  );
                }

                const isOwn = msg.userId === user?.uid;
                const isRoomOwner = user?.uid === roomOwnerId;
                const canDeleteImage = (isOwn || isRoomOwner) && !!msg.imageUrl && !msg.imageDeleted;
                const initials = (msg.displayName ?? "?").slice(0, 2).toUpperCase();
                const isHovered = hoveredMsgId === msg.id;

                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className={cn("flex gap-3 group relative py-1", isOwn ? "flex-row-reverse" : "flex-row")}
                    onMouseEnter={() => setHoveredMsgId(msg.id)}
                    onMouseLeave={() => { setHoveredMsgId(null); if (emojiPickerMsgId === msg.id) setEmojiPickerMsgId(null); }}
                  >
                    {/* Avatar */}
                    <Avatar className="h-8 w-8 shrink-0 mt-1 ring-2 ring-white/10 shadow-lg">
                      <AvatarImage src={msg.photoURL} />
                      <AvatarFallback className="text-[10px] font-bold text-white"
                        style={{ background: theme.ownBubbleBg }}>
                        {initials}
                      </AvatarFallback>
                    </Avatar>

                    <div className={cn("flex flex-col gap-1.5 min-w-0 max-w-[72%]", isOwn ? "items-end" : "items-start")}>
                      {/* Name + time */}
                      <div className={cn("flex items-baseline gap-2 px-1", isOwn && "flex-row-reverse")}>
                        <span className="text-[11px] font-bold text-white/60">{isOwn ? "You" : msg.displayName}</span>
                        <span className="text-[10px] text-white/25">{format(new Date(msg.createdAt), "HH:mm")}</span>
                      </div>

                      {/* Reply quote */}
                      {msg.replyTo && (
                        <div className={cn("flex items-start gap-1.5 px-3 py-2 rounded-xl text-[11px] border-l-2 max-w-full",
                          isOwn ? "border-white/30" : "border-white/20")}
                          style={{ background: "rgba(255,255,255,0.06)" }}>
                          <Reply className="h-2.5 w-2.5 shrink-0 mt-0.5 text-white/40" />
                          <div className="min-w-0">
                            <p className="font-bold text-white/50 truncate">{msg.replyTo.displayName}</p>
                            <p className="text-white/35 truncate">{msg.replyTo.imageUrl ? "📷 Photo" : msg.replyTo.text}</p>
                          </div>
                        </div>
                      )}

                      {/* Bubble */}
                      <div
                        className="relative rounded-2xl overflow-hidden shadow-lg"
                        style={isOwn ? {
                          background: theme.ownBubbleBg,
                          color: theme.ownBubbleText,
                          borderRadius: "18px 18px 4px 18px",
                          boxShadow: isThemed ? "0 4px 20px rgba(0,0,0,0.35)" : undefined,
                        } : {
                          background: isThemed ? "rgba(255,255,255,0.09)" : "rgba(255,255,255,0.07)",
                          color: "rgba(255,255,255,0.9)",
                          border: "1px solid rgba(255,255,255,0.07)",
                          borderRadius: "18px 18px 18px 4px",
                          backdropFilter: "blur(12px)",
                        }}
                      >
                        {msg.imageDeleted && (
                          <div className="px-4 py-2.5 text-xs italic opacity-50 flex items-center gap-2">
                            🗑️ Photo deleted
                          </div>
                        )}
                        {msg.imageUrl && !msg.imageDeleted && (
                          <div className="p-1.5">
                            <img src={msg.imageUrl} alt="Photo" onClick={() => setFullImage(msg.imageUrl!)}
                              className="max-w-[220px] max-h-[180px] w-auto h-auto rounded-xl cursor-zoom-in object-cover hover:opacity-90 transition-opacity" />
                          </div>
                        )}
                        {msg.text && (
                          <div className="px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words">
                            {msg.text}
                          </div>
                        )}
                      </div>

                      {/* Reactions */}
                      {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-0.5 px-1">
                          {Object.entries(msg.reactions)
                            .filter(([, uids]) => uids.length > 0)
                            .map(([emoji, uids]) => {
                              const iMine = user && uids.includes(user.uid);
                              return (
                                <button key={emoji} onClick={() => handleReact(msg.id, emoji)}
                                  className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border transition-all"
                                  style={{
                                    background: iMine ? `${theme.ownBubbleBg}30` : "rgba(255,255,255,0.06)",
                                    borderColor: iMine ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.1)",
                                    color: "rgba(255,255,255,0.8)",
                                  }}>
                                  <span>{emoji}</span>
                                  <span className="font-semibold">{uids.length}</span>
                                </button>
                              );
                            })}
                        </div>
                      )}
                    </div>

                    {/* Hover action bar */}
                    <AnimatePresence>
                      {isHovered && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.85 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.85 }}
                          transition={{ duration: 0.1 }}
                          className={cn(
                            "absolute -top-3 flex items-center gap-0.5 rounded-xl px-1.5 py-1 z-20 shadow-xl",
                            isOwn ? "right-10" : "left-10"
                          )}
                          style={{ background: "rgba(20,20,35,0.95)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(16px)" }}
                        >
                          <HoverBtn title="Reply" onClick={() => setReplyingTo(msg)} icon={<Reply className="h-3.5 w-3.5" />} />
                          <div className="relative">
                            <HoverBtn title="React" onClick={() => setEmojiPickerMsgId(emojiPickerMsgId === msg.id ? null : msg.id)} icon={<Smile className="h-3.5 w-3.5" />} />
                            <AnimatePresence>
                              {emojiPickerMsgId === msg.id && (
                                <motion.div
                                  initial={{ opacity: 0, y: 4, scale: 0.92 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 4, scale: 0.92 }}
                                  className={cn("absolute top-8 flex gap-1.5 px-2.5 py-2 rounded-2xl shadow-2xl z-30", isOwn ? "right-0" : "left-0")}
                                  style={{ background: "rgba(20,20,35,0.98)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(16px)" }}
                                >
                                  {QUICK_EMOJIS.map((e) => (
                                    <button key={e} onClick={() => handleReact(msg.id, e)} className="text-xl hover:scale-125 transition-transform duration-100 leading-none">{e}</button>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                          {msg.text && (
                            <HoverBtn title="Copy" onClick={() => handleCopy(msg)}
                              icon={copiedMsgId === msg.id ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />} />
                          )}
                          {canDeleteImage && (
                            confirmDeleteId === msg.id ? (
                              <span className="flex items-center gap-1">
                                <button onClick={() => handleDeleteImage(msg)} disabled={deletingImageId === msg.id}
                                  className="px-2 py-0.5 bg-red-500/80 hover:bg-red-500 text-white rounded-lg text-[10px] font-bold transition-colors">
                                  {deletingImageId === msg.id ? "…" : "Delete"}
                                </button>
                                <button onClick={() => setConfirmDeleteId(null)} className="px-2 py-0.5 bg-white/10 hover:bg-white/20 rounded-lg text-[10px] transition-colors">Cancel</button>
                              </span>
                            ) : (
                              <HoverBtn title="Delete photo" danger onClick={() => setConfirmDeleteId(msg.id)} icon={<Trash2 className="h-3.5 w-3.5 text-red-400" />} />
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
          </div>

          {/* Scroll badge */}
          <AnimatePresence>
            {!isAtBottom && (
              <motion.button
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                onClick={() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); setUnreadCount(0); }}
                className="absolute bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-2 text-white text-xs font-bold px-4 py-2 rounded-full shadow-xl z-20 transition-transform hover:scale-105"
                style={{ background: theme.ownBubbleBg }}
              >
                {unreadCount > 0 && <span className="bg-white/20 rounded-full px-1.5">{unreadCount} new</span>}
                <ChevronDown className="h-3.5 w-3.5" />
              </motion.button>
            )}
          </AnimatePresence>

          {/* Input area */}
          <div className="shrink-0 px-4 py-3 relative z-10" style={{ background: isThemed ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.15)", backdropFilter: "blur(12px)", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <AnimatePresence>
              {replyingTo && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="flex items-center gap-2 px-3 py-2 rounded-t-xl text-xs mb-0 overflow-hidden"
                  style={{ background: `${theme.ownBubbleBg.includes("gradient") ? "rgba(255,255,255,0.06)" : "rgba(59,130,246,0.1)"}`, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <Reply className="h-3 w-3 text-white/50 shrink-0" />
                  <span className="font-bold text-white/70">{replyingTo.displayName}:</span>
                  <span className="text-white/40 truncate flex-1">{replyingTo.imageUrl ? "📷 Photo" : replyingTo.text}</span>
                  <button onClick={() => setReplyingTo(null)} className="p-0.5 hover:bg-white/10 rounded"><X className="h-3 w-3 text-white/50" /></button>
                </motion.div>
              )}
              {previewUrl && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="relative p-2 rounded-t-xl mb-0 overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <img src={previewUrl} className="h-16 w-auto rounded-lg" alt="Preview" />
                  <button onClick={clearAttachment} className="absolute top-1 left-1 p-1 bg-black/60 hover:bg-red-500/80 rounded-full text-white transition-colors">
                    <X className="h-2.5 w-2.5" />
                  </button>
                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <div className="absolute bottom-0 left-0 h-0.5 rounded-full transition-all" style={{ width: `${uploadProgress}%`, background: theme.ownBubbleBg }} />
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex gap-2 items-end mt-1">
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
              <button onClick={() => fileInputRef.current?.click()} disabled={sending} title="Attach photo"
                className="shrink-0 h-9 w-9 rounded-xl flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors">
                <ImagePlus className="h-4 w-4" />
              </button>

              <Textarea
                value={text} onChange={(e) => setText(e.target.value)} onKeyDown={handleKeyDown}
                placeholder={`Message…`} rows={1}
                className="flex-1 min-h-[38px] max-h-[100px] resize-none text-sm rounded-2xl text-white placeholder:text-white/30 focus-visible:ring-1"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  outline: "none",
                  boxShadow: "none",
                }}
              />

              <button onClick={handleSend} disabled={(!text.trim() && !file) || sending}
                className="shrink-0 h-9 w-9 rounded-xl flex items-center justify-center text-white shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                style={{ background: theme.ownBubbleBg }}>
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Theme Picker (in chat header, controlled from parent via prop) ── */}

      {/* Lightbox */}
      <AnimatePresence>
        {fullImage && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/92 backdrop-blur-md p-4" onClick={() => setFullImage(null)}>
            <button className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors" onClick={() => setFullImage(null)}>
              <X className="h-6 w-6" />
            </button>
            <motion.img initial={{ scale: 0.88, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.88, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              src={fullImage} className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl" alt="Full size" onClick={(e) => e.stopPropagation()} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function HoverBtn({ icon, title, onClick, danger = false }: { icon: React.ReactNode; title: string; onClick: () => void; danger?: boolean }) {
  return (
    <button title={title} onClick={onClick}
      className={cn("p-1.5 rounded-lg transition-colors", danger ? "hover:bg-red-500/20" : "hover:bg-white/10 text-white/50 hover:text-white")}>
      {icon}
    </button>
  );
}
