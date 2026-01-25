
"use client";

import { Overview } from "@/components/app/dashboard/overview";
import { RecentSessions } from "@/components/app/dashboard/recent-sessions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useUser, useFirestore, useCollection } from "@/firebase";
import {
    Activity,
    Target,
    TrendingUp,
    Zap,
    Clock,
    Brain,
    AlertCircle,
    BarChart3,
    Calendar,
    PieChart,
    Flame,
    Sun,
    Moon,
    ZapOff,
    ArrowUpRight,
    ArrowDownRight,
    Search,
    MessageSquareQuote,
    Settings2
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { collection, query, where } from "firebase/firestore";
import { Session, User, Subject } from "@/lib/definitions";
import { useDoc } from "@/firebase";
import { doc } from "firebase/firestore";
import LoadingScreen from "@/components/app/loading-screen";
import { cn } from "@/lib/utils";
import { useDashboardStats } from "@/hooks/use-dashboard-stats";
import { format } from "date-fns";
import { motion } from "framer-motion";

function formatDuration(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m`;
    return "0m";
}

export default function DashboardPage() {
    const { user, loading: userLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();

    const userDocRef = useMemo(() => (user && firestore ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
    const { data: userData } = useDoc<User>(userDocRef);

    useEffect(() => {
        if (!userLoading && !user) {
            router.push('/login');
        }
    }, [user, userLoading, router]);

    const sessionsQuery = useMemo(() => {
        if (!user || !firestore) return null;
        return query(collection(firestore, 'sessions'), where('userId', '==', user.uid));
    }, [user, firestore]);

    const subjectsQuery = useMemo(() => {
        if (!user || !firestore) return null;
        return query(collection(firestore, 'subjects'), where('userId', '==', user.uid));
    }, [user, firestore]);

    const { data: allSessions, loading: sessionsLoading } = useCollection<Session>(sessionsQuery);
    const { data: allSubjects } = useCollection<Subject>(subjectsQuery);

    const stats = useDashboardStats(allSessions, allSubjects);

    if (userLoading || sessionsLoading || !user || !stats) {
        return <LoadingScreen />;
    }

    return (
        <div className="flex-col md:flex">
            <div className="flex-1 space-y-10 p-8 pt-6 max-w-7xl mx-auto w-full">

                {/* Header Phase */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-8">
                    <div className="space-y-4">
                        <div>
                            <div className="flex items-center gap-2 text-primary mb-1">
                                <Activity className="h-5 w-5" />
                                <span className="text-[10px] font-bold uppercase tracking-[0.4em]">Overview</span>
                            </div>
                            <h1 className="text-6xl font-black tracking-tighter text-gradient">
                                Dashboard
                            </h1>
                            <p className="text-muted-foreground text-sm mt-1 max-w-sm">Clear analysis of your study habits and focus performance.</p>
                        </div>
                    </div>

                    {/* Layer 5: Personalized Insights (Premium) */}
                    <div className="flex flex-col gap-3 max-w-sm w-full">
                        <div className="flex items-center gap-2 mb-1">
                            <Zap className="h-4 w-4 text-primary fill-primary animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Study Insights</span>
                        </div>
                        {stats.insights.map((insight, i) => (
                            <div key={i} className="relative group overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <div className="glass p-4 rounded-2xl border border-primary/20 flex items-start gap-3 animate-in fade-in slide-in-from-right duration-700 relative z-10" style={{ animationDelay: `${i * 100}ms` }}>
                                    <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                                    <p className="text-[12px] font-bold leading-relaxed text-foreground/90">{insight}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Layer 1: Core Productivity */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    <Card className="glass-card overflow-hidden group">
                        <CardHeader className="pb-2 space-y-0">
                            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                                <span>Focus Today</span>
                                <Clock className="h-3 w-3" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-black tracking-tighter">{formatDuration(stats.core.timeToday)}</div>
                            <div className="mt-4 flex items-center gap-2">
                                <div className={cn(
                                    "flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full",
                                    stats.core.momentum >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                                )}>
                                    {stats.core.momentum >= 0 ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
                                    {Math.abs(Math.round(stats.core.momentum))}%
                                </div>
                                <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">VS PREV WEEK</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="glass-card overflow-hidden group">
                        <CardHeader className="pb-2 space-y-0">
                            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                                <span>Avg Period</span>
                                <Activity className="h-3 w-3" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-black tracking-tighter">{formatDuration(stats.core.avgSessionDuration)}</div>
                            <p className="text-[10px] font-bold text-muted-foreground/40 mt-4 uppercase tracking-widest">Average session</p>
                        </CardContent>
                    </Card>

                    <Card className="glass-card overflow-hidden group">
                        <CardHeader className="pb-2 space-y-0">
                            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                                <span>Max Focus</span>
                                <Flame className="h-3 w-3" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-black tracking-tighter">{formatDuration(stats.core.longestSession)}</div>
                            <p className="text-[10px] font-bold text-muted-foreground/40 mt-4 uppercase tracking-widest">Longest session</p>
                        </CardContent>
                    </Card>

                    <Card className="glass-card overflow-hidden group">
                        <CardHeader className="pb-2 space-y-0">
                            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                                <span>Study Rhythm</span>
                                {stats.behavior.rhythm === 'Night Owl' ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-black tracking-tighter uppercase">{stats.behavior.rhythm}</div>
                            <p className="text-[10px] font-bold text-muted-foreground/40 mt-6 uppercase tracking-widest">Your focus rhythm</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Layer 2: Intelligence & History */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <Card className="lg:col-span-8 glass border-white/10 shadow-2xl p-6 h-fit md:h-[450px]">
                        <div className="flex items-center justify-between mb-8">
                            <div className="space-y-1">
                                <h3 className="text-sm font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4 text-primary" /> Progress Trend
                                </h3>
                                <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">Weekly flow trend</p>
                            </div>
                            <div className="text-[10px] font-bold text-muted-foreground bg-white/5 px-3 py-1 rounded-md uppercase tracking-widest">Last 168 Hours</div>
                        </div>
                        <div className="h-[300px]">
                            <Overview sessions={stats.core.timeThisWeek > 0 ? allSessions : []} />
                        </div>
                    </Card>

                    <Card className="lg:col-span-4 glass border-white/10 shadow-2xl overflow-hidden flex flex-col h-[450px]">
                        <CardHeader className="border-b border-white/5 p-6 bg-white/[0.01]">
                            <CardTitle className="text-sm font-bold uppercase tracking-[0.2em]">Recent Rituals</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                            <RecentSessions />
                        </CardContent>
                        <div className="p-4 border-t border-white/5 text-center bg-white/[0.01]">
                            <button onClick={() => router.push('/history')} className="text-[10px] font-black text-primary uppercase tracking-[0.3em] hover:tracking-[0.4em] transition-all">
                                ACCESS TEMPORAL ARCHIVE →
                            </button>
                        </div>
                    </Card>
                </div>

                {/* Layer 3: Subject Focus */}
                <Card className="w-full glass border-white/10 shadow-2xl flex flex-col">
                    <CardHeader className="border-b border-white/5 p-6">
                        <div className="flex items-center gap-2 text-primary mb-1">
                            <PieChart className="h-4 w-4" />
                            <CardTitle className="text-sm font-bold uppercase tracking-[0.2em]">Subject Focus</CardTitle>
                        </div>
                        <CardDescription className="text-[10px] uppercase font-bold text-muted-foreground/40">Subject priority and balance</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {stats.subjects.distribution.map((sub, i) => (
                                <div key={i} className="space-y-3 group">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: sub.color }} />
                                            <span className="text-sm font-bold tracking-tight">{sub.name}</span>
                                        </div>
                                        <span className="text-[10px] font-bold text-muted-foreground/60 uppercase">{formatDuration(sub.totalTime)}</span>
                                    </div>
                                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${sub.consistency}%` }}
                                            className="h-full rounded-full transition-all duration-1000"
                                            style={{ backgroundColor: sub.color }}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">
                                        <span>Rituals: {sub.sessionCount}</span>
                                        <span>Stability: {Math.round(sub.consistency)}%</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {stats.subjects.neglected.length > 0 && (
                            <div className="mt-8 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 flex items-start gap-3">
                                <ZapOff className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Balance Alert</p>
                                    <p className="text-[10px] leading-tight text-amber-500/60 font-medium">
                                        {stats.subjects.neglected.join(", ")} {stats.subjects.neglected.length > 1 ? 'have' : 'has'} fallen below the threshold.
                                    </p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Level 3: Time & Behavior Heatmap (Bottom Layer) */}
                <Card className="w-full glass border-white/10 shadow-2xl overflow-hidden mt-6">
                    <CardHeader className="border-b border-white/5 p-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-primary">
                                    <Calendar className="h-4 w-4" />
                                    <CardTitle className="text-sm font-bold uppercase tracking-[0.2em]">Time Distribution</CardTitle>
                                </div>
                                <CardDescription className="text-[10px] uppercase font-bold text-muted-foreground/40">Productivity Heatmap by Hour</CardDescription>
                            </div>
                            <div className="text-[10px] font-black tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full uppercase">
                                Peak: {stats.behavior.bestHour.label}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8">
                        <div className="h-[250px] w-full">
                            {/* Simplified custom heatmap visual */}
                            <div className="flex items-end justify-between h-full gap-1">
                                {stats.behavior.hourHeatmap.map((h, i) => (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-2 group/hour">
                                        <div
                                            className="w-full rounded-t-lg transition-all duration-500 hover:bg-primary shadow-[0_0_20px_rgba(var(--primary),0.2)]"
                                            style={{
                                                height: `${Math.max(4, (h.total / stats.behavior.bestHour.total) * 100)}%`,
                                                backgroundColor: h.total > 0 ? `hsla(var(--primary), ${Math.max(0.1, h.total / stats.behavior.bestHour.total)})` : 'transparent',
                                                border: h.total > 0 ? '1px solid hsla(var(--primary), 0.2)' : '1px dashed hsla(var(--muted), 0.1)'
                                            }}
                                        />
                                        {i % 4 === 0 && <span className="text-[8px] font-bold text-muted-foreground/40 uppercase">{h.label}</span>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
