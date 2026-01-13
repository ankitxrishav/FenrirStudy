"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useEffect, useState, useMemo } from "react";
import { Subject } from "@/lib/definitions";
import { useUser, useCollection, useFirestore } from "@/firebase";
import { useRouter } from "next/navigation";
import { collection, query, where, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { AddSubjectDialog } from "@/components/app/timer/add-subject-dialog";
import { EditSubjectDialog } from "@/components/app/timer/edit-subject-dialog";
import { addDoc } from "firebase/firestore";
import LoadingScreen from "@/components/app/loading-screen";

export default function SubjectsPage() {
    const { user, loading: userLoading } = useUser();
    const router = useRouter();
    const firestore = useFirestore();
    const [isAddSubjectOpen, setAddSubjectOpen] = useState(false);
    const [isEditSubjectOpen, setEditSubjectOpen] = useState(false);
    const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

    const subjectsQuery = useMemo(() => user && firestore ? query(collection(firestore, 'subjects'), where('userId', '==', user.uid)) : null, [user, firestore]);
    const { data: subjects, loading: subjectsLoading, error } = useCollection<Subject>(subjectsQuery);

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

    return (
        <>
            <div className="container mx-auto p-4 md:p-8">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-3xl font-bold tracking-tight">Subjects</h1>
                    <Button onClick={() => setAddSubjectOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Subject
                    </Button>
                </div>
                {(userLoading || subjectsLoading || !user) ? (
                    (() => {
                        console.log("[UI] SubjectsPage Loading:", { userLoading, subjectsLoading, user: !!user });
                        return <LoadingScreen />;
                    })()
                ) : (
                    <Card>
                        <CardContent className="mt-6">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[50px]">Color</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Priority</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {error && <tr><td colSpan={5}>Error: {error.message}</td></tr>}
                                    {subjects && subjects.length > 0 ? subjects.map((subject) => (
                                        <TableRow key={subject.id}>
                                            <TableCell>
                                                <div className="h-4 w-4 rounded-full" style={{ backgroundColor: subject.color }}></div>
                                            </TableCell>
                                            <TableCell className="font-medium">{subject.name}</TableCell>
                                            <TableCell>
                                                <Badge variant={subject.archived ? 'secondary' : 'default'}>
                                                    {subject.archived ? 'Archived' : 'Active'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="capitalize">{subject.priority || '-'}</TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                                            <span className="sr-only">Open menu</span>
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                        <DropdownMenuItem onClick={() => handleEditSubject(subject)}>Edit</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => toggleArchive(subject)}>
                                                            {subject.archived ? 'Unarchive' : 'Archive'}
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center">No subjects created yet.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}
            </div>
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
        </>
    );
}
