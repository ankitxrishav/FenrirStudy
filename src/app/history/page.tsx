
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Calendar, Clock, Zap, BarChart3, ChevronRight, Hash, ChevronDown, FolderArchive } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState } from "react";
import { useUser, useCollection, useFirestore } from "@/firebase";
import { useRouter } from "next/navigation";
import { collection, query, where, orderBy } from "firebase/firestore";
import { Subject, Session } from "@/lib/definitions";
import { format, subDays, startOfDay, isSameDay, eachDayOfInterval } from "date-fns";
import LoadingScreen from "@/components/app/loading-screen";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

function formatDuration(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}

export default function HistoryPage() {
    const { user, loading: userLoading } = useUser();
    const router = useRouter();
    const firestore = useFirestore();
    const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

    const toggleDate = (date: string) => {
        setExpandedDates(prev => {
            const next = new Set(prev);
            if (next.has(date)) next.delete(date);
            else next.add(date);
            return next;
        });
    };

    const subjectsQuery = useMemo(() => user && firestore ? query(collection(firestore, 'subjects'), where('userId', '==', user.uid)) : null, [user, firestore]);
    const { data: subjects, loading: subjectsLoading } = useCollection<Subject>(subjectsQuery);

    const sessionsQuery = useMemo(() => user && firestore ? query(collection(firestore, 'sessions'), where('userId', '==', user.uid), orderBy('startTime', 'desc')) : null, [user, firestore]);
    const { data: sessions, loading: sessionsLoading } = useCollection<Session>(sessionsQuery);

    const subjectsMap = useMemo(() => {
        if (!subjects) return new Map<string, Subject>();
        return new Map(subjects.map(s => [s.id, s]));
    }, [subjects]);

    const heatmapData = useMemo(() => {
        if (!sessions) return [];
        const last30Days = eachDayOfInterval({
            start: subDays(new Date(), 29),
            end: new Date()
        });

        return last30Days.map(day => {
            const daySessions = sessions.filter(s => isSameDay(new Date(s.startTime), day));
            const totalDuration = daySessions.reduce((acc, s) => acc + s.duration, 0);
            return {
                day,
                totalDuration,
                level: totalDuration === 0 ? 0 : totalDuration < 3600 ? 1 : totalDuration < 7200 ? 2 : totalDuration < 14400 ? 3 : 4
            };
        });
    }, [sessions]);

    const { todaySessions, pastSessionsGrouped } = useMemo(() => {
        if (!sessions) return { todaySessions: [], pastSessionsGrouped: [] };

        const today = new Date();
        const todaySessions: Session[] = [];
        const pastGroups: { [key: string]: Session[] } = {};

        sessions.forEach(s => {
            const sessionDate = new Date(s.startTime);
            if (isSameDay(sessionDate, today)) {
                todaySessions.push(s);
            } else {
                const dateKey = format(sessionDate, 'yyyy-MM-dd');
                if (!pastGroups[dateKey]) pastGroups[dateKey] = [];
                pastGroups[dateKey].push(s);
            }
        });

        return {
            todaySessions,
            pastSessionsGrouped: Object.entries(pastGroups).sort((a, b) => b[0].localeCompare(a[0]))
        };
    }, [sessions]);

    useEffect(() => {
        if (!userLoading && !user) {
            router.push('/login');
        }
    }, [user, userLoading, router]);

    if (userLoading || subjectsLoading || sessionsLoading || !user) {
        return <LoadingScreen />;
    }

    const renderSessionCard = (session: Session) => {
        const subject = subjectsMap.get(session.subjectId);
        return (
            <div key={session.id} className="glass-card flex items-center p-4 rounded-xl border-white/5 group hover:border-primary/20 transition-all">
                <div className="h-10 w-10 rounded-full flex items-center justify-center shrink-0 shadow-inner" style={{ backgroundColor: `${subject?.color}15` }}>
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: subject?.color }} />
                </div>
                <div className="ml-4 flex-1">
                    <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm">{subject?.name || 'Unknown Subject'}</h4>
                        <Badge variant="outline" className="text-[9px] h-4 py-0 font-bold opacity-60 uppercase">
                            {session.mode}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                            <Clock className="h-3 w-3" /> {formatDuration(session.duration)}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                            <Zap className="h-3 w-3" /> {session.focusScore}%
                        </span>
                    </div>
                </div>
                <div className="text-right flex items-center gap-4">
                    <div className="hidden md:block">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{session.status}</p>
                        <p className="text-[10px] font-medium opacity-40">{format(new Date(session.startTime), 'p')}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
            </div>
        );
    };

    return (
        <div className="container mx-auto p-4 md:p-8 space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight text-gradient mb-2">History</h1>
                    <p className="text-muted-foreground">Review your past sessions and study consistency.</p>
                </div>
            </div>

            <Card className="glass border-white/10 shadow-xl overflow-hidden">
                <CardHeader className="border-b border-white/5 pb-4">
                    <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em]">
                        <BarChart3 className="h-4 w-4 text-primary" /> Focus Heatmap
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6 overflow-x-auto">
                    <div className="flex gap-1.5 min-w-max">
                        {heatmapData.map((data, i) => (
                            <div key={i} className="flex flex-col gap-1 items-center">
                                <div
                                    className={cn(
                                        "w-4 h-4 rounded-sm transition-all hover:scale-125 cursor-help",
                                        data.level === 0 && "bg-muted/10",
                                        data.level === 1 && "bg-primary/20",
                                        data.level === 2 && "bg-primary/40",
                                        data.level === 3 && "bg-primary/70",
                                        data.level === 4 && "bg-primary"
                                    )}
                                    title={`${format(data.day, 'MMM d')}: ${Math.round(data.totalDuration / 60)} minutes`}
                                />
                                {i % 7 === 0 && <span className="text-[8px] font-bold text-muted-foreground/50 mt-1 uppercase">{format(data.day, 'MMM d')}</span>}
                            </div>
                        ))}
                    </div>
                    <div className="flex items-center justify-end gap-2 mt-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        <span>Less</span>
                        <div className="flex gap-1">
                            <div className="w-2.5 h-2.5 rounded-sm bg-muted/10" />
                            <div className="w-2.5 h-2.5 rounded-sm bg-primary/20" />
                            <div className="w-2.5 h-2.5 rounded-sm bg-primary/40" />
                            <div className="w-2.5 h-2.5 rounded-sm bg-primary/70" />
                            <div className="w-2.5 h-2.5 rounded-sm bg-primary" />
                        </div>
                        <span>More</span>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-6">
                {/* Today's Rituals (Always Visible) */}
                <section className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Clock className="h-4 w-4 text-primary" />
                        </div>
                        <h2 className="text-xl font-bold tracking-tight">Today's Focus</h2>
                        <div className="h-px flex-1 bg-gradient-to-r from-primary/20 to-transparent" />
                    </div>

                    <div className="grid gap-3">
                        {todaySessions.length > 0 ? todaySessions.map(renderSessionCard) : (
                            <div className="py-8 text-center glass border-dashed border-2 border-white/5 rounded-2xl opacity-40">
                                <p className="text-xs font-bold uppercase tracking-widest">No sessions yet today</p>
                            </div>
                        )}
                    </div>
                </section>

                {/* History Matrix (Collapsible by Date) */}
                <div className="space-y-4">
                    <div className="flex items-center gap-3 pt-6">
                        <div className="h-8 w-8 rounded-full bg-muted/10 flex items-center justify-center">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <h2 className="text-xl font-bold tracking-tight">Temporal Records</h2>
                        <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                    </div>

                    <div className="grid gap-4">
                        {pastSessionsGrouped.length > 0 ? pastSessionsGrouped.map(([dateKey, entries]) => {
                            const isExpanded = expandedDates.has(dateKey);
                            return (
                                <div key={dateKey} className="group">
                                    <button
                                        onClick={() => toggleDate(dateKey)}
                                        className={cn(
                                            "w-full flex items-center justify-between p-5 rounded-2xl border transition-all",
                                            isExpanded ? "glass border-primary/20 bg-primary/5" : "bg-white/[0.02] border-white/5 hover:border-white/10"
                                        )}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "h-10 w-10 rounded-xl flex items-center justify-center transition-all",
                                                isExpanded ? "bg-primary text-primary-foreground" : "bg-white/5 text-muted-foreground"
                                            )}>
                                                <Calendar className="h-5 w-5" />
                                            </div>
                                            <div className="text-left">
                                                <h3 className="text-sm font-bold tracking-tight uppercase">{format(new Date(dateKey), 'EEEE, MMMM d')}</h3>
                                                <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">
                                                    {entries.length} {entries.length === 1 ? 'Ritual' : 'Rituals'} • {formatDuration(entries.reduce((acc, s) => acc + s.duration, 0))}
                                                </p>
                                            </div>
                                        </div>
                                        <ChevronDown className={cn("h-5 w-5 text-muted-foreground/40 transition-transform duration-500", isExpanded ? "rotate-180 text-primary" : "")} />
                                    </button>

                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                transition={{ duration: 0.4, ease: "circOut" }}
                                                className="overflow-hidden"
                                            >
                                                <div className="grid gap-3 pt-4 pb-2 px-4 border-l-2 border-primary/10 ml-5 mt-2">
                                                    {entries.map(renderSessionCard)}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        }) : (
                            <div className="py-12 text-center opacity-30">
                                <p className="text-xs font-bold uppercase tracking-widest">No historical rituals logged yet.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
