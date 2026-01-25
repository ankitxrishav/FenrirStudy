
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, MoreHorizontal, Clock, Target, Calendar, ChevronRight, Archive, Edit3, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useEffect, useState, useMemo } from "react";
import { Subject, Session } from "@/lib/definitions";
import { useUser, useCollection, useFirestore } from "@/firebase";
import { useRouter } from "next/navigation";
import { collection, query, where, doc, updateDoc, serverTimestamp, addDoc } from "firebase/firestore";
import { AddSubjectDialog } from "@/components/app/timer/add-subject-dialog";
import { EditSubjectDialog } from "@/components/app/timer/edit-subject-dialog";
import LoadingScreen from "@/components/app/loading-screen";
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

    const subjectsQuery = useMemo(() => user && firestore ? query(collection(firestore, 'subjects'), where('userId', '==', user.uid)) : null, [user, firestore]);
    const { data: subjects, loading: subjectsLoading } = useCollection<Subject>(subjectsQuery);

    const sessionsQuery = useMemo(() => user && firestore ? query(collection(firestore, 'sessions'), where('userId', '==', user.uid)) : null, [user, firestore]);
    const { data: allSessions } = useCollection<Session>(sessionsQuery);

    const subjectStats = useMemo(() => {
        if (!subjects || !allSessions) return new Map();
        const stats = new Map();
        subjects.forEach(sub => {
            const subSessions = allSessions.filter(s => s.subjectId === sub.id);
            const totalTime = subSessions.reduce((acc, s) => acc + s.duration, 0);
            const lastActive = subSessions.length > 0
                ? new Date(Math.max(...subSessions.map(s => new Date(s.startTime).getTime())))
                : null;
            stats.set(sub.id, { totalTime, lastActive, sessionCount: subSessions.length });
        });
        return stats;
    }, [subjects, allSessions]);

    useEffect(() => {
        if (!userLoading && !user) {
            router.push('/login');
        }
    }, [user, userLoading, router]);

    const handleAddSubject = async (newSubject: Omit<Subject, 'id' | 'archived' | 'userId' | 'createdAt'>) => {
        if (!user || !firestore) return;
        try {
            await addDoc(collection(firestore, "subjects"), {
                ...newSubject,
                userId: user.uid,
                archived: false,
                createdAt: serverTimestamp(),
            });
            setAddSubjectOpen(false);
        } catch (e) {
            console.error("Error adding document: ", e);
        }
    };

    const handleEditSubject = (subject: Subject) => {
        setEditingSubject(subject);
        setEditSubjectOpen(true);
    };

    const handleUpdateSubject = async (subjectId: string, updates: Partial<Subject>) => {
        if (!firestore) return;
        try {
            const subjectRef = doc(firestore, "subjects", subjectId);
            await updateDoc(subjectRef, updates);
            setEditSubjectOpen(false);
            setEditingSubject(null);
        } catch (e) {
            console.error("Error updating document: ", e);
        }
    };

    const toggleArchive = async (subject: Subject) => {
        if (!firestore) return;
        const subjectRef = doc(firestore, "subjects", subject.id);
        await updateDoc(subjectRef, {
            archived: !subject.archived
        });
    };

    if (userLoading || subjectsLoading || !user) {
        return <LoadingScreen />;
    }

    const activeSubjects = subjects?.filter(s => !s.archived) || [];
    const archivedSubjects = subjects?.filter(s => s.archived) || [];

    return (
        <div className="container mx-auto p-4 md:p-8 space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight text-gradient mb-2">Subjects</h1>
                    <p className="text-muted-foreground">Manage your study categories and track your progress.</p>
                </div>
                <Button onClick={() => setAddSubjectOpen(true)} className="shadow-lg hover:scale-105 transition-all">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add New Subject
                </Button>
            </div>

            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <div className="h-1 w-1 rounded-full bg-primary" />
                    <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground">Active Subjects</h2>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {activeSubjects.length > 0 ? activeSubjects.map((subject) => {
                        const stats = subjectStats.get(subject.id);
                        return (
                            <Card key={subject.id} className="group glass border-white/10 shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden relative">
                                <div className="absolute top-0 right-0 w-32 h-32 opacity-[0.03] group-hover:scale-110 transition-transform -mr-8 -mt-8 rounded-full" style={{ backgroundColor: subject.color }} />

                                <CardHeader className="pb-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="h-4 w-4 rounded-full shadow-lg" style={{ backgroundColor: subject.color }} />
                                            <div>
                                                <CardTitle className="text-xl">{subject.name}</CardTitle>
                                                <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                                                    <Badge variant="outline" className="text-[10px] uppercase font-bold py-0 h-4 border-primary/20 bg-primary/5">
                                                        {subject.priority || 'MEDIUM'}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="glass border-white/10">
                                                <DropdownMenuLabel>Manage Subject</DropdownMenuLabel>
                                                <DropdownMenuSeparator className="bg-white/5" />
                                                <DropdownMenuItem onClick={() => handleEditSubject(subject)} className="gap-2">
                                                    <Edit3 className="h-4 w-4" /> Edit Details
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => toggleArchive(subject)} className="gap-2 text-amber-500">
                                                    <Archive className="h-4 w-4" /> Archive Subject
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </CardHeader>

                                <CardContent className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-white/5 dark:bg-black/20 p-3 rounded-lg border border-white/5">
                                            <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-muted-foreground mb-1">
                                                <Clock className="h-3 w-3" /> Total Focus
                                            </div>
                                            <div className="text-lg font-bold">{formatDuration(stats?.totalTime || 0)}</div>
                                        </div>
                                        <div className="bg-white/5 dark:bg-black/20 p-3 rounded-lg border border-white/5">
                                            <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-muted-foreground mb-1">
                                                <Target className="h-3 w-3" /> Sessions
                                            </div>
                                            <div className="text-lg font-bold">{stats?.sessionCount || 0}</div>
                                        </div>
                                    </div>

                                    {stats?.lastActive && (
                                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-white/5">
                                            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Last Active</span>
                                            <span className="font-medium text-foreground">{stats.lastActive.toLocaleDateString()}</span>
                                        </div>
                                    )}
                                </CardContent>

                                <div className="absolute bottom-0 left-0 w-full h-1 opacity-20" style={{ backgroundColor: subject.color }} />
                            </Card>
                        )
                    }) : (
                        <div className="col-span-full py-12 text-center glass border-dashed border-2 border-white/10 rounded-xl">
                            <p className="text-muted-foreground">No active subjects. Start by adding one!</p>
                        </div>
                    )}
                </div>
            </div>

            {archivedSubjects.length > 0 && (
                <div className="space-y-4 pt-8">
                    <div className="flex items-center gap-2">
                        <div className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                        <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground/50">Archived</h2>
                    </div>
                    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
                        {archivedSubjects.map((subject) => (
                            <Card key={subject.id} className="glass opacity-60 hover:opacity-100 transition-opacity border-white/5">
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: subject.color }} />
                                        <span className="text-sm font-medium">{subject.name}</span>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => toggleArchive(subject)} className="h-8 px-2 text-[10px] font-bold uppercase tracking-wider">
                                        UNARCHIVE
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
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
        </div>
    );
}
