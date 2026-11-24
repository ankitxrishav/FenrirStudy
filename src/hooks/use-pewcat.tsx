'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { doc, setDoc } from 'firebase/firestore';
import { usePathname } from 'next/navigation';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { User } from '@/lib/definitions';

const PihuCat = dynamic(
  () => import('@/components/app/rooms/pihu-cat').then((m) => m.PihuCat),
  { ssr: false }
);

interface PewCatContextValue {
  pewCatEnabled: boolean;
  setPewCatEnabled: (enabled: boolean) => void;
  togglePewCat: () => void;
  isFullscreenActive: boolean;
  setFullscreenActive: (active: boolean) => void;
}

const PewCatContext = createContext<PewCatContextValue>({
  pewCatEnabled: true,
  setPewCatEnabled: () => {},
  togglePewCat: () => {},
  isFullscreenActive: false,
  setFullscreenActive: () => {},
});

const STORAGE_KEY = 'fenrir_pewcat';

export function PewCatProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const pathname = usePathname();

  const [pewCatEnabled, setPewCatState] = useState<boolean>(true);
  const [mounted, setMounted] = useState(false);
  const [isFullscreenActive, setFullscreenActive] = useState(false);

  const userDocRef = useMemo(
    () => (user && firestore ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: userData } = useDoc<User>(userDocRef);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'false') {
        setPewCatState(false);
      } else if (stored === 'true') {
        setPewCatState(true);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    if (typeof userData?.settings?.pewCatEnabled === 'boolean') {
      const remote = userData.settings.pewCatEnabled;
      setPewCatState(remote);
      try {
        localStorage.setItem(STORAGE_KEY, String(remote));
      } catch {
        // ignore storage errors
      }
    }
  }, [userData?.settings?.pewCatEnabled]);

  const setPewCatEnabled = useCallback(
    (enabled: boolean) => {
      setPewCatState(enabled);
      try {
        localStorage.setItem(STORAGE_KEY, String(enabled));
      } catch {
        // ignore storage errors
      }
      if (user && firestore) {
        setDoc(
          doc(firestore, 'users', user.uid),
          { settings: { pewCatEnabled: enabled } },
          { merge: true }
        ).catch(() => {});
      }
    },
    [user, firestore]
  );

  const togglePewCat = useCallback(() => {
    setPewCatEnabled(!pewCatEnabled);
  }, [pewCatEnabled, setPewCatEnabled]);

  const showMascot =
    mounted &&
    pewCatEnabled &&
    !isFullscreenActive &&
    !!user &&
    pathname !== '/login';

  const value = useMemo(
    () => ({
      pewCatEnabled,
      setPewCatEnabled,
      togglePewCat,
      isFullscreenActive,
      setFullscreenActive,
    }),
    [pewCatEnabled, setPewCatEnabled, togglePewCat, isFullscreenActive]
  );

  return (
    <PewCatContext.Provider value={value}>
      {children}
      {showMascot && <PihuCat />}
    </PewCatContext.Provider>
  );
}

export function usePewCat() {
  return useContext(PewCatContext);
}
