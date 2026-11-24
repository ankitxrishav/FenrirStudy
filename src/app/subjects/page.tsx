"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  MoreHorizontal,
  Clock,
  Target,
  Calendar,
  Archive,
  Edit3,
  Trash2,
} from "lucide-react";
import {
  collection,
  query,
  where,
  doc,
  updateDoc,
  serverTimestamp,
  addDoc,
  deleteDoc,
  getDocs,
} from "firebase/firestore";
import { useUser, useCollection, useFirestore } from "@/firebase";
import { Subject, Session } from "@/lib/definitions";
import { AddSubjectDialog } from "@/components/app/timer/add-subject-dialog";
import { EditSubjectDialog } from "@/components/app/timer/edit-subject-dialog";
import LoadingScreen from "@/components/app/loading-screen";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { cn } from "@/lib/utils";

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function SubjectsPage() {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  const [isAddSubjectOpen, setAddSubjectOpen] = useState(false);
  const [isEditSubjectOpen, setEditSubjectOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [deletingSubject, setDeletingSubject] = useState<Subject | null>(null);

  const subjectsQuery = useMemo(
    () =>
      user && firestore
        ? query(collection(firestore, "subjects"), where("userId", "==", user.uid))
        : null,
    [user, firestore]
  );
  const { data: subjects, loading: subjectsLoading } =
    useCollection<Subject>(subjectsQuery);

  const sessionsQuery = useMemo(
    () =>
      user && firestore
        ? query(collection(firestore, "sessions"), where("userId", "==", user.uid))
        : null,
    [user, firestore]
  );
  const { data: allSessions } = useCollection<Session>(sessionsQuery);

  const subjectStats = useMemo(() => {
    if (!subjects || !allSessions) return new Map();
    const stats = new Map<
      string,
      { totalTime: number; lastActive: Date | null; sessionCount: number }
    >();
    subjects.forEach((sub) => {
      const subSessions = allSessions.filter((s) => s.subjectId === sub.id);
      const totalTime = subSessions.reduce((acc, s) => acc + s.duration, 0);
      const lastActive =
        subSessions.length > 0
          ? new Date(
              Math.max(...subSessions.map((s) => new Date(s.startTime).getTime()))
            )
          : null;
      stats.set(sub.id, {
        totalTime,
        lastActive,
        sessionCount: subSessions.length,
      });
    });
    return stats;
  }, [subjects, allSessions]);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push("/login");
    }
  }, [user, userLoading, router]);

  const handleAddSubject = async (
    newSubject: Omit<Subject, "id" | "archived" | "userId" | "createdAt">
  ) => {
    if (!user || !firestore) return;
    await addDoc(collection(firestore, "subjects"), {
      ...newSubject,
      userId: user.uid,
      archived: false,
      createdAt: serverTimestamp(),
    });
    setAddSubjectOpen(false);
  };

  const handleEditSubject = (subject: Subject) => {
    setEditingSubject(subject);
    setEditSubjectOpen(true);
  };

  const handleUpdateSubject = async (
    subjectId: string,
    updates: Partial<Subject>
  ) => {
    if (!firestore) return;
    await updateDoc(doc(firestore, "subjects", subjectId), updates);
    setEditSubjectOpen(false);
    setEditingSubject(null);
  };

  const toggleArchive = async (subject: Subject) => {
    if (!firestore) return;
    await updateDoc(doc(firestore, "subjects", subject.id), {
      archived: !subject.archived,
    });
  };

  const confirmDeleteSubject = async () => {
    if (!firestore || !deletingSubject) return;
    const target = deletingSubject;
    setDeletingSubject(null);
    const sessionsQ = query(
      collection(firestore, "sessions"),
      where("subjectId", "==", target.id)
    );
    const snapshot = await getDocs(sessionsQ);
    await Promise.all(
      snapshot.docs.map((docSnap) =>
        deleteDoc(doc(firestore, "sessions", docSnap.id))
      )
    );
    await deleteDoc(doc(firestore, "subjects", target.id));
  };

  if (userLoading || subjectsLoading || !user) {
    return <LoadingScreen />;
  }

  const activeSubjects = subjects?.filter((s) => !s.archived) || [];
  const archivedSubjects = subjects?.filter((s) => s.archived) || [];

  return (
    <div className="space-y-7 pb-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-muted">
            Curriculum
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-ink">Subjects</h1>
          <p className="text-sm text-ink-muted mt-0.5">
            Organize focus time across courses and priorities.
          </p>
        </div>

        <Button
          type="button"
          onClick={() => setAddSubjectOpen(true)}
          className="min-h-[44px] rounded-full bg-clay text-ink border border-line hover:bg-clay/90 font-semibold gap-2 px-5"
        >
          <Plus className="h-4 w-4" />
          <span>Add Subject</span>
        </Button>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-mono text-xs uppercase tracking-[0.14em] text-ink-muted">
            Active ({activeSubjects.length})
          </h2>
        </div>

        {activeSubjects.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activeSubjects.map((subject) => {
              const stats = subjectStats.get(subject.id);
              const priority = subject.priority || "medium";

              return (
                <Card
                  key={subject.id}
                  className="border-line bg-surface rounded-2xl overflow-hidden"
                >
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className="h-4 w-4 rounded-full border border-line shrink-0"
                          style={{ backgroundColor: subject.color }}
                        />
                        <div className="min-w-0">
                          <h3 className="text-base font-semibold text-ink truncate">
                            {subject.name}
                          </h3>
                          <span
                            className={cn(
                              "inline-block mt-1 font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border",
                              priority === "high"
                                ? "bg-highlight border-line text-ink"
                                : "bg-surface-soft border-line/20 text-ink-muted"
                            )}
                          >
                            {priority} priority
                          </span>
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Actions for ${subject.name}`}
                            className="h-9 w-9 rounded-full text-ink-muted hover:text-ink"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleEditSubject(subject)}
                            className="gap-2"
                          >
                            <Edit3 className="h-4 w-4" /> Edit Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => toggleArchive(subject)}
                            className="gap-2"
                          >
                            <Archive className="h-4 w-4" /> Archive Subject
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeletingSubject(subject)}
                            className="gap-2 text-danger focus:text-danger"
                          >
                            <Trash2 className="h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="rounded-xl border border-line/15 bg-surface-soft p-3">
                        <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                          <Clock className="h-3 w-3" /> Focus
                        </div>
                        <div className="text-lg font-bold tabular-nums text-ink mt-0.5">
                          {formatDuration(stats?.totalTime || 0)}
                        </div>
                      </div>
                      <div className="rounded-xl border border-line/15 bg-surface-soft p-3">
                        <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                          <Target className="h-3 w-3" /> Sessions
                        </div>
                        <div className="text-lg font-bold tabular-nums text-ink mt-0.5">
                          {stats?.sessionCount || 0}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-ink-muted pt-2 border-t border-line/15">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" /> Last session
                      </span>
                      <span className="font-mono text-ink">
                        {stats?.lastActive ? stats.lastActive.toLocaleDateString() : "None yet"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="border-dashed border-line/40 bg-surface rounded-2xl">
            <CardContent className="py-12 text-center space-y-3">
              <p className="text-sm text-ink-muted">
                No active subjects yet. Create one to begin tracking focus blocks.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddSubjectOpen(true)}
                className="rounded-full border-line"
              >
                Add first subject
              </Button>
            </CardContent>
          </Card>
        )}
      </section>

      {archivedSubjects.length > 0 && (
        <section className="space-y-3 pt-4 border-t border-line/15">
          <h2 className="font-mono text-xs uppercase tracking-[0.14em] text-ink-muted">
            Archived ({archivedSubjects.length})
          </h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {archivedSubjects.map((subject) => (
              <div
                key={subject.id}
                className="flex items-center justify-between gap-2 rounded-2xl border border-line/20 bg-surface-soft px-4 py-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="h-3 w-3 rounded-full border border-line/30 shrink-0"
                    style={{ backgroundColor: subject.color }}
                  />
                  <span className="text-sm font-medium text-ink truncate">
                    {subject.name}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => toggleArchive(subject)}
                    className="h-8 text-xs rounded-full"
                  >
                    Restore
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeletingSubject(subject)}
                    aria-label={`Delete ${subject.name}`}
                    className="h-8 w-8 text-danger hover:text-danger"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <AddSubjectDialog
        isOpen={isAddSubjectOpen}
        onOpenChange={setAddSubjectOpen}
        onAddSubject={handleAddSubject}
      />
      <EditSubjectDialog
        isOpen={isEditSubjectOpen}
        onOpenChange={setEditSubjectOpen}
        onUpdateSubject={handleUpdateSubject}
        subject={editingSubject}
      />

      <AlertDialog
        open={!!deletingSubject}
        onOpenChange={(open) => {
          if (!open) setDeletingSubject(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deletingSubject?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes this subject and all of its logged study sessions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteSubject}
              className="bg-danger text-surface hover:bg-danger/90"
            >
              Delete Subject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
