"use client";

import { useState, useEffect } from "react";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { collectionGroup, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { ArrowRight, Users, Maximize2, BarChart2 } from "lucide-react";
import { useAuth, useFirestore, useUser } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { FenrirLogo } from "@/components/icons";
import { AndroidDownloadCard } from "@/components/app/android-download-card";
import LoadingScreen from "@/components/app/loading-screen";
import {
  setAuthHintCookie,
  setActiveRoomCookie,
  setStartPageCookie,
} from "@/lib/routing-cookies";
import { cn } from "@/lib/utils";
import { User } from "@/lib/definitions";

const SLIDES = [
  {
    id: "rooms",
    tag: "01 · SHARED WORKSPACES",
    title: "Study alongside people, quietly.",
    description:
      "Join a persistent study room once and return right where you left off. See live session status without noisy feeds.",
    icon: Users,
    previewTitle: "Computer Science · Room",
    previewMeta: "4 online · FEN123",
    previewClock: "24:18",
  },
  {
    id: "focus",
    tag: "02 · IMMERSIVE POMODORO",
    title: "Full-screen flip timer, zero clutter.",
    description:
      "Expand your personal or room timer into a quiet full-viewport display with wake lock and minimal controls.",
    icon: Maximize2,
    previewTitle: "Operating Systems",
    previewMeta: "Pomodoro · Cycle 2 of 4",
    previewClock: "42:00",
  },
  {
    id: "rhythm",
    tag: "03 · CONSISTENT HABITS",
    title: "Measure focus without noise.",
    description:
      "Track subjects, daily targets, and routines in calm weekly summaries that stay out of your way while working.",
    icon: BarChart2,
    previewTitle: "Weekly Focus",
    previewMeta: "18h 40m logged",
    previewClock: "03:15",
  },
];

export function AuthScreen() {
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, loading: userLoading } = useUser();

  const [slideIdx, setSlideIdx] = useState(0);
  const [signingIn, setSigningIn] = useState(false);

  const resolveDestinationAndRedirect = async (uid: string) => {
    setAuthHintCookie(true);

    let nextParam: string | null = null;
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const rawNext = sp.get("next");
      if (rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//")) {
        nextParam = rawNext;
      }
    }

    let activeRoomId: string | null = null;
    let fallbackRoute = "/dashboard";

    if (firestore) {
      try {
        const [memberSnap, userSnap] = await Promise.all([
          getDocs(query(collectionGroup(firestore, "members"), where("userId", "==", uid))),
          getDoc(doc(firestore, "users", uid)),
        ]);

        if (!memberSnap.empty) {
          const candidateRoomId = memberSnap.docs[0].data()?.roomId as string | undefined;
          if (candidateRoomId) {
            const roomDoc = await getDoc(doc(firestore, "rooms", candidateRoomId));
            if (roomDoc.exists()) {
              activeRoomId = candidateRoomId;
            }
          }
        }

        if (userSnap.exists()) {
          const uData = userSnap.data() as User;
          if (uData.settings?.startPage) {
            setStartPageCookie(uData.settings.startPage);
            if (uData.settings.startPage === "timer") fallbackRoute = "/timer";
            else if (uData.settings.startPage === "rooms") fallbackRoute = "/rooms";
          }
        }
      } catch {
        // Fall through to default route cleanly
      }
    }

    setActiveRoomCookie(activeRoomId);

    if (nextParam) {
      router.replace(nextParam);
      return;
    }

    if (activeRoomId) {
      router.replace(`/rooms/${activeRoomId}`);
    } else {
      router.replace(fallbackRoute);
    }
  };

  useEffect(() => {
    if (!userLoading && user) {
      resolveDestinationAndRedirect(user.uid);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userLoading]);

  const handleGoogleSignIn = async () => {
    if (!auth) {
      toast({
        title: "Authentication unavailable",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
      return;
    }

    setSigningIn(true);
    const provider = new GoogleAuthProvider();
    try {
      const cred = await signInWithPopup(auth, provider);
      await resolveDestinationAndRedirect(cred.user.uid);
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      if (err?.code === "auth/popup-closed-by-user") {
        setSigningIn(false);
        return;
      }
      toast({
        title: "Sign in failed",
        description: err?.message || "Could not sign in with Google.",
        variant: "destructive",
      });
      setSigningIn(false);
    }
  };

  if (userLoading || user) {
    return <LoadingScreen label="Restoring your study room" />;
  }

  const activeSlide = SLIDES[slideIdx];
  const SlideIcon = activeSlide.icon;

  return (
    <div className="w-full max-w-[980px] mx-auto px-4 py-6 md:py-10">
      <div className="rounded-[22px] border border-line bg-surface overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        {/* Left editorial story panel (desktop) */}
        <div className="hidden lg:flex lg:col-span-7 flex-col justify-between border-r border-line bg-surface-soft p-8 xl:p-10">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-sm border border-line bg-surface">
                <FenrirLogo className="h-4 w-4 text-ink" />
              </div>
              <span className="font-mono text-xs font-medium text-ink">fenrirstudy</span>
            </div>
            <span className="font-mono text-[11px] text-ink-muted">{activeSlide.tag}</span>
          </div>

          {/* Framed editorial study desk preview */}
          <div className="my-8 rounded-[18px] border border-line bg-surface p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-line/15 pb-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-clay border border-line" />
                <span className="font-mono text-xs text-ink font-medium">{activeSlide.previewTitle}</span>
              </div>
              <span className="rounded-full border border-line bg-highlight px-2.5 py-0.5 font-mono text-[11px] text-ink">
                {activeSlide.previewMeta}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 items-center py-2">
              <div className="rounded-[14px] border border-line bg-surface-soft px-5 py-6 flex flex-col items-center justify-center">
                <span className="font-mono text-5xl font-semibold tracking-tight text-ink timer-digit">
                  {activeSlide.previewClock}
                </span>
                <span className="mt-2 font-mono text-[11px] text-ink-muted">FOCUS BLOCK</span>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between rounded-[10px] border border-line/30 bg-surface px-3 py-2">
                  <span className="text-xs font-medium text-ink">Aarav</span>
                  <span className="font-mono text-xs text-ink-muted timer-digit">18:40</span>
                </div>
                <div className="flex items-center justify-between rounded-[10px] border border-line bg-accent-soft px-3 py-2">
                  <span className="text-xs font-medium text-ink">You</span>
                  <span className="font-mono text-xs text-ink timer-digit">{activeSlide.previewClock}</span>
                </div>
                <div className="flex items-center justify-between rounded-[10px] border border-line/30 bg-surface px-3 py-2">
                  <span className="text-xs font-medium text-ink">Maya</span>
                  <span className="font-mono text-xs text-ink-muted timer-digit">05:00 break</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-line bg-surface">
                <SlideIcon className="h-4 w-4 text-ink" strokeWidth={1.75} />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-ink leading-tight">
                  {activeSlide.title}
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-muted max-w-md">
                  {activeSlide.description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              {SLIDES.map((s, idx) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSlideIdx(idx)}
                  aria-label={`View slide ${idx + 1}: ${s.title}`}
                  className={cn(
                    "h-2 rounded-full border border-line transition-all duration-150",
                    idx === slideIdx ? "w-7 bg-ink" : "w-2 bg-surface hover:bg-surface-muted"
                  )}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right sign-in panel */}
        <div className="lg:col-span-5 p-6 sm:p-10 flex flex-col justify-between gap-8 bg-surface">
          <div className="flex items-center justify-between lg:justify-end">
            <div className="inline-flex items-center gap-2 lg:hidden">
              <div className="flex h-9 w-9 items-center justify-center rounded-sm border border-line bg-surface-soft">
                <FenrirLogo className="h-4 w-4 text-ink" />
              </div>
              <span className="font-mono text-xs font-medium text-ink">fenrirstudy</span>
            </div>
            <span className="font-mono text-[11px] text-ink-muted">WORKSPACE ACCESS</span>
          </div>

          <div className="space-y-6 my-auto">
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-ink leading-[1.08]">
                Sign in to study
              </h1>
              <p className="text-sm leading-relaxed text-ink-muted">
                Return directly to your active study room, or open a personal focus timer.
              </p>
            </div>

            <div className="space-y-3">
              <Button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={!auth || signingIn}
                className="w-full h-12 rounded-[10px] border border-line bg-clay text-ink font-semibold text-sm justify-between px-4 hover:bg-clay/90"
              >
                <span className="flex items-center gap-2.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border border-line bg-surface font-mono text-xs font-semibold">
                    G
                  </span>
                  <span>{signingIn ? "Signing in..." : "Continue with Google"}</span>
                </span>
                <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
              </Button>
            </div>

            <div className="border-t border-line/15 pt-4 space-y-2 text-xs text-ink-muted">
              <p>Active room members land straight in their study room.</p>
              <p>Your personal timer stays accessible anytime from the sidebar or bottom bar.</p>
            </div>

            <AndroidDownloadCard compact />
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-ink-muted">
            <span>FENRIRSTUDY</span>
            <span>FIREBASE AUTH</span>
          </div>
        </div>
      </div>
    </div>
  );
}
