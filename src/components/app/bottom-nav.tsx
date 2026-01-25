
'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Home, LayoutDashboard, Book, History as HistoryIcon, Settings, Target } from 'lucide-react';
import { motion } from 'framer-motion';

export default function BottomNav() {
  const pathname = usePathname();

  const routes = [
    { href: '/', label: 'Timer', icon: Home },
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/goals', label: 'Goals', icon: Target },
    { href: '/subjects', label: 'Subjects', icon: Book },
    { href: '/history', label: 'History', icon: HistoryIcon },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  // Hide nav on login page
  if (pathname === '/login') {
    return null;
  }

  return (
    <nav className="flex items-center gap-1 rounded-full border bg-background/60 p-1.5 shadow-2xl backdrop-blur-xl md:gap-2 md:p-2">
      {routes.map((route) => {
        const isActiveRoute = pathname === route.href;
        return (
          <Link
            key={route.href}
            href={route.href}
            className={cn(
              'relative flex items-center justify-center gap-2 rounded-full px-3 py-2 text-xs font-medium transition-all duration-300 md:px-4 md:py-2.5 md:text-sm',
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
            <route.icon className={cn('relative z-10 h-4 w-4 md:h-5 md:w-5', isActiveRoute && 'scale-110')} />
            <span className={cn('relative z-10', isActiveRoute ? 'block' : 'hidden md:block')}>
              {route.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
