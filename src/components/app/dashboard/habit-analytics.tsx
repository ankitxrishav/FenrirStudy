'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { BarChart2, Flame, Target, TrendingUp, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
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
} from 'recharts';
import { useHabits } from '@/hooks/use-habits';

// -------------------------------------------------------
// Stat Card
// -------------------------------------------------------
function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return (
    <Card className="glass-card">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">
          <span>{label}</span>
          {icon}
        </div>
        <div className="text-3xl font-black tracking-tighter">{value}</div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 mt-2">{sub}</div>
      </CardContent>
    </Card>
  );
}

// -------------------------------------------------------
// Heatmap
// -------------------------------------------------------
const LEVEL_CLASSES = [
  'bg-muted',
  'bg-primary/20',
  'bg-primary/40',
  'bg-primary/70',
  'bg-primary',
];

function HabitHeatmap({ data }: { data: { date: string; level: number }[] }) {
  const weeks: { date: string; level: number }[][] = [];
  let week: { date: string; level: number }[] = [];

  if (data.length === 0) return null;

  const firstDay = new Date(data[0].date);
  const firstDayOfWeek = firstDay.getDay();
  for (let i = 0; i < firstDayOfWeek; i++) week.push({ date: '', level: -1 });

  for (const d of data) {
    week.push(d);
    if (week.length === 7) { weeks.push(week); week = []; }
  }
  if (week.length > 0) weeks.push(week);

  return (
    <div className="flex gap-1.5 min-w-max">
      {weeks.map((wk, wi) => (
        <div key={wi} className="flex flex-col gap-1.5">
          {wk.map((d, di) => (
            <div
              key={di}
              title={d.date || ''}
              className={cn(
                'h-3 w-3 rounded-sm transition-colors',
                d.level < 0 ? 'opacity-0' : LEVEL_CLASSES[d.level] ?? 'bg-muted'
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// -------------------------------------------------------
// Habit Analytics Component
// -------------------------------------------------------
export function HabitAnalytics({ analytics }: { analytics: ReturnType<typeof useHabits>['analytics'] }) {
  if (!analytics) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 rounded-2xl bg-muted/40 animate-pulse" />
        ))}
      </div>
    );
  }

  const PIE_COLORS = ['hsl(var(--primary))', 'hsl(var(--muted-foreground) / 0.3)'];
  const pieData = [
    { name: 'Completed', value: analytics.todaySummary.completed },
    { name: 'Missed', value: analytics.todaySummary.missed },
  ];

  const barData = analytics.dailyCompletions.slice(-7).map(d => ({
    day: format(new Date(d.date), 'EEE'),
    completed: d.count,
    total: d.total,
  }));

  const lineData = analytics.dailyCompletions.slice(-14).map(d => ({
    date: format(new Date(d.date), 'MMM d'),
    rate: d.total > 0 ? Math.round((d.count / d.total) * 100) : 0,
  }));

  const streaks = Object.values(analytics.streakByHabit);
  const bestCurrent = streaks.reduce((m, s) => Math.max(m, s.current), 0);
  const bestLongest = streaks.reduce((m, s) => Math.max(m, s.longest), 0);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Target className="h-4 w-4" />} label="Today's Rate"  value={`${analytics.completionRateToday}%`} sub="completion" />
        <StatCard icon={<TrendingUp className="h-4 w-4" />} label="Weekly Avg" value={`${analytics.weeklyAvgRate}%`}       sub="last 7 days" />
        <StatCard icon={<Flame className="h-4 w-4" />}     label="Best Streak" value={`${bestCurrent}d`}                  sub={`longest ${bestLongest}d`} />
        <StatCard icon={<Calendar className="h-4 w-4" />}  label="Today Progress" value={`${analytics.todaySummary.completed}/${analytics.todaySummary.total}`} sub={`${analytics.todaySummary.missed} missed`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Line Chart */}
        <Card className="glass border-white/10 shadow-2xl overflow-hidden">
          <CardHeader className="pb-2 border-b border-white/5">
            <CardTitle className="text-xs font-bold uppercase tracking-[0.2em] flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
              Completion Rate — Last 14 Days
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData} margin={{ top: 4, right: 8, bottom: 0, left: -24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.1)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 11 }}
                  formatter={(v: number) => [`${v}%`, 'Rate']}
                />
                <Line type="monotone" dataKey="rate" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4, fill: 'hsl(var(--primary))', strokeWidth: 2, stroke: 'hsl(var(--background))' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bar Chart */}
        <Card className="glass border-white/10 shadow-2xl overflow-hidden">
          <CardHeader className="pb-2 border-b border-white/5">
            <CardTitle className="text-xs font-bold uppercase tracking-[0.2em] flex items-center gap-2">
              <BarChart2 className="h-3.5 w-3.5 text-primary" />
              Habits Completed — Last 7 Days
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 4, right: 8, bottom: 0, left: -24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.1)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 11 }}
                />
                <Bar dataKey="completed" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Completed" />
                <Bar dataKey="total"     fill="hsl(var(--muted-foreground) / 0.1)" radius={[4, 4, 0, 0]} name="Total" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Pie Chart */}
        <Card className="lg:col-span-4 glass border-white/10 shadow-2xl overflow-hidden h-fit md:h-[350px]">
          <CardHeader className="pb-2 border-b border-white/5">
            <CardTitle className="text-xs font-bold uppercase tracking-[0.2em]">Today — Completed vs Missed</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 h-[250px] flex flex-col items-center justify-center gap-6">
            <div className="h-[140px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={4} dataKey="value" strokeWidth={0}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-4">
              {pieData.map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full shrink-0" style={{ background: PIE_COLORS[i] }} />
                  <span className="text-[10px] font-bold uppercase tracking-tight">{d.name}</span>
                  <span className="text-[10px] text-muted-foreground font-black">{d.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Heatmap */}
        <Card className="lg:col-span-8 glass border-white/10 shadow-2xl overflow-hidden h-fit md:h-[350px]">
          <CardHeader className="pb-2 border-b border-white/5">
            <CardTitle className="text-xs font-bold uppercase tracking-[0.2em] flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              Consistency Heatmap — Last 12 Weeks
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-8 overflow-x-auto custom-scrollbar h-[250px] flex items-center">
            <div className="px-2">
              <HabitHeatmap data={analytics.heatmapData} />
              <div className="mt-6 flex items-center gap-3 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">
                <span>Less</span>
                <div className="flex gap-1">
                  {LEVEL_CLASSES.map((c, i) => (<div key={i} className={cn("h-2 w-2 rounded-sm", c)} />))}
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
