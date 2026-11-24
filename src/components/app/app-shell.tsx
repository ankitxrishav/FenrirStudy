"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { LeftRail } from "./left-rail";
import { WorkspaceHeader } from "./workspace-header";
import { MobileNav } from "./mobile-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/login";

  if (isAuthPage) {
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
            {children}
          </main>
        </div>
      </div>
      <MobileNav />
    </div>
  );
}
