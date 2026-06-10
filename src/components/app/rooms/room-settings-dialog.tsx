"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";
import { doc, updateDoc, deleteDoc, writeBatch } from "firebase/firestore";
import { useFirestore, useUser } from "@/firebase";
import { leaveRoom } from "@/hooks/use-room";
import { Room, RoomMember } from "@/lib/definitions";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

interface RoomSettingsDialogProps {
  room: Room;
  members: RoomMember[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RoomSettingsDialog({ room, members, isOpen, onOpenChange }: RoomSettingsDialogProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();

  const [name, setName] = useState(room.name);
  const [description, setDescription] = useState(room.description ?? "");
  const [password, setPassword] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!user || user.uid !== room.ownerId) return null;

  const handleSave = async () => {
    if (!firestore) return;
    setSaving(true);
    try {
      await updateDoc(doc(firestore, "rooms", room.id), {
        name: name.trim(),
        description: description.trim(),
        ...(password !== "" ? { password } : {}),
      });
      toast({ title: "Settings saved." });
    } catch (e: unknown) {
      toast({ variant: "destructive", title: "Error", description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!firestore || deleteConfirm !== room.name) return;
    setSaving(true);
    try {
      const batch = writeBatch(firestore);
      
      // Delete the room doc itself
      batch.delete(doc(firestore, "rooms", room.id));
      
      // Delete all member docs in subcollection to prevent orphaned docs
      members.forEach(m => {
        const uid = m.id || m.userId;
        if (uid) {
          batch.delete(doc(firestore, "rooms", room.id, "members", uid));
        }
      });
      
      await batch.commit();
      
      onOpenChange(false);
      router.push("/rooms");
      toast({ title: "Room deleted successfully." });
    } catch (e: unknown) {
      toast({ variant: "destructive", title: "Error", description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (member: RoomMember) => {
    if (!firestore || !user) return;
    try {
      await leaveRoom(firestore, user, room.id, member.userId);
      toast({ title: `${member.displayName} removed.` });
    } catch (e: unknown) {
      toast({ variant: "destructive", title: "Error", description: (e as Error).message });
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Room Settings</DialogTitle>
            <DialogDescription>Manage your room — only you can see this as the owner.</DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="settings">
            <TabsList className="w-full">
              <TabsTrigger value="settings" className="flex-1">Settings</TabsTrigger>
              <TabsTrigger value="members" className="flex-1">Members ({members.length})</TabsTrigger>
            </TabsList>

            {/* Settings tab */}
            <TabsContent value="settings" className="space-y-4 pt-4">
              <div className="grid gap-1.5">
                <Label>Room Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>Description</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} />
              </div>
              <div className="grid gap-1.5">
                <Label>New Password <span className="text-muted-foreground text-xs">(blank = remove password)</span></Label>
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Leave blank to keep current" />
              </div>
              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? "Saving…" : "Save Changes"}
              </Button>

              {/* Danger zone */}
              <Card className="border-destructive/30">
                <CardContent className="p-4 space-y-3">
                  <p className="text-sm font-semibold text-destructive">Danger Zone</p>
                  <p className="text-xs text-muted-foreground">
                    This permanently deletes the room, all messages, and history.
                  </p>
                  <Button
                    variant="destructive"
                    className="w-full gap-2"
                    onClick={() => setIsDeleteDialogOpen(true)}
                  >
                    <Trash2 className="h-4 w-4" /> Delete Room
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Members tab */}
            <TabsContent value="members" className="pt-4 space-y-2">
              <p className="text-xs text-muted-foreground mb-3">{members.length} member{members.length !== 1 ? "s" : ""}</p>
              {members.map((m, index) => (
                <div key={m.id || m.userId || `member-${index}`} className="flex items-center gap-3 rounded-lg px-3 py-2 bg-white/[0.02] border border-white/5">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={m.photoURL} />
                    <AvatarFallback className="text-xs">{(m.displayName ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{m.displayName}</p>
                    <p className="text-[10px] text-muted-foreground">Joined {new Date(m.joinedAt).toLocaleDateString()}</p>
                  </div>
                  <Badge variant={m.role === "owner" ? "default" : "secondary"} className="text-[10px] uppercase shrink-0">
                    {m.role}
                  </Badge>
                  {m.role !== "owner" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive h-7 text-xs"
                      onClick={() => handleRemoveMember(m)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Room</AlertDialogTitle>
            <AlertDialogDescription>
              Type <strong>{room.name}</strong> to confirm permanent deletion.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={deleteConfirm}
            onChange={e => setDeleteConfirm(e.target.value)}
            placeholder={room.name}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleteConfirm !== room.name}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
