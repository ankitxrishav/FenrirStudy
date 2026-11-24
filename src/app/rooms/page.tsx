"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/firebase";
import { useMyRooms } from "@/hooks/use-room";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Users, Copy, ArrowUpRight, Crown, Flame } from "lucide-react";
import LoadingScreen from "@/components/app/loading-screen";
import { CreateRoomDialog } from "@/components/app/rooms/create-room-dialog";
import { JoinRoomDialog } from "@/components/app/rooms/join-room-dialog";
import { useToast } from "@/hooks/use-toast";
import { setActiveRoomCookie } from "@/lib/routing-cookies";

export default function RoomsPage() {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();
  const { rooms, loading: roomsLoading } = useMyRooms();
  const { toast } = useToast();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);

  useEffect(() => {
    if (!userLoading && !user) router.replace("/login");
  }, [user, userLoading, router]);

  useEffect(() => {
    if (!roomsLoading && rooms.length === 1) {
      setActiveRoomCookie(rooms[0].id);
      router.replace(`/rooms/${rooms[0].id}`);
    }
  }, [rooms, roomsLoading, router]);

  if (userLoading || roomsLoading || !user) return <LoadingScreen />;

  const handleCopyCode = (code: string) => {
    if (navigator.share) {
      navigator
        .share({ title: "Join my study room", text: `Join my study room. Code: ${code}` })
        .catch((err: unknown) => {
          if (err instanceof Error && err.name !== "AbortError") {
            navigator.clipboard?.writeText(code);
            toast({ title: "Room code copied", description: code });
          }
        });
    } else {
      navigator.clipboard.writeText(code);
      toast({ title: "Room code copied", description: code });
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 py-2">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-line/15 pb-6">
        <div className="space-y-1.5">
          <span className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
            Shared study space
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-ink leading-[1.04]">
            Study Rooms
          </h1>
          <p className="text-sm text-ink-muted">
            Return to a quiet room with peers and keep your daily focus cadence steady.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <Button variant="outline" onClick={() => setIsJoinOpen(true)} className="h-11">
            <Users className="h-4 w-4" strokeWidth={1.75} />
            Join with code
          </Button>
          <Button onClick={() => setIsCreateOpen(true)} className="h-11">
            <Plus className="h-4 w-4" strokeWidth={1.75} />
            Create room
          </Button>
        </div>
      </div>

      {/* Empty State or Rooms Grid */}
      {rooms.length === 0 ? (
        <div className="rounded-[22px] border border-line bg-surface-soft p-8 sm:p-12 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-3 max-w-md">
            <span className="inline-flex items-center rounded-full border border-line bg-highlight px-3 py-0.5 font-mono text-[11px] text-ink">
              NO ACTIVE ROOM
            </span>
            <h2 className="text-3xl font-bold tracking-tight text-ink">Study with someone.</h2>
            <p className="text-sm leading-relaxed text-ink-muted">
              Create a private study room for your group or join with a 6-character invite code. Once joined, opening the app brings you right back here.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <Button variant="outline" onClick={() => setIsJoinOpen(true)} className="h-11 px-5">
              Join with code
            </Button>
            <Button onClick={() => setIsCreateOpen(true)} className="h-11 px-5">
              Create room
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => (
            <Card key={room.id} className="flex flex-col justify-between bg-surface">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg font-semibold truncate">{room.name}</CardTitle>
                    {room.description && (
                      <p className="text-xs text-ink-muted mt-1 line-clamp-2">{room.description}</p>
                    )}
                  </div>
                  {user.uid === room.ownerId && (
                    <Badge variant="highlight" className="shrink-0 gap-1">
                      <Crown className="h-3 w-3" strokeWidth={1.75} />
                      Owner
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-md border border-line/30 bg-surface-soft px-3 py-2">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                      Invite Code
                    </div>
                    <span className="font-mono text-sm font-semibold tracking-[0.16em] text-ink">
                      {room.code}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => handleCopyCode(room.code)}
                    aria-label="Copy room code"
                  >
                    <Copy className="h-4 w-4" strokeWidth={1.75} />
                  </Button>
                </div>

                <div className="flex items-center justify-between text-xs text-ink-muted">
                  <span className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" strokeWidth={1.75} />
                    <span>
                      {room.totalMemberCount} member{room.totalMemberCount !== 1 ? "s" : ""}
                    </span>
                  </span>
                  {(room.collectiveStreak ?? 0) > 0 && (
                    <span className="inline-flex items-center gap-1 font-mono font-medium text-ink">
                      <Flame className="h-3.5 w-3.5 text-clay" strokeWidth={1.75} />
                      {room.collectiveStreak}d streak
                    </span>
                  )}
                </div>

                <Button
                  className="w-full justify-between"
                  onClick={() => router.push(`/rooms/${room.id}`)}
                >
                  <span>Open room</span>
                  <ArrowUpRight className="h-4 w-4" strokeWidth={1.75} />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateRoomDialog
        isOpen={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onCreated={(roomId) => router.push(`/rooms/${roomId}`)}
      />
      <JoinRoomDialog
        isOpen={isJoinOpen}
        onOpenChange={setIsJoinOpen}
        onJoined={(roomId) => router.push(`/rooms/${roomId}`)}
      />
    </div>
  );
}
