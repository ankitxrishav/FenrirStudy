"use client";

import { useState } from 'react';
import { RoomMember } from '@/lib/definitions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy, Clock, Medal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { motion, AnimatePresence } from 'framer-motion';

export function RoomLeaderboard({ members }: { members: RoomMember[] }) {
  const [period, setPeriod] = useState<'today' | 'weekly' | 'monthly'>('today');

  const getStats = (m: RoomMember) => {
    switch (period) {
      case 'today': return { seconds: m.todaySeconds || 0, sessions: m.todaySessions || 0 };
      case 'weekly': return { seconds: m.weeklySeconds || 0, sessions: m.weeklySessions || 0 };
      case 'monthly': return { seconds: m.monthlySeconds || 0, sessions: m.monthlySessions || 0 };
    }
  };

  const sortedMembers = [...members]
    .filter(m => getStats(m).seconds > 0)
    .sort((a, b) => getStats(b).seconds - getStats(a).seconds);

  if (sortedMembers.length === 0) return null;

  return (
    <Card className="border-white/10 bg-black/40 backdrop-blur-xl mt-6">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-primary">
          <Trophy className="h-4 w-4" /> Leaderboard
        </CardTitle>
        <ToggleGroup type="single" value={period} onValueChange={(v) => v && setPeriod(v as any)} size="sm">
          <ToggleGroupItem value="today" className="text-xs px-2 h-7">Day</ToggleGroupItem>
          <ToggleGroupItem value="weekly" className="text-xs px-2 h-7">Week</ToggleGroupItem>
          <ToggleGroupItem value="monthly" className="text-xs px-2 h-7">Month</ToggleGroupItem>
        </ToggleGroup>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {sortedMembers.map((m, index) => {
              const stats = getStats(m);
              const hours = Math.floor(stats.seconds / 3600);
              const minutes = Math.floor((stats.seconds % 3600) / 60);
              
              return (
                <motion.div
                  key={m.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-4 bg-white/5 rounded-xl p-3 border border-white/5 relative overflow-hidden"
                >
                  {index === 0 && <div className="absolute top-0 left-0 w-1 h-full bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]" />}
                  {index === 1 && <div className="absolute top-0 left-0 w-1 h-full bg-slate-300" />}
                  {index === 2 && <div className="absolute top-0 left-0 w-1 h-full bg-amber-700" />}
                  
                  <div className="flex items-center justify-center w-6 shrink-0">
                    {index === 0 ? <Medal className="h-5 w-5 text-yellow-500" /> :
                     index === 1 ? <Medal className="h-5 w-5 text-slate-300" /> :
                     index === 2 ? <Medal className="h-5 w-5 text-amber-700" /> :
                     <span className="text-xs text-muted-foreground font-mono">{index + 1}</span>}
                  </div>

                  <Avatar className="h-10 w-10 ring-2 ring-white/10">
                    <AvatarImage src={m.photoURL} />
                    <AvatarFallback>{m.displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{m.displayName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {m.subjectName && (
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: m.subjectColor || '#888' }} />
                          <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">{m.subjectName}</span>
                        </div>
                      )}
                      <span className="text-[10px] text-muted-foreground bg-white/5 px-1.5 rounded">{stats.sessions} sessions</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1.5 text-primary">
                      <Clock className="h-3 w-3" />
                      <span className="text-sm font-bold font-mono">
                        {hours > 0 ? `${hours}h ` : ''}{minutes}m
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}
