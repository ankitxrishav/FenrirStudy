"use client";

import { RoomMember } from '@/lib/definitions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Activity, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

export function RoomMemberStats({ members }: { members: RoomMember[] }) {
  if (members.length === 0) return null;

  return (
    <Card className="border-white/10 bg-black/40 backdrop-blur-xl">
      <CardHeader className="pb-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-primary">
          <Activity className="h-4 w-4" /> Member Stats Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((m, i) => {
            // Calculate live time if running
            let liveTime = 0;
            if (m.timerStatus === 'running' && m.startedAt) {
              const start = new Date(m.startedAt).getTime();
              const now = new Date().getTime();
              liveTime = Math.floor(Math.max(0, now - start) / 1000);
            }
            
            // Add live time to total and subject total
            const todaySeconds = (m.todaySeconds || 0) + liveTime;
            const hours = Math.floor(todaySeconds / 3600);
            const minutes = Math.floor((todaySeconds % 3600) / 60);

            const subjSeconds = (m.currentSubjectTodaySeconds || 0) + liveTime;
            const subjHours = Math.floor(subjSeconds / 3600);
            const subjMins = Math.floor((subjSeconds % 3600) / 60);
            const subjTimeStr = subjHours > 0 ? `${subjHours}h ${subjMins}m` : `${subjMins}m`;

            // Calculate Level (include live time in xp for real-time level ups!)
            const allTimeMins = Math.floor(((m.allTimeSeconds || 0) + liveTime) / 60);
            const xp = (allTimeMins * 10) + ((m.allTimeSessions || 0) * 50);
            const level = Math.max(1, Math.floor(Math.sqrt(xp) / 5)); // adjusted curve for quicker early levels

            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.05 }}
                className="flex flex-col p-4 bg-card rounded-xl border border-border/50 shadow-sm relative overflow-hidden"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="relative">
                    <Avatar className="h-10 w-10 ring-2 ring-background">
                      <AvatarImage src={m.photoURL} />
                      <AvatarFallback>{m.displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground text-[9px] font-black px-1.5 py-0.5 rounded-sm border border-background shadow-sm">
                      Lvl {level}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate leading-none mb-1 text-foreground">{m.displayName}</p>
                    {m.subjectName ? (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="w-2 h-2 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: m.subjectColor || '#888' }} />
                        <span className="text-xs font-semibold text-muted-foreground truncate">
                          {m.subjectName} <span className="opacity-50 font-normal mx-0.5">•</span> <span className="text-foreground/80">{subjTimeStr} active</span>
                        </span>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">Not studying right now</p>
                    )}
                  </div>
                </div>

                {/* Today's Subject Breakdown */}
                {m.todaySubjectBreakdown && m.todaySubjectBreakdown.length > 0 && (
                  <div className="mt-1 mb-4 flex flex-col gap-1.5">
                    {m.todaySubjectBreakdown.map((s) => {
                      // Add live time to the currently active subject in the breakdown
                      const isCurrent = m.timerStatus === 'running' && m.subjectName === s.name;
                      const sSeconds = s.seconds + (isCurrent ? liveTime : 0);
                      const sHrs = Math.floor(sSeconds / 3600);
                      const sMins = Math.floor((sSeconds % 3600) / 60);
                      if (sHrs === 0 && sMins === 0) return null; // Hide 0m entries
                      return (
                        <div key={s.id} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: s.color || '#888' }} />
                            <span className="truncate text-muted-foreground">{s.name}</span>
                          </div>
                          <span className="font-medium text-foreground/80 shrink-0 ml-2">
                            {sHrs > 0 ? `${sHrs}h ` : ''}{sMins}m
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex items-center justify-between mt-auto pt-3 border-t border-border/50">
                  <div className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-md border border-border/30">
                    {m.todaySessions || 0} Sessions Today
                  </div>
                  <div className="flex items-center gap-1.5 text-primary">
                    <Clock className="h-3.5 w-3.5" />
                    <span className="text-sm font-bold font-mono">
                      {hours > 0 ? `${hours}h ` : ''}{minutes}m total
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
