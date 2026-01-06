
'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Home, LayoutDashboard, Book, History, Settings } from 'lucide-react';
import { motion } from 'framer-motion';

export default function BottomNav() {
  const pathname = usePathname();

  const routes = [
    { href: '/', label: 'Timer', icon: Home },
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/subjects', label: 'Subjects', icon: Book },
    { href: '/history', label: 'History', icon: History },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  // Hide nav on login page
  if (pathname === '/login') {
    return null;
  }

  return (
      <div className="flex items-center gap-2 rounded-full border bg-background/80 p-2 shadow-lg backdrop-blur-lg">
        {routes.map((route) => (
          <Link
            key={route.href}
            href={route.href}
            className={cn(
              'relative flex h-12 w-12 flex-col items-center justify-center gap-1 rounded-full text-xs font-medium transition-colors duration-200',
              pathname === route.href ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <route.icon className="h-5 w-5" />
            <span className="sr-only">{route.label}</span>
          </Link>
        ))}
      </div>
  );
}
