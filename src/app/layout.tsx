
import type { Metadata } from 'next';
import './globals.css';
import { Inter } from 'next/font/google';
import { cn } from '@/lib/utils';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from "@/components/ui/toaster"
import BottomNav from '@/components/app/bottom-nav';
import { AppHeader } from '@/components/app/header';
import { FirebaseClientProvider } from '@/firebase/client-provider';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'fenrirstudy',
  description: 'A personal study analytics system to enhance focus and productivity.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          'h-dvh bg-background font-sans antialiased overflow-hidden',
          inter.variable
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <FirebaseClientProvider>
            <div className="relative flex h-full w-full flex-col">
              <AppHeader />
              <main className="flex-1 overflow-y-auto pt-16 pb-24">
                {children}
              </main>
              <footer className="fixed bottom-0 inset-x-0 z-50 h-20 flex items-center justify-center">
                <BottomNav />
              </footer>
            </div>
            <Toaster />
          </FirebaseClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
