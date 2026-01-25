
import { useMemo } from 'react';
import { Session, Subject } from '@/lib/definitions';
import {
    startOfDay,
    subDays,
    isAfter,
    isBefore,
    format,
    differenceInDays,
    eachDayOfInterval,
    isSameDay,
    startOfWeek,
    endOfWeek
} from 'date-fns';

export function useDashboardStats(sessions: Session[] | null, subjects: Subject[] | null) {
    return useMemo(() => {
        if (!sessions) return null;

        const now = new Date();
        const todayStart = startOfDay(now);
        const yesterdayStart = startOfDay(subDays(now, 1));
        const last7DaysStart = startOfDay(subDays(now, 6));
        const prev7DaysStart = startOfDay(subDays(now, 13));

        // --- LAYER 1: CORE PRODUCTIVITY ---
        const todaySessions = sessions.filter(s => new Date(s.startTime) >= todayStart);
        const timeToday = todaySessions.reduce((acc, s) => acc + s.duration, 0);

        const thisWeekSessions = sessions.filter(s => isAfter(new Date(s.startTime), last7DaysStart));
        const timeThisWeek = thisWeekSessions.reduce((acc, s) => acc + s.duration, 0);

        const prevWeekSessions = sessions.filter(s => {
            const d = new Date(s.startTime);
            return isAfter(d, prev7DaysStart) && isBefore(d, last7DaysStart);
        });
        const timePrevWeek = prevWeekSessions.reduce((acc, s) => acc + s.duration, 0);

        const avgSessionDuration = sessions.length > 0
            ? sessions.reduce((acc, s) => acc + s.duration, 0) / sessions.length
            : 0;

        const longestSession = sessions.length > 0
            ? Math.max(...sessions.map(s => s.duration))
            : 0;

        // --- LAYER 2: SUBJECT INTELLIGENCE ---
        const subjectDistribution = subjects?.filter(sub => !sub.archived).map(sub => {
            const subSessions = sessions.filter(s => s.subjectId === sub.id);
            const totalTime = subSessions.reduce((acc, s) => acc + s.duration, 0);

            // Efficiency = Avg Score * Consistency (days strictly studying it in last 7)
            const weekSessions = subSessions.filter(s => isAfter(new Date(s.startTime), last7DaysStart));
            const uniqueDays = new Set(weekSessions.map(s => format(new Date(s.startTime), 'yyyy-MM-dd'))).size;
            const consistency = (uniqueDays / 7) * 100;

            return {
                name: sub.name,
                color: sub.color,
                totalTime,
                consistency,
                sessionCount: subSessions.length
            };
        }).sort((a, b) => b.totalTime - a.totalTime) || [];

        const neglectedSubjects = subjects?.filter(sub => {
            if (sub.archived) return false;
            const subSessions = sessions.filter(s => s.subjectId === sub.id);
            if (subSessions.length === 0) return true;
            const lastSessionTime = Math.max(...subSessions.map(s => new Date(s.startTime).getTime()));
            return isBefore(new Date(lastSessionTime), subDays(now, 3));
        }).map(s => s.name) || [];

        // --- LAYER 3: TIME & BEHAVIOR ---
        const hourHeatmap = new Array(24).fill(0).map((_, i) => ({
            hour: i,
            label: format(new Date().setHours(i), 'ha'),
            total: sessions.filter(s => new Date(s.startTime).getHours() === i).reduce((acc, s) => acc + s.duration, 0)
        }));

        const bestHour = hourHeatmap.reduce((prev, current) => (prev.total > current.total) ? prev : current);

        const dayOfWeekStats = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => ({
            day,
            total: sessions.filter(s => new Date(s.startTime).getDay() === i).reduce((acc, s) => acc + s.duration, 0)
        }));

        // Study Rhythm Detection
        const lateNightSessions = sessions.filter(s => {
            const h = new Date(s.startTime).getHours();
            return h >= 22 || h <= 4;
        }).length;
        const earlyMorningSessions = sessions.filter(s => {
            const h = new Date(s.startTime).getHours();
            return h >= 5 && h <= 9;
        }).length;

        let rhythm = "Balanced Learner";
        if (lateNightSessions > earlyMorningSessions && lateNightSessions > 5) rhythm = "Night Owl";
        else if (earlyMorningSessions > lateNightSessions && earlyMorningSessions > 5) rhythm = "Early Focus";

        // --- LAYER 4: PROGRESS & TRENDS ---
        const momentum = timePrevWeek > 0 ? ((timeThisWeek - timePrevWeek) / timePrevWeek) * 100 : 0;

        // --- LAYER 5: PERSONALIZED INSIGHTS ---
        const insights = [];
        if (momentum > 10) insights.push("Your momentum is surging this week. Capitalize on this energy.");
        if (neglectedSubjects.length > 0) insights.push(`Focus on ${neglectedSubjects[0]} to maintain subject balance.`);
        if (avgSessionDuration > 2400) insights.push("You excel in deep focus. Long sessions are your strength.");
        else insights.push("You perform best with short, intense focus sprints.");

        if (bestHour.total > 0) insights.push(`Your biological prime time appears to be around ${bestHour.label}.`);

        return {
            core: {
                timeToday,
                timeThisWeek,
                timePrevWeek,
                avgSessionDuration,
                longestSession,
                momentum
            },
            subjects: {
                distribution: subjectDistribution,
                neglected: neglectedSubjects
            },
            behavior: {
                hourHeatmap,
                bestHour,
                dayOfWeekStats,
                rhythm
            },
            insights: insights.slice(0, 3)
        };
    }, [sessions, subjects]);
}
