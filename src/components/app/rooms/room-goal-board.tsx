"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Target, Plus, X, Check } from "lucide-react";
import { addDoc, collection, updateDoc, doc } from "firebase/firestore";
import { format, addDays, endOfWeek } from "date-fns";
import { useFirestore, useUser } from "@/firebase";
import { RoomGoal } from "@/lib/definitions";
import { cn } from "@/lib/utils";

interface RoomGoalBoardProps {
  roomId: string;
  roomGoals: RoomGoal[];
}

const DATE_OPTIONS = [
  { label: "Today", value: format(new Date(), "yyyy-MM-dd") },
  { label: "Tomorrow", value: format(addDays(new Date(), 1), "yyyy-MM-dd") },
  { label: "This Week", value: format(endOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd") },
];

function groupGoalsByDate(goals: RoomGoal[]) {
  const today = format(new Date(), "yyyy-MM-dd");
  const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");

  const grouped: Record<string, RoomGoal[]> = {};
  goals.forEach(g => {
    const key = g.targetDate === today ? "Today" : g.targetDate === tomorrow ? "Tomorrow" : g.targetDate;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(g);
  });
  return grouped;
}

export function RoomGoalBoard({ roomId, roomGoals }: RoomGoalBoardProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const [addOpen, setAddOpen] = useState(false);
  const [goalText, setGoalText] = useState("");
  const [targetDate, setTargetDate] = useState(DATE_OPTIONS[0].value);
  const [loading, setLoading] = useState(false);

  // Filter out completed goals older than 2 days
  const visibleGoals = useMemo(() => {
    const twoDaysAgo = format(addDays(new Date(), -2), "yyyy-MM-dd");
    return roomGoals.filter(g => !g.completed || g.targetDate >= twoDaysAgo);
  }, [roomGoals]);

  const grouped = useMemo(() => groupGoalsByDate(visibleGoals), [visibleGoals]);

  const handleAddGoal = async () => {
    if (!firestore || !user || !goalText.trim()) return;
    setLoading(true);
    try {
      await addDoc(collection(firestore, "rooms", roomId, "goals"), {
        roomId,
        userId: user.uid,
        displayName: user.displayName ?? "",
        text: goalText.trim(),
        targetDate,
        completed: false,
        createdAt: new Date().toISOString(),
      });
      setGoalText("");
      setAddOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleComplete = async (goal: RoomGoal) => {
    if (!firestore || !user) return;
    await updateDoc(doc(firestore, "rooms", roomId, "goals", goal.id), {
      completed: !goal.completed,
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
          <Target className="h-3.5 w-3.5" /> Goal Board
        </h3>
        <Button size="sm" variant="ghost" onClick={() => setAddOpen(!addOpen)}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Inline add form */}
      {addOpen && (
        <Card className="glass border-primary/20">
          <CardContent className="p-4 space-y-3">
            <div className="grid gap-1.5">
              <Label className="text-xs">Your goal</Label>
              <Input
                value={goalText}
                onChange={e => setGoalText(e.target.value)}
                placeholder="Finish OS chapter 4 today"
                className="h-8 text-sm"
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Target</Label>
              <select
                value={targetDate}
                onChange={e => setTargetDate(e.target.value)}
                className="h-8 text-sm rounded-md border border-input bg-background px-2"
              >
                {DATE_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddGoal} disabled={loading || !goalText.trim()} className="flex-1">
                Post Goal
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setAddOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Goal list */}
      {Object.keys(grouped).length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No goals posted yet. Set one to keep the room focused.
        </p>
      ) : (
        Object.entries(grouped).map(([dateLabel, goals]) => (
          <div key={dateLabel} className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] uppercase">{dateLabel}</Badge>
              <div className="flex-1 h-px bg-white/5" />
            </div>
            {goals.map(goal => (
              <div
                key={goal.id}
                className={cn(
                  "flex items-start gap-3 rounded-lg px-3 py-2.5 border border-white/5 bg-white/[0.02] transition-opacity",
                  goal.completed && "opacity-50"
                )}
              >
                <Avatar className="h-6 w-6 shrink-0 mt-0.5">
                  <AvatarFallback className="text-[9px]">
                    {(goal.displayName ?? "?").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">{goal.displayName}</p>
                  <p className={cn("text-sm", goal.completed && "line-through")}>{goal.text}</p>
                </div>
                  <button
                    onClick={() => handleToggleComplete(goal)}
                    className={cn(
                      "shrink-0 mt-0.5 h-5 w-5 rounded border flex items-center justify-center transition-colors",
                      goal.completed
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-white/20 hover:border-primary/50"
                    )}
                  >
                    {goal.completed && <Check className="h-3 w-3" />}
                  </button>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
