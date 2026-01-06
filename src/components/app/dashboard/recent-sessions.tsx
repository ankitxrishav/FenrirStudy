
"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useFirestore, useUser, useCollection } from "@/firebase";
import { Subject, Session } from "@/lib/definitions";
import { collection, query, where, orderBy, limit } from "firebase/firestore";
import { useMemo } from "react";
import { formatDistanceToNow } from 'date-fns';

export function RecentSessions() {
    const { user } = useUser();
    const firestore = useFirestore();

    const sessionsQuery = useMemo(() => {
        if (!user || !firestore) return null;
        return query(
            collection(firestore, 'sessions'),
            where('userId', '==', user.uid),
            orderBy('startTime', 'desc'),
            limit(5)
        );
    }, [user, firestore]);
    const { data: recentSessions, loading: sessionsLoading } = useCollection<Session>(sessionsQuery);

    const subjectIds = useMemo(() => {
        if (!recentSessions) return [];
        return [...new Set(recentSessions.map(s => s.subjectId))];
    }, [recentSessions]);

    const subjectsQuery = useMemo(() => {
        if (!firestore || subjectIds.length === 0) return null;
        return query(collection(firestore, 'subjects'), where('__name__', 'in', subjectIds));
    }, [firestore, subjectIds]);
    const { data: subjects, loading: subjectsLoading } = useCollection<Subject>(subjectsQuery);

    const subjectsMap = useMemo(() => {
        if (!subjects) return new Map<string, Subject>();
        return new Map(subjects.map(s => [s.id, s]));
    }, [subjects]);

    const loading = sessionsLoading || subjectsLoading;

    if (loading) {
        return <div className="text-muted-foreground">Loading recent sessions...</div>
    }

    if (!recentSessions || recentSessions.length === 0) {
        return <p className="text-sm text-muted-foreground">You have no recent sessions.</p>
    }

    return (
        <div className="space-y-8">
            {recentSessions.map(session => {
                const subject = subjectsMap.get(session.subjectId);
                const durationMinutes = Math.round(session.duration / 60);

                return (
                    <div key={session.id} className="flex items-center">
                        <Avatar className="h-9 w-9">
                           <div className="flex h-full w-full items-center justify-center rounded-full" style={{backgroundColor: subject?.color || 'hsl(var(--muted))'}}>
                                <AvatarFallback className="bg-transparent text-white font-medium">
                                    {subject?.name ? subject.name.substring(0,2) : '?'}
                                </AvatarFallback>
                            </div>
                        </Avatar>
                        <div className="ml-4 space-y-1">
                            <p className="text-sm font-medium leading-none">{subject?.name || 'Unknown Subject'}</p>
                            <p className="text-sm text-muted-foreground">
                                {formatDistanceToNow(new Date(session.startTime), { addSuffix: true })}
                            </p>
                        </div>
                        {durationMinutes > 0 && (
                            <div className="ml-auto font-medium">+{durationMinutes} min</div>
                        )}
                    </div>
                )
            })}
        </div>
    );
}
