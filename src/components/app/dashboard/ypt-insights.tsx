'use client';

import { useMemo, useState } from 'react';
import {
  Activity,
  Award,
  BarChart3,
  Clock,
  Coffee,
  Download,
  Flame,
  Sparkles,
  Sunrise,
  TrendingUp,
} from 'lucide-react';
import type { DayMetaRecord, Session, StudyTodo, Subject } from '@/lib/definitions';
import {
  buildStudyReportCsv,
  formatMinuteOfDay,
  StudyStatistics,
} from '@/lib/study-time';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface YptInsightsProps {
  stats: StudyStatistics;
  sessions: Session[];
  subjects: Subject[];
  dayMeta?: Record<string, DayMetaRecord>;
  todos?: StudyTodo[];
}

function fmtShort(seconds: number) {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function YptInsights({
  stats,
  sessions,
  subjects,
  dayMeta,
}: YptInsightsProps) {
  const [compareTab, setCompareTab] = useState<'day' | 'week' | 'month'>('day');
  const [stackedMode, setStackedMode] = useState<'14d' | '6m'>('14d');

  const maxHistCount = useMemo(
    () => Math.max(1, ...stats.focusHistogram.map((b) => b.count)),
    [stats.focusHistogram]
  );

  const maxWeekdayAvg = useMemo(
    () => Math.max(60, ...stats.schedule.weekdayProfile.map((w) => w.avgSeconds)),
    [stats.schedule.weekdayProfile]
  );

  const stackedSeries =
    stackedMode === '14d'
      ? stats.subjects.stackedDaily14
      : stats.subjects.stackedMonthly6;
  const maxStackedSec = useMemo(
    () => Math.max(60, ...stackedSeries.map((p) => p.totalSeconds)),
    [stackedSeries]
  );

  const maxWeekBarSec = useMemo(
    () =>
      Math.max(
        60,
        ...stats.periodComparison.weekBarsMonSun.flatMap((w) => [
          w.thisWeekSec,
          w.lastWeekSec,
        ])
      ),
    [stats.periodComparison.weekBarsMonSun]
  );

  const handleExportCsv = () => {
    const csv = buildStudyReportCsv(sessions, subjects, dayMeta);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fenrirstudy-report-${stats.periodKeys.todayDateKey}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-muted">
            Deep Analytics
          </p>
          <h2 className="text-xl font-bold tracking-tight text-ink">
            Understand Every Study Pattern at a Glance
          </h2>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleExportCsv}
          className="rounded-full border-line bg-surface hover:bg-surface-soft gap-2 min-h-[40px]"
        >
          <Download className="h-4 w-4 text-clay" />
          <span>Export CSV Report</span>
        </Button>
      </div>

      {/* Averages, Attendance & Efficiency Strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-line bg-surface rounded-2xl">
          <CardContent className="p-4">
            <p className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
              Daily Avg (Active Days)
            </p>
            <p className="text-2xl font-bold tabular-nums text-ink mt-1">
              {fmtShort(stats.core.avgExclDayOffSeconds)}
            </p>
            <p className="font-mono text-[11px] text-ink-muted mt-1">
              Skips rest days · All days: {fmtShort(stats.core.avgInclDayOffSeconds)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-line bg-surface rounded-2xl">
          <CardContent className="p-4">
            <p className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
              30-Day Consistency
            </p>
            <p className="text-2xl font-bold tabular-nums text-ink mt-1">
              {stats.core.attendanceRate30d}%
            </p>
            <p className="font-mono text-[11px] text-ink-muted mt-1">
              {stats.core.studiedDays30d} studied · {stats.core.dayOffCount30d} rest days
            </p>
          </CardContent>
        </Card>

        <Card className="border-line bg-surface rounded-2xl">
          <CardContent className="p-4">
            <p className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
              Focus vs. Break Ratio
            </p>
            <p className="text-2xl font-bold tabular-nums text-ink mt-1">
              {stats.breaks.focusEfficiencyPct}%
            </p>
            <p className="font-mono text-[11px] text-ink-muted mt-1">
              Avg rest {fmtShort(stats.breaks.avgBreakPerStudiedDaySeconds)}/day
            </p>
          </CardContent>
        </Card>

        <Card className="border-line bg-surface rounded-2xl">
          <CardContent className="p-4">
            <p className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
              Typical Focus Block
            </p>
            <p className="text-2xl font-bold tabular-nums text-ink mt-1">
              {fmtShort(stats.core.avgContinuousSeconds)}
            </p>
            <p className="font-mono text-[11px] text-ink-muted mt-1">
              Longest unbroken: {fmtShort(stats.core.maxContinuousSeconds)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Period Comparison Stairs (Day / Week / Month) & Start/Finish Window */}
      <div className="grid gap-5 lg:grid-cols-12">
        <Card className="lg:col-span-7 border-line bg-surface rounded-3xl">
          <CardHeader className="pb-3 border-b border-line/15 flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-ink">
                <TrendingUp className="h-4 w-4 text-clay" />
                Period Comparison
              </CardTitle>
              <CardDescription className="text-xs text-ink-muted">
                Compare current output against the prior cycle
              </CardDescription>
            </div>
            <div className="inline-flex rounded-full border border-line bg-surface-soft p-0.5">
              {(['day', 'week', 'month'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setCompareTab(t)}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-semibold capitalize transition-colors',
                    compareTab === t ? 'bg-ink text-surface' : 'text-ink-muted hover:text-ink'
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {compareTab === 'day' && (
              <>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <span className="text-2xl font-bold tabular-nums text-ink">
                      {fmtShort(stats.core.timeToday)}
                    </span>
                    <span className="ml-2 text-xs text-ink-muted">
                      vs Yesterday {fmtShort(stats.core.timeYesterday)}
                    </span>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs">
                    {stats.core.dailyComparisonPct >= 0 ? '+' : ''}
                    {Math.round(stats.core.dailyComparisonPct)}%
                  </Badge>
                </div>
                <div className="space-y-1">
                  <div className="h-32 flex items-end gap-1 pt-2">
                    {Array.from({ length: 24 }).map((_, h) => {
                      const maxCum = Math.max(
                        60,
                        stats.periodComparison.cumulativeTodayByHour[23] || 0,
                        stats.periodComparison.cumulativeYesterdayByHour[23] || 0
                      );
                      const todayH = (stats.periodComparison.cumulativeTodayByHour[h] / maxCum) * 100;
                      const yestH = (stats.periodComparison.cumulativeYesterdayByHour[h] / maxCum) * 100;
                      return (
                        <div key={h} className="flex-1 h-full flex items-end gap-[1px]">
                          <div
                            className="flex-1 rounded-t-sm bg-surface-muted border border-line/25"
                            style={{ height: `${Math.max(4, yestH)}%` }}
                            title={`Yesterday @ ${h}:00 — ${fmtShort(stats.periodComparison.cumulativeYesterdayByHour[h])}`}
                          />
                          <div
                            className="flex-1 rounded-t-sm bg-clay border border-line/60"
                            style={{ height: `${Math.max(4, todayH)}%` }}
                            title={`Today @ ${h}:00 — ${fmtShort(stats.periodComparison.cumulativeTodayByHour[h])}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between font-mono text-[10px] text-ink-muted pt-1">
                    <span>00:00</span>
                    <span>06:00</span>
                    <span>12:00</span>
                    <span>18:00</span>
                    <span>24:00</span>
                  </div>
                  <div className="flex items-center gap-4 text-[11px] text-ink-muted pt-1">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-sm bg-clay border border-line" /> Today cumulative
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-sm bg-surface-muted border border-line/40" /> Yesterday
                    </span>
                  </div>
                </div>
              </>
            )}

            {compareTab === 'week' && (
              <>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <span className="text-2xl font-bold tabular-nums text-ink">
                      {fmtShort(stats.core.timeThisWeek)}
                    </span>
                    <span className="ml-2 text-xs text-ink-muted">
                      vs Prev 7d {fmtShort(stats.core.timePrevWeek)}
                    </span>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs">
                    {stats.core.momentum >= 0 ? '+' : ''}
                    {Math.round(stats.core.momentum)}%
                  </Badge>
                </div>
                <div className="h-36 flex items-end gap-2 pt-2">
                  {stats.periodComparison.weekBarsMonSun.map((bar) => (
                    <div key={bar.label} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                      <div className="w-full flex-1 flex items-end justify-center gap-1">
                        <div
                          className="w-2.5 rounded-t bg-surface-muted border border-line/30"
                          style={{ height: `${Math.max(5, (bar.lastWeekSec / maxWeekBarSec) * 100)}%` }}
                          title={`Last ${bar.label}: ${fmtShort(bar.lastWeekSec)}`}
                        />
                        <div
                          className="w-2.5 rounded-t bg-clay border border-line"
                          style={{ height: `${Math.max(5, (bar.thisWeekSec / maxWeekBarSec) * 100)}%` }}
                          title={`This ${bar.label}: ${fmtShort(bar.thisWeekSec)}`}
                        />
                      </div>
                      <span className="font-mono text-[10px] text-ink-muted">{bar.label}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {compareTab === 'month' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <span className="text-2xl font-bold tabular-nums text-ink">
                      {fmtShort(stats.periodComparison.thisMonthSec)}
                    </span>
                    <span className="ml-2 text-xs text-ink-muted">
                      vs Last Month {fmtShort(stats.periodComparison.lastMonthSec)}
                    </span>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs">
                    {stats.periodComparison.monthDeltaPct >= 0 ? '+' : ''}
                    {Math.round(stats.periodComparison.monthDeltaPct)}%
                  </Badge>
                </div>
                {(() => {
                  const maxM = Math.max(
                    60,
                    stats.periodComparison.thisMonthSec,
                    stats.periodComparison.lastMonthSec
                  );
                  return (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-ink">
                          <span className="font-medium">This Month</span>
                          <span className="font-mono tabular-nums">{fmtShort(stats.periodComparison.thisMonthSec)}</span>
                        </div>
                        <div className="h-3.5 rounded-full border border-line bg-surface-soft overflow-hidden">
                          <div
                            className="h-full bg-clay"
                            style={{ width: `${(stats.periodComparison.thisMonthSec / maxM) * 100}%` }}
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-ink-muted">
                          <span className="font-medium">Last Month</span>
                          <span className="font-mono tabular-nums">{fmtShort(stats.periodComparison.lastMonthSec)}</span>
                        </div>
                        <div className="h-3.5 rounded-full border border-line/40 bg-surface-soft overflow-hidden">
                          <div
                            className="h-full bg-surface-muted"
                            style={{ width: `${(stats.periodComparison.lastMonthSec / maxM) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Start / Finish Consistency & Study vs. Rest Breakdown */}
        <Card className="lg:col-span-5 border-line bg-surface rounded-3xl">
          <CardHeader className="pb-3 border-b border-line/15">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-ink">
              <Sunrise className="h-4 w-4 text-clay" />
              Study Window &amp; Rest Balance (30d)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-line/25 bg-surface-soft p-3">
                <p className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                  Avg Start Time
                </p>
                <p className="font-mono text-xl font-bold text-ink mt-1">
                  {formatMinuteOfDay(stats.schedule.avgStartMinuteOfDay)}
                </p>
              </div>
              <div className="rounded-2xl border border-line/25 bg-surface-soft p-3">
                <p className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                  Avg Finish Time
                </p>
                <p className="font-mono text-xl font-bold text-ink mt-1">
                  {formatMinuteOfDay(stats.schedule.avgFinishMinuteOfDay)}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-ink flex items-center gap-1.5">
                  <Coffee className="h-3.5 w-3.5 text-clay" />
                  Focus vs. Rest Split
                </span>
                <span className="font-mono text-ink-muted tabular-nums">
                  {stats.breaks.focusEfficiencyPct}% Focus
                </span>
              </div>
              <div className="h-3.5 w-full rounded-full border border-line bg-surface-soft overflow-hidden flex">
                <div
                  className="h-full bg-clay"
                  style={{ width: `${stats.breaks.focusEfficiencyPct}%` }}
                />
                <div
                  className="h-full bg-highlight"
                  style={{ width: `${Math.max(0, 100 - stats.breaks.focusEfficiencyPct)}%` }}
                />
              </div>
              {stats.breaks.byTag.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {stats.breaks.byTag.slice(0, 5).map((bt) => (
                    <Badge key={bt.tag} variant="secondary" className="font-mono text-[10px]">
                      {bt.tag}: {fmtShort(bt.seconds)}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-ink-muted">
                  Pause gaps and tagged breaks appear here.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 20-Minute Continuous Focus Histogram & 30-Day Weekday Profile */}
      <div className="grid gap-5 lg:grid-cols-12">
        <Card className="lg:col-span-6 border-line bg-surface rounded-3xl">
          <CardHeader className="pb-3 border-b border-line/15">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-ink">
              <Flame className="h-4 w-4 text-clay" />
              Session Length Breakdown (20m Buckets)
            </CardTitle>
            <CardDescription className="text-xs text-ink-muted">
              How long you usually stay focused before pausing or stopping
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5">
            <div className="h-40 flex items-end gap-2">
              {stats.focusHistogram.map((bucket) => (
                <div
                  key={bucket.label}
                  className="flex-1 h-full flex flex-col items-center justify-end gap-1"
                >
                  <span className="font-mono text-[10px] text-ink-muted tabular-nums">
                    {bucket.count > 0 ? bucket.count : ''}
                  </span>
                  <div
                    className={cn(
                      'w-full rounded-t-lg border border-line transition-all',
                      bucket.count > 0 ? 'bg-clay' : 'bg-surface-soft border-line/20'
                    )}
                    style={{
                      height: `${Math.max(bucket.count > 0 ? 12 : 4, (bucket.count / maxHistCount) * 78)}%`,
                    }}
                    title={`${bucket.label}: ${bucket.count} blocks (${fmtShort(bucket.totalSeconds)}, ${bucket.sharePct}%)`}
                  />
                  <span className="font-mono text-[10px] text-ink-muted text-center">
                    {bucket.label}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-6 border-line bg-surface rounded-3xl">
          <CardHeader className="pb-3 border-b border-line/15">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-ink">
              <Clock className="h-4 w-4 text-clay" />
              When You Study Each Weekday (30d)
            </CardTitle>
            <CardDescription className="text-xs text-ink-muted">
              Average focus hours and typical start–finish clock per day
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-2.5">
            {stats.schedule.weekdayProfile.map((wp) => (
              <div key={wp.day} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold w-8 text-ink">{wp.day}</span>
                    <span className="font-mono text-[11px] text-ink-muted">
                      {wp.avgStartMinute !== null
                        ? `${formatMinuteOfDay(wp.avgStartMinute)}–${formatMinuteOfDay(wp.avgFinishMinute)}`
                        : 'No study'}
                    </span>
                  </div>
                  <span className="font-mono font-semibold text-ink tabular-nums">
                    {fmtShort(wp.avgSeconds)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-surface-soft border border-line/20 overflow-hidden">
                  <div
                    className="h-full bg-clay rounded-full"
                    style={{
                      width: `${wp.avgSeconds > 0 ? Math.max(4, (wp.avgSeconds / maxWeekdayAvg) * 100) : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Stacked Subject Trend (14d / 6m) */}
      <Card className="border-line bg-surface rounded-3xl">
        <CardHeader className="pb-3 border-b border-line/15 flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-ink">
              <BarChart3 className="h-4 w-4 text-clay" />
              Subject Distribution Over Time
            </CardTitle>
            <CardDescription className="text-xs text-ink-muted">
              Stacked daily or monthly focus breakdown by subject color
            </CardDescription>
          </div>
          <div className="inline-flex rounded-full border border-line bg-surface-soft p-0.5">
            {([
              ['14d', '14 Days'],
              ['6m', '6 Months'],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setStackedMode(id)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-semibold transition-colors',
                  stackedMode === id ? 'bg-ink text-surface' : 'text-ink-muted hover:text-ink'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-5 space-y-3">
          <div className="h-40 flex items-end gap-1.5 overflow-x-auto pb-1">
            {stackedSeries.map((point) => (
              <div
                key={point.key}
                className="flex-1 min-w-[20px] h-full flex flex-col items-center justify-end gap-1"
                title={`${point.label}: ${fmtShort(point.totalSeconds)}`}
              >
                <div
                  className="w-full rounded-t-md border border-line/35 bg-surface-soft flex flex-col-reverse overflow-hidden"
                  style={{
                    height: `${point.totalSeconds > 0 ? Math.max(8, (point.totalSeconds / maxStackedSec) * 84) : 4}%`,
                  }}
                >
                  {point.segments.map((seg) => (
                    <div
                      key={seg.subjectId}
                      style={{
                        height: `${point.totalSeconds > 0 ? (seg.seconds / point.totalSeconds) * 100 : 0}%`,
                        backgroundColor: seg.color,
                      }}
                      title={`${seg.name}: ${fmtShort(seg.seconds)}`}
                    />
                  ))}
                </div>
                <span className="font-mono text-[9px] text-ink-muted truncate max-w-full">
                  {stackedMode === '14d' ? point.label.split(' ')[1] : point.label}
                </span>
              </div>
            ))}
          </div>
          {subjects.filter((s) => !s.archived).length > 0 && (
            <div className="flex flex-wrap gap-3 pt-1">
              {subjects
                .filter((s) => !s.archived)
                .map((sub) => (
                  <span key={sub.id} className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
                    <span
                      className="h-2.5 w-2.5 rounded-full border border-line/30"
                      style={{ backgroundColor: sub.color }}
                    />
                    {sub.name}
                  </span>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 120-Day Threshold Share & Big-Day Traits */}
      <div className="grid gap-5 lg:grid-cols-12">
        <Card className="lg:col-span-6 border-line bg-surface rounded-3xl">
          <CardHeader className="pb-3 border-b border-line/15">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-ink">
              <Award className="h-4 w-4 text-clay" />
              Daily Hour Milestones (Last 120 Days)
            </CardTitle>
            <CardDescription className="text-xs text-ink-muted">
              How often you reached 1h, 2h, 4h, 6h, or 8h+ on active days
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-3">
            {stats.trends.thresholdRates120d.map((item) => (
              <div key={item.hours} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-mono font-semibold text-ink">{item.label} days</span>
                  <span className="font-mono text-ink-muted tabular-nums">
                    {item.dayCount} days ({item.shareOfStudiedPct}% of studied · {item.shareOf120Pct}% of 120d)
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-surface-soft border border-line/20 overflow-hidden">
                  <div
                    className="h-full bg-clay rounded-full"
                    style={{ width: `${item.shareOfStudiedPct}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-6 border-line bg-surface rounded-3xl">
          <CardHeader className="pb-3 border-b border-line/15">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-ink">
              <Sparkles className="h-4 w-4 text-clay" />
              What Your Big Study Days Have in Common
            </CardTitle>
            <CardDescription className="text-xs text-ink-muted">
              Habits present on your top-quartile high-output study days
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-3">
            {stats.trends.bigDayTraits.map((trait) => (
              <div key={trait.key} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-ink">{trait.label}</span>
                  <span className="font-mono text-ink tabular-nums">
                    {trait.bigDayPct}% vs {trait.otherDayPct}% normal
                  </span>
                </div>
                <div className="h-2 rounded-full bg-surface-soft border border-line/20 overflow-hidden">
                  <div
                    className="h-full bg-success rounded-full"
                    style={{ width: `${trait.bigDayPct}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* 120-Day Quarterly Calendar Heatmap */}
      <Card className="border-line bg-surface rounded-3xl">
        <CardHeader className="pb-3 border-b border-line/15">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-ink">
            <Activity className="h-4 w-4 text-clay" />
            120-Day Activity Calendar
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 overflow-x-auto">
          <div className="grid grid-flow-col grid-rows-7 gap-1 min-w-max">
            {stats.trends.quarterly120Days.map((cell) => (
              <div
                key={cell.dateKey}
                title={`${cell.dateKey}: ${fmtShort(cell.seconds)}${cell.isDayOff ? ' (Day Off)' : ''}`}
                className={cn(
                  'h-3.5 w-3.5 rounded-[3px] border',
                  cell.isDayOff && cell.seconds === 0
                    ? 'bg-highlight border-line/40'
                    : cell.level === 0
                    ? 'bg-surface-muted border-line/15'
                    : cell.level === 1
                    ? 'bg-accent-soft/60 border-line/25'
                    : cell.level === 2
                    ? 'bg-accent-soft border-line/40'
                    : cell.level === 3
                    ? 'bg-clay/70 border-line/70'
                    : 'bg-clay border-line'
                )}
              />
            ))}
          </div>
          <div className="flex items-center gap-3 text-[11px] text-ink-muted mt-3">
            <span>Less</span>
            <span className="h-3 w-3 rounded-[2px] bg-surface-muted border border-line/20" />
            <span className="h-3 w-3 rounded-[2px] bg-accent-soft/60 border border-line/25" />
            <span className="h-3 w-3 rounded-[2px] bg-clay/70 border border-line/60" />
            <span className="h-3 w-3 rounded-[2px] bg-clay border border-line" />
            <span>More</span>
            <span className="ml-3 inline-flex items-center gap-1">
              <span className="h-3 w-3 rounded-[2px] bg-highlight border border-line/40" /> Day Off
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
