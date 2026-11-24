import type { Metadata } from "next";
import "./globals.css";
import { DM_Sans, IBM_Plex_Mono } from "next/font/google";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { FirebaseClientProvider } from "@/firebase/client-provider";
import { TimerProvider } from "@/hooks/use-timer";
import { PewCatProvider } from "@/hooks/use-pewcat";
import { FcmInitializer } from "@/components/app/fcm-initializer";
import { AppShell } from "@/components/app/app-shell";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "fenrirstudy",
  description: "Warm editorial focus timer and collaborative study rooms.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Fenrir",
  },
};

export const viewport = {
  themeColor: "#E9DFD0",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
          "min-h-dvh bg-page font-sans text-ink antialiased",
          dmSans.variable,
          ibmPlexMono.variable
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <FirebaseClientProvider>
            <TimerProvider>
              <PewCatProvider>
                <AppShell>{children}</AppShell>
                <Toaster />
                <FcmInitializer />
              </PewCatProvider>
            </TimerProvider>
          </FirebaseClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
