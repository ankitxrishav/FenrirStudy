"use client";

import * as React from "react";
import { format } from "date-fns";
import { BarChart2, Flame, Target, TrendingUp, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useHabits } from "@/hooks/use-habits";

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <Card className="border-line bg-surface">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted mb-2">
          <span>{label}</span>
          {icon}
        </div>
        <div className="text-2xl sm:text-3xl font-bold tracking-tight tabular-nums text-ink">
          {value}
        </div>
        <div className="text-xs text-ink-muted mt-1">{sub}</div>
      </CardContent>
    </Card>
  );
}

const LEVEL_STYLES = [
  "bg-surface-muted border-line/15",
  "bg-accent-soft/50 border-line/25",
  "bg-accent-soft border-line/35",
  "bg-clay/65 border-line/60",
  "bg-clay border-line",
];

function HabitHeatmap({ data }: { data: { date: string; level: number }[] }) {
  const weeks: { date: string; level: number }[][] = [];
  let week: { date: string; level: number }[] = [];

  if (data.length === 0) return null;

  const firstDay = new Date(data[0].date);
  const firstDayOfWeek = firstDay.getDay();
  for (let i = 0; i < firstDayOfWeek; i++) week.push({ date: "", level: -1 });

  for (const d of data) {
    week.push(d);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) weeks.push(week);

  return (
    <div className="flex gap-1.5 min-w-max">
      {weeks.map((wk, wi) => (
        <div key={wi} className="flex flex-col gap-1.5">
          {wk.map((d, di) => (
            <div
              key={di}
              title={d.date || ""}
              className={cn(
                "h-3.5 w-3.5 rounded-[4px] border",
                d.level < 0 ? "opacity-0 border-transparent" : LEVEL_STYLES[d.level] ?? LEVEL_STYLES[0]
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function HabitAnalytics({
  analytics,
}: {
  analytics: ReturnType<typeof useHabits>["analytics"];
}) {
  if (!analytics) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-32 rounded-2xl border border-line/20 bg-surface-soft"
          />
        ))}
      </div>
    );
  }

  const PIE_COLORS = ["var(--accent)", "var(--surface-muted)"];
  const pieData = [
    { name: "Completed", value: analytics.todaySummary.completed },
    { name: "Missed", value: analytics.todaySummary.missed },
  ];

  const barData = analytics.dailyCompletions.slice(-7).map((d) => ({
    day: format(new Date(d.date), "EEE"),
    completed: d.count,
    total: d.total,
  }));

  const lineData = analytics.dailyCompletions.slice(-14).map((d) => ({
    date: format(new Date(d.date), "MMM d"),
    rate: d.total > 0 ? Math.round((d.count / d.total) * 100) : 0,
  }));

  const streaks = Object.values(analytics.streakByHabit);
  const bestCurrent = streaks.reduce((m, s) => Math.max(m, s.current), 0);
  const bestLongest = streaks.reduce((m, s) => Math.max(m, s.longest), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Target className="h-4 w-4" />}
          label="Today's Rate"
          value={`${analytics.completionRateToday}%`}
          sub="completion"
        />
        <StatCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Weekly Avg"
          value={`${analytics.weeklyAvgRate}%`}
          sub="last 7 days"
        />
        <StatCard
          icon={<Flame className="h-4 w-4" />}
          label="Best Streak"
          value={`${bestCurrent}d`}
          sub={`longest ${bestLongest}d`}
        />
        <StatCard
          icon={<Calendar className="h-4 w-4" />}
          label="Today Progress"
          value={`${analytics.todaySummary.completed}/${analytics.todaySummary.total}`}
          sub={`${analytics.todaySummary.missed} remaining`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-line bg-surface">
          <CardHeader className="pb-2 border-b border-line/15">
            <CardTitle className="font-mono text-xs uppercase tracking-[0.14em] flex items-center gap-2 text-ink">
              <TrendingUp className="h-4 w-4 text-clay" />
              Completion Rate — 14 Days
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5 h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData} margin={{ top: 6, right: 8, bottom: 0, left: -24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line-subtle)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "var(--ink-muted)" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "var(--ink-muted)" }}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 100]}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--surface)",
                    border: "1px solid var(--line)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [`${v}%`, "Rate"]}
                />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke="var(--accent)"
                  strokeWidth={2.5}
                  dot={{ r: 3.5, fill: "var(--accent)", strokeWidth: 1, stroke: "var(--line)" }}
                  activeDot={{ r: 5 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-line bg-surface">
          <CardHeader className="pb-2 border-b border-line/15">
            <CardTitle className="font-mono text-xs uppercase tracking-[0.14em] flex items-center gap-2 text-ink">
              <BarChart2 className="h-4 w-4 text-clay" />
              Habits Completed — 7 Days
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5 h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 6, right: 8, bottom: 0, left: -24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line-subtle)" vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 10, fill: "var(--ink-muted)" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "var(--ink-muted)" }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--surface)",
                    border: "1px solid var(--line)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Bar
                  dataKey="completed"
                  fill="var(--accent)"
                  stroke="var(--line)"
                  strokeWidth={1}
                  radius={[5, 5, 0, 0]}
                  name="Completed"
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="total"
                  fill="var(--surface-muted)"
                  stroke="var(--line)"
                  strokeWidth={1}
                  radius={[5, 5, 0, 0]}
                  name="Total"
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-4 border-line bg-surface">
          <CardHeader className="pb-2 border-b border-line/15">
            <CardTitle className="font-mono text-xs uppercase tracking-[0.14em] text-ink">
              Today — Split
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5 flex flex-col items-center justify-center gap-5">
            <div className="h-[150px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={44}
                    outerRadius={66}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="var(--line)"
                    strokeWidth={1}
                    isAnimationActive={false}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "var(--surface)",
                      border: "1px solid var(--line)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-5">
              {pieData.map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div
                    className="h-2.5 w-2.5 rounded-full border border-line shrink-0"
                    style={{ background: PIE_COLORS[i] }}
                  />
                  <span className="text-xs font-medium text-ink">{d.name}</span>
                  <span className="font-mono text-xs text-ink-muted tabular-nums">
                    {d.value}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-8 border-line bg-surface">
          <CardHeader className="pb-2 border-b border-line/15">
            <CardTitle className="font-mono text-xs uppercase tracking-[0.14em] flex items-center gap-2 text-ink">
              <Calendar className="h-4 w-4 text-clay" />
              Consistency Heatmap — 12 Weeks
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 overflow-x-auto flex items-center">
            <div className="px-1">
              <HabitHeatmap data={analytics.heatmapData} />
              <div className="mt-5 flex items-center gap-2.5 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                <span>Less</span>
                <div className="flex gap-1">
                  {LEVEL_STYLES.map((c, i) => (
                    <div key={i} className={cn("h-2.5 w-2.5 rounded-[3px] border", c)} />
                  ))}
                </div>
                <span>More</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
