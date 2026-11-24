"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";
import { Session } from "@/lib/definitions";
import { format, subDays, startOfDay } from "date-fns";

interface OverviewProps {
  sessions: Session[] | null;
}

export function Overview({ sessions }: OverviewProps) {
  const data = useMemo(() => {
    const today = startOfDay(new Date());
    const weeklyData = Array.from({ length: 7 }).map((_, i) => {
      const date = startOfDay(subDays(today, 6 - i));
      return {
        name: format(date, "EEE"),
        fullDate: format(date, "MMM d"),
        date,
        isToday: i === 6,
        total: 0,
      };
    });

    if (sessions) {
      sessions.forEach((session) => {
        const sessionDayStart = startOfDay(new Date(session.startTime));
        const dayData = weeklyData.find(
          (d) => d.date.getTime() === sessionDayStart.getTime()
        );
        if (dayData) {
          dayData.total += session.duration;
        }
      });
    }

    return weeklyData.map((d) => {
      const totalMinutes = Math.round(d.total / 60);
      const h = Math.floor(totalMinutes / 60);
      const m = totalMinutes % 60;
      return {
        name: d.name,
        fullDate: d.fullDate,
        isToday: d.isToday,
        total: totalMinutes,
        formatted: h > 0 ? `${h}h ${m}m` : `${m}m`,
      };
    });
  }, [sessions]);

  if (!sessions) {
    return (
      <div className="h-[260px] flex items-center justify-center text-sm text-ink-muted">
        Loading chart...
      </div>
    );
  }

  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
          <XAxis
            dataKey="name"
            stroke="var(--ink-muted)"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: "var(--line-subtle)" }}
            dy={6}
          />
          <YAxis
            stroke="var(--ink-muted)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}m`}
          />
          <Tooltip
            cursor={{ fill: "rgba(36, 32, 27, 0.05)" }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const row = payload[0].payload as (typeof data)[number];
                return (
                  <div className="rounded-xl border border-line bg-surface px-3 py-2 text-ink">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                      {row.name} · {row.fullDate}
                    </p>
                    <p className="font-mono text-sm font-semibold tabular-nums">
                      {row.formatted}
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar
            dataKey="total"
            radius={[8, 8, 2, 2]}
            maxBarSize={36}
            isAnimationActive={false}
          >
            {data.map((entry, idx) => (
              <Cell
                key={`day-${idx}`}
                fill={entry.isToday ? "var(--accent)" : "var(--surface-muted)"}
                stroke="var(--line)"
                strokeWidth={1}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
