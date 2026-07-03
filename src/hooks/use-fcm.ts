"use client";

import { useEffect } from "react";
import { useUser, useFirestore } from "@/firebase";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";

export function useFcm() {
  const { user } = useUser();
  const firestore = useFirestore();

  useEffect(() => {
    if (!user || !firestore) return;

    let unsubscribeMessageListener: (() => void) | undefined;

    const setupFcm = async () => {
      try {
        // Dynamic import to prevent SSR rendering issues on server-side
        const { getMessaging, getToken, isSupported, onMessage } = await import("firebase/messaging");
        
        const supported = await isSupported();
        if (!supported) {
          console.warn("FCM is not supported in this browser environment.");
          return;
        }

        // 1. Request browser notification permission
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          console.log("FCM permission denied or dismissed.");
          return;
        }

        // 2. Wait for next-pwa / workbox service worker to be ready
        const registration = await navigator.serviceWorker.ready;

        const { initializeFirebase } = await import("@/firebase/config");
        const { app } = initializeFirebase();

        if (!app) return;
        const messaging = getMessaging(app);

        // 3. Request FCM token using VAPID Key
        const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
        const token = await getToken(messaging, {
          vapidKey,
          serviceWorkerRegistration: registration,
        });

        if (token) {
          // 4. Save registration token to Firestore under users/{userId}
          await updateDoc(doc(firestore, "users", user.uid), {
            fcmTokens: arrayUnion(token),
          });
          console.log("FCM Registration Token saved to Firestore:", token);
        }

        // 5. Setup foreground notification listener
        unsubscribeMessageListener = onMessage(messaging, (payload) => {
          console.log("Foreground message received:", payload);
          const currentPath = window.location.pathname;
          const roomUrl = `/rooms/${payload.data?.roomId || ""}`;

          // Only display system notification if the user is not actively inside the target room chat
          if (currentPath !== roomUrl) {
            const title = payload.notification?.title || "New Message";
            const options = {
              body: payload.notification?.body || "",
              icon: "/icon/icon-192.png",
              badge: "/icon/icon-192.png",
              data: payload.data,
            };
            if (Notification.permission === "granted") {
              new Notification(title, options);
            }
          }
        });
      } catch (err) {
        console.error("FCM setup failed:", err);
      }
    };

    // Delay setup slightly to ensure PWA service worker is fully loaded and registered
    const timeout = setTimeout(setupFcm, 1500);
    return () => {
      clearTimeout(timeout);
      if (unsubscribeMessageListener) {
        unsubscribeMessageListener();
      }
    };
  }, [user, firestore]);
}
