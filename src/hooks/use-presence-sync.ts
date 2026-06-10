'use client';

import { useEffect, useRef } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { updateMyPresence } from '@/hooks/use-room';

export function usePresenceSync(roomId: string) {
  const firestore = useFirestore();
  const { user } = useUser();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!firestore || !user || !roomId) return;

    const handlePresenceError = (e: any) => {
      if (e?.code !== 'not-found' && e?.code !== 'permission-denied') console.error(e);
    };

    // Set idle on mount
    updateMyPresence(firestore, user.uid, roomId, { status: 'idle' }).catch(handlePresenceError);

    // Heartbeat every 30s
    intervalRef.current = setInterval(() => {
      updateMyPresence(firestore, user.uid, roomId, {}).catch(handlePresenceError);
    }, 30_000);

    // Focus / blur listeners
    const handleFocus = () => {
      updateMyPresence(firestore, user.uid, roomId, { status: 'idle' }).catch(handlePresenceError);
    };
    const handleBlur = () => {
      updateMyPresence(firestore, user.uid, roomId, { status: 'offline' }).catch(handlePresenceError);
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      updateMyPresence(firestore, user.uid, roomId, { status: 'offline' }).catch(handlePresenceError);
    };
  }, [firestore, user, roomId]);
}
