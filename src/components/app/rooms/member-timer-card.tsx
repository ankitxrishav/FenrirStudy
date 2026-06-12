'use client';

import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { RoomMember } from '@/lib/definitions';

interface MemberTimerCardProps {
  member: RoomMember;
  isCurrentUser: boolean;
  onSyncRequest: (member: RoomMember) => void;
  onMemberClick: (member: RoomMember) => void;
}

const formatTime = (s: number) => {
  const sec = Math.floor(Math.max(0, s));
  return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
};

export function MemberTimerCard({ member, isCurrentUser, onSyncRequest, onMemberClick }: MemberTimerCardProps) {
  const timerStatus = member.timerStatus ?? 'stopped';
  const timerMode = member.timerMode ?? 'pomodoro';
  const initialDuration = member.initialDuration ?? 1500;
  const accumulatedTime = member.accumulatedTime ?? 0;

  const computeDisplaySeconds = () => {
    if (timerStatus === 'running' && member.startedAt) {
      const elapsedSinceStart = (Date.now() - new Date(member.startedAt).getTime()) / 1000;
      const totalElapsed = accumulatedTime + elapsedSinceStart;
      if (timerMode === 'pomodoro') {
        return Math.max(0, initialDuration - totalElapsed);
      } else {
        return totalElapsed;
      }
    } else if (timerStatus === 'paused') {
      if (timerMode === 'pomodoro') {
        return Math.max(0, initialDuration - accumulatedTime);
      } else {
        return accumulatedTime;
      }
    } else {
      return timerMode === 'pomodoro' ? initialDuration : 0;
    }
  };

  const [displaySeconds, setDisplaySeconds] = useState(computeDisplaySeconds);

  // Recompute when key state changes (e.g. after a sync or status change)
  useEffect(() => {
    setDisplaySeconds(computeDisplaySeconds());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [member.startedAt, timerStatus, timerMode, accumulatedTime, initialDuration]);

  // Tick every second when running
  useEffect(() => {
    if (timerStatus !== 'running' || !member.startedAt) return;

    const interval = setInterval(() => {
      setDisplaySeconds(computeDisplaySeconds());
    }, 1000);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerStatus, member.startedAt, accumulatedTime, initialDuration, timerMode]);

  const progressPercent =
    timerMode === 'pomodoro' && initialDuration > 0
      ? (displaySeconds / initialDuration) * 100
      : 100;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onMemberClick(member)}
      onKeyDown={e => e.key === 'Enter' && onMemberClick(member)}
      id={`member-card-${member.userId}`}
      data-user-id={member.userId}
      className={cn(
        'member-card glass border-white/10 rounded-2xl p-4 flex flex-col gap-3 relative overflow-hidden transition-all duration-300 cursor-pointer hover:scale-[1.02] hover:border-white/20 active:scale-[0.98]',
        isCurrentUser && 'border-primary/40',
      )}
    >
      {/* Top row — avatar + name + status dot */}
      <div className="flex items-center gap-2">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={member.photoURL} />
          <AvatarFallback className="text-xs">{member.displayName?.[0]?.toUpperCase() ?? '?'}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">
            {member.displayName}
            {isCurrentUser && (
              <span className="text-muted-foreground font-normal"> (you)</span>
            )}
          </p>
        </div>
        <span
          className={cn(
            'h-2 w-2 rounded-full shrink-0',
            timerStatus === 'running'
              ? 'bg-green-500 animate-pulse'
              : timerStatus === 'paused'
              ? 'bg-yellow-500'
              : 'bg-muted-foreground/30',
          )}
        />
      </div>

      {/* Timer display */}
      <div className="flex flex-col items-center py-2">
        <span
          className={cn(
            'text-4xl font-black tracking-tighter tabular-nums transition-colors duration-300',
            timerStatus === 'running' ? 'text-foreground' : 'text-muted-foreground/50',
          )}
        >
          {formatTime(displaySeconds)}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 mt-1">
          {timerMode === 'pomodoro' ? 'Pomodoro' : 'Stopwatch'}
        </span>
      </div>

      {/* Subject pill */}
      {member.subjectName && (
        <div className="flex items-center gap-2">
          <div
            className="h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: member.subjectColor ?? '#888' }}
          />
          <span className="text-xs text-muted-foreground truncate">
            {member.subjectName}
          </span>
        </div>
      )}
      {!member.subjectName && member.timerStatus !== undefined && (
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full shrink-0 bg-muted-foreground/30" />
          <span className="text-xs text-muted-foreground">No subject</span>
        </div>
      )}

      {/* Daily Stats */}
      {(member.todaySessions !== undefined || member.todaySeconds !== undefined) && (
        <div className="mt-2 flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 border-t border-white/5 pt-2 w-full justify-between">
          <span>{member.todaySessions || 0} Sessions</span>
          <span>{Math.round((member.todaySeconds || 0) / 3600 * 10) / 10}h Today</span>
        </div>
      )}

      {/* Sync button — only shown when member is running AND not current user */}
      {timerStatus === 'running' && !isCurrentUser && (
        <Button
          variant="outline"
          size="sm"
          className="w-full mt-1 text-xs h-7"
          onClick={e => { e.stopPropagation(); onSyncRequest(member); }}
        >
          Sync to this timer
        </Button>
      )}

      {/* Progress bar at the bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/5">
        <div
          className="h-full transition-all duration-1000"
          style={{
            width: `${Math.max(0, Math.min(100, progressPercent))}%`,
            backgroundColor: member.subjectColor ?? 'hsl(var(--primary))',
          }}
        />
      </div>
    </div>
  );
}
