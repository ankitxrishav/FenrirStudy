"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useUser } from "@/firebase";
import { LeftRail } from "./left-rail";
import { WorkspaceHeader } from "./workspace-header";
import { MobileNav } from "./mobile-nav";
import LoadingScreen from "./loading-screen";

const PROTECTED_PREFIXES = [
  "/rooms",
  "/timer",
  "/dashboard",
  "/goals",
  "/routine",
  "/subjects",
  "/history",
  "/settings",
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading: userLoading } = useUser();

  const isAuthPage = pathname === "/login";
  const isRootLanding = pathname === "/";
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  useEffect(() => {
    if (isProtected && !userLoading && !user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [isProtected, userLoading, user, pathname, router]);

  // Auth page and unauthenticated / resolving root landing render without app workspace chrome
  if (isAuthPage || (isRootLanding && (userLoading || !user))) {
    return (
      <div className="min-h-dvh w-full bg-page flex items-center justify-center p-0 md:p-6">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-dvh w-full bg-page md:p-3 lg:p-5 flex justify-center">
      <div className="w-full max-w-[1600px] min-h-dvh md:min-h-[calc(100dvh-1.5rem)] lg:min-h-[calc(100dvh-2.5rem)] md:max-h-[calc(100dvh-1.5rem)] lg:max-h-[calc(100dvh-2.5rem)] bg-surface md:border md:border-line md:rounded-[22px] flex overflow-hidden">
        <LeftRail />
        <div className="flex flex-1 min-w-0 flex-col">
          <WorkspaceHeader />
          <main className="flex-1 overflow-y-auto px-4 sm:px-6 xl:px-8 py-5 pb-24 md:pb-8">
            {isProtected && (userLoading || !user) ? (
              <LoadingScreen label={userLoading ? "Restoring workspace" : "Redirecting to sign in"} />
            ) : (
              children
            )}
          </main>
        </div>
      </div>
      <MobileNav />
    </div>
  );
}
