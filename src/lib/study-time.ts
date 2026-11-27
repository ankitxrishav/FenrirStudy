import type { Session, StudySegment, Subject } from './definitions';

export type TimeIntervalMs = {
  startMs: number;
  endMs: number;
};

export type DaySlice = {
  dateKey: string;
  startMs: number;
  endMs: number;
  durationMs: number;
};

export type HourSlice = {
  hour: number;
  durationMs: number;
};

export type CalendarSessionSlice = {
  session: Session;
  dateKey: string;
  sliceStartMs: number;
  sliceEndMs: number;
  sliceSeconds: number;
  isCrossMidnight: boolean;
  continuesFromPrevDay: boolean;
  continuesIntoNextDay: boolean;
};

export type DayCalendarRecord = {
  dateKey: string;
  totalSeconds: number;
  sessionCount: number;
  slices: CalendarSessionSlice[];
};

export type PeriodKeys = {
  todayDateKey: string;
  yesterdayDateKey: string;
  weekKey: string;
  monthKey: string;
};

export type PeriodicStatsSummary = {
  periodKeys: PeriodKeys;
  today: { seconds: number; sessions: number };
  yesterday: { seconds: number; sessions: number };
  weekly: { seconds: number; sessions: number };
  monthly: { seconds: number; sessions: number };
  allTime: { seconds: number; sessions: number };
  currentSubjectTodaySeconds: number;
  todaySubjectBreakdown: Record<string, number>;
};

export type StudyStatistics = {
  periodKeys: PeriodKeys;
  core: {
    timeToday: number;
    timeYesterday: number;
    dailyComparisonPct: number;
    timeThisWeek: number;
    timePrevWeek: number;
    timeThisMonth: number;
    timeAllTime: number;
    totalSessions: number;
    avgSessionDuration: number;
    longestSession: number;
    momentum: number;
    avgTimePerWeek: number;
    avgTimePerMonth: number;
    goalTargetSeconds: number;
    goalProgressPct: number;
    currentStreak: number;
    bestStreak: number;
    bestDay: { dateKey: string; seconds: number } | null;
    bestWeek: { weekKey: string; seconds: number } | null;
  };
  subjects: {
    distribution: {
      id: string;
      name: string;
      color: string;
      totalTime: number;
      todayTime: number;
      consistency: number;
      sessionCount: number;
    }[];
    todayBreakdown: Record<string, number>;
    neglected: string[];
  };
  behavior: {
    hourHeatmap: { hour: number; label: string; total: number }[];
    bestHour: { hour: number; label: string; total: number };
    dayOfWeekStats: { day: string; total: number }[];
    rhythm: string;
  };
  trends: {
    last7Days: {
      dateKey: string;
      name: string;
      fullDate: string;
      isToday: boolean;
      seconds: number;
    }[];
    heatmap30Days: { dateKey: string; seconds: number; level: number }[];
    heatmap84Days: { dateKey: string; seconds: number; level: number }[];
  };
  calendarByDate: Record<string, DayCalendarRecord>;
  insights: string[];
};

const HOUR_LABELS = [
  '12am', '1am', '2am', '3am', '4am', '5am',
  '6am', '7am', '8am', '9am', '10am', '11am',
  '12pm', '1pm', '2pm', '3pm', '4pm', '5pm',
  '6pm', '7pm', '8pm', '9pm', '10pm', '11pm',
];

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SHORT_DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SHORT_MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function parseIsoMs(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string' && value.trim().length > 0) {
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? ms : 0;
  }
  if (value && typeof value === 'object') {
    const obj = value as { toMillis?: () => number; seconds?: number; nanoseconds?: number };
    if (typeof obj.toMillis === 'function') return obj.toMillis();
    if (typeof obj.seconds === 'number') {
      return obj.seconds * 1000 + Math.round((obj.nanoseconds || 0) / 1_000_000);
    }
  }
  return 0;
}

export function formatLocalDateKey(ms: number): string {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function startOfLocalDayMs(ms: number): number {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).getTime();
}

export function startOfNextLocalDayMs(ms: number): number {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, 0).getTime();
}

export function addLocalDaysMs(dayStartMs: number, deltaDays: number): number {
  const d = new Date(dayStartMs);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + deltaDays, 0, 0, 0, 0).getTime();
}

export function startOfLocalWeekMondayMs(ms: number): number {
  const d = new Date(ms);
  const dow = d.getDay();
  const diffToMonday = dow === 0 ? -6 : 1 - dow;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + diffToMonday, 0, 0, 0, 0).getTime();
}

export function startOfLocalMonthMs(ms: number): number {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0).getTime();
}

export function getPeriodKeys(nowMs: number = Date.now()): PeriodKeys {
  const todayStart = startOfLocalDayMs(nowMs);
  const yesterdayStart = addLocalDaysMs(todayStart, -1);
  const weekStart = startOfLocalWeekMondayMs(nowMs);
  const d = new Date(nowMs);
  return {
    todayDateKey: formatLocalDateKey(todayStart),
    yesterdayDateKey: formatLocalDateKey(yesterdayStart),
    weekKey: formatLocalDateKey(weekStart),
    monthKey: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
  };
}

export function resolveSessionIntervals(session: Pick<Session, 'startTime' | 'endTime' | 'duration' | 'segments'>): TimeIntervalMs[] {
  const targetMs = Math.max(0, Math.round((session.duration || 0) * 1000));
  if (targetMs <= 0) return [];

  if (Array.isArray(session.segments) && session.segments.length > 0) {
    const raw: TimeIntervalMs[] = [];
    for (const seg of session.segments) {
      const s = parseIsoMs(seg.startTime);
      const e = parseIsoMs(seg.endTime);
      if (s > 0 && e > s) raw.push({ startMs: s, endMs: e });
    }
    if (raw.length > 0) {
      raw.sort((a, b) => a.startMs - b.startMs);
      return trimIntervalsToBudget(raw, targetMs);
    }
  }

  const startMs = parseIsoMs(session.startTime);
  if (startMs <= 0) return [];
  const endMs = parseIsoMs(session.endTime);

  // Use exact duration window starting from startTime when endTime is missing or matches unpaused span
  if (endMs <= startMs || Math.abs((endMs - startMs) - targetMs) <= 5000) {
    return [{ startMs, endMs: startMs + targetMs }];
  }
  return [{ startMs, endMs: startMs + targetMs }];
}

function trimIntervalsToBudget(sorted: TimeIntervalMs[], maxBudgetMs: number): TimeIntervalMs[] {
  const out: TimeIntervalMs[] = [];
  let remaining = maxBudgetMs;
  for (const iv of sorted) {
    if (remaining <= 0) break;
    const len = iv.endMs - iv.startMs;
    if (len <= remaining) {
      out.push(iv);
      remaining -= len;
    } else {
      out.push({ startMs: iv.startMs, endMs: iv.startMs + remaining });
      remaining = 0;
    }
  }
  return out;
}

export function splitIntervalByLocalDays(startMs: number, endMs: number): DaySlice[] {
  if (endMs <= startMs) return [];
  const slices: DaySlice[] = [];
  let cursor = startMs;
  while (cursor < endMs) {
    const nextMidnight = startOfNextLocalDayMs(cursor);
    const segEnd = Math.min(endMs, nextMidnight);
    if (segEnd > cursor) {
      slices.push({
        dateKey: formatLocalDateKey(cursor),
        startMs: cursor,
        endMs: segEnd,
        durationMs: segEnd - cursor,
      });
    }
    if (segEnd <= cursor) break;
    cursor = segEnd;
  }
  return slices;
}

export function splitIntervalByLocalHours(startMs: number, endMs: number): HourSlice[] {
  if (endMs <= startMs) return [];
  const slices: HourSlice[] = [];
  let cursor = startMs;
  while (cursor < endMs) {
    const d = new Date(cursor);
    const hour = d.getHours();
    const nextHourMs = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hour + 1, 0, 0, 0).getTime();
    const segEnd = Math.min(endMs, nextHourMs);
    if (segEnd > cursor) {
      slices.push({ hour, durationMs: segEnd - cursor });
    }
    if (segEnd <= cursor) break;
    cursor = segEnd;
  }
  return slices;
}

type TaggedInterval = {
  session: Session;
  startMs: number;
  endMs: number;
  sessionFirstDayKey: string;
  sessionLastDayKey: string;
};

function deduplicateUserSessions(sessions: Session[]): TaggedInterval[] {
  const candidates: TaggedInterval[] = [];
  for (const session of sessions) {
    const intervals = resolveSessionIntervals(session);
    if (intervals.length === 0) continue;
    const firstKey = formatLocalDateKey(intervals[0].startMs);
    const lastKey = formatLocalDateKey(intervals[intervals.length - 1].endMs - 1);
    for (const iv of intervals) {
      candidates.push({
        session,
        startMs: iv.startMs,
        endMs: iv.endMs,
        sessionFirstDayKey: firstKey,
        sessionLastDayKey: lastKey,
      });
    }
  }

  candidates.sort((a, b) => a.startMs - b.startMs || b.endMs - a.endMs);
  const result: TaggedInterval[] = [];
  let coveredUntil = 0;

  for (const item of candidates) {
    const effectiveStart = Math.max(item.startMs, coveredUntil);
    if (item.endMs > effectiveStart) {
      result.push({
        session: item.session,
        startMs: effectiveStart,
        endMs: item.endMs,
        sessionFirstDayKey: item.sessionFirstDayKey,
        sessionLastDayKey: item.sessionLastDayKey,
      });
      coveredUntil = item.endMs;
    }
  }
  return result;
}

export function computePeriodicStats(
  sessions: Session[],
  selectedSubjectId: string | null = null,
  nowMs: number = Date.now()
): PeriodicStatsSummary {
  const keys = getPeriodKeys(nowMs);
  const todayStart = startOfLocalDayMs(nowMs);
  const tomorrowStart = startOfNextLocalDayMs(nowMs);
  const yesterdayStart = addLocalDaysMs(todayStart, -1);
  const weekStart = startOfLocalWeekMondayMs(nowMs);
  const nextWeekStart = addLocalDaysMs(weekStart, 7);
  const monthStart = startOfLocalMonthMs(nowMs);
  const nextMonthStart = new Date(new Date(nowMs).getFullYear(), new Date(nowMs).getMonth() + 1, 1, 0, 0, 0, 0).getTime();

  const deduped = deduplicateUserSessions(sessions);

  let todayMs = 0;
  let yesterdayMs = 0;
  let weekMs = 0;
  let monthMs = 0;
  let allTimeMs = 0;

  const todaySessionIds = new Set<string>();
  const yesterdaySessionIds = new Set<string>();
  const weekSessionIds = new Set<string>();
  const monthSessionIds = new Set<string>();
  const allTimeSessionIds = new Set<string>();
  const subjectTodayMsMap = new Map<string, number>();

  for (const item of deduped) {
    const { startMs, endMs, session } = item;
    allTimeMs += endMs - startMs;
    if (session.id) allTimeSessionIds.add(session.id);

    const todayOverlap = Math.max(0, Math.min(endMs, tomorrowStart) - Math.max(startMs, todayStart));
    if (todayOverlap > 0) {
      todayMs += todayOverlap;
      if (session.id) todaySessionIds.add(session.id);
      if (session.subjectId) {
        subjectTodayMsMap.set(session.subjectId, (subjectTodayMsMap.get(session.subjectId) ?? 0) + todayOverlap);
      }
    }

    const yestOverlap = Math.max(0, Math.min(endMs, todayStart) - Math.max(startMs, yesterdayStart));
    if (yestOverlap > 0) {
      yesterdayMs += yestOverlap;
      if (session.id) yesterdaySessionIds.add(session.id);
    }

    const weekOverlap = Math.max(0, Math.min(endMs, nextWeekStart) - Math.max(startMs, weekStart));
    if (weekOverlap > 0) {
      weekMs += weekOverlap;
      if (session.id) weekSessionIds.add(session.id);
    }

    const monthOverlap = Math.max(0, Math.min(endMs, nextMonthStart) - Math.max(startMs, monthStart));
    if (monthOverlap > 0) {
      monthMs += monthOverlap;
      if (session.id) monthSessionIds.add(session.id);
    }
  }

  const todaySubjectBreakdown: Record<string, number> = {};
  for (const [subId, ms] of subjectTodayMsMap.entries()) {
    const secs = Math.round(ms / 1000);
    if (secs > 0) todaySubjectBreakdown[subId] = secs;
  }

  return {
    periodKeys: keys,
    today: { seconds: Math.round(todayMs / 1000), sessions: todaySessionIds.size },
    yesterday: { seconds: Math.round(yesterdayMs / 1000), sessions: yesterdaySessionIds.size },
    weekly: { seconds: Math.round(weekMs / 1000), sessions: weekSessionIds.size },
    monthly: { seconds: Math.round(monthMs / 1000), sessions: monthSessionIds.size },
    allTime: { seconds: Math.round(allTimeMs / 1000), sessions: allTimeSessionIds.size || sessions.filter(s => s.duration > 0).length },
    currentSubjectTodaySeconds: selectedSubjectId ? (todaySubjectBreakdown[selectedSubjectId] ?? 0) : 0,
    todaySubjectBreakdown,
  };
}

export function computeRunningTimerTodaySeconds(
  params: {
    status?: string;
    startedAtMs: number;
    currentSegmentStartMs?: number;
    sessionStartTimeMs: number;
    accumulatedTimeSec: number;
    completedSegments?: StudySegment[];
  },
  nowMs: number = Date.now()
): number {
  const { status, startedAtMs, currentSegmentStartMs, sessionStartTimeMs, accumulatedTimeSec, completedSegments } = params;
  if (status !== 'running' && status !== 'paused') return 0;

  const todayStart = startOfLocalDayMs(nowMs);
  const tomorrowStart = startOfNextLocalDayMs(nowMs);
  let totalMs = 0;

  if (Array.isArray(completedSegments) && completedSegments.length > 0) {
    for (const seg of completedSegments) {
      const s = parseIsoMs(seg.startTime);
      const e = parseIsoMs(seg.endTime);
      if (s > 0 && e > s) {
        totalMs += Math.max(0, Math.min(e, tomorrowStart) - Math.max(s, todayStart));
      }
    }
    if (status === 'running') {
      const segStart = currentSegmentStartMs && currentSegmentStartMs > 0 ? currentSegmentStartMs : startedAtMs;
      if (segStart > 0 && nowMs > segStart) {
        totalMs += Math.max(0, Math.min(nowMs, tomorrowStart) - Math.max(segStart, todayStart));
      }
    }
    return Math.round(totalMs / 1000);
  }

  // Fallback for active states without segment arrays
  if (sessionStartTimeMs >= todayStart && accumulatedTimeSec > 0) {
    totalMs += accumulatedTimeSec * 1000;
  }
  if (status === 'running' && startedAtMs > 0 && nowMs > startedAtMs) {
    totalMs += Math.max(0, Math.min(nowMs, tomorrowStart) - Math.max(startedAtMs, todayStart));
  }
  return Math.round(totalMs / 1000);
}

export function sliceSessionsByDate(
  sessions: Session[],
  lookbackDays: number,
  nowMs: number = Date.now()
): { dateKey: string; seconds: number }[] {
  const todayStart = startOfLocalDayMs(nowMs);
  const startDay = addLocalDaysMs(todayStart, -(lookbackDays - 1));
  const dayMsMap = new Map<string, number>();

  for (let i = 0; i < lookbackDays; i++) {
    const dk = formatLocalDateKey(addLocalDaysMs(startDay, i));
    dayMsMap.set(dk, 0);
  }

  const deduped = deduplicateUserSessions(sessions);
  for (const item of deduped) {
    const daySlices = splitIntervalByLocalDays(item.startMs, item.endMs);
    for (const slice of daySlices) {
      if (dayMsMap.has(slice.dateKey)) {
        dayMsMap.set(slice.dateKey, (dayMsMap.get(slice.dateKey) ?? 0) + slice.durationMs);
      }
    }
  }

  return Array.from(dayMsMap.entries()).map(([dateKey, ms]) => ({
    dateKey,
    seconds: Math.round(ms / 1000),
  }));
}

export function computeStudyStatistics(
  sessions: Session[],
  subjects: Subject[],
  dailyTargetHours: number = 2,
  nowMs: number = Date.now()
): StudyStatistics {
  const keys = getPeriodKeys(nowMs);
  const periodic = computePeriodicStats(sessions, null, nowMs);

  const todayStart = startOfLocalDayMs(nowMs);
  const last7Start = addLocalDaysMs(todayStart, -6);
  const prev7Start = addLocalDaysMs(todayStart, -13);
  const last30Start = addLocalDaysMs(todayStart, -29);
  const last84Start = addLocalDaysMs(todayStart, -83);
  const tomorrowStart = startOfNextLocalDayMs(nowMs);

  const deduped = deduplicateUserSessions(sessions);

  const dayTotalMs = new Map<string, number>();
  const weekTotalMs = new Map<string, number>();
  const hourTotalMs = new Array<number>(24).fill(0);
  const dowTotalMs = new Array<number>(7).fill(0);
  const subjectTotalMs = new Map<string, number>();
  const subjectSessionIds = new Map<string, Set<string>>();
  const subjectWeekDays = new Map<string, Set<string>>();
  const subjectLastActiveMs = new Map<string, number>();
  const calendarByDate: Record<string, { totalMs: number; sessionIds: Set<string>; slicesBySession: Map<string, CalendarSessionSlice> }> = {};

  let last7Ms = 0;
  let prev7Ms = 0;
  let last30Ms = 0;
  const activeDaysLast7 = new Set<string>();
  const activeDaysLast30 = new Set<string>();

  for (const item of deduped) {
    const { session, startMs, endMs, sessionFirstDayKey, sessionLastDayKey } = item;
    const isCrossMidnight = sessionFirstDayKey !== sessionLastDayKey;

    if (session.subjectId) {
      subjectTotalMs.set(session.subjectId, (subjectTotalMs.get(session.subjectId) ?? 0) + (endMs - startMs));
      if (!subjectSessionIds.has(session.subjectId)) subjectSessionIds.set(session.subjectId, new Set());
      if (session.id) subjectSessionIds.get(session.subjectId)!.add(session.id);
      const prevMax = subjectLastActiveMs.get(session.subjectId) ?? 0;
      if (endMs > prevMax) subjectLastActiveMs.set(session.subjectId, endMs);
    }

    const daySlices = splitIntervalByLocalDays(startMs, endMs);
    for (const dSlice of daySlices) {
      const { dateKey, startMs: sMs, endMs: eMs, durationMs } = dSlice;
      dayTotalMs.set(dateKey, (dayTotalMs.get(dateKey) ?? 0) + durationMs);

      const wkKey = formatLocalDateKey(startOfLocalWeekMondayMs(sMs));
      weekTotalMs.set(wkKey, (weekTotalMs.get(wkKey) ?? 0) + durationMs);

      const dow = new Date(sMs).getDay();
      dowTotalMs[dow] += durationMs;

      if (sMs >= last7Start && sMs < tomorrowStart) {
        last7Ms += durationMs;
        activeDaysLast7.add(dateKey);
        if (session.subjectId) {
          if (!subjectWeekDays.has(session.subjectId)) subjectWeekDays.set(session.subjectId, new Set());
          subjectWeekDays.get(session.subjectId)!.add(dateKey);
        }
      } else if (sMs >= prev7Start && sMs < last7Start) {
        prev7Ms += durationMs;
      }

      if (sMs >= last30Start && sMs < tomorrowStart) {
        last30Ms += durationMs;
        activeDaysLast30.add(dateKey);
      }

      if (!calendarByDate[dateKey]) {
        calendarByDate[dateKey] = { totalMs: 0, sessionIds: new Set(), slicesBySession: new Map() };
      }
      const cal = calendarByDate[dateKey];
      cal.totalMs += durationMs;
      const sessKey = session.id || `${session.startTime}_${session.subjectId}`;
      cal.sessionIds.add(sessKey);
      const existingSlice = cal.slicesBySession.get(sessKey);
      if (existingSlice) {
        existingSlice.sliceStartMs = Math.min(existingSlice.sliceStartMs, sMs);
        existingSlice.sliceEndMs = Math.max(existingSlice.sliceEndMs, eMs);
        existingSlice.sliceSeconds += Math.round(durationMs / 1000);
      } else {
        cal.slicesBySession.set(sessKey, {
          session,
          dateKey,
          sliceStartMs: sMs,
          sliceEndMs: eMs,
          sliceSeconds: Math.round(durationMs / 1000),
          isCrossMidnight,
          continuesFromPrevDay: dateKey !== sessionFirstDayKey,
          continuesIntoNextDay: dateKey !== sessionLastDayKey,
        });
      }
    }

    const hourSlices = splitIntervalByLocalHours(startMs, endMs);
    for (const hSlice of hourSlices) {
      hourTotalMs[hSlice.hour] += hSlice.durationMs;
    }
  }

  const finalCalendarByDate: Record<string, DayCalendarRecord> = {};
  for (const [dateKey, entry] of Object.entries(calendarByDate)) {
    const slices = Array.from(entry.slicesBySession.values()).sort((a, b) => b.sliceStartMs - a.sliceStartMs);
    finalCalendarByDate[dateKey] = {
      dateKey,
      totalSeconds: Math.round(entry.totalMs / 1000),
      sessionCount: entry.sessionIds.size,
      slices,
    };
  }

  const timeLast7 = Math.round(last7Ms / 1000);
  const timePrev7 = Math.round(prev7Ms / 1000);
  const timeLast30 = Math.round(last30Ms / 1000);
  const momentum = timePrev7 > 0 ? ((timeLast7 - timePrev7) / timePrev7) * 100 : 0;
  const dailyComparisonPct = periodic.yesterday.seconds > 0
    ? ((periodic.today.seconds - periodic.yesterday.seconds) / periodic.yesterday.seconds) * 100
    : (periodic.today.seconds > 0 ? 100 : 0);

  const avgTimePerWeek = activeDaysLast7.size > 0 ? timeLast7 / activeDaysLast7.size : 0;
  const avgTimePerMonth = activeDaysLast30.size > 0 ? timeLast30 / activeDaysLast30.size : 0;

  const validSessions = sessions.filter((s) => (s.duration || 0) > 0);
  const totalSessions = validSessions.length;
  const avgSessionDuration = totalSessions > 0 ? periodic.allTime.seconds / totalSessions : 0;
  const longestSession = totalSessions > 0 ? Math.max(...validSessions.map((s) => s.duration || 0)) : 0;

  let bestDay: { dateKey: string; seconds: number } | null = null;
  for (const [dk, ms] of dayTotalMs.entries()) {
    const secs = Math.round(ms / 1000);
    if (!bestDay || secs > bestDay.seconds) bestDay = { dateKey: dk, seconds: secs };
  }

  let bestWeek: { weekKey: string; seconds: number } | null = null;
  for (const [wk, ms] of weekTotalMs.entries()) {
    const secs = Math.round(ms / 1000);
    if (!bestWeek || secs > bestWeek.seconds) bestWeek = { weekKey: wk, seconds: secs };
  }

  // Streaks calculated from consecutive local days where study duration >= goal (or > 0 fallback when target is 0)
  const goalTargetSeconds = Math.max(0, Math.round(dailyTargetHours * 3600));
  const qualifiesForStreak = (dk: string) => {
    const sec = Math.round((dayTotalMs.get(dk) ?? 0) / 1000);
    return goalTargetSeconds > 0 ? sec >= goalTargetSeconds : sec > 0;
  };

  let currentStreak = 0;
  if (qualifiesForStreak(keys.todayDateKey)) {
    currentStreak = 1;
    let cursor = addLocalDaysMs(todayStart, -1);
    while (qualifiesForStreak(formatLocalDateKey(cursor))) {
      currentStreak++;
      cursor = addLocalDaysMs(cursor, -1);
    }
  } else {
    let cursor = addLocalDaysMs(todayStart, -1);
    while (qualifiesForStreak(formatLocalDateKey(cursor))) {
      currentStreak++;
      cursor = addLocalDaysMs(cursor, -1);
    }
  }

  const qualifiedDaysSorted = Array.from(dayTotalMs.keys())
    .filter(qualifiesForStreak)
    .sort();
  let bestStreak = currentStreak;
  let runStreak = 0;
  let prevDayStart = 0;
  for (const dk of qualifiedDaysSorted) {
    const [y, m, d] = dk.split('-').map(Number);
    const dayMs = new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
    if (prevDayStart > 0 && dayMs === addLocalDaysMs(prevDayStart, 1)) {
      runStreak++;
    } else {
      runStreak = 1;
    }
    if (runStreak > bestStreak) bestStreak = runStreak;
    prevDayStart = dayMs;
  }

  const activeSubjects = subjects.filter((s) => !s.archived);
  const subjectDistribution = activeSubjects
    .map((sub) => {
      const totalSec = Math.round((subjectTotalMs.get(sub.id) ?? 0) / 1000);
      const todaySec = periodic.todaySubjectBreakdown[sub.id] ?? 0;
      const uniqueDays = subjectWeekDays.get(sub.id)?.size ?? 0;
      const consistency = (uniqueDays / 7) * 100;
      const sessionCount = subjectSessionIds.get(sub.id)?.size ?? 0;
      return {
        id: sub.id,
        name: sub.name,
        color: sub.color,
        totalTime: totalSec,
        todayTime: todaySec,
        consistency,
        sessionCount,
      };
    })
    .sort((a, b) => b.totalTime - a.totalTime);

  const threeDaysAgoMs = nowMs - 3 * 86_400_000;
  const neglected = activeSubjects
    .filter((sub) => (subjectLastActiveMs.get(sub.id) ?? 0) < threeDaysAgoMs)
    .map((sub) => sub.name);

  const hourHeatmap = hourTotalMs.map((ms, i) => ({
    hour: i,
    label: HOUR_LABELS[i],
    total: Math.round(ms / 1000),
  }));
  const bestHour = hourHeatmap.reduce((prev, cur) => (cur.total > prev.total ? cur : prev), hourHeatmap[0]);

  const lateNightSec = [22, 23, 0, 1, 2, 3, 4].reduce((s, h) => s + hourHeatmap[h].total, 0);
  const earlyMorningSec = [5, 6, 7, 8, 9].reduce((s, h) => s + hourHeatmap[h].total, 0);
  let rhythm = 'Balanced Learner';
  if (lateNightSec > earlyMorningSec && lateNightSec >= 3600) rhythm = 'Night Owl';
  else if (earlyMorningSec > lateNightSec && earlyMorningSec >= 3600) rhythm = 'Early Focus';

  const dayOfWeekStats = WEEKDAY_LABELS.map((day, idx) => ({
    day,
    total: Math.round(dowTotalMs[idx] / 1000),
  }));

  const last7Days = Array.from({ length: 7 }).map((_, idx) => {
    const dayMs = addLocalDaysMs(last7Start, idx);
    const d = new Date(dayMs);
    const dk = formatLocalDateKey(dayMs);
    return {
      dateKey: dk,
      name: SHORT_DAY_NAMES[d.getDay()],
      fullDate: `${SHORT_MONTH_NAMES[d.getMonth()]} ${d.getDate()}`,
      isToday: idx === 6,
      seconds: Math.round((dayTotalMs.get(dk) ?? 0) / 1000),
    };
  });

  const heatLevel = (sec: number) =>
    sec <= 0 ? 0 : sec < 3600 ? 1 : sec < 7200 ? 2 : sec < 14400 ? 3 : 4;

  const heatmap30Days = Array.from({ length: 30 }).map((_, idx) => {
    const dayMs = addLocalDaysMs(last30Start, idx);
    const dk = formatLocalDateKey(dayMs);
    const sec = Math.round((dayTotalMs.get(dk) ?? 0) / 1000);
    return { dateKey: dk, seconds: sec, level: heatLevel(sec) };
  });

  const heatmap84Days = Array.from({ length: 84 }).map((_, idx) => {
    const dayMs = addLocalDaysMs(last84Start, idx);
    const dk = formatLocalDateKey(dayMs);
    const sec = Math.round((dayTotalMs.get(dk) ?? 0) / 1000);
    return { dateKey: dk, seconds: sec, level: heatLevel(sec) };
  });

  const insights: string[] = [];
  if (momentum > 10) insights.push('Your momentum is surging this week. Capitalize on this energy.');
  if (neglected.length > 0) insights.push(`Focus on ${neglected[0]} to maintain subject balance.`);
  if (avgSessionDuration > 2400) insights.push('You excel in deep focus. Long sessions are your strength.');
  else insights.push('You perform best with short, intense focus sprints.');
  if (bestHour.total > 0) insights.push(`Your biological prime time appears to be around ${bestHour.label}.`);

  const goalProgressPct = goalTargetSeconds > 0
    ? Math.min(100, (periodic.today.seconds / goalTargetSeconds) * 100)
    : 0;

  return {
    periodKeys: keys,
    core: {
      timeToday: periodic.today.seconds,
      timeYesterday: periodic.yesterday.seconds,
      dailyComparisonPct,
      timeThisWeek: timeLast7,
      timePrevWeek: timePrev7,
      timeThisMonth: periodic.monthly.seconds,
      timeAllTime: periodic.allTime.seconds,
      totalSessions,
      avgSessionDuration,
      longestSession,
      momentum,
      avgTimePerWeek,
      avgTimePerMonth,
      goalTargetSeconds,
      goalProgressPct,
      currentStreak,
      bestStreak,
      bestDay,
      bestWeek,
    },
    subjects: {
      distribution: subjectDistribution,
      todayBreakdown: periodic.todaySubjectBreakdown,
      neglected,
    },
    behavior: {
      hourHeatmap,
      bestHour,
      dayOfWeekStats,
      rhythm,
    },
    trends: {
      last7Days,
      heatmap30Days,
      heatmap84Days,
    },
    calendarByDate: finalCalendarByDate,
    insights: insights.slice(0, 3),
  };
}

export function getEffectiveMemberTodaySeconds(
  member: {
    todaySeconds?: number;
    todayStatsDate?: string;
    timerStatus?: string;
    startedAt?: string | null;
    clientStartedAtMs?: number | null;
  },
  nowMs: number = Date.now()
): number {
  const keys = getPeriodKeys(nowMs);
  const base = member.todayStatsDate === keys.todayDateKey || !member.todayStatsDate
    ? (member.todaySeconds || 0)
    : 0;

  if (member.timerStatus === 'running') {
    const startMs = parseIsoMs(member.startedAt) || member.clientStartedAtMs || 0;
    if (startMs > 0 && nowMs > startMs) {
      const todayStart = startOfLocalDayMs(nowMs);
      const tomorrowStart = startOfNextLocalDayMs(nowMs);
      const liveDelta = Math.max(0, Math.min(nowMs, tomorrowStart) - Math.max(startMs, todayStart));
      return base + Math.round(liveDelta / 1000);
    }
  }
  return base;
}

export function getEffectiveMemberPeriodStats(
  member: {
    todaySeconds?: number;
    todaySessions?: number;
    todayStatsDate?: string;
    weeklySeconds?: number;
    weeklySessions?: number;
    weeklyStatsKey?: string;
    monthlySeconds?: number;
    monthlySessions?: number;
    monthlyStatsKey?: string;
    timerStatus?: string;
    startedAt?: string | null;
    clientStartedAtMs?: number | null;
  },
  period: 'today' | 'weekly' | 'monthly',
  nowMs: number = Date.now()
): { seconds: number; sessions: number } {
  const keys = getPeriodKeys(nowMs);
  const isRunning = member.timerStatus === 'running';
  const startMs = parseIsoMs(member.startedAt) || member.clientStartedAtMs || 0;

  const liveDeltaSince = (windowStartMs: number) => {
    if (!isRunning || startMs <= 0 || nowMs <= startMs) return 0;
    return Math.round(Math.max(0, nowMs - Math.max(startMs, windowStartMs)) / 1000);
  };

  if (period === 'today') {
    const fresh = !member.todayStatsDate || member.todayStatsDate === keys.todayDateKey;
    const baseSec = fresh ? (member.todaySeconds || 0) : 0;
    const baseSess = fresh ? (member.todaySessions || 0) : 0;
    return {
      seconds: baseSec + liveDeltaSince(startOfLocalDayMs(nowMs)),
      sessions: baseSess,
    };
  }
  if (period === 'weekly') {
    const fresh = !member.weeklyStatsKey || member.weeklyStatsKey === keys.weekKey;
    const baseSec = fresh ? (member.weeklySeconds || 0) : 0;
    const baseSess = fresh ? (member.weeklySessions || 0) : 0;
    return {
      seconds: baseSec + liveDeltaSince(startOfLocalWeekMondayMs(nowMs)),
      sessions: baseSess,
    };
  }
  const fresh = !member.monthlyStatsKey || member.monthlyStatsKey === keys.monthKey;
  const baseSec = fresh ? (member.monthlySeconds || 0) : 0;
  const baseSess = fresh ? (member.monthlySessions || 0) : 0;
  return {
    seconds: baseSec + liveDeltaSince(startOfLocalMonthMs(nowMs)),
    sessions: baseSess,
  };
}
