"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/firebase";
import { useMyRooms } from "@/hooks/use-room";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Users, Copy, ExternalLink, Crown } from "lucide-react";
import LoadingScreen from "@/components/app/loading-screen";
import { CreateRoomDialog } from "@/components/app/rooms/create-room-dialog";
import { JoinRoomDialog } from "@/components/app/rooms/join-room-dialog";
import { useToast } from "@/hooks/use-toast";

export default function RoomsPage() {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();
  const { rooms, loading: roomsLoading } = useMyRooms();
  const { toast } = useToast();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);

  useEffect(() => {
    if (!userLoading && !user) router.push("/login");
  }, [user, userLoading, router]);

  useEffect(() => {
    if (!roomsLoading && rooms.length === 1) {
      router.replace(`/rooms/${rooms[0].id}`);
    }
  }, [rooms, roomsLoading, router]);

  if (userLoading || roomsLoading || !user) return <LoadingScreen />;

  const handleCopyCode = (code: string) => {
    if (navigator.share) {
      navigator
        .share({ title: "Join my study room!", text: `Join my study room! Code: ${code}` })
        .catch((err: unknown) => {
          // AbortError = user dismissed the share sheet — not a real error
          if (err instanceof Error && err.name !== "AbortError") {
            toast({ title: "Code copied!", description: code });
          }
        });
    } else {
      navigator.clipboard.writeText(code);
      toast({ title: "Code copied!", description: code });
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-gradient mb-2">Rooms</h1>
          <p className="text-muted-foreground">Study together. Stay accountable.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsJoinOpen(true)}>
            <Users className="mr-2 h-4 w-4" /> Join Room
          </Button>
          <Button onClick={() => setIsCreateOpen(true)} className="shadow-lg hover:scale-105 transition-all">
            <PlusCircle className="mr-2 h-4 w-4" /> Create Room
          </Button>
        </div>
      </div>

      {/* Section label */}
      <div className="flex items-center gap-2">
        <div className="h-1 w-1 rounded-full bg-primary" />
        <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground">
          My Rooms
        </h2>
      </div>

      {/* Rooms grid */}
      {rooms.length === 0 ? (
        <div className="py-20 text-center glass border-dashed border-2 border-white/10 rounded-xl flex flex-col items-center gap-4">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none" className="opacity-30">
            <circle cx="24" cy="24" r="10" fill="currentColor" />
            <circle cx="40" cy="24" r="10" fill="currentColor" />
            <ellipse cx="24" cy="46" rx="14" ry="7" fill="currentColor" />
            <ellipse cx="40" cy="46" rx="14" ry="7" fill="currentColor" />
          </svg>
          <p className="text-muted-foreground text-lg">No rooms yet. Create one or join with a code.</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsJoinOpen(true)}>Join with code</Button>
            <Button onClick={() => setIsCreateOpen(true)}>Create room</Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {rooms.map(room => (
            <Card
              key={room.id}
              className="group glass border-white/10 shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden relative"
            >
              <div className="absolute top-0 right-0 w-24 h-24 opacity-[0.04] group-hover:scale-110 transition-transform -mr-6 -mt-6 rounded-full bg-primary" />

              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{room.name}</CardTitle>
                    {room.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{room.description}</p>
                    )}
                  </div>
                  {user.uid === room.ownerId && (
                    <Badge variant="secondary" className="shrink-0 gap-1 text-[10px] uppercase font-bold">
                      <Crown className="h-2.5 w-2.5" /> Owner
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Room code */}
                <div className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">Invite Code</div>
                    <span className="font-mono font-bold tracking-[0.2em] text-sm">{room.code}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleCopyCode(room.code)}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* Stats row */}
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    <span>{room.totalMemberCount} member{room.totalMemberCount !== 1 ? "s" : ""}</span>
                  </span>
                  {(room.collectiveStreak ?? 0) > 0 && (
                    <span className="text-xs font-semibold text-orange-400">
                      🔥 {room.collectiveStreak}d streak
                    </span>
                  )}
                </div>

                <Button
                  className="w-full gap-2"
                  onClick={() => router.push(`/rooms/${room.id}`)}
                >
                  <ExternalLink className="h-4 w-4" /> Open Room
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateRoomDialog
        isOpen={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onCreated={roomId => router.push(`/rooms/${roomId}`)}
      />
      <JoinRoomDialog
        isOpen={isJoinOpen}
        onOpenChange={setIsJoinOpen}
        onJoined={roomId => router.push(`/rooms/${roomId}`)}
      />
    </div>
  );
}
