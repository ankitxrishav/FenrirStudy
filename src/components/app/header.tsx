
'use client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { UserNav } from './user-nav';
import { ThemeToggle } from './theme-toggle';
import Image from 'next/image';

export function FenrirLogo() {
    return (
        <Image src="/icon/logo.svg" alt="Fenrir Study Logo" width={24} height={24} className="text-primary" />
    )
}


export function AppHeader() {
  const { user, loading } = useUser();
  const router = useRouter();

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
        <Link href="/" className="flex items-center gap-2">
            <FenrirLogo />
            <span className="font-bold">fenrirstudy</span>
        </Link>
        <div className="flex flex-1 items-center justify-end space-x-2">
           <ThemeToggle />
          <nav className="flex items-center space-x-1">
            {loading ? (
                <div></div> // Or a skeleton loader
            ) : user ? (
                <UserNav />
            ) : (
              <Button onClick={() => router.push('/login')}>
                Login
              </Button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
