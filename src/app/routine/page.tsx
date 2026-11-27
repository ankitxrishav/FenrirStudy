"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  CheckSquare,
  ListTodo,
  Plus,
  Repeat2,
  Trash2,
} from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { collection, query, where } from "firebase/firestore";

import { useCollection, useFirestore, useUser } from "@/firebase";
import { useHabits } from "@/hooks/use-habits";
import { useYptExtras } from "@/hooks/use-ypt-extras";
import { Habit, Subject } from "@/lib/definitions";
import { useToast } from "@/hooks/use-toast";

import { DateSelector } from "@/components/app/habits/date-selector";
import { HabitItem } from "@/components/app/habits/habit-item";
import { ProgressHeader } from "@/components/app/habits/progress-header";
import { AddEditHabitDialog } from "@/components/app/habits/add-edit-habit-dialog";
import { StarterGuide } from "@/components/app/habits/starter-guide";
import LoadingScreen from "@/components/app/loading-screen";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function dateLabel(d: Date) {
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEE, MMM d");
}

export default function RoutinePage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [section, setSection] = React.useState<"habits" | "todos">("habits");
  const [selectedDate, setSelectedDate] = React.useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  });
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<Habit | null>(null);

  const [todoText, setTodoText] = React.useState("");
  const [todoSubjectId, setTodoSubjectId] = React.useState("");

  const {
    habits,
    logsForDate,
    loading,
    toggleHabit,
    addHabit,
    editHabit,
    deleteHabit,
    moveHabit,
  } = useHabits(selectedDate);

  const {
    studyTodos,
    addTodo,
    toggleTodo,
    deleteTodo,
    moveUnfinishedToTomorrow,
  } = useYptExtras();

  const subjectsQuery = React.useMemo(
    () =>
      user && firestore
        ? query(collection(firestore, "subjects"), where("userId", "==", user.uid))
        : null,
    [user, firestore]
  );
  const { data: subjects } = useCollection<Subject>(subjectsQuery);
  const activeSubjects = React.useMemo(
    () => (subjects ?? []).filter((s) => !s.archived),
    [subjects]
  );

  React.useEffect(() => {
    if (!todoSubjectId && activeSubjects.length > 0) {
      setTodoSubjectId(activeSubjects[0].id);
    }
  }, [activeSubjects, todoSubjectId]);

  React.useEffect(() => {
    if (!userLoading && !user) router.push("/login");
  }, [user, userLoading, router]);

  if (userLoading || !user) return <LoadingScreen />;

  const selectedDateKey = format(selectedDate, "yyyy-MM-dd");
  const completedCount = habits.filter(
    (h) => logsForDate[h.id]?.status === "completed"
  ).length;

  const dayTodos = studyTodos.filter((t) => t.dateKey === selectedDateKey);
  const dayTodosCompleted = dayTodos.filter((t) => t.completed).length;
  const todoAchievementPct = dayTodos.length > 0 ? Math.round((dayTodosCompleted / dayTodos.length) * 100) : 0;
  const unfinishedCount = dayTodos.filter((t) => !t.completed).length;

  const subjectMap = new Map((subjects ?? []).map((s) => [s.id, s]));

  const handleSave = async (data: Parameters<typeof addHabit>[0]) => {
    if (editTarget) {
      await editHabit(editTarget.id, data);
    } else {
      await addHabit(data);
    }
  };

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!todoText.trim()) return;
    await addTodo(todoSubjectId || activeSubjects[0]?.id || "general", todoText, selectedDateKey);
    setTodoText("");
  };

  const openEdit = (habit: Habit) => {
    setEditTarget(habit);
    setDialogOpen(true);
  };
  const openAdd = () => {
    setEditTarget(null);
    setDialogOpen(true);
  };

  return (
    <div className="max-w-2xl mx-auto w-full space-y-6 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-muted flex items-center gap-1.5">
            <Repeat2 className="h-3.5 w-3.5 text-clay" />
            Daily Execution
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-ink mt-0.5">
            Routine &amp; Study To-Dos
          </h1>
          <p className="text-sm text-ink-muted mt-0.5">{dateLabel(selectedDate)}</p>
        </div>

        <div className="inline-flex rounded-full border border-line bg-surface p-1">
          <button
            type="button"
            onClick={() => setSection("habits")}
            className={cn(
              "px-4 py-1.5 rounded-full text-xs font-semibold transition-colors",
              section === "habits" ? "bg-ink text-surface" : "text-ink-muted hover:text-ink"
            )}
          >
            Habits ({completedCount}/{habits.length})
          </button>
          <button
            type="button"
            onClick={() => setSection("todos")}
            className={cn(
              "px-4 py-1.5 rounded-full text-xs font-semibold transition-colors",
              section === "todos" ? "bg-ink text-surface" : "text-ink-muted hover:text-ink"
            )}
          >
            To-Dos ({dayTodosCompleted}/{dayTodos.length})
          </button>
        </div>
      </div>

      <DateSelector selectedDate={selectedDate} onDateChange={setSelectedDate} />

      {section === "habits" ? (
        <>
          <div className="flex items-center justify-between gap-3">
            <StarterGuide />
            <Button
              id="add-habit-fab"
              type="button"
              onClick={openAdd}
              className="min-h-[40px] rounded-full bg-clay text-ink border border-line hover:bg-clay/90 font-semibold gap-1.5 px-4 shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>Add Habit</span>
            </Button>
          </div>

          {habits.length > 0 && (
            <Card className="border-line bg-surface rounded-2xl">
              <CardContent className="p-5">
                <ProgressHeader completed={completedCount} total={habits.length} />
              </CardContent>
            </Card>
          )}

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-[72px] rounded-2xl border border-line/15 bg-surface-soft"
                />
              ))}
            </div>
          ) : habits.length === 0 ? (
            <EmptyState onAdd={openAdd} />
          ) : (
            <div className="space-y-3">
              {habits.map((habit, idx) => {
                const now = new Date();
                const midnightToday = new Date(
                  now.getFullYear(),
                  now.getMonth(),
                  now.getDate()
                );
                const isNotToday = selectedDate.getTime() !== midnightToday.getTime();

                let isOutsideWindow = false;
                if (!isNotToday && habit.startTime && habit.endTime) {
                  const [startH, startM] = habit.startTime.split(":").map(Number);
                  const [endH, endM] = habit.endTime.split(":").map(Number);
                  const startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), startH, startM);
                  const endTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endH, endM);
                  isOutsideWindow = now < startTime || now > endTime;
                }

                return (
                  <HabitItem
                    key={habit.id}
                    habit={habit}
                    log={logsForDate[habit.id]}
                    isFirst={idx === 0}
                    isLast={idx === habits.length - 1}
                    disabled={isNotToday || isOutsideWindow}
                    onToggle={() => toggleHabit(habit.id)}
                    onEdit={() => openEdit(habit)}
                    onDelete={() => deleteHabit(habit.id)}
                    onMoveUp={() => moveHabit(habit.id, "up")}
                    onMoveDown={() => moveHabit(habit.id, "down")}
                  />
                );
              })}
            </div>
          )}

          <AddEditHabitDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            defaultValues={editTarget}
            onSave={handleSave}
          />
        </>
      ) : (
        <div className="space-y-4">
          <Card className="border-line bg-surface rounded-2xl">
            <CardContent className="p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                    Achievement Rate ({dateLabel(selectedDate)})
                  </p>
                  <p className="text-2xl font-bold tabular-nums text-ink">
                    {todoAchievementPct}%
                  </p>
                </div>
                {unfinishedCount > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      const moved = await moveUnfinishedToTomorrow(selectedDateKey);
                      toast({ title: `Moved ${moved} unfinished task${moved === 1 ? "" : "s"} to tomorrow` });
                    }}
                    className="rounded-full border-line text-xs gap-1.5"
                  >
                    <span>Move {unfinishedCount} unfinished to tomorrow</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              <div className="h-2.5 rounded-full border border-line/40 bg-surface-soft overflow-hidden">
                <div
                  className="h-full bg-clay transition-all duration-300"
                  style={{ width: `${todoAchievementPct}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <form onSubmit={handleAddTodo} className="rounded-2xl border border-line bg-surface p-4 space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={todoSubjectId}
                onChange={(e) => setTodoSubjectId(e.target.value)}
                className="h-10 rounded-xl border border-line bg-surface-soft px-3 text-xs text-ink sm:w-44"
              >
                {activeSubjects.length === 0 && <option value="general">General</option>}
                {activeSubjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <Input
                value={todoText}
                onChange={(e) => setTodoText(e.target.value)}
                placeholder="Add subject To-Do (e.g. Solve 20 integrals)..."
                className="h-10 flex-1 bg-surface-soft text-sm"
              />
              <Button
                type="submit"
                className="h-10 rounded-full bg-clay text-ink border border-line hover:bg-clay/90 font-semibold gap-1.5 px-5"
              >
                <Plus className="h-4 w-4" />
                <span>Add</span>
              </Button>
            </div>
          </form>

          {dayTodos.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-line/40 bg-surface py-12 px-6 flex flex-col items-center justify-center gap-2 text-center">
              <ListTodo className="h-8 w-8 text-ink-muted" />
              <p className="font-semibold text-base text-ink">No To-Dos for {dateLabel(selectedDate)}</p>
              <p className="text-xs text-ink-muted">Link actionable study tasks directly to your subjects.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {dayTodos.map((t) => {
                const sub = subjectMap.get(t.subjectId);
                return (
                  <div
                    key={t.id}
                    className={cn(
                      "rounded-2xl border border-line px-4 py-3 flex items-center justify-between gap-3 transition-colors",
                      t.completed ? "bg-surface-soft/80" : "bg-surface"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => toggleTodo(t.id)}
                      className="flex items-center gap-3 flex-1 min-w-0 text-left"
                    >
                      <span
                        className={cn(
                          "h-5 w-5 rounded-md border border-line flex items-center justify-center shrink-0 transition-colors",
                          t.completed ? "bg-clay text-ink" : "bg-surface-soft"
                        )}
                      >
                        {t.completed && <Check className="h-3.5 w-3.5 stroke-[2.5]" />}
                      </span>
                      <div className="min-w-0">
                        <p className={cn("text-sm font-medium text-ink truncate", t.completed && "line-through text-ink-muted")}>
                          {t.text}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: sub?.color || "var(--accent)" }}
                          />
                          <span className="font-mono text-[10px] text-ink-muted">
                            {sub?.name || "General"}
                          </span>
                        </div>
                      </div>
                    </button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteTodo(t.id)}
                      className="h-8 w-8 rounded-full text-ink-muted hover:text-danger shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-3xl border border-dashed border-line/40 bg-surface py-12 px-6 flex flex-col items-center justify-center gap-3 text-center">
      <div className="h-12 w-12 rounded-2xl border border-line bg-surface-soft flex items-center justify-center text-ink">
        <CheckSquare className="h-5 w-5 stroke-[1.5]" />
      </div>
      <div>
        <p className="font-semibold text-base text-ink">No habits scheduled</p>
        <p className="text-ink-muted text-sm mt-1">
          Build your daily routine by adding your first habit.
        </p>
      </div>
      <Button
        type="button"
        onClick={onAdd}
        className="mt-2 min-h-[44px] px-6 rounded-full bg-clay text-ink border border-line hover:bg-clay/90 font-semibold"
      >
        Add your first habit
      </Button>
    </div>
  );
}
