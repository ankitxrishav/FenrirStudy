
'use client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { UserNav } from './user-nav';
import { ThemeToggle } from './theme-toggle';
import { FenrirLogo } from '@/components/icons';
import { Home, LayoutDashboard, Book, History, Settings, Flame, Settings2 } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { User } from '@/lib/definitions';
import { useMemo, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { format, subDays } from 'date-fns';
import Image from 'next/image';
import { useTimer } from '@/hooks/use-timer';
import { motion, AnimatePresence } from 'framer-motion';
import { StyleSelector } from './timer/style-selector';

export function AppHeader() {
  const { user, loading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const pathname = usePathname();
  const { activeFace, handleFaceChange } = useTimer();
  const [isStyleSelectorOpen, setStyleSelectorOpen] = useState(false);

  const userDocRef = useMemo(() => (user && firestore ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
  const { data: userData } = useDoc<User>(userDocRef);

  // Streak expiration logic
  useEffect(() => {
    if (userData?.streak && userData?.lastStreakUpdate && firestore && user) {
      const today = format(new Date(), 'yyyy-MM-dd');
      const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
      const lastUpdate = userData.lastStreakUpdate;

      if (lastUpdate !== today && lastUpdate !== yesterday) {
        // Streak expired
        updateDoc(doc(firestore, 'users', user.uid), {
          streak: 0
        });
      }
    }
  }, [userData, firestore, user]);

  return (
    <header className="fixed top-0 z-40 w-full border-b bg-background/80 backdrop-blur-lg">
      <div className="container flex h-16 items-center">
        <Link href="/" className="flex items-center gap-2 mr-6">
          <Image
            src="/icon/logo.svg"
            alt="fenrirstudy logo"
            width={32}
            height={32}
            className="dark:invert dark:brightness-150"
          />
          <span className="font-bold hidden sm:inline-block">fenrirstudy</span>
        </Link>

        <div className="flex flex-1 items-center justify-end space-x-3">
          {user && (
            <div className="flex items-center gap-2">
              {/* Ritual Controls Group */}
              <div className="flex items-center gap-1 p-1 rounded-full bg-white/5 border border-white/10 shadow-sm transition-all hover:bg-white/10 group relative">
                <ThemeToggle />
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 glass border border-white/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                  <span className="text-[8px] font-bold uppercase tracking-widest text-foreground">Mood Shift</span>
                </div>
              </div>

              <div className="flex items-center gap-1 p-1 rounded-full bg-white/5 border border-white/10 shadow-sm transition-all hover:bg-white/10 active:scale-95 group relative">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setStyleSelectorOpen(true)}
                  className="h-9 w-9 text-muted-foreground hover:text-primary transition-colors hover:bg-transparent"
                >
                  <Settings2 className="h-4 w-4" />
                </Button>
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 glass border border-white/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                  <span className="text-[8px] font-bold uppercase tracking-widest text-foreground">Watch Style</span>
                </div>
              </div>

              {/* Streak Counter */}
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-orange-100/50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 font-bold text-sm shadow-sm border border-orange-200/50 dark:border-orange-500/20">
                <Flame className="h-4 w-4 fill-current animate-pulse" />
                <span>{userData?.streak || 0}</span>
              </div>
            </div>
          )}
          {loading ? (
            <div className="h-9 w-9 bg-muted rounded-full animate-pulse"></div>
          ) : user ? (
            <UserNav />
          ) : (
            <Button onClick={() => router.push('/login')} size="sm">
              Login
            </Button>
          )}
        </div>
      </div>

      <StyleSelector
        isOpen={isStyleSelectorOpen}
        onOpenChange={setStyleSelectorOpen}
        activeFace={activeFace}
        onFaceChange={handleFaceChange}
      />
    </header>
  );
}
