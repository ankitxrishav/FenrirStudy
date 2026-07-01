"use client";

import { useState, useEffect, useMemo, use } from "react";
import { useUser, useFirestore, useCollection } from "@/firebase";
import { useRoom, leaveRoom } from "@/hooks/use-room";
import { usePresenceSync } from "@/hooks/use-presence-sync";
import { useRoomPresence, useFinishBroadcast } from "@/hooks/use-room-presence";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { CHAT_THEMES, ChatThemeId } from "@/hooks/use-room-theme";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Copy, Settings, LogOut, Users, Trophy,
  Zap, BarChart2, Target, MessageCircle, Timer,
  ChevronDown, ChevronUp,
} from "lucide-react";
import LoadingScreen from "@/components/app/loading-screen";
import { MemberTimerGrid } from "@/components/app/rooms/member-timer-grid";
import { MemberGrid } from "@/components/app/rooms/member-grid";
import { MemberProfileDrawer } from "@/components/app/rooms/member-profile-drawer";
import { RoomFinishFx } from "@/components/app/rooms/room-finish-fx";
import { StandaloneChat } from "@/components/app/rooms/standalone-chat";
import { SharedFocusPanel } from "@/components/app/rooms/shared-focus-panel";
import { RoomLeaderboard } from "@/components/app/rooms/room-leaderboard";
import { RoomChallenges } from "@/components/app/rooms/room-challenges";
import { RoomAnalytics } from "@/components/app/rooms/room-analytics";
import { RoomGoalBoard } from "@/components/app/rooms/room-goal-board";
import { RoomStreakBanner } from "@/components/app/rooms/room-streak-banner";
import { RoomSettingsDialog } from "@/components/app/rooms/room-settings-dialog";
import { PihuCat } from "@/components/app/rooms/pihu-cat";
import { RoomErrorBoundary } from "@/components/app/rooms/room-error-boundary";
import { RoomMemberStats } from "@/components/app/rooms/room-member-stats";
import { RoomPersonalTimer } from "@/components/app/rooms/room-personal-timer";
import { useToast } from "@/hooks/use-toast";
import { Subject, RoomMember } from "@/lib/definitions";
import { collection, query, where } from "firebase/firestore";
import { cn } from "@/lib/utils";

interface RoomPageProps {
  params: Promise<{ roomId: string }>;
}

type PanelId = "members" | "leaderboard" | "challenges" | "analytics" | "goals";

const NAV_ITEMS: { id: PanelId; label: string; icon: React.ElementType }[] = [
  { id: "members",     label: "Members",     icon: Users     },
  { id: "leaderboard", label: "Leaderboard", icon: Trophy    },
  { id: "challenges",  label: "Challenges",  icon: Zap       },
  { id: "analytics",   label: "Analytics",  icon: BarChart2  },
  { id: "goals",       label: "Goals",       icon: Target    },
];

export default function RoomPage({ params }: RoomPageProps) {
  const { roomId } = use(params);
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const { room, members, messages, challenges, roomGoals, loading } = useRoom(roomId);
  const [activePanel, setActivePanel] = useState<PanelId>("members");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [leavingRoom, setLeavingRoom] = useState(false);
  const [selectedMember, setSelectedMember] = useState<RoomMember | null>(null);
  const [sidebarTab, setSidebarTab] = useState<"timer" | "focus">("timer");
  const [chatOpen, setChatOpen] = useState(true);

  const subjectsQuery = useMemo(
    () =>
      user && firestore
        ? query(collection(firestore, "subjects"), where("userId", "==", user.uid))
        : null,
    [user, firestore]
  );
  const { data: subjects } = useCollection<Subject>(subjectsQuery);

  usePresenceSync(roomId);
  useRoomPresence(roomId, subjects ?? []);
  useFinishBroadcast(roomId);

  useEffect(() => {
    if (!userLoading && !user) router.push("/login");
  }, [user, userLoading, router]);

  const isOwner = user?.uid === room?.ownerId;
  const onlineCount = useMemo(
    () => members.filter((m) => m.status !== "offline").length,
    [members]
  );
  const totalStudyMinutesToday = useMemo(() => {
    const seconds = members.reduce((acc, m) => acc + (m.todaySeconds || 0), 0);
    return Math.floor(seconds / 60);
  }, [members]);

  const handleCopyCode = () => {
    if (!room) return;
    navigator.clipboard.writeText(room.code);
    toast({ title: "Room code copied!", description: room.code });
  };

  const handleLeave = async () => {
    if (!firestore || !user) return;
    setLeavingRoom(true);
    try {
      await leaveRoom(firestore, user, roomId);
      router.push("/rooms");
    } finally {
      setLeavingRoom(false);
    }
  };

  if (userLoading || loading || !user) return <LoadingScreen />;

  if (!room) {
    return (
      <div className="flex h-screen items-center justify-center p-4">
        <Card className="glass border-white/10 max-w-sm w-full">
          <CardContent className="p-8 text-center">
            <p className="text-xl font-bold mb-2">Room not found.</p>
            <p className="text-muted-foreground text-sm mb-4">
              This room may have been deleted or the link is invalid.
            </p>
            <Button onClick={() => router.push("/rooms")}>Back to Rooms</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const themeId = (room.chatTheme || "default") as ChatThemeId;
  const themeObj = CHAT_THEMES.find((t) => t.id === themeId) || CHAT_THEMES[0];

  return (
    <div
      className="relative flex-1 min-h-0 overflow-y-auto"
      style={{
        "--primary": themeObj.primaryHsl,
        "--ring": themeObj.ringHsl,
      } as React.CSSProperties}
    >
      {themeObj.roomBg && (
        <div
          className="absolute inset-0 pointer-events-none z-0"
          style={{ background: themeObj.roomBg, transition: "background 0.6s ease" }}
        />
      )}
      <div className="container mx-auto px-4 md:px-6 py-4 md:py-6 space-y-5 pb-10 relative z-10">

        {/* ── Room Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div className="space-y-1 min-w-0 flex-1">
            <h1 className="text-2xl md:text-3xl font-black tracking-tighter text-gradient truncate">
              {room.name}
            </h1>
            {room.description && (
              <p className="text-muted-foreground text-sm truncate">{room.description}</p>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full px-3 py-1 transition-colors group"
              >
                <span className="font-mono font-bold tracking-[0.2em] text-xs">{room.code}</span>
                <Copy className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-colors" />
              </button>
              <Badge variant="outline" className="text-[10px]">
                {onlineCount} online · {members.length} total
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
              onClick={() => setChatOpen((v) => !v)}
              title={chatOpen ? "Hide chat" : "Show chat"}
            >
              <MessageCircle className="h-4 w-4" />
            </Button>
            {isOwner && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSettingsOpen(true)}>
                <Settings className="h-4 w-4" />
              </Button>
            )}
            {!isOwner && (
              <Button
                variant="ghost" size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={handleLeave} disabled={leavingRoom}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* ── Streak Banner ── */}
        <RoomStreakBanner room={room} totalStudyMinutesToday={totalStudyMinutesToday} />

        {/* ── Main layout: left content + right sidebar ── */}
        <div className="flex flex-col lg:flex-row gap-5">

          {/* Left: Timer grid + nav + panel */}
          <div className="flex-1 min-w-0 space-y-4">
            <RoomErrorBoundary fallbackLabel="Could not load live timers.">
              <MemberTimerGrid
                members={members}
                currentUserId={user.uid}
                roomId={roomId}
                onMemberClick={setSelectedMember}
              />
            </RoomErrorBoundary>

            {/* Pill nav */}
            <div className="glass border border-white/10 rounded-2xl p-1.5 flex gap-1 overflow-x-auto">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = activePanel === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActivePanel(item.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200",
                      active
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    {item.label}
                  </button>
                );
              })}
            </div>

            {/* Panel content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activePanel}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
              >
                {activePanel === "members" && (
                  <RoomErrorBoundary fallbackLabel="Could not load members.">
                    <MemberGrid roomId={roomId} members={members} />
                  </RoomErrorBoundary>
                )}
                {activePanel === "leaderboard" && (
                  <RoomErrorBoundary fallbackLabel="Could not load leaderboard.">
                    <RoomLeaderboard members={members} />
                  </RoomErrorBoundary>
                )}
                {activePanel === "challenges" && (
                  <RoomErrorBoundary fallbackLabel="Could not load challenges.">
                    <RoomChallenges
                      roomId={roomId}
                      challenges={challenges}
                      isOwner={isOwner}
                      members={members}
                    />
                  </RoomErrorBoundary>
                )}
                {activePanel === "analytics" && (
                  <RoomErrorBoundary fallbackLabel="Could not load analytics.">
                    <RoomAnalytics roomId={roomId} members={members} />
                  </RoomErrorBoundary>
                )}
                {activePanel === "goals" && (
                  <RoomErrorBoundary fallbackLabel="Could not load goals.">
                    <div className="glass border border-white/10 rounded-xl p-4">
                      <RoomGoalBoard roomId={roomId} roomGoals={roomGoals} />
                    </div>
                  </RoomErrorBoundary>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right sidebar: My Timer + Room Focus */}
          <div className="w-full lg:w-80 shrink-0 space-y-4">
            <div className="flex bg-white/5 p-1 rounded-xl gap-1">
              <button
                onClick={() => setSidebarTab("timer")}
                className={cn(
                  "flex-1 py-1.5 text-[11px] font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5",
                  sidebarTab === "timer"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-white/5"
                )}
              >
                <Timer className="h-3 w-3" /> My Timer
              </button>
              <button
                onClick={() => setSidebarTab("focus")}
                className={cn(
                  "flex-1 py-1.5 text-[11px] font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5",
                  sidebarTab === "focus"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-white/5"
                )}
              >
                <Zap className="h-3 w-3" /> Room Focus
              </button>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={sidebarTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {sidebarTab === "timer" ? (
                  <RoomErrorBoundary fallbackLabel="Could not load personal timer.">
                    <RoomPersonalTimer subjects={subjects ?? []} />
                  </RoomErrorBoundary>
                ) : (
                  <RoomErrorBoundary fallbackLabel="Could not load room focus timer.">
                    <SharedFocusPanel roomId={roomId} room={room} />
                  </RoomErrorBoundary>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* ── Separate Chat Section ── */}
        <div className="w-full">
          {/* Toggle header */}
          <button
            onClick={() => setChatOpen((v) => !v)}
            className={cn(
              "w-full flex items-center gap-3 px-5 py-3.5 transition-colors group",
              "glass border border-white/10",
              chatOpen ? "rounded-t-2xl rounded-b-none border-b-0" : "rounded-2xl"
            )}
          >
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <MessageCircle className="h-4 w-4 text-primary shrink-0" />
              <span className="font-bold text-sm">Room Chat</span>
              <span className="text-[11px] text-muted-foreground/50 font-normal hidden sm:block">
                — {messages.length} messages
              </span>
              {!chatOpen && messages.length > 0 && (
                <span className="ml-1 bg-primary/15 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full border border-primary/25">
                  {messages.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors shrink-0">
              <span className="text-[11px] font-medium">{chatOpen ? "Collapse" : "Expand"}</span>
              {chatOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </div>
          </button>

          {/* Chat panel with framer motion */}
          <AnimatePresence initial={false}>
            {chatOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 580, opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                className="overflow-hidden border border-t-0 border-white/10 rounded-b-2xl"
              >
                <div className="h-[580px] relative">
                  <RoomErrorBoundary fallbackLabel="Could not load chat.">
                    <StandaloneChat
                      roomId={roomId}
                      roomName={room.name}
                      messages={messages}
                      roomOwnerId={room.ownerId}
                      chatTheme={room.chatTheme}
                    />
                  </RoomErrorBoundary>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Member Stats */}
        <div className="w-full mt-4">
          <RoomMemberStats members={members} />
        </div>
      </div>

      {/* Finish FX */}
      <RoomFinishFx members={members} currentUserId={user.uid} />

      {/* Member profile drawer */}
      <MemberProfileDrawer
        member={selectedMember}
        onClose={() => setSelectedMember(null)}
      />

      {/* Settings dialog (owner only) */}
      {isOwner && (
        <RoomSettingsDialog
          room={room}
          members={members}
          isOpen={settingsOpen}
          onOpenChange={setSettingsOpen}
        />
      )}

      {/* Roaming Cat Pihu */}
      <PihuCat />
    </div>
  );
}
