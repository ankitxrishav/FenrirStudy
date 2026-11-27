import { useMemo } from 'react';
import { Session, Subject } from '@/lib/definitions';
import { computeStudyStatistics, StudyStatistics, StudyStatisticsOptions } from '@/lib/study-time';

export function useDashboardStats(
  sessions: Session[] | null,
  subjects: Subject[] | null,
  dailyTargetHours: number = 2,
  options?: StudyStatisticsOptions
): StudyStatistics | null {
  return useMemo(() => {
    if (!sessions) return null;
    return computeStudyStatistics(sessions, subjects ?? [], dailyTargetHours, Date.now(), options);
  }, [sessions, subjects, dailyTargetHours, options]);
}
