import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computePeriodicStats,
  computeRunningTimerTodaySeconds,
  computeStudyStatistics,
  formatLocalDateKey,
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

  // Checked on Nov 28 at 10:00 AM
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
  assert.equal(fullStats.core.currentStreak, 2); // 3h yesterday (>=2h) + 2h today (>=2h)
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
  assert.equal(stats.calendarByDate['2026-11-27'].totalSeconds, 3600); // 30m @20h + 30m @23h
  assert.equal(stats.calendarByDate['2026-11-28'].totalSeconds, 3600); // 60m @00h
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
    startTime: isoLocal(2026, 11, 29, 22, 0, 0), // Sunday
    endTime: isoLocal(2026, 11, 30, 1, 0, 0),   // Monday
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
    startTime: isoLocal(2026, 11, 30, 23, 0, 0), // Nov 30 (Monday)
    endTime: isoLocal(2026, 12, 1, 1, 0, 0),     // Dec 1 (Tuesday)
    duration: 2 * 3600,
    pauseCount: 0,
    status: 'stopped',
    focusScore: 100,
  };

  const dec1 = localMs(2026, 12, 1, 12, 0, 0);
  const periodicDec1 = computePeriodicStats([sunToMon, novToDec], 'sub-math', dec1);

  assert.equal(periodicDec1.today.seconds, 3600); // Only Dec 1 00:00->01:00
  assert.equal(periodicDec1.yesterday.seconds, 2 * 3600); // Mon Nov 30: 00:00->01:00 + 23:00->24:00
  assert.equal(periodicDec1.weekly.seconds, 3 * 3600); // Week starting Mon Nov 30 = 1h (Mon AM) + 1h (Mon PM) + 1h (Tue AM)
  assert.equal(periodicDec1.monthly.seconds, 3600); // December = 1h
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
  assert.equal(periodic.today.seconds, 5400); // 1.5h union, not 2.0h
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
  assert.equal(todayRunning, 600); // 10 minutes on Nov 28, not 20 minutes!

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
  assert.equal(effToday.seconds, 600); // Yesterday's 3h expired at midnight, plus 10m since midnight
  assert.equal(effToday.sessions, 0);

  const effWeek = getEffectiveMemberPeriodStats(peerMember, 'weekly', nowAfterMidnight);
  assert.equal(effWeek.seconds, 10800 + 1200); // Same week -> base 3h + full 20m running
});
