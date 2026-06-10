"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useFirestore, useUser } from "@/firebase";
import { createRoom } from "@/hooks/use-room";
import { useToast } from "@/hooks/use-toast";

interface CreateRoomDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (roomId: string) => void;
}

export function CreateRoomDialog({ isOpen, onOpenChange, onCreated }: CreateRoomDialogProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!firestore || !user || !name.trim()) return;
    setLoading(true);
    try {
      const roomId = await createRoom(firestore, user, {
        name: name.trim(),
        description: description.trim(),
        password: password.trim(),
      });
      toast({ title: "Room created!", description: "Share the code with your study group." });
      onCreated(roomId);
      onOpenChange(false);
      setName(""); setDescription(""); setPassword("");
    } catch (e: unknown) {
      toast({ variant: "destructive", title: "Error", description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Create a Study Room</DialogTitle>
          <DialogDescription>Set up a room for your study group. Others join with the room code.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-1.5">
            <Label htmlFor="room-name">Room Name <span className="text-destructive">*</span></Label>
            <Input
              id="room-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. JEE 2027 Grind"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="room-desc">Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Textarea
              id="room-desc"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What does this room study?"
              rows={2}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="room-password">Password <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input
              id="room-password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Leave blank for open room"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading || !name.trim()}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Room
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
