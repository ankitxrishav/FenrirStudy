'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MemberTimerCard } from './member-timer-card';
import { useTimer } from '@/hooks/use-timer';
import { useToast } from '@/hooks/use-toast';
import { RoomMember } from '@/lib/definitions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface MemberTimerGridProps {
  members: RoomMember[];
  currentUserId: string;
  roomId: string;
  onMemberClick: (member: RoomMember) => void;
}

export function MemberTimerGrid({ members, currentUserId, onMemberClick }: MemberTimerGridProps) {
  const { handleModeChange, handleDurationChange, start, stop, isIdle } = useTimer();
  const { toast } = useToast();
  const [syncTarget, setSyncTarget] = useState<RoomMember | null>(null);

  // The actual sync — called after user confirms
  const doSync = async (targetMember: RoomMember) => {
    // If the user's timer is currently running/paused, stop it first
    if (!isIdle) {
      await stop('stopped');
      // Small delay so Firestore write settles before we write new state
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    if (
      targetMember.timerMode === 'pomodoro' &&
      targetMember.timerStatus === 'running' &&
      targetMember.startedAt
    ) {
      // Compute how much time is left on the target's timer right now
      const elapsedSinceStart =
        (Date.now() - new Date(targetMember.startedAt).getTime()) / 1000;
      const totalElapsed = (targetMember.accumulatedTime ?? 0) + elapsedSinceStart;
      const remaining = Math.max(10, (targetMember.initialDuration ?? 1500) - totalElapsed);

      // Set our timer to pomodoro mode with the remaining duration
      handleModeChange('pomodoro');
      handleDurationChange(Math.round(remaining / 60)); // convert seconds to minutes

      // Small delay to let the duration change propagate
      await new Promise(resolve => setTimeout(resolve, 200));

      // Start our timer immediately
      await start();

      toast({
        title: `Synced with ${targetMember.displayName}`,
        description: `Your timer is now running in sync. ${Math.round(remaining / 60)}m remaining.`,
      });
    } else if (targetMember.timerMode === 'stopwatch') {
      handleModeChange('stopwatch');
      await start();
      toast({
        title: `Synced with ${targetMember.displayName}`,
        description: 'Your stopwatch is now running.',
      });
    }
  };

  const handleSyncRequest = (member: RoomMember) => {
    setSyncTarget(member);
  };

  const studyingCount = members.filter(m => m.timerStatus === 'running').length;

  return (
    <div className="space-y-4">
      {/* Section label */}
      <div className="flex items-center gap-2 mb-4">
        <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Live — {studyingCount} studying now
        </h2>
      </div>

      {/* Grid */}
      <div id="member-timer-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <AnimatePresence mode="popLayout">
          {members.map((member, i) => (
            <motion.div
              key={member.id || member.userId || `member-${i}`}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <MemberTimerCard
                member={member}
                isCurrentUser={member.userId === currentUserId}
                onSyncRequest={handleSyncRequest}
                onMemberClick={onMemberClick}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {members.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No members yet. Share your room code to invite friends.
        </div>
      )}

      {/* Sync confirmation dialog */}
      <AlertDialog
        open={!!syncTarget}
        onOpenChange={open => !open && setSyncTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sync timer?</AlertDialogTitle>
            <AlertDialogDescription>
              Your timer will be set to match{' '}
              <strong>{syncTarget?.displayName}</strong>&apos;s countdown and start
              immediately.{!isIdle && ' Your current session will be stopped first.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (syncTarget) {
                  doSync(syncTarget);
                  setSyncTarget(null);
                }
              }}
            >
              Sync
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
