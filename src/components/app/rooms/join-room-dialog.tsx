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
import { Loader2 } from "lucide-react";
import { useFirestore, useUser } from "@/firebase";
import { joinRoomByCode } from "@/hooks/use-room";
import { useToast } from "@/hooks/use-toast";

interface JoinRoomDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onJoined: (roomId: string) => void;
}

export function JoinRoomDialog({ isOpen, onOpenChange, onJoined }: JoinRoomDialogProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [codeError, setCodeError] = useState("");

  const handleSubmit = async () => {
    if (!firestore || !user) return;
    if (code.length !== 6) {
      setCodeError("Room code must be exactly 6 characters.");
      return;
    }
    setCodeError("");
    setLoading(true);
    try {
      const roomId = await joinRoomByCode(firestore, user, { code, password });
      toast({ title: "Joined!", description: "Welcome to the room." });
      onJoined(roomId);
      onOpenChange(false);
      setCode(""); setPassword("");
    } catch (e: unknown) {
      toast({ variant: "destructive", title: "Error", description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Join a Study Room</DialogTitle>
          <DialogDescription>Enter the 6-character room code to join.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-1.5">
            <Label htmlFor="join-code">Room Code <span className="text-destructive">*</span></Label>
            <Input
              id="join-code"
              value={code}
              onChange={e => {
                setCode(e.target.value.toUpperCase());
                setCodeError("");
              }}
              placeholder="e.g. FEN123"
              maxLength={6}
              className="tracking-widest font-mono text-lg"
            />
            {codeError && <p className="text-xs text-destructive">{codeError}</p>}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="join-password">Password <span className="text-muted-foreground text-xs">(if required)</span></Label>
            <Input
              id="join-password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Leave blank if no password"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading || code.length === 0}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Join Room
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
