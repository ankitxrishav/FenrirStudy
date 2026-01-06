
'use client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { UserNav } from './user-nav';
import { ThemeToggle } from './theme-toggle';
import { FenrirLogo } from '@/components/icons';
import { Home, LayoutDashboard, Book, History, Settings } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export function AppHeader() {
  const { user, loading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <header className="fixed top-0 z-40 w-full border-b bg-background/80 backdrop-blur-lg">
      <div className="container flex h-16 items-center">
        <Link href="/" className="flex items-center gap-2 mr-6">
            <FenrirLogo className="w-6 h-6 text-foreground"/>
            <span className="font-bold hidden sm:inline-block">fenrirstudy</span>
        </Link>
        
        <div className="flex flex-1 items-center justify-end space-x-2">
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
