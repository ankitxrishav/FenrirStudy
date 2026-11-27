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
import { format, parseISO } from "date-fns";
import { sliceSessionsByDate } from "@/lib/study-time";

interface OverviewProps {
  sessions: Session[] | null;
}

export function Overview({ sessions }: OverviewProps) {
  const data = useMemo(() => {
    if (!sessions) return null;
    const sliced = sliceSessionsByDate(sessions, 7);
    return sliced.map((entry, i) => {
      const dateObj = parseISO(entry.dateKey);
      const totalMinutes = Math.round(entry.seconds / 60);
      const h = Math.floor(totalMinutes / 60);
      const m = totalMinutes % 60;
      return {
        name: format(dateObj, "EEE"),
        fullDate: format(dateObj, "MMM d"),
        isToday: i === sliced.length - 1,
        total: totalMinutes,
        formatted: h > 0 ? `${h}h ${m}m` : `${m}m`,
      };
    });
  }, [sessions]);

  if (!data) {
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
