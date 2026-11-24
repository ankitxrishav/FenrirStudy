"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Users,
  Timer,
  LayoutGrid,
  MoreHorizontal,
  Target,
  Repeat2,
  BookOpen,
  History,
  Settings,
  Smartphone,
  LogOut,
} from "lucide-react";
import { signOut } from "firebase/auth";
import { cn } from "@/lib/utils";
import { useAuth, useUser } from "@/firebase";
import { useMyRooms } from "@/hooks/use-room";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const { user } = useUser();
  const { rooms } = useMyRooms();
  const [moreOpen, setMoreOpen] = React.useState(false);

  if (pathname === "/login") {
    return null;
  }

  const roomHref = rooms.length === 1 ? `/rooms/${rooms[0].id}` : "/rooms";

  const primaryTabs = [
    { href: roomHref, label: "Room", icon: Users, match: (p: string) => p.startsWith("/rooms") },
    { href: "/timer", label: "Timer", icon: Timer, match: (p: string) => p.startsWith("/timer") },
    { href: "/dashboard", label: "Overview", icon: LayoutGrid, match: (p: string) => p.startsWith("/dashboard") },
  ];

  const secondaryRoutes = [
    { href: "/goals", label: "Daily Goals", icon: Target },
    { href: "/routine", label: "Routine", icon: Repeat2 },
    { href: "/subjects", label: "Subjects", icon: BookOpen },
    { href: "/history", label: "History", icon: History },
    { href: "/settings", label: "Settings", icon: Settings },
    { href: "/download", label: "Get Android App", icon: Smartphone },
  ];

  const isSecondaryActive = secondaryRoutes.some((r) => pathname.startsWith(r.href));

  const handleSignOut = async () => {
    if (!auth) return;
    setMoreOpen(false);
    await signOut(auth);
    router.replace("/login");
  };

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed bottom-0 inset-x-0 z-40 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <div className="grid grid-cols-4 h-16">
        {primaryTabs.map((tab) => {
          const active = tab.match(pathname);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.label}
              href={tab.href}
              className={cn(
                "flex min-h-[44px] flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors duration-150",
                active ? "text-ink" : "text-ink-muted hover:text-ink"
              )}
            >
              <span
                className={cn(
                  "flex items-center justify-center rounded-full px-3 py-1 transition-colors",
                  active && "bg-highlight border border-line"
                )}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2 : 1.75} />
              </span>
              <span className={cn("leading-none", active && "font-semibold")}>{tab.label}</span>
            </Link>
          );
        })}

        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex min-h-[44px] flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors duration-150",
                isSecondaryActive ? "text-ink" : "text-ink-muted hover:text-ink"
              )}
              aria-label="More destinations"
            >
              <span
                className={cn(
                  "flex items-center justify-center rounded-full px-3 py-1 transition-colors",
                  isSecondaryActive && "bg-highlight border border-line"
                )}
              >
                <MoreHorizontal className="h-[18px] w-[18px]" strokeWidth={isSecondaryActive ? 2 : 1.75} />
              </span>
              <span className={cn("leading-none", isSecondaryActive && "font-semibold")}>More</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-[24px] border-t border-line bg-surface px-5 pb-8 pt-6">
            <SheetHeader className="text-left pb-4 border-b border-line/15">
              <SheetTitle className="text-lg font-semibold text-ink">Workspace</SheetTitle>
            </SheetHeader>
            <div className="mt-4 grid grid-cols-1 gap-2">
              {secondaryRoutes.map((route) => {
                const Icon = route.icon;
                const active = pathname.startsWith(route.href);
                return (
                  <Link
                    key={route.href}
                    href={route.href}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      "flex min-h-[44px] items-center gap-3 rounded-md border px-3.5 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "border-line bg-highlight text-ink font-semibold"
                        : "border-line/20 bg-surface-soft text-ink hover:border-line"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                    <span>{route.label}</span>
                  </Link>
                );
              })}

              {user && (
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="mt-2 flex min-h-[44px] items-center gap-3 rounded-md border border-line/20 bg-surface px-3.5 py-2.5 text-sm font-medium text-danger hover:border-danger"
                >
                  <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                  <span>Sign out</span>
                </button>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
