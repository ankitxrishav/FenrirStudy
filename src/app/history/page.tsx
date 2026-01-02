
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo } from "react";
import { useUser, useCollection, useFirestore } from "@/firebase";
import { useRouter } from "next/navigation";
import { collection, query, where, orderBy } from "firebase/firestore";
import { Subject, Session } from "@/lib/definitions";
import { format } from "date-fns";

function formatDuration(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    let result = '';
    if (h > 0) result += `${h}h `;
    if (m > 0) result += `${m}m `;
    if (s > 0 || (h === 0 && m === 0)) result += `${s}s`;
    return result.trim();
}

export default function HistoryPage() {
    const { user, loading: userLoading } = useUser();
    const router = useRouter();
    const firestore = useFirestore();

    const subjectsQuery = useMemo(() => user && firestore ? query(collection(firestore, 'subjects'), where('userId', '==', user.uid)) : null, [user, firestore]);
    const { data: subjects, loading: subjectsLoading } = useCollection<Subject>(subjectsQuery);

    const sessionsQuery = useMemo(() => user && firestore ? query(collection(firestore, 'sessions'), where('userId', '==', user.uid), orderBy('startTime', 'desc')) : null, [user, firestore]);
    const { data: sessions, loading: sessionsLoading } = useCollection<Session>(sessionsQuery);
    
    const subjectsMap = useMemo(() => {
        if (!subjects) return new Map<string, Subject>();
        return new Map(subjects.map(s => [s.id, s]));
    }, [subjects]);

    useEffect(() => {
        if (!userLoading && !user) {
            router.push('/login');
        }
    }, [user, userLoading, router]);


    if (userLoading || subjectsLoading || sessionsLoading || !user) {
        return <div className="container mx-auto p-4 md:p-8">Loading history...</div>
    }

    return (
        <div className="container mx-auto p-4 md:p-8">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold tracking-tight">Session History</h1>
            </div>
            <Card>
                <CardContent className="mt-6">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Subject</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Duration</TableHead>
                                <TableHead>Focus Score</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sessions && sessions.length > 0 ? (
                                sessions.map((session) => {
                                    const subject = subjectsMap.get(session.subjectId);
                                    return (
                                        <TableRow key={session.id}>
                                            <TableCell className="font-medium flex items-center gap-2">
                                                {subject && <div className="h-2 w-2 rounded-full" style={{ backgroundColor: subject?.color }}></div>}
                                                {subject?.name || 'Unknown'}
                                            </TableCell>
                                            <TableCell>{format(new Date(session.startTime), 'MMM d, yyyy')}</TableCell>
                                            <TableCell>{formatDuration(session.duration)}</TableCell>
                                            <TableCell>
                                                {session.focusScore > 0 ? <Badge variant="outline">{session.focusScore}%</Badge> : <Badge variant="secondary">-</Badge>}
                                            </TableCell>
                                            <TableCell className="capitalize">{session.status}</TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0" disabled>
                                                            <span className="sr-only">Open menu</span>
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center h-24">No sessions recorded yet.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
