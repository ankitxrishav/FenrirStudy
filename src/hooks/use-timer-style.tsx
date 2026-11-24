"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { doc, setDoc } from "firebase/firestore";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { TimerFaceStyle, User } from "@/lib/definitions";

export type FullscreenTone = "warm" | "cream" | "charcoal";

const STYLE_STORAGE_KEY = "fenrir_timer_style";
const TONE_STORAGE_KEY = "fenrir_fullscreen_tone";

const VALID_STYLES: TimerFaceStyle[] = ["flip", "digital", "minimal", "progress"];
const VALID_TONES: FullscreenTone[] = ["warm", "cream", "charcoal"];

export function useTimerStyle() {
  const { user } = useUser();
  const firestore = useFirestore();

  const [timerStyle, setTimerStyleState] = useState<TimerFaceStyle>("flip");
  const [fullscreenTone, setFullscreenToneState] = useState<FullscreenTone>("cream");

  const userDocRef = useMemo(
    () => (user && firestore ? doc(firestore, "users", user.uid) : null),
    [user, firestore]
  );
  const { data: userData } = useDoc<User>(userDocRef);

  useEffect(() => {
    try {
      const savedStyle = localStorage.getItem(STYLE_STORAGE_KEY) as TimerFaceStyle | null;
      if (savedStyle && VALID_STYLES.includes(savedStyle)) {
        setTimerStyleState(savedStyle);
      }
      const savedTone = localStorage.getItem(TONE_STORAGE_KEY) as FullscreenTone | null;
      if (savedTone && VALID_TONES.includes(savedTone)) {
        setFullscreenToneState(savedTone);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    const remoteStyle = userData?.settings?.timerFace;
    if (remoteStyle && VALID_STYLES.includes(remoteStyle)) {
      setTimerStyleState(remoteStyle);
      try {
        localStorage.setItem(STYLE_STORAGE_KEY, remoteStyle);
      } catch {
        // ignore
      }
    }
  }, [userData?.settings?.timerFace]);

  const setTimerStyle = useCallback(
    (style: TimerFaceStyle) => {
      setTimerStyleState(style);
      try {
        localStorage.setItem(STYLE_STORAGE_KEY, style);
      } catch {
        // ignore
      }
      if (user && firestore) {
        setDoc(
          doc(firestore, "users", user.uid),
          { settings: { timerFace: style } },
          { merge: true }
        ).catch(() => {});
      }
    },
    [user, firestore]
  );

  const setFullscreenTone = useCallback((tone: FullscreenTone) => {
    setFullscreenToneState(tone);
    try {
      localStorage.setItem(TONE_STORAGE_KEY, tone);
    } catch {
      // ignore
    }
  }, []);

  return {
    timerStyle,
    setTimerStyle,
    fullscreenTone,
    setFullscreenTone,
  };
}

export function requestBrowserFullscreen() {
  if (typeof document === "undefined") return;
  try {
    if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
      void document.documentElement.requestFullscreen().catch(() => {});
    }
  } catch {
    // Fallback overlay works without Fullscreen API
  }
}
