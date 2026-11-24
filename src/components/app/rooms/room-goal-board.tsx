"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  goals.forEach((g) => {
    const key =
      g.targetDate === today ? "Today" : g.targetDate === tomorrow ? "Tomorrow" : g.targetDate;
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

  const visibleGoals = useMemo(() => {
    const twoDaysAgo = format(addDays(new Date(), -2), "yyyy-MM-dd");
    return roomGoals.filter((g) => !g.completed || g.targetDate >= twoDaysAgo);
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
      <div className="flex items-center justify-between">
        <h3 className="font-mono text-xs uppercase tracking-wider text-ink-muted flex items-center gap-2">
          <Target className="h-3.5 w-3.5" strokeWidth={1.75} /> Shared Goals
        </h3>
        <Button size="sm" variant="outline" onClick={() => setAddOpen(!addOpen)} className="h-9 gap-1.5">
          <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
          <span>Add goal</span>
        </Button>
      </div>

      {addOpen && (
        <div className="rounded-[14px] border border-line bg-surface-soft p-4 space-y-3">
          <div className="grid gap-1.5">
            <Label className="text-xs">Your goal</Label>
            <Input
              value={goalText}
              onChange={(e) => setGoalText(e.target.value)}
              placeholder="Finish OS chapter 4 today"
              className="h-10 bg-surface"
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">Target</Label>
            <select
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="h-10 text-sm rounded-[12px] border border-line bg-surface px-3 text-ink"
            >
              {DATE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleAddGoal}
              disabled={loading || !goalText.trim()}
              className="flex-1 h-10"
            >
              Post goal
            </Button>
            <Button size="sm" variant="outline" onClick={() => setAddOpen(false)} className="h-10 w-10 p-0">
              <X className="h-4 w-4" strokeWidth={1.75} />
            </Button>
          </div>
        </div>
      )}

      {Object.keys(grouped).length === 0 ? (
        <p className="text-sm text-ink-muted text-center py-6">
          No goals posted yet. Add one to keep the room aligned.
        </p>
      ) : (
        Object.entries(grouped).map(([dateLabel, goals]) => (
          <div key={dateLabel} className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{dateLabel}</Badge>
              <div className="flex-1 h-px bg-line/15" />
            </div>
            <div className="divide-y divide-line/15 rounded-[12px] border border-line/30 bg-surface overflow-hidden">
              {goals.map((goal) => (
                <div
                  key={goal.id}
                  className={cn(
                    "flex items-start gap-3 px-3.5 py-3 transition-opacity",
                    goal.completed && "opacity-60"
                  )}
                >
                  <Avatar className="h-7 w-7 border border-line/30 shrink-0 mt-0.5">
                    <AvatarFallback className="bg-surface-soft font-mono text-[10px] text-ink">
                      {(goal.displayName ?? "?").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-ink-muted">{goal.displayName}</p>
                    <p className={cn("text-sm text-ink", goal.completed && "line-through")}>
                      {goal.text}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleComplete(goal)}
                    aria-label={goal.completed ? "Mark incomplete" : "Mark complete"}
                    className={cn(
                      "shrink-0 mt-0.5 h-6 w-6 rounded-[6px] border flex items-center justify-center transition-colors",
                      goal.completed
                        ? "bg-success border-line text-surface"
                        : "border-line bg-surface hover:bg-surface-soft"
                    )}
                  >
                    {goal.completed && <Check className="h-3.5 w-3.5" strokeWidth={2.25} />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
