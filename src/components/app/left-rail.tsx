"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutGrid,
  Users,
  Timer,
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
import { FenrirLogo } from "@/components/icons";

export function LeftRail() {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const { user } = useUser();
  const { rooms } = useMyRooms();

  const roomHref = rooms.length === 1 ? `/rooms/${rooms[0].id}` : "/rooms";

  const primaryNav = [
    { href: "/dashboard", label: "Overview", icon: LayoutGrid, match: (p: string) => p.startsWith("/dashboard") },
    { href: roomHref, label: "Room", icon: Users, match: (p: string) => p.startsWith("/rooms") },
    { href: "/timer", label: "Timer", icon: Timer, match: (p: string) => p.startsWith("/timer") },
    { href: "/goals", label: "Goals", icon: Target, match: (p: string) => p.startsWith("/goals") },
    { href: "/routine", label: "Routine", icon: Repeat2, match: (p: string) => p.startsWith("/routine") },
    { href: "/subjects", label: "Subjects", icon: BookOpen, match: (p: string) => p.startsWith("/subjects") },
    { href: "/history", label: "History", icon: History, match: (p: string) => p.startsWith("/history") },
  ];

  const handleSignOut = async () => {
    if (!auth) return;
    await signOut(auth);
    router.replace("/login");
  };

  return (
    <aside
      aria-label="Primary navigation"
      className="hidden md:flex w-[76px] xl:w-[88px] shrink-0 flex-col items-center justify-between border-r border-line bg-surface py-4 px-2 select-none"
    >
      <div className="flex flex-col items-center gap-4 w-full">
        <Link
          href={rooms.length === 1 ? `/rooms/${rooms[0].id}` : "/dashboard"}
          aria-label="Fenrir Study home"
          className="flex h-11 w-11 items-center justify-center rounded-md border border-line bg-surface-soft text-ink hover:bg-highlight transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <FenrirLogo className="h-5 w-5" />
        </Link>

        <nav className="flex flex-col items-center gap-1.5 w-full">
          {primaryNav.map((item) => {
            const active = item.match(pathname);
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "group flex w-full flex-col items-center justify-center gap-1 rounded-[10px] py-2 px-1 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "bg-highlight border border-line text-ink"
                    : "border border-transparent text-ink-muted hover:bg-surface-soft hover:text-ink"
                )}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2 : 1.75} />
                <span className={cn("text-[10px] leading-none tracking-tight", active ? "font-semibold" : "font-medium")}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex flex-col items-center gap-1.5 w-full pt-3 border-t border-line/15">
        <Link
          href="/download"
          className={cn(
            "flex w-full flex-col items-center justify-center gap-1 rounded-[10px] py-2 px-1 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            pathname.startsWith("/download")
              ? "bg-highlight border border-line text-ink"
              : "border border-transparent text-ink-muted hover:bg-surface-soft hover:text-ink"
          )}
        >
          <Smartphone className="h-[18px] w-[18px]" strokeWidth={pathname.startsWith("/download") ? 2 : 1.75} />
          <span className="text-[10px] leading-none font-medium">Android</span>
        </Link>

        <Link
          href="/settings"
          className={cn(
            "flex w-full flex-col items-center justify-center gap-1 rounded-[10px] py-2 px-1 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            pathname.startsWith("/settings")
              ? "bg-highlight border border-line text-ink"
              : "border border-transparent text-ink-muted hover:bg-surface-soft hover:text-ink"
          )}
        >
          <Settings className="h-[18px] w-[18px]" strokeWidth={pathname.startsWith("/settings") ? 2 : 1.75} />
          <span className="text-[10px] leading-none font-medium">Settings</span>
        </Link>

        {user && (
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full flex-col items-center justify-center gap-1 rounded-[10px] py-2 px-1 border border-transparent text-ink-muted hover:bg-surface-soft hover:text-danger transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <LogOut className="h-[18px] w-[18px]" strokeWidth={1.75} />
            <span className="text-[10px] leading-none font-medium">Sign out</span>
          </button>
        )}
      </div>
    </aside>
  );
}
