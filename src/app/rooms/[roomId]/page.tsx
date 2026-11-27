"use client";

import { useState, useEffect, useMemo, use } from "react";
import { useUser, useFirestore, useCollection } from "@/firebase";
import { useRoom, leaveRoom, sendMessage } from "@/hooks/use-room";
import { usePresenceSync } from "@/hooks/use-presence-sync";
import { useRoomPresence, useFinishBroadcast } from "@/hooks/use-room-presence";
import { setActiveRoomCookie } from "@/lib/routing-cookies";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Copy,
  Check,
  Settings,
  LogOut,
  Users,
  Trophy,
  Zap,
  BarChart2,
  Target,
  MessageCircle,
  Timer,
  ChevronDown,
  ChevronUp,
  Activity,
  Share2,
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
import { RoomErrorBoundary } from "@/components/app/rooms/room-error-boundary";
import { RoomMemberStats } from "@/components/app/rooms/room-member-stats";
import { RoomPersonalTimer } from "@/components/app/rooms/room-personal-timer";
import { RoomSessionFeed } from "@/components/app/rooms/room-session-feed";
import { AccountabilityPairs } from "@/components/app/rooms/accountability-pairs";
import { useToast } from "@/hooks/use-toast";
import { Subject, RoomMember } from "@/lib/definitions";
import { getEffectiveMemberTodaySeconds, parseIsoMs } from "@/lib/study-time";
import { collection, query, where } from "firebase/firestore";
import { cn } from "@/lib/utils";

interface RoomPageProps {
  params: Promise<{ roomId: string }>;
}

type PanelId = "members" | "leaderboard" | "challenges" | "analytics" | "goals" | "activity";

const NAV_ITEMS: { id: PanelId; label: string; icon: React.ElementType }[] = [
  { id: "members", label: "Participants", icon: Users },
  { id: "leaderboard", label: "Leaderboard", icon: Trophy },
  { id: "challenges", label: "Challenges", icon: Zap },
  { id: "analytics", label: "Analytics", icon: BarChart2 },
  { id: "goals", label: "Goals", icon: Target },
  { id: "activity", label: "Activity", icon: Activity },
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
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [leavingRoom, setLeavingRoom] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [selectedMember, setSelectedMember] = useState<RoomMember | null>(null);
  const [sidebarTab, setSidebarTab] = useState<"focus" | "timer">("focus");
  const [chatOpen, setChatOpen] = useState(true);
  const [nudgeCooldowns, setNudgeCooldowns] = useState<Record<string, number>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = localStorage.getItem(`fenrir_nudge_${roomId}`);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const handleWakeNudge = async (target: RoomMember) => {
    if (!firestore || !user) return;
    const now = Date.now();
    if ((nudgeCooldowns[target.userId] ?? 0) > now) return;
    const nextUntil = now + 2 * 60 * 60 * 1000;
    const nextMap = { ...nudgeCooldowns, [target.userId]: nextUntil };
    setNudgeCooldowns(nextMap);
    try {
      localStorage.setItem(`fenrir_nudge_${roomId}`, JSON.stringify(nextMap));
    } catch {}
    await sendMessage(
      firestore,
      user,
      roomId,
      `Wake-up nudge for @${target.displayName || "study partner"} — jump back into focus!`
    );
    toast({
      title: `Wake-up nudge sent to ${target.displayName || "partner"}`,
      description: "2-hour cooldown active for this member.",
    });
  };

  const subjectsQuery = useMemo(
    () =>
      user && firestore
        ? query(
            collection(firestore, "subjects"),
            where("userId", "==", user.uid),
            where("archived", "==", false)
          )
        : null,
    [user, firestore]
  );
  const { data: subjects } = useCollection<Subject>(subjectsQuery);

  usePresenceSync(roomId);
  useRoomPresence(roomId, subjects ?? []);
  useFinishBroadcast(roomId);

  useEffect(() => {
    if (!userLoading && !user) {
      router.replace("/login");
    }
  }, [user, userLoading, router]);

  useEffect(() => {
    if (!loading && !room) {
      setActiveRoomCookie(null);
    } else if (!loading && room) {
      setActiveRoomCookie(room.id);
    }
  }, [loading, room]);

  const isOwner = user?.uid === room?.ownerId;
  const isMember = useMemo(() => {
    if (!user) return false;
    return room?.memberIds?.includes(user.uid) || members.some((m) => m.userId === user.uid);
  }, [room?.memberIds, members, user]);

  const [nowMs, setNowMs] = useState(() => Date.now());
  const hasRunningMember = members.some((m) => m.timerStatus === "running");

  useEffect(() => {
    setNowMs(Date.now());
    if (!hasRunningMember) return;
    const id = setInterval(() => setNowMs(Date.now()), 5000);
    return () => clearInterval(id);
  }, [hasRunningMember]);

  const onlineCount = useMemo(
    () =>
      members.filter((m) => {
        if (m.timerStatus === "running" || m.timerStatus === "paused") return true;
        if (m.status === "offline") return false;
        const lastMs = parseIsoMs(m.lastSeen);
        return lastMs === 0 || nowMs - lastMs <= 120_000;
      }).length,
    [members, nowMs]
  );

  const totalStudyMinutesToday = useMemo(() => {
    const seconds = members.reduce((acc, m) => acc + getEffectiveMemberTodaySeconds(m, nowMs), 0);
    return Math.floor(seconds / 60);
  }, [members, nowMs]);

  const handleCopyCode = () => {
    if (!room) return;
    navigator.clipboard?.writeText(room.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 1800);
    toast({ title: "Room code copied", description: room.code });
  };

  const handleShareInvite = () => {
    if (!room) return;
    const shareUrl = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      navigator
        .share({
          title: room.name,
          text: `Join my Fenrir Study room "${room.name}" with code ${room.code}`,
          url: shareUrl,
        })
        .catch(() => handleCopyCode());
    } else {
      handleCopyCode();
    }
  };

  const handleLeave = async () => {
    if (!firestore || !user) return;
    setLeavingRoom(true);
    try {
      await leaveRoom(firestore, user, roomId);
      setLeaveConfirmOpen(false);
      router.replace("/rooms");
    } finally {
      setLeavingRoom(false);
    }
  };

  if (userLoading || loading || !user) return <LoadingScreen />;

  if (!room || !isMember) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <Card className="max-w-md w-full border-line bg-surface">
          <CardContent className="p-8 space-y-4">
            <span className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
              Room unavailable
            </span>
            <h1 className="text-2xl font-bold text-ink">
              {!room ? "Room not found" : "Membership required"}
            </h1>
            <p className="text-ink-muted text-sm leading-relaxed">
              {!room
                ? "This study room may have been deleted or the link is no longer valid."
                : "You are not currently a member of this room. Join using its 6-character code from the Rooms directory."}
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button onClick={() => router.replace("/rooms")}>Browse Rooms</Button>
              <Button variant="outline" onClick={() => router.replace("/dashboard")}>
                Go to Overview
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative mx-auto max-w-6xl space-y-6 pb-8">
      {/* Room Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-line/15 pb-5">
        <div className="space-y-2 min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopyCode}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-soft px-3 py-1 font-mono text-xs font-medium text-ink hover:bg-highlight transition-colors"
              title="Copy room invite code"
            >
              <span className="tracking-[0.14em]">{room.code}</span>
              {copiedCode ? (
                <Check className="h-3.5 w-3.5 text-success" strokeWidth={2} />
              ) : (
                <Copy className="h-3.5 w-3.5 text-ink-muted" strokeWidth={1.75} />
              )}
            </button>

            <Badge variant="outline" className="gap-1.5 bg-surface">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              <span>{onlineCount} online</span>
              <span className="text-ink-muted">· {members.length} total</span>
            </Badge>

            {room.password && (
              <Badge variant="secondary">Password protected</Badge>
            )}
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-ink leading-[1.06] truncate">
            {room.name}
          </h1>

          {room.description && (
            <p className="text-sm text-ink-muted max-w-2xl">{room.description}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleShareInvite}
            className="h-10 gap-1.5"
          >
            <Share2 className="h-4 w-4" strokeWidth={1.75} />
            <span>Invite</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setChatOpen((v) => !v)}
            className={cn("h-10 gap-1.5", chatOpen && "bg-surface-soft")}
          >
            <MessageCircle className="h-4 w-4" strokeWidth={1.75} />
            <span>Chat ({messages.length})</span>
          </Button>

          {isOwner ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSettingsOpen(true)}
              className="h-10 gap-1.5"
            >
              <Settings className="h-4 w-4" strokeWidth={1.75} />
              <span>Room settings</span>
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="h-10 gap-1.5 text-danger hover:text-danger border-line/40 hover:border-danger"
              onClick={() => setLeaveConfirmOpen(true)}
              disabled={leavingRoom}
            >
              <LogOut className="h-4 w-4" strokeWidth={1.75} />
              <span>Leave room</span>
            </Button>
          )}
        </div>
      </div>

      {/* Collective Streak Banner */}
      <RoomStreakBanner room={room} totalStudyMinutesToday={totalStudyMinutesToday} />

      {/* Main Bento Split: Left Live Peers + Workspace Tabs, Right Timers */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Right Column (First on Mobile so Room Timer appears immediately) */}
        <div className="lg:col-span-5 lg:order-2 space-y-4">
          <div
            role="tablist"
            aria-label="Timer context"
            className="grid grid-cols-2 rounded-full border border-line bg-surface-soft p-1 gap-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={sidebarTab === "focus"}
              onClick={() => setSidebarTab("focus")}
              className={cn(
                "min-h-[40px] rounded-full text-xs font-medium transition-colors flex items-center justify-center gap-1.5",
                sidebarTab === "focus"
                  ? "bg-ink text-surface"
                  : "text-ink-muted hover:text-ink"
              )}
            >
              <Zap className="h-3.5 w-3.5" strokeWidth={1.75} />
              <span>Shared Room Focus</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={sidebarTab === "timer"}
              onClick={() => setSidebarTab("timer")}
              className={cn(
                "min-h-[40px] rounded-full text-xs font-medium transition-colors flex items-center justify-center gap-1.5",
                sidebarTab === "timer"
                  ? "bg-ink text-surface"
                  : "text-ink-muted hover:text-ink"
              )}
            >
              <Timer className="h-3.5 w-3.5" strokeWidth={1.75} />
              <span>My Room Timer</span>
            </button>
          </div>

          {sidebarTab === "focus" ? (
            <RoomErrorBoundary fallbackLabel="Could not load shared room focus timer.">
              <SharedFocusPanel roomId={roomId} room={room} />
            </RoomErrorBoundary>
          ) : (
            <RoomErrorBoundary fallbackLabel="Could not load personal timer.">
              <RoomPersonalTimer subjects={subjects ?? []} />
            </RoomErrorBoundary>
          )}
        </div>

        {/* Left Column: Live Participants + Panels */}
        <div className="lg:col-span-7 lg:order-1 space-y-6 min-w-0">
          <RoomErrorBoundary fallbackLabel="Could not load live participant timers.">
            <MemberTimerGrid
              members={members}
              currentUserId={user.uid}
              roomId={roomId}
              onMemberClick={setSelectedMember}
              onNudge={handleWakeNudge}
              nudgeCooldowns={nudgeCooldowns}
            />
          </RoomErrorBoundary>

          {/* Secondary Panel Navigation */}
          <div className="space-y-4">
            <div
              id="room-pill-nav"
              className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1"
            >
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = activePanel === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActivePanel(item.id)}
                    className={cn(
                      "inline-flex min-h-[40px] items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors duration-150",
                      active
                        ? "border-line bg-highlight text-ink font-semibold"
                        : "border-line/25 bg-surface text-ink-muted hover:border-line hover:text-ink"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {activePanel === "members" && (
              <RoomErrorBoundary fallbackLabel="Could not load participants.">
                <MemberGrid
                  roomId={roomId}
                  members={members}
                  subjects={subjects ?? []}
                  onNudge={handleWakeNudge}
                  nudgeCooldowns={nudgeCooldowns}
                />
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
                <div className="rounded-[16px] border border-line bg-surface p-5">
                  <RoomGoalBoard roomId={roomId} roomGoals={roomGoals} />
                </div>
              </RoomErrorBoundary>
            )}
            {activePanel === "activity" && (
              <RoomErrorBoundary fallbackLabel="Could not load room activity.">
                <div className="space-y-5">
                  <RoomSessionFeed roomId={roomId} members={members} />
                  <div className="rounded-[16px] border border-line bg-surface p-5">
                    <AccountabilityPairs roomId={roomId} members={members} />
                  </div>
                </div>
              </RoomErrorBoundary>
            )}
          </div>
        </div>
      </div>

      {/* Collapsible Room Chat */}
      <div className="w-full">
        <button
          type="button"
          onClick={() => setChatOpen((v) => !v)}
          className={cn(
            "w-full flex items-center justify-between px-5 py-3.5 border border-line bg-surface-soft text-ink transition-colors hover:bg-surface-muted",
            chatOpen ? "rounded-t-[16px] border-b-0" : "rounded-[16px]"
          )}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <MessageCircle className="h-4 w-4 text-ink shrink-0" strokeWidth={1.75} />
            <span className="font-semibold text-sm">Room Chat</span>
            <span className="font-mono text-xs text-ink-muted">
              {messages.length} message{messages.length === 1 ? "" : "s"}
            </span>
          </div>
          <span className="inline-flex items-center gap-1 font-mono text-xs text-ink-muted">
            {chatOpen ? "Hide" : "Show"}
            {chatOpen ? (
              <ChevronUp className="h-4 w-4" strokeWidth={1.75} />
            ) : (
              <ChevronDown className="h-4 w-4" strokeWidth={1.75} />
            )}
          </span>
        </button>

        {chatOpen && (
          <div className="h-[520px] rounded-b-[16px] border border-line overflow-hidden bg-surface">
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
        )}
      </div>

      {/* Member Stats Overview */}
      <RoomMemberStats members={members} />

      {/* Finish FX */}
      <RoomFinishFx members={members} currentUserId={user.uid} />

      {/* Member Profile Drawer */}
      <MemberProfileDrawer
        member={selectedMember}
        onClose={() => setSelectedMember(null)}
      />

      {/* Settings Dialog (Owner Only) */}
      {isOwner && (
        <RoomSettingsDialog
          room={room}
          members={members}
          isOpen={settingsOpen}
          onOpenChange={setSettingsOpen}
        />
      )}

      {/* Leave Room Confirmation */}
      <AlertDialog open={leaveConfirmOpen} onOpenChange={setLeaveConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave {room.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Leaving removes your active room membership. Future visits and sign-ins will no longer land in this room automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay in room</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeave}
              disabled={leavingRoom}
              className="bg-danger text-surface hover:bg-danger/90"
            >
              {leavingRoom ? "Leaving..." : "Leave room"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
