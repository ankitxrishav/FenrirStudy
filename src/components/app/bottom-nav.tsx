
'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Home, LayoutDashboard, Book, History as HistoryIcon, Settings, Target, Repeat2, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { useMyRooms } from '@/hooks/use-room';

export default function BottomNav() {
  const pathname = usePathname();
  const { rooms } = useMyRooms();

  const roomsHref = rooms.length === 1 ? `/rooms/${rooms[0].id}` : '/rooms';

  const routes = [
    { href: '/', label: 'Timer', icon: Home },
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/goals', label: 'Goals', icon: Target },
    { href: roomsHref, label: 'Rooms', icon: Users },
    { href: '/routine', label: 'Routine', icon: Repeat2 },
    { href: '/subjects', label: 'Subjects', icon: Book },
    { href: '/history', label: 'History', icon: HistoryIcon },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  // Hide nav on login page
  if (pathname === '/login') {
    return null;
  }

  return (
    <nav id="bottom-mobile-nav" className="flex items-center gap-0.5 rounded-full border bg-background/60 p-1 shadow-2xl backdrop-blur-xl md:gap-1 md:p-1.5 pointer-events-auto">
      {routes.map((route) => {
        const isActiveRoute =
          pathname === route.href ||
          (route.label === 'Rooms' && pathname.startsWith('/rooms'));
        return (
          <Link
            key={route.href}
            href={route.href}
            className={cn(
              'relative flex items-center justify-center gap-1.5 rounded-full px-2.5 py-2 text-[11px] font-medium transition-all duration-300 md:px-3 md:py-2.5 md:text-sm',
              isActiveRoute ? 'text-primary-foreground' : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
            )}
          >
            {isActiveRoute && (
              <motion.div
                layoutId="active-nav-bg"
                className="absolute inset-0 z-0 rounded-full bg-primary shadow-lg shadow-primary/20"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
              />
            )}
            <route.icon className={cn('relative z-10 h-3.5 w-3.5 md:h-5 md:w-5', isActiveRoute && 'scale-110')} />
            <span className={cn('relative z-10', isActiveRoute ? 'block' : 'hidden md:block')}>
              {route.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
