"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Cat, Flame } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { format, subDays } from "date-fns";
import { cn } from "@/lib/utils";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { User } from "@/lib/definitions";
import { useTimer } from "@/hooks/use-timer";
import { useMyRooms } from "@/hooks/use-room";
import { usePewCat } from "@/hooks/use-pewcat";
import { calculateUserLevel } from "@/lib/level";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";
import { UserNav } from "./user-nav";
import { FenrirLogo } from "@/components/icons";

function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function WorkspaceHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useUser();
  const firestore = useFirestore();
  const { rooms } = useMyRooms();
  const { pewCatEnabled, togglePewCat } = usePewCat();
  const { displayTime, isActive, isPaused, selectedSubjectName } = useTimer();

  const userDocRef = useMemo(
    () => (user && firestore ? doc(firestore, "users", user.uid) : null),
    [user, firestore]
  );
  const { data: userData } = useDoc<User>(userDocRef);

  // Preserve streak expiration logic from legacy header
  useEffect(() => {
    if (userData?.streak && userData?.lastStreakUpdate && firestore && user) {
      const today = format(new Date(), "yyyy-MM-dd");
      const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");
      const lastUpdate = userData.lastStreakUpdate;

      if (lastUpdate !== today && lastUpdate !== yesterday) {
        updateDoc(doc(firestore, "users", user.uid), { streak: 0 }).catch(() => {});
      }
    }
  }, [userData?.streak, userData?.lastStreakUpdate, firestore, user]);

  const activeRoom = useMemo(() => {
    if (!pathname.startsWith("/rooms/")) return null;
    const roomId = pathname.split("/")[2];
    return rooms.find((r) => r.id === roomId) ?? null;
  }, [pathname, rooms]);

  const pageTitle = useMemo(() => {
    if (activeRoom) return activeRoom.name;
    if (pathname.startsWith("/rooms")) return "Study Rooms";
    if (pathname.startsWith("/dashboard")) return "Overview";
    if (pathname.startsWith("/goals")) return "Daily Goals";
    if (pathname.startsWith("/routine")) return "Routine";
    if (pathname.startsWith("/subjects")) return "Subjects";
    if (pathname.startsWith("/history")) return "History";
    if (pathname.startsWith("/settings")) return "Settings";
    if (pathname.startsWith("/timer") || pathname === "/") return "Focus Timer";
    return "Fenrir Study";
  }, [pathname, activeRoom]);

  const level = calculateUserLevel(userData?.allTimeSeconds, userData?.allTimeSessions);
  const streak = userData?.streak || 0;
  const showRunningPill = isActive || isPaused;

  return (
    <>
      {/* Desktop / Tablet Capsule Header */}
      <header className="hidden md:flex items-center justify-between gap-3 mx-6 xl:mx-8 mt-4 mb-1 rounded-full border border-line bg-surface px-4 py-1.5 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-mono text-[11px] uppercase tracking-wider text-ink-muted shrink-0">
            fenrirstudy
          </span>
          <span className="h-3 w-px bg-line/20 shrink-0" />
          <span className="text-sm font-semibold text-ink truncate">{pageTitle}</span>
          {activeRoom && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line/30 bg-surface-soft px-2.5 py-0.5 font-mono text-[11px] text-ink">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              <span>{activeRoom.code}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {showRunningPill && (
            <Link
              href="/"
              className={cn(
                "inline-flex items-center gap-2 rounded-full border border-line px-3 py-1 font-mono text-xs timer-digit transition-colors duration-150",
                isActive ? "bg-clay-soft text-ink" : "bg-surface-soft text-ink-muted"
              )}
              title="Open Focus Timer"
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  isActive ? "bg-clay" : "bg-ink-muted"
                )}
              />
              <span>{formatClock(displayTime)}</span>
              {selectedSubjectName && (
                <span className="hidden lg:inline truncate max-w-[120px] font-sans text-xs">
                  · {selectedSubjectName}
                </span>
              )}
            </Link>
          )}

          {user && (
            <>
              <button
                type="button"
                onClick={togglePewCat}
                aria-pressed={pewCatEnabled}
                aria-label={pewCatEnabled ? "Turn PewCat off" : "Turn PewCat on"}
                title={pewCatEnabled ? "PewCat: On (click to hide)" : "PewCat: Off (click to show)"}
                className={cn(
                  "inline-flex items-center gap-1.5 h-9 rounded-full border px-3 text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  pewCatEnabled
                    ? "border-line bg-highlight text-ink"
                    : "border-line/35 bg-surface text-ink-muted hover:bg-surface-soft hover:text-ink"
                )}
              >
                <Cat className="h-4 w-4" strokeWidth={1.75} />
                <span>PewCat</span>
                <span className="font-mono text-[10px] opacity-80">
                  {pewCatEnabled ? "ON" : "OFF"}
                </span>
              </button>

              <div
                className="hidden lg:inline-flex items-center gap-1.5 h-9 rounded-full border border-line/30 bg-surface-soft px-3 font-mono text-xs text-ink"
                title="Current level & streak"
              >
                <span>L{level}</span>
                <span className="text-line/30">·</span>
                <Flame className="h-3.5 w-3.5 text-clay" strokeWidth={1.75} />
                <span className="timer-digit">{streak}d</span>
              </div>
            </>
          )}

          <ThemeToggle />

          {loading ? (
            <div className="h-10 w-10 rounded-full border border-line/20 bg-surface-soft animate-pulse" />
          ) : user ? (
            <UserNav />
          ) : (
            <Button onClick={() => router.push("/login")} size="sm" className="rounded-full">
              Sign in
            </Button>
          )}
        </div>
      </header>

      {/* Mobile Compact Top Bar */}
      <header className="flex md:hidden items-center justify-between gap-2 border-b border-line bg-surface px-3 h-14 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Link
            href={rooms.length === 1 ? `/rooms/${rooms[0].id}` : "/dashboard"}
            aria-label="Fenrir Study"
            className="flex h-9 w-9 items-center justify-center rounded-sm border border-line bg-surface-soft text-ink shrink-0"
          >
            <FenrirLogo className="h-4 w-4" />
          </Link>
          <span className="text-sm font-semibold text-ink truncate">{pageTitle}</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {showRunningPill && (
            <Link
              href="/"
              className="inline-flex items-center gap-1 rounded-full border border-line bg-clay-soft px-2 py-1 font-mono text-[11px] timer-digit text-ink"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-clay" />
              <span>{formatClock(displayTime)}</span>
            </Link>
          )}

          {user && (
            <button
              type="button"
              onClick={togglePewCat}
              aria-pressed={pewCatEnabled}
              aria-label={pewCatEnabled ? "Hide PewCat" : "Show PewCat"}
              title={`PewCat ${pewCatEnabled ? "On" : "Off"}`}
              className={cn(
                "inline-flex items-center justify-center gap-1 h-10 min-w-[44px] px-2.5 rounded-full border text-xs font-medium transition-colors duration-150",
                pewCatEnabled
                  ? "border-line bg-highlight text-ink"
                  : "border-line/35 bg-surface text-ink-muted"
              )}
            >
              <Cat className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              <span className="hidden min-[380px]:inline text-[11px]">PewCat</span>
            </button>
          )}

          <ThemeToggle />

          {user ? (
            <UserNav />
          ) : (
            !loading && (
              <Button onClick={() => router.push("/login")} size="sm">
                Sign in
              </Button>
            )
          )}
        </div>
      </header>
    </>
  );
}
