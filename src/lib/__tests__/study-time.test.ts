import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildStudyReportCsv,
  computePeriodicStats,
  computeRunningTimerTodaySeconds,
  computeStudyStatistics,
  formatDdayBadge,
  formatLocalDateKey,
  formatMinuteOfDay,
  getEffectiveMemberPeriodStats,
  splitIntervalByLocalDays,
  splitIntervalByLocalHours,
} from '../study-time';
import type { Session, Subject } from '../definitions';

function localMs(year: number, month1: number, day: number, hour = 0, min = 0, sec = 0): number {
  return new Date(year, month1 - 1, day, hour, min, sec, 0).getTime();
}

function isoLocal(year: number, month1: number, day: number, hour = 0, min = 0, sec = 0): string {
  return new Date(year, month1 - 1, day, hour, min, sec, 0).toISOString();
}

const MATH_SUB: Subject = {
  id: 'sub-math',
  userId: 'u1',
  name: 'Mathematics',
  color: '#F36B32',
  archived: false,
  createdAt: '2026-01-01T00:00:00.000Z',
};

const PHYS_SUB: Subject = {
  id: 'sub-phys',
  userId: 'u1',
  name: 'Physics',
  color: '#395B72',
  archived: false,
  createdAt: '2026-01-01T00:00:00.000Z',
};

test('cross-midnight session (Nov 27 21:00 -> Nov 28 02:00) splits 3h on Nov 27 and 2h on Nov 28', () => {
  const start = localMs(2026, 11, 27, 21, 0, 0);
  const end = localMs(2026, 11, 28, 2, 0, 0);

  const daySlices = splitIntervalByLocalDays(start, end);
  assert.equal(daySlices.length, 2);
  assert.equal(daySlices[0].dateKey, '2026-11-27');
  assert.equal(daySlices[0].durationMs, 3 * 3600 * 1000);
  assert.equal(daySlices[1].dateKey, '2026-11-28');
  assert.equal(daySlices[1].durationMs, 2 * 3600 * 1000);

  const hourSlices = splitIntervalByLocalHours(start, end);
  assert.deepEqual(
    hourSlices.map((h) => [h.hour, h.durationMs / 1000]),
    [
      [21, 3600],
      [22, 3600],
      [23, 3600],
      [0, 3600],
      [1, 3600],
    ]
  );

  const session: Session = {
    id: 's-midnight',
    userId: 'u1',
    subjectId: 'sub-math',
    mode: 'stopwatch',
    startTime: new Date(start).toISOString(),
    endTime: new Date(end).toISOString(),
    duration: 5 * 3600,
    pauseCount: 0,
    status: 'stopped',
    focusScore: 100,
  };

  const nowNov28 = localMs(2026, 11, 28, 10, 0, 0);
  const periodic = computePeriodicStats([session], 'sub-math', nowNov28);
  assert.equal(periodic.today.seconds, 2 * 3600);
  assert.equal(periodic.yesterday.seconds, 3 * 3600);
  assert.equal(periodic.weekly.seconds, 5 * 3600);
  assert.equal(periodic.monthly.seconds, 5 * 3600);
  assert.equal(periodic.allTime.seconds, 5 * 3600);
  assert.equal(periodic.currentSubjectTodaySeconds, 2 * 3600);

  const fullStats = computeStudyStatistics([session], [MATH_SUB], 2, nowNov28);
  assert.equal(fullStats.core.timeToday, 2 * 3600);
  assert.equal(fullStats.core.timeYesterday, 3 * 3600);
  assert.equal(fullStats.calendarByDate['2026-11-27'].totalSeconds, 3 * 3600);
  assert.equal(fullStats.calendarByDate['2026-11-28'].totalSeconds, 2 * 3600);
  assert.equal(fullStats.calendarByDate['2026-11-28'].slices[0].continuesFromPrevDay, true);
  assert.equal(fullStats.calendarByDate['2026-11-27'].slices[0].continuesIntoNextDay, true);
  assert.equal(fullStats.core.currentStreak, 2);
});

test('pause gaps across midnight attribute only focused segments to true wall-clock dates and hours', () => {
  const session: Session = {
    id: 's-paused',
    userId: 'u1',
    subjectId: 'sub-math',
    mode: 'stopwatch',
    startTime: isoLocal(2026, 11, 27, 20, 0, 0),
    endTime: isoLocal(2026, 11, 28, 1, 0, 0),
    duration: 2 * 3600,
    pauseCount: 1,
    status: 'stopped',
    focusScore: 100,
    segments: [
      { startTime: isoLocal(2026, 11, 27, 20, 0, 0), endTime: isoLocal(2026, 11, 27, 20, 30, 0) },
      { startTime: isoLocal(2026, 11, 27, 23, 30, 0), endTime: isoLocal(2026, 11, 28, 1, 0, 0) },
    ],
  };

  const nowNov28 = localMs(2026, 11, 28, 9, 0, 0);
  const stats = computeStudyStatistics([session], [MATH_SUB], 1, nowNov28);
  assert.equal(stats.calendarByDate['2026-11-27'].totalSeconds, 3600);
  assert.equal(stats.calendarByDate['2026-11-28'].totalSeconds, 3600);
  assert.equal(stats.behavior.hourHeatmap[20].total, 1800);
  assert.equal(stats.behavior.hourHeatmap[21].total, 0);
  assert.equal(stats.behavior.hourHeatmap[23].total, 1800);
  assert.equal(stats.behavior.hourHeatmap[0].total, 3600);
});

test('week and month boundaries split sessions accurately (Sun Nov 29 22:00 -> Mon Nov 30 01:00 and Nov 30 23:00 -> Dec 1 01:00)', () => {
  const sunToMon: Session = {
    id: 's-week',
    userId: 'u1',
    subjectId: 'sub-math',
    mode: 'stopwatch',
    startTime: isoLocal(2026, 11, 29, 22, 0, 0),
    endTime: isoLocal(2026, 11, 30, 1, 0, 0),
    duration: 3 * 3600,
    pauseCount: 0,
    status: 'stopped',
    focusScore: 100,
  };

  const novToDec: Session = {
    id: 's-month',
    userId: 'u1',
    subjectId: 'sub-math',
    mode: 'stopwatch',
    startTime: isoLocal(2026, 11, 30, 23, 0, 0),
    endTime: isoLocal(2026, 12, 1, 1, 0, 0),
    duration: 2 * 3600,
    pauseCount: 0,
    status: 'stopped',
    focusScore: 100,
  };

  const dec1 = localMs(2026, 12, 1, 12, 0, 0);
  const periodicDec1 = computePeriodicStats([sunToMon, novToDec], 'sub-math', dec1);

  assert.equal(periodicDec1.today.seconds, 3600);
  assert.equal(periodicDec1.yesterday.seconds, 2 * 3600);
  assert.equal(periodicDec1.weekly.seconds, 3 * 3600);
  assert.equal(periodicDec1.monthly.seconds, 3600);
  assert.equal(periodicDec1.allTime.seconds, 5 * 3600);
});

test('overlapping multi-device duplicate sessions do not double-count duration', () => {
  const s1: Session = {
    id: 's1',
    userId: 'u1',
    subjectId: 'sub-math',
    mode: 'stopwatch',
    startTime: isoLocal(2026, 11, 27, 21, 0, 0),
    endTime: isoLocal(2026, 11, 27, 22, 0, 0),
    duration: 3600,
    pauseCount: 0,
    status: 'stopped',
    focusScore: 100,
  };
  const s2Dup: Session = {
    id: 's2',
    userId: 'u1',
    subjectId: 'sub-math',
    mode: 'stopwatch',
    startTime: isoLocal(2026, 11, 27, 21, 30, 0),
    endTime: isoLocal(2026, 11, 27, 22, 30, 0),
    duration: 3600,
    pauseCount: 0,
    status: 'stopped',
    focusScore: 100,
  };

  const now = localMs(2026, 11, 27, 23, 0, 0);
  const periodic = computePeriodicStats([s1, s2Dup], 'sub-math', now);
  assert.equal(periodic.today.seconds, 5400);
});

test('running timer across midnight and peer stats cache expiration compute exact today delta', () => {
  const startedBeforeMidnight = localMs(2026, 11, 27, 23, 50, 0);
  const nowAfterMidnight = localMs(2026, 11, 28, 0, 10, 0);

  const todayRunning = computeRunningTimerTodaySeconds(
    {
      status: 'running',
      startedAtMs: startedBeforeMidnight,
      currentSegmentStartMs: startedBeforeMidnight,
      sessionStartTimeMs: startedBeforeMidnight,
      accumulatedTimeSec: 0,
    },
    nowAfterMidnight
  );
  assert.equal(todayRunning, 600);

  const peerMember = {
    todaySeconds: 10800,
    todaySessions: 2,
    todayStatsDate: '2026-11-27',
    weeklySeconds: 10800,
    weeklySessions: 2,
    weeklyStatsKey: formatLocalDateKey(localMs(2026, 11, 23, 0, 0, 0)),
    monthlySeconds: 10800,
    monthlySessions: 2,
    monthlyStatsKey: '2026-11',
    timerStatus: 'running',
    startedAt: new Date(startedBeforeMidnight).toISOString(),
  };

  const effToday = getEffectiveMemberPeriodStats(peerMember, 'today', nowAfterMidnight);
  assert.equal(effToday.seconds, 600);
  assert.equal(effToday.sessions, 0);

  const effWeek = getEffectiveMemberPeriodStats(peerMember, 'weekly', nowAfterMidnight);
  assert.equal(effWeek.seconds, 10800 + 1200);
});

test('YPT advanced analytics compute 20m focus histogram, study/rest efficiency, day-off streak protection, stacked bars, and CSV report', () => {
  const sNov25: Session = {
    id: 'd25',
    userId: 'u1',
    subjectId: 'sub-math',
    mode: 'pomodoro',
    startTime: isoLocal(2026, 11, 25, 8, 0, 0),
    endTime: isoLocal(2026, 11, 25, 9, 15, 0), // 75m -> bucket 3 (60-80m)
    duration: 75 * 60,
    pauseCount: 0,
    status: 'completed',
    focusScore: 100,
  };
  const sNov27a: Session = {
    id: 'd27a',
    userId: 'u1',
    subjectId: 'sub-math',
    mode: 'stopwatch',
    startTime: isoLocal(2026, 11, 27, 8, 30, 0),
    endTime: isoLocal(2026, 11, 27, 9, 0, 0), // 30m -> bucket 1 (20-40m)
    duration: 30 * 60,
    pauseCount: 0,
    status: 'stopped',
    focusScore: 100,
  };
  const sNov27b: Session = {
    id: 'd27b',
    userId: 'u1',
    subjectId: 'sub-phys',
    mode: 'stopwatch',
    startTime: isoLocal(2026, 11, 27, 9, 20, 0), // 20m break gap before this
    endTime: isoLocal(2026, 11, 27, 11, 30, 0), // 130m -> bucket 6 (120m+)
    duration: 130 * 60,
    pauseCount: 0,
    status: 'stopped',
    focusScore: 100,
  };

  const now = localMs(2026, 11, 27, 15, 0, 0);
  const stats = computeStudyStatistics(
    [sNov25, sNov27a, sNov27b],
    [MATH_SUB, PHYS_SUB],
    1, // 1h/day target
    now,
    {
      dayMeta: {
        '2026-11-26': { isDayOff: true, dayOffReason: 'Rest' },
        '2026-11-27': {
          closingRating: 5,
          closingComment: 'Solid physics session',
          breaks: [{ id: 'b1', dateKey: '2026-11-27', startTime: isoLocal(2026, 11, 27, 9, 0, 0), endTime: isoLocal(2026, 11, 27, 9, 20, 0), durationSeconds: 1200, tag: 'Meal' }],
        },
      },
      todos: [
        { id: 't1', subjectId: 'sub-math', text: 'Ch1', dateKey: '2026-11-27', completed: true, createdAt: isoLocal(2026, 11, 27, 8, 0) },
        { id: 't2', subjectId: 'sub-phys', text: 'Ch2', dateKey: '2026-11-27', completed: false, createdAt: isoLocal(2026, 11, 27, 8, 0) },
      ],
    }
  );

  // Nov 26 was a Day Off between Nov 25 (>=1h) and Nov 27 (>=1h) -> 2-day streak preserved!
  assert.equal(stats.core.currentStreak, 2);
  assert.equal(stats.core.dayOffCount30d, 1);
  assert.equal(stats.core.studiedDays30d, 2);
  assert.equal(stats.core.maxContinuousSeconds, 130 * 60);
  assert.equal(stats.focusHistogram[1].count, 1); // 20-40m
  assert.equal(stats.focusHistogram[3].count, 1); // 60-80m
  assert.equal(stats.focusHistogram[6].count, 1); // 120m+
  assert.equal(stats.breaks.todayBreakSeconds, 1200);
  assert.equal(stats.breaks.byTag[0].tag, 'Meal');
  assert.equal(stats.schedule.avgStartMinuteOfDay, 8 * 60 + 15);
  assert.equal(formatMinuteOfDay(stats.schedule.avgStartMinuteOfDay), '08:15');
  assert.equal(stats.todos.todayAchievementPct, 50);
  assert.equal(stats.trends.thresholdRates120d[0].dayCount, 2); // both Nov 25 (75m) & Nov 27 (160m) >= 1h
  assert.equal(formatDdayBadge('2026-12-07', '2026-11-27').label, 'D-10');
  assert.equal(formatDdayBadge('2026-11-27', '2026-11-27').label, 'D-DAY');

  const csv = buildStudyReportCsv([sNov25, sNov27a, sNov27b], [MATH_SUB, PHYS_SUB], {
    '2026-11-27': { closingRating: 5, isDayOff: false },
  });
  assert.match(csv, /2026-11-27,"Physics"/);
  assert.match(csv, /2026-11-27,"Mathematics"/);
});
