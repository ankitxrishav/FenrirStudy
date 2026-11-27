import { useMemo } from 'react';
import { Session, Subject } from '@/lib/definitions';
import { computeStudyStatistics, StudyStatistics } from '@/lib/study-time';

export function useDashboardStats(
  sessions: Session[] | null,
  subjects: Subject[] | null,
  dailyTargetHours: number = 2
): StudyStatistics | null {
  return useMemo(() => {
    if (!sessions) return null;
    return computeStudyStatistics(sessions, subjects ?? [], dailyTargetHours);
  }, [sessions, subjects, dailyTargetHours]);
}
