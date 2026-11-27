import type {
  DayMetaRecord,
  DdayItem,
  Session,
  StudySegment,
  StudyTodo,
  Subject,
} from './definitions';

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
  firstStartMs: number;
  lastEndMs: number;
  breakSeconds: number;
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

export type FocusHistogramBucket = {
  label: string;
  minMinutes: number;
  maxMinutes: number | null;
  count: number;
  totalSeconds: number;
  sharePct: number;
};

export type StackedSubjectPoint = {
  key: string;
  label: string;
  totalSeconds: number;
  segments: {
    subjectId: string;
    name: string;
    color: string;
    seconds: number;
  }[];
};

export type WeekdayProfileItem = {
  dayIndex: number; // 0=Mon .. 6=Sun
  day: string;
  avgSeconds: number;
  totalSeconds: number;
  activeDays: number;
  avgStartMinute: number | null;
  avgFinishMinute: number | null;
};

export type ThresholdShareItem = {
  hours: number;
  label: string;
  dayCount: number;
  shareOf120Pct: number;
  shareOfStudiedPct: number;
};

export type BigDayTraitItem = {
  key: string;
  label: string;
  bigDayPct: number;
  otherDayPct: number;
  bigDayCount: number;
};

export type BreakTagSummary = {
  tag: string;
  seconds: number;
  count: number;
};

export type StudyStatisticsOptions = {
  dayMeta?: Record<string, DayMetaRecord>;
  todos?: StudyTodo[];
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
    timePrevMonth: number;
    timeAllTime: number;
    totalSessions: number;
    avgSessionDuration: number;
    longestSession: number;
    maxContinuousSeconds: number;
    avgContinuousSeconds: number;
    momentum: number;
    avgTimePerWeek: number;
    avgTimePerMonth: number;
    avgExclDayOffSeconds: number;
    avgInclDayOffSeconds: number;
    avgPerStudiedDaySeconds: number;
    studiedDays30d: number;
    dayOffCount30d: number;
    attendanceRate30d: number;
    goalTargetSeconds: number;
    goalProgressPct: number;
    currentStreak: number;
    bestStreak: number;
    bestDay: { dateKey: string; seconds: number } | null;
    bestWeek: { weekKey: string; seconds: number } | null;
  };
  schedule: {
    todayFirstStartMs: number | null;
    todayLastEndMs: number | null;
    avgStartMinuteOfDay: number | null;
    avgFinishMinuteOfDay: number | null;
    startFinishSeries30d: {
      dateKey: string;
      startMinute: number;
      endMinute: number;
      focusSeconds: number;
    }[];
    weekdayProfile: WeekdayProfileItem[];
    habitHourBand: boolean[];
  };
  breaks: {
    todayBreakSeconds: number;
    totalBreakSeconds30d: number;
    avgBreakPerStudiedDaySeconds: number;
    focusEfficiencyPct: number;
    byTag: BreakTagSummary[];
  };
  focusHistogram: FocusHistogramBucket[];
  periodComparison: {
    cumulativeTodayByHour: number[];
    cumulativeYesterdayByHour: number[];
    weekBarsMonSun: { label: string; thisWeekSec: number; lastWeekSec: number }[];
    thisMonthSec: number;
    lastMonthSec: number;
    monthDeltaPct: number;
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
    stackedDaily14: StackedSubjectPoint[];
    stackedMonthly6: StackedSubjectPoint[];
  };
  behavior: {
    hourHeatmap: { hour: number; label: string; total: number; activeDayPct: number }[];
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
    heatmap30Days: { dateKey: string; seconds: number; level: number; isDayOff: boolean }[];
    heatmap84Days: { dateKey: string; seconds: number; level: number; isDayOff: boolean }[];
    quarterly120Days: { dateKey: string; seconds: number; level: number; isDayOff: boolean }[];
    thresholdRates120d: ThresholdShareItem[];
    bigDayTraits: BigDayTraitItem[];
  };
  todos: {
    todayCompleted: number;
    todayTotal: number;
    todayAchievementPct: number;
    completed7d: number;
    total7d: number;
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
const MON_SUN_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
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

export function formatMinuteOfDay(minuteOfDay: number | null): string {
  if (minuteOfDay === null || !Number.isFinite(minuteOfDay)) return '—';
  const clamped = Math.max(0, Math.min(1440, Math.round(minuteOfDay)));
  if (clamped === 1440) return '24:00';
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatDdayBadge(targetDateKey: string, todayDateKey: string = formatLocalDateKey(Date.now())): {
  daysRemaining: number;
  label: string;
} {
  const [ty, tm, td] = targetDateKey.split('-').map(Number);
  const [ny, nm, nd] = todayDateKey.split('-').map(Number);
  if (!ty || !ny) return { daysRemaining: 0, label: 'D-DAY' };
  const targetUtc = Date.UTC(ty, tm - 1, td);
  const todayUtc = Date.UTC(ny, nm - 1, nd);
  const diffDays = Math.round((targetUtc - todayUtc) / 86_400_000);
  if (diffDays === 0) return { daysRemaining: 0, label: 'D-DAY' };
  if (diffDays > 0) return { daysRemaining: diffDays, label: `D-${diffDays}` };
  return { daysRemaining: diffDays, label: `D+${Math.abs(diffDays)}` };
}

export function pickMainDday(ddays: DdayItem[] | undefined, mainDdayId?: string | null): DdayItem | null {
  if (!ddays || ddays.length === 0) return null;
  if (mainDdayId) {
    const found = ddays.find((d) => d.id === mainDdayId);
    if (found) return found;
  }
  const todayKey = formatLocalDateKey(Date.now());
  const upcoming = ddays
    .filter((d) => d.targetDate >= todayKey)
    .sort((a, b) => a.targetDate.localeCompare(b.targetDate));
  return upcoming[0] ?? ddays[0];
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
    allTime: { seconds: Math.round(allTimeMs / 1000), sessions: allTimeSessionIds.size || sessions.filter((s) => s.duration > 0).length },
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
    dayMsMap.set(formatLocalDateKey(addLocalDaysMs(startDay, i)), 0);
  }

  const deduped = deduplicateUserSessions(sessions);
  for (const item of deduped) {
    for (const slice of splitIntervalByLocalDays(item.startMs, item.endMs)) {
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

function minuteOfDayInDate(ms: number, dateKey: string): number {
  const dayMidnight = (() => {
    const [y, m, d] = dateKey.split('-').map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
  })();
  const diffMin = Math.round((ms - dayMidnight) / 60_000);
  return Math.max(0, Math.min(1440, diffMin));
}

export function computeStudyStatistics(
  sessions: Session[],
  subjects: Subject[],
  dailyTargetHours: number = 2,
  nowMs: number = Date.now(),
  options?: StudyStatisticsOptions
): StudyStatistics {
  const keys = getPeriodKeys(nowMs);
  const periodic = computePeriodicStats(sessions, null, nowMs);
  const dayMeta = options?.dayMeta ?? {};
  const todos = options?.todos ?? [];

  const todayStart = startOfLocalDayMs(nowMs);
  const tomorrowStart = startOfNextLocalDayMs(nowMs);
  const yesterdayStart = addLocalDaysMs(todayStart, -1);
  const thisWeekMon = startOfLocalWeekMondayMs(nowMs);
  const prevWeekMon = addLocalDaysMs(thisWeekMon, -7);
  const nowDate = new Date(nowMs);
  const prevMonthStart = new Date(nowDate.getFullYear(), nowDate.getMonth() - 1, 1, 0, 0, 0, 0).getTime();
  const thisMonthStart = startOfLocalMonthMs(nowMs);

  const last7Start = addLocalDaysMs(todayStart, -6);
  const prev7Start = addLocalDaysMs(todayStart, -13);
  const last14Start = addLocalDaysMs(todayStart, -13);
  const last30Start = addLocalDaysMs(todayStart, -29);
  const last84Start = addLocalDaysMs(todayStart, -83);
  const last120Start = addLocalDaysMs(todayStart, -119);

  const deduped = deduplicateUserSessions(sessions);

  const dayTotalMs = new Map<string, number>();
  const weekTotalMs = new Map<string, number>();
  const daySubjectMs = new Map<string, Map<string, number>>();
  const monthSubjectMs = new Map<string, Map<string, number>>();
  const daySlicesRaw = new Map<string, { startMs: number; endMs: number }[]>();
  const dayMaxBlockSec = new Map<string, number>();
  const dayHoursVisited = new Map<string, Set<number>>();
  const dayTotalByHourMs = new Map<string, number[]>();

  const hourTotalMs = new Array<number>(24).fill(0);
  const dowTotalMs = new Array<number>(7).fill(0);
  const subjectTotalMs = new Map<string, number>();
  const subjectSessionIds = new Map<string, Set<string>>();
  const subjectWeekDays = new Map<string, Set<string>>();
  const subjectLastActiveMs = new Map<string, number>();
  const calendarByDate: Record<string, {
    totalMs: number;
    firstStartMs: number;
    lastEndMs: number;
    sessionIds: Set<string>;
    slicesBySession: Map<string, CalendarSessionSlice>;
  }> = {};

  let last7Ms = 0;
  let prev7Ms = 0;
  let last30Ms = 0;
  let prevMonthMs = 0;
  const activeDaysLast7 = new Set<string>();
  const activeDaysLast30 = new Set<string>();
  const thisWeekMonSunMs = new Array<number>(7).fill(0);
  const prevWeekMonSunMs = new Array<number>(7).fill(0);

  // Merge consecutive deduped intervals separated by <= 15s for continuous focus block metrics
  const continuousBlocks: { startMs: number; endMs: number }[] = [];
  for (const item of deduped) {
    const prev = continuousBlocks[continuousBlocks.length - 1];
    if (prev && item.startMs - prev.endMs <= 15_000) {
      prev.endMs = Math.max(prev.endMs, item.endMs);
    } else {
      continuousBlocks.push({ startMs: item.startMs, endMs: item.endMs });
    }
  }

  for (const blk of continuousBlocks) {
    const blkSec = Math.round((blk.endMs - blk.startMs) / 1000);
    for (const dSlice of splitIntervalByLocalDays(blk.startMs, blk.endMs)) {
      const prevMax = dayMaxBlockSec.get(dSlice.dateKey) ?? 0;
      if (blkSec > prevMax) dayMaxBlockSec.set(dSlice.dateKey, blkSec);
    }
  }

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

    if (startMs < thisMonthStart && endMs > prevMonthStart) {
      prevMonthMs += Math.max(0, Math.min(endMs, thisMonthStart) - Math.max(startMs, prevMonthStart));
    }

    const daySlices = splitIntervalByLocalDays(startMs, endMs);
    for (const dSlice of daySlices) {
      const { dateKey, startMs: sMs, endMs: eMs, durationMs } = dSlice;
      dayTotalMs.set(dateKey, (dayTotalMs.get(dateKey) ?? 0) + durationMs);

      const listRaw = daySlicesRaw.get(dateKey) ?? [];
      listRaw.push({ startMs: sMs, endMs: eMs });
      daySlicesRaw.set(dateKey, listRaw);

      if (session.subjectId) {
        if (!daySubjectMs.has(dateKey)) daySubjectMs.set(dateKey, new Map());
        const dSub = daySubjectMs.get(dateKey)!;
        dSub.set(session.subjectId, (dSub.get(session.subjectId) ?? 0) + durationMs);

        const mKey = dateKey.slice(0, 7);
        if (!monthSubjectMs.has(mKey)) monthSubjectMs.set(mKey, new Map());
        const mSub = monthSubjectMs.get(mKey)!;
        mSub.set(session.subjectId, (mSub.get(session.subjectId) ?? 0) + durationMs);
      }

      const wkKey = formatLocalDateKey(startOfLocalWeekMondayMs(sMs));
      weekTotalMs.set(wkKey, (weekTotalMs.get(wkKey) ?? 0) + durationMs);

      const dObj = new Date(sMs);
      const dow = dObj.getDay();
      dowTotalMs[dow] += durationMs;

      const monSunIdx = dow === 0 ? 6 : dow - 1;
      if (sMs >= thisWeekMon && sMs < addLocalDaysMs(thisWeekMon, 7)) {
        thisWeekMonSunMs[monSunIdx] += durationMs;
      } else if (sMs >= prevWeekMon && sMs < thisWeekMon) {
        prevWeekMonSunMs[monSunIdx] += durationMs;
      }

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
        calendarByDate[dateKey] = {
          totalMs: 0,
          firstStartMs: sMs,
          lastEndMs: eMs,
          sessionIds: new Set(),
          slicesBySession: new Map(),
        };
      }
      const cal = calendarByDate[dateKey];
      cal.totalMs += durationMs;
      if (sMs < cal.firstStartMs) cal.firstStartMs = sMs;
      if (eMs > cal.lastEndMs) cal.lastEndMs = eMs;
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

      for (const hSl of splitIntervalByLocalHours(sMs, eMs)) {
        hourTotalMs[hSl.hour] += hSl.durationMs;
        if (!dayHoursVisited.has(dateKey)) dayHoursVisited.set(dateKey, new Set());
        dayHoursVisited.get(dateKey)!.add(hSl.hour);
        if (!dayTotalByHourMs.has(dateKey)) dayTotalByHourMs.set(dateKey, new Array<number>(24).fill(0));
        dayTotalByHourMs.get(dateKey)![hSl.hour] += hSl.durationMs;
      }
    }
  }

  // Compute daily breaks (auto gaps <= 3h between study slices + explicit tagged BreakLogs)
  const dayBreakMs = new Map<string, number>();
  const tagAgg30d = new Map<string, { seconds: number; count: number }>();

  const allKnownDates = new Set<string>([
    ...daySlicesRaw.keys(),
    ...Object.keys(dayMeta),
  ]);

  for (const dateKey of allKnownDates) {
    const rawSlices = [...(daySlicesRaw.get(dateKey) ?? [])].sort((a, b) => a.startMs - b.startMs);
    const metaBreaks = dayMeta[dateKey]?.breaks ?? [];
    const inLast30 = dateKey >= formatLocalDateKey(last30Start) && dateKey <= keys.todayDateKey;
    let totalDayBreakMs = 0;

    for (const br of metaBreaks) {
      const sec = Math.max(0, br.durationSeconds || 0);
      if (sec <= 0) continue;
      totalDayBreakMs += sec * 1000;
      if (inLast30) {
        const tag = br.tag?.trim() || 'Rest';
        const cur = tagAgg30d.get(tag) ?? { seconds: 0, count: 0 };
        cur.seconds += sec;
        cur.count += 1;
        tagAgg30d.set(tag, cur);
      }
    }

    for (let i = 1; i < rawSlices.length; i++) {
      const gapStart = rawSlices[i - 1].endMs;
      const gapEnd = rawSlices[i].startMs;
      const gapMs = gapEnd - gapStart;
      if (gapMs > 15_000 && gapMs <= 3 * 3600_000) {
        // Avoid double-counting explicit tagged breaks overlapping this gap
        const coveredByMeta = metaBreaks.some((b) => {
          const bs = parseIsoMs(b.startTime);
          const be = parseIsoMs(b.endTime);
          return bs > 0 && be > bs && Math.min(be, gapEnd) > Math.max(bs, gapStart);
        });
        if (!coveredByMeta) {
          totalDayBreakMs += gapMs;
          if (inLast30) {
            const tag = gapMs <= 45 * 60_000 ? 'Session Pauses' : 'Between Sessions';
            const cur = tagAgg30d.get(tag) ?? { seconds: 0, count: 0 };
            cur.seconds += Math.round(gapMs / 1000);
            cur.count += 1;
            tagAgg30d.set(tag, cur);
          }
        }
      }
    }

    if (totalDayBreakMs > 0) {
      dayBreakMs.set(dateKey, totalDayBreakMs);
    }
  }

  const finalCalendarByDate: Record<string, DayCalendarRecord> = {};
  for (const [dateKey, entry] of Object.entries(calendarByDate)) {
    const slices = Array.from(entry.slicesBySession.values()).sort((a, b) => b.sliceStartMs - a.sliceStartMs);
    finalCalendarByDate[dateKey] = {
      dateKey,
      totalSeconds: Math.round(entry.totalMs / 1000),
      sessionCount: entry.sessionIds.size,
      firstStartMs: entry.firstStartMs,
      lastEndMs: entry.lastEndMs,
      breakSeconds: Math.round((dayBreakMs.get(dateKey) ?? 0) / 1000),
      slices,
    };
  }

  // 20-minute continuous focus histogram
  const bucketDefs: { label: string; minMinutes: number; maxMinutes: number | null }[] = [
    { label: '0–20m', minMinutes: 0, maxMinutes: 20 },
    { label: '20–40m', minMinutes: 20, maxMinutes: 40 },
    { label: '40–60m', minMinutes: 40, maxMinutes: 60 },
    { label: '60–80m', minMinutes: 60, maxMinutes: 80 },
    { label: '80–100m', minMinutes: 80, maxMinutes: 100 },
    { label: '100–120m', minMinutes: 100, maxMinutes: 120 },
    { label: '120m+', minMinutes: 120, maxMinutes: null },
  ];
  const bucketCounts = new Array<number>(7).fill(0);
  const bucketSec = new Array<number>(7).fill(0);
  let maxContinuousSeconds = 0;
  let totalContinuousSeconds = 0;
  for (const blk of continuousBlocks) {
    const sec = Math.max(0, Math.round((blk.endMs - blk.startMs) / 1000));
    if (sec <= 0) continue;
    totalContinuousSeconds += sec;
    if (sec > maxContinuousSeconds) maxContinuousSeconds = sec;
    const mins = sec / 60;
    const idx = Math.min(6, Math.floor(mins / 20));
    bucketCounts[idx] += 1;
    bucketSec[idx] += sec;
  }
  const totalBlockCount = continuousBlocks.length;
  const focusHistogram: FocusHistogramBucket[] = bucketDefs.map((def, i) => ({
    ...def,
    count: bucketCounts[i],
    totalSeconds: bucketSec[i],
    sharePct: totalBlockCount > 0 ? Math.round((bucketCounts[i] / totalBlockCount) * 100) : 0,
  }));
  const avgContinuousSeconds = totalBlockCount > 0 ? Math.round(totalContinuousSeconds / totalBlockCount) : 0;

  // Schedule: Start/finish stats, Weekday 30d profile, Hourly >50% habit band
  const startFinishSeries30d: StudyStatistics['schedule']['startFinishSeries30d'] = [];
  let sumStartMin30 = 0;
  let sumEndMin30 = 0;
  let countStartEnd30 = 0;
  let totalBreak30dSec = 0;
  const hourDayCounts30d = new Array<number>(24).fill(0);
  const weekdayAgg = Array.from({ length: 7 }, (_, i) => ({
    dayIndex: i,
    day: MON_SUN_LABELS[i],
    totalMs: 0,
    occurrences: 0,
    activeDays: 0,
    sumStartMin: 0,
    sumFinishMin: 0,
  }));

  let dayOffCount30d = 0;
  const dayOffDatesSet = new Set<string>();
  for (const [dk, m] of Object.entries(dayMeta)) {
    if (m?.isDayOff) dayOffDatesSet.add(dk);
  }

  for (let i = 0; i < 30; i++) {
    const dMs = addLocalDaysMs(last30Start, i);
    const dk = formatLocalDateKey(dMs);
    const dow = new Date(dMs).getDay();
    const monSunIdx = dow === 0 ? 6 : dow - 1;
    weekdayAgg[monSunIdx].occurrences += 1;

    const focusMs = dayTotalMs.get(dk) ?? 0;
    const focusSec = Math.round(focusMs / 1000);
    if (dayOffDatesSet.has(dk) && focusSec === 0) {
      dayOffCount30d += 1;
    }

    totalBreak30dSec += Math.round((dayBreakMs.get(dk) ?? 0) / 1000);
    if (focusMs > 0 && calendarByDate[dk]) {
      const startMin = minuteOfDayInDate(calendarByDate[dk].firstStartMs, dk);
      const endMin = minuteOfDayInDate(calendarByDate[dk].lastEndMs, dk);
      startFinishSeries30d.push({
        dateKey: dk,
        startMinute: startMin,
        endMinute: endMin,
        focusSeconds: focusSec,
      });
      sumStartMin30 += startMin;
      sumEndMin30 += endMin;
      countStartEnd30 += 1;

      weekdayAgg[monSunIdx].totalMs += focusMs;
      weekdayAgg[monSunIdx].activeDays += 1;
      weekdayAgg[monSunIdx].sumStartMin += startMin;
      weekdayAgg[monSunIdx].sumFinishMin += endMin;

      const hrs = dayHoursVisited.get(dk);
      if (hrs) {
        hrs.forEach((hr) => {
          hourDayCounts30d[hr] += 1;
        });
      }
    }
  }

  const studiedDays30d = activeDaysLast30.size;
  const nonDayOff30 = Math.max(1, 30 - dayOffCount30d);
  const timeLast30Sec = Math.round(last30Ms / 1000);
  const avgExclDayOffSeconds = Math.round(timeLast30Sec / nonDayOff30);
  const avgInclDayOffSeconds = Math.round(timeLast30Sec / 30);
  const avgPerStudiedDaySeconds = studiedDays30d > 0 ? Math.round(timeLast30Sec / studiedDays30d) : 0;
  const attendanceRate30d = Math.min(100, Math.round((studiedDays30d / nonDayOff30) * 100));

  const habitHourBand = hourDayCounts30d.map(
    (cnt) => studiedDays30d > 0 && cnt / studiedDays30d >= 0.5
  );

  const weekdayProfile: WeekdayProfileItem[] = weekdayAgg.map((w) => ({
    dayIndex: w.dayIndex,
    day: w.day,
    avgSeconds: w.occurrences > 0 ? Math.round(w.totalMs / 1000 / w.occurrences) : 0,
    totalSeconds: Math.round(w.totalMs / 1000),
    activeDays: w.activeDays,
    avgStartMinute: w.activeDays > 0 ? Math.round(w.sumStartMin / w.activeDays) : null,
    avgFinishMinute: w.activeDays > 0 ? Math.round(w.sumFinishMin / w.activeDays) : null,
  }));

  // Cumulative Today vs Yesterday by hour
  const todayHourlyArr = dayTotalByHourMs.get(keys.todayDateKey) ?? new Array<number>(24).fill(0);
  const yestHourlyArr = dayTotalByHourMs.get(keys.yesterdayDateKey) ?? new Array<number>(24).fill(0);
  const cumulativeTodayByHour: number[] = [];
  const cumulativeYesterdayByHour: number[] = [];
  let cumT = 0;
  let cumY = 0;
  for (let h = 0; h < 24; h++) {
    cumT += todayHourlyArr[h];
    cumY += yestHourlyArr[h];
    cumulativeTodayByHour.push(Math.round(cumT / 1000));
    cumulativeYesterdayByHour.push(Math.round(cumY / 1000));
  }

  const weekBarsMonSun = MON_SUN_LABELS.map((label, idx) => ({
    label,
    thisWeekSec: Math.round(thisWeekMonSunMs[idx] / 1000),
    lastWeekSec: Math.round(prevWeekMonSunMs[idx] / 1000),
  }));
  const thisMonthSec = periodic.monthly.seconds;
  const lastMonthSec = Math.round(prevMonthMs / 1000);
  const monthDeltaPct = lastMonthSec > 0
    ? ((thisMonthSec - lastMonthSec) / lastMonthSec) * 100
    : (thisMonthSec > 0 ? 100 : 0);

  // Stacked Subject Series (14d daily + 6m monthly)
  const activeSubjects = subjects.filter((s) => !s.archived);
  const subjectInfoMap = new Map<string, Subject>();
  for (const s of subjects) subjectInfoMap.set(s.id, s);

  const buildStackedSegments = (subMap: Map<string, number> | undefined) => {
    if (!subMap) return [];
    return Array.from(subMap.entries())
      .map(([subId, ms]) => {
        const sub = subjectInfoMap.get(subId);
        return {
          subjectId: subId,
          name: sub?.name ?? 'General Study',
          color: sub?.color ?? '#F36B32',
          seconds: Math.round(ms / 1000),
        };
      })
      .filter((x) => x.seconds > 0)
      .sort((a, b) => b.seconds - a.seconds);
  };

  const stackedDaily14: StackedSubjectPoint[] = Array.from({ length: 14 }).map((_, i) => {
    const dMs = addLocalDaysMs(last14Start, i);
    const dk = formatLocalDateKey(dMs);
    const dObj = new Date(dMs);
    const segments = buildStackedSegments(daySubjectMs.get(dk));
    return {
      key: dk,
      label: `${SHORT_MONTH_NAMES[dObj.getMonth()]} ${dObj.getDate()}`,
      totalSeconds: Math.round((dayTotalMs.get(dk) ?? 0) / 1000),
      segments,
    };
  });

  const stackedMonthly6: StackedSubjectPoint[] = Array.from({ length: 6 }).map((_, i) => {
    const offset = i - 5;
    const dObj = new Date(nowDate.getFullYear(), nowDate.getMonth() + offset, 1);
    const mk = `${dObj.getFullYear()}-${String(dObj.getMonth() + 1).padStart(2, '0')}`;
    const segments = buildStackedSegments(monthSubjectMs.get(mk));
    const totalSeconds = segments.reduce((sum, x) => sum + x.seconds, 0);
    return {
      key: mk,
      label: SHORT_MONTH_NAMES[dObj.getMonth()],
      totalSeconds,
      segments,
    };
  });

  const timeLast7 = Math.round(last7Ms / 1000);
  const timePrev7 = Math.round(prev7Ms / 1000);
  const momentum = timePrev7 > 0 ? ((timeLast7 - timePrev7) / timePrev7) * 100 : (timeLast7 > 0 ? 100 : 0);
  const dailyComparisonPct = periodic.yesterday.seconds > 0
    ? ((periodic.today.seconds - periodic.yesterday.seconds) / periodic.yesterday.seconds) * 100
    : (periodic.today.seconds > 0 ? 100 : 0);

  const avgTimePerWeek = activeDaysLast7.size > 0 ? timeLast7 / activeDaysLast7.size : 0;
  const avgTimePerMonth = studiedDays30d > 0 ? timeLast30Sec / studiedDays30d : 0;

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

  // Day-Off protected streaks
  const goalTargetSeconds = Math.max(0, Math.round(dailyTargetHours * 3600));
  const qualifiesForStreak = (dk: string) => {
    const sec = Math.round((dayTotalMs.get(dk) ?? 0) / 1000);
    return goalTargetSeconds > 0 ? sec >= goalTargetSeconds : sec > 0;
  };
  const isBridgeDayOff = (dk: string) => dayOffDatesSet.has(dk);

  let currentStreak = 0;
  let cursor = qualifiesForStreak(keys.todayDateKey) || isBridgeDayOff(keys.todayDateKey)
    ? todayStart
    : addLocalDaysMs(todayStart, -1);
  for (let steps = 0; steps < 3650; steps++) {
    const dk = formatLocalDateKey(cursor);
    if (qualifiesForStreak(dk)) {
      currentStreak++;
      cursor = addLocalDaysMs(cursor, -1);
    } else if (isBridgeDayOff(dk) && dk !== keys.todayDateKey) {
      cursor = addLocalDaysMs(cursor, -1);
    } else if (isBridgeDayOff(dk) && dk === keys.todayDateKey) {
      cursor = addLocalDaysMs(cursor, -1);
    } else {
      break;
    }
  }

  const allStreakDays = Array.from(new Set([...dayTotalMs.keys(), ...dayOffDatesSet]))
    .filter((dk) => qualifiesForStreak(dk) || isBridgeDayOff(dk))
    .sort();
  let bestStreak = currentStreak;
  let runStreak = 0;
  let prevDayStart = 0;
  for (const dk of allStreakDays) {
    const [y, m, d] = dk.split('-').map(Number);
    const dayMs = new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
    const isConsec = prevDayStart > 0 && dayMs === addLocalDaysMs(prevDayStart, 1);
    if (!isConsec) runStreak = 0;
    if (qualifiesForStreak(dk)) runStreak++;
    if (runStreak > bestStreak) bestStreak = runStreak;
    prevDayStart = dayMs;
  }

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
    activeDayPct: studiedDays30d > 0 ? Math.round((hourDayCounts30d[i] / studiedDays30d) * 100) : 0,
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
      name: WEEKDAY_LABELS[d.getDay()],
      fullDate: `${SHORT_MONTH_NAMES[d.getMonth()]} ${d.getDate()}`,
      isToday: idx === 6,
      seconds: Math.round((dayTotalMs.get(dk) ?? 0) / 1000),
    };
  });

  const heatLevel = (sec: number) =>
    sec <= 0 ? 0 : sec < 3600 ? 1 : sec < 7200 ? 2 : sec < 14400 ? 3 : 4;

  const buildHeatSlice = (startDayMs: number, count: number) =>
    Array.from({ length: count }).map((_, idx) => {
      const dk = formatLocalDateKey(addLocalDaysMs(startDayMs, idx));
      const sec = Math.round((dayTotalMs.get(dk) ?? 0) / 1000);
      return { dateKey: dk, seconds: sec, level: heatLevel(sec), isDayOff: dayOffDatesSet.has(dk) };
    });

  const heatmap30Days = buildHeatSlice(last30Start, 30);
  const heatmap84Days = buildHeatSlice(last84Start, 84);
  const quarterly120Days = buildHeatSlice(last120Start, 120);

  // 120d Goal Threshold Share & Big-Day Common Traits
  const studiedDays120 = quarterly120Days.filter((d) => d.seconds > 0);
  const thresholdRates120d: ThresholdShareItem[] = [1, 2, 4, 6, 8].map((hrs) => {
    const reqSec = hrs * 3600;
    const count = studiedDays120.filter((d) => d.seconds >= reqSec).length;
    return {
      hours: hrs,
      label: `${hrs}h+`,
      dayCount: count,
      shareOf120Pct: Math.round((count / 120) * 100),
      shareOfStudiedPct: studiedDays120.length > 0 ? Math.round((count / studiedDays120.length) * 100) : 0,
    };
  });

  const sortedStudied120 = [...studiedDays120].sort((a, b) => a.seconds - b.seconds);
  const p75Idx = sortedStudied120.length > 0 ? Math.floor(sortedStudied120.length * 0.75) : 0;
  const bigCutoffSec = sortedStudied120.length > 0
    ? Math.max(3600, sortedStudied120[p75Idx].seconds)
    : 7200;
  const bigDayKeys = new Set(studiedDays120.filter((d) => d.seconds >= bigCutoffSec).map((d) => d.dateKey));
  const otherDayKeys = new Set(studiedDays120.filter((d) => d.seconds < bigCutoffSec).map((d) => d.dateKey));

  const dayHasTrait = (dk: string, key: string): boolean => {
    const cal = calendarByDate[dk];
    if (!cal) return false;
    switch (key) {
      case 'earlyStart':
        return minuteOfDayInDate(cal.firstStartMs, dk) < 9 * 60;
      case 'deepBlock':
        return (dayMaxBlockSec.get(dk) ?? 0) >= 40 * 60;
      case 'multiSubject':
        return (daySubjectMs.get(dk)?.size ?? 0) >= 2;
      case 'eveningFocus': {
        const hrs = dayHoursVisited.get(dk);
        return Boolean(hrs && ([20, 21, 22, 23].some((h) => hrs.has(h))));
      }
      case 'lowBreak': {
        const fSec = cal.totalMs / 1000;
        const bSec = (dayBreakMs.get(dk) ?? 0) / 1000;
        return fSec + bSec > 0 && fSec / (fSec + bSec) >= 0.75;
      }
      default:
        return false;
    }
  };

  const traitDefs = [
    { key: 'earlyStart', label: 'Started before 9:00 AM' },
    { key: 'deepBlock', label: 'Unbroken block ≥ 40m' },
    { key: 'multiSubject', label: '2+ subjects studied' },
    { key: 'eveningFocus', label: 'Evening session (8 PM+)' },
    { key: 'lowBreak', label: 'Focus efficiency ≥ 75%' },
  ];

  const bigDayTraits: BigDayTraitItem[] = traitDefs.map((t) => {
    const bigMatches = Array.from(bigDayKeys).filter((dk) => dayHasTrait(dk, t.key)).length;
    const otherMatches = Array.from(otherDayKeys).filter((dk) => dayHasTrait(dk, t.key)).length;
    return {
      key: t.key,
      label: t.label,
      bigDayPct: bigDayKeys.size > 0 ? Math.round((bigMatches / bigDayKeys.size) * 100) : 0,
      otherDayPct: otherDayKeys.size > 0 ? Math.round((otherMatches / otherDayKeys.size) * 100) : 0,
      bigDayCount: bigDayKeys.size,
    };
  });

  // Break & Efficiency totals
  const focusEfficiencyPct = timeLast30Sec + totalBreak30dSec > 0
    ? Math.round((timeLast30Sec / (timeLast30Sec + totalBreak30dSec)) * 100)
    : (timeLast30Sec > 0 ? 100 : 0);

  const byTag: BreakTagSummary[] = Array.from(tagAgg30d.entries())
    .map(([tag, info]) => ({ tag, seconds: info.seconds, count: info.count }))
    .sort((a, b) => b.seconds - a.seconds);

  // To-Do completion stats
  const todayTodos = todos.filter((t) => t.dateKey === keys.todayDateKey);
  const todayTodoCompleted = todayTodos.filter((t) => t.completed).length;
  const last7StartKey = formatLocalDateKey(last7Start);
  const todos7d = todos.filter((t) => t.dateKey >= last7StartKey && t.dateKey <= keys.todayDateKey);

  const insights: string[] = [];
  if (momentum > 10) insights.push(`Weekly output is up ${Math.round(momentum)}% compared to last week.`);
  if (maxContinuousSeconds >= 2400) {
    insights.push(`Longest uninterrupted block reached ${Math.round(maxContinuousSeconds / 60)}m across active sessions.`);
  }
  if (neglected.length > 0) insights.push(`Focus on ${neglected[0]} to maintain subject balance.`);
  if (bestHour.total > 0) insights.push(`Peak focus hour sits around ${bestHour.label} (${bestHour.activeDayPct}% of study days).`);

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
      timeThisMonth: thisMonthSec,
      timePrevMonth: lastMonthSec,
      timeAllTime: periodic.allTime.seconds,
      totalSessions,
      avgSessionDuration,
      longestSession,
      maxContinuousSeconds,
      avgContinuousSeconds,
      momentum,
      avgTimePerWeek,
      avgTimePerMonth,
      avgExclDayOffSeconds,
      avgInclDayOffSeconds,
      avgPerStudiedDaySeconds,
      studiedDays30d,
      dayOffCount30d,
      attendanceRate30d,
      goalTargetSeconds,
      goalProgressPct,
      currentStreak,
      bestStreak,
      bestDay,
      bestWeek,
    },
    schedule: {
      todayFirstStartMs: finalCalendarByDate[keys.todayDateKey]?.firstStartMs ?? null,
      todayLastEndMs: finalCalendarByDate[keys.todayDateKey]?.lastEndMs ?? null,
      avgStartMinuteOfDay: countStartEnd30 > 0 ? Math.round(sumStartMin30 / countStartEnd30) : null,
      avgFinishMinuteOfDay: countStartEnd30 > 0 ? Math.round(sumEndMin30 / countStartEnd30) : null,
      startFinishSeries30d,
      weekdayProfile,
      habitHourBand,
    },
    breaks: {
      todayBreakSeconds: Math.round((dayBreakMs.get(keys.todayDateKey) ?? 0) / 1000),
      totalBreakSeconds30d: totalBreak30dSec,
      avgBreakPerStudiedDaySeconds: studiedDays30d > 0 ? Math.round(totalBreak30dSec / studiedDays30d) : 0,
      focusEfficiencyPct,
      byTag,
    },
    focusHistogram,
    periodComparison: {
      cumulativeTodayByHour,
      cumulativeYesterdayByHour,
      weekBarsMonSun,
      thisMonthSec,
      lastMonthSec,
      monthDeltaPct,
    },
    subjects: {
      distribution: subjectDistribution,
      todayBreakdown: periodic.todaySubjectBreakdown,
      neglected,
      stackedDaily14,
      stackedMonthly6,
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
      quarterly120Days,
      thresholdRates120d,
      bigDayTraits,
    },
    todos: {
      todayCompleted: todayTodoCompleted,
      todayTotal: todayTodos.length,
      todayAchievementPct: todayTodos.length > 0 ? Math.round((todayTodoCompleted / todayTodos.length) * 100) : 0,
      completed7d: todos7d.filter((t) => t.completed).length,
      total7d: todos7d.length,
    },
    calendarByDate: finalCalendarByDate,
    insights: insights.slice(0, 3),
  };
}

export function buildStudyReportCsv(
  sessions: Session[],
  subjects: Subject[],
  dayMeta?: Record<string, DayMetaRecord>
): string {
  const subMap = new Map(subjects.map((s) => [s.id, s.name]));
  const escape = (val: string) => `"${val.replace(/"/g, '""')}"`;
  const header = 'Date,Subject,Mode,Source,Start Time,End Time,Focus Seconds,Focus Minutes,Pause Count,Closing Rating,Day Off';
  const rows: string[] = [header];

  const stats = computeStudyStatistics(sessions, subjects, 2, Date.now(), { dayMeta });
  const dates = Object.keys(stats.calendarByDate).sort().reverse();
  for (const dk of dates) {
    const cal = stats.calendarByDate[dk];
    const meta = dayMeta?.[dk];
    for (const sl of cal.slices) {
      const s = sl.session;
      const subName = subMap.get(s.subjectId) ?? 'General Study';
      const startIso = new Date(sl.sliceStartMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const endIso = sl.continuesIntoNextDay ? '24:00' : new Date(sl.sliceEndMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      rows.push([
        dk,
        escape(subName),
        s.mode,
        s.source ?? 'timer',
        escape(startIso),
        escape(endIso),
        String(sl.sliceSeconds),
        String(Math.round(sl.sliceSeconds / 60)),
        String(s.pauseCount ?? 0),
        String(meta?.closingRating ?? ''),
        meta?.isDayOff ? 'yes' : 'no',
      ].join(','));
    }
  }
  return rows.join('\n');
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
