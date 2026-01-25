
"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell, Area, AreaChart } from "recharts"
import { Session } from "@/lib/definitions";
import { useMemo } from 'react';
import { format, subDays, startOfDay } from 'date-fns';

interface OverviewProps {
  sessions: Session[] | null;
}

export function Overview({ sessions }: OverviewProps) {
  const data = useMemo(() => {
    const weeklyData = Array.from({ length: 7 }).map((_, i) => {
      const date = startOfDay(subDays(new Date(), 6 - i));
      return {
        name: format(date, 'E'), // "Mon", "Tue", etc.
        date,
        total: 0,
      };
    });

    if (sessions) {
      sessions.forEach(session => {
        const sessionDayStart = startOfDay(new Date(session.startTime));
        const dayData = weeklyData.find(d => d.date.getTime() === sessionDayStart.getTime());
        if (dayData) {
          dayData.total += session.duration; // duration in seconds
        }
      });
    }

    return weeklyData.map(d => {
      const totalMinutes = Math.round(d.total / 60);
      const h = Math.floor(totalMinutes / 60);
      const m = totalMinutes % 60;
      return {
        name: d.name,
        total: totalMinutes,
        formatted: h > 0 ? `${h}h ${m}m` : `${m}m`
      };
    });
  }, [sessions]);


  if (!sessions) {
    return (
      <div style={{ height: 350, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="text-muted-foreground animate-pulse">Loading charts...</div>
      </div>
    )
  }

  return (
    <div className="h-[350px] w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="name"
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            dy={10}
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}m`}
          />
          <Tooltip
            cursor={{ fill: 'hsl(var(--primary)/0.1)', radius: 8 }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="glass px-3 py-2 rounded-lg border-white/10 shadow-xl">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      {payload[0].payload.name}
                    </p>
                    <p className="text-sm font-bold text-foreground">
                      {payload[0].payload.formatted}
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar
            dataKey="total"
            fill="url(#barGradient)"
            radius={[6, 6, 0, 0]}
            barSize={32}
            animationDuration={1500}
            animationEasing="ease-out"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
