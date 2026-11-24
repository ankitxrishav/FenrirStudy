"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { doc } from "firebase/firestore";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { useMyRooms } from "@/hooks/use-room";
import LoadingScreen from "@/components/app/loading-screen";
import { AuthScreen } from "@/components/app/auth-screen";
import { User } from "@/lib/definitions";
import { setActiveRoomCookie, setStartPageCookie } from "@/lib/routing-cookies";

export default function Home() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { rooms, loading: roomsLoading } = useMyRooms();

  const userDocRef = useMemo(
    () => (user && firestore ? doc(firestore, "users", user.uid) : null),
    [user, firestore]
  );
  const { data: userData, loading: userDocLoading } = useDoc<User>(userDocRef);

  useEffect(() => {
    if (userLoading) return;
    if (!user) return;
    if (roomsLoading || userDocLoading) return;

    if (rooms.length > 0) {
      const roomId = rooms[0].id;
      setActiveRoomCookie(roomId);
      router.replace(`/rooms/${roomId}`);
      return;
    }

    setActiveRoomCookie(null);
    const pref = userData?.settings?.startPage;
    if (pref) setStartPageCookie(pref);

    if (pref === "timer") {
      router.replace("/timer");
    } else if (pref === "rooms") {
      router.replace("/rooms");
    } else {
      router.replace("/dashboard");
    }
  }, [user, userLoading, rooms, roomsLoading, userData?.settings?.startPage, userDocLoading, router]);

  if (userLoading || (user && (roomsLoading || userDocLoading))) {
    return <LoadingScreen label="Preparing your workspace" />;
  }

  if (user) {
    return <LoadingScreen label="Opening your workspace" />;
  }

  return <AuthScreen />;
}
