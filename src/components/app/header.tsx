
'use client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { UserNav } from './user-nav';
import { ThemeToggle } from './theme-toggle';
import { FenrirLogo } from '@/components/icons';
import { Home, LayoutDashboard, Book, History, Settings, Flame } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { User } from '@/lib/definitions';
import { useMemo, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { format, subDays } from 'date-fns';
import Image from 'next/image';

export function AppHeader() {
  const { user, loading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const pathname = usePathname();

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

        <div className="flex flex-1 items-center justify-end space-x-2">
          {user && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 font-bold text-sm">
              <Flame className="w-4 h-4 fill-current" />
              <span>{userData?.streak || 0}</span>
            </div>
          )}
          <ThemeToggle />
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
    </header>
  );
}
