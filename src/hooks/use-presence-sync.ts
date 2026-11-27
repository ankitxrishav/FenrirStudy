'use client';

import { useEffect } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { updateMyPresence } from '@/hooks/use-room';

export function usePresenceSync(roomId: string) {
  const firestore = useFirestore();
  const { user } = useUser();

  useEffect(() => {
    if (!firestore || !user || !roomId) return;
    updateMyPresence(firestore, user.uid, roomId, {}).catch(() => {});
  }, [firestore, user, roomId]);
}
