
'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Home, LayoutDashboard, Book, History, Settings } from 'lucide-react';

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
    <div className="fixed bottom-0 inset-x-0 z-50 h-24 pointer-events-none">
        <div className="w-full h-full max-w-sm mx-auto p-4">
            <div className="grid h-full grid-cols-5 bg-background/80 backdrop-blur-lg border rounded-full shadow-lg pointer-events-auto">
                {routes.map((route) => (
                <Link
                    key={route.href}
                    href={route.href}
                    className={cn(
                    'flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors duration-300 hover:text-primary rounded-full',
                    pathname === route.href
                        ? 'text-primary'
                        : 'text-muted-foreground'
                    )}
                >
                    <route.icon className="h-5 w-5" />
                    <span className="hidden sm:inline">{route.label}</span>
                </Link>
                ))}
            </div>
      </div>
    </div>
  );
}
