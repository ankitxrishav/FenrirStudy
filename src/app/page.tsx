"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useUser, useFirestore, useCollection } from "@/firebase";
import { collectionGroup, query, where } from "firebase/firestore";
import Timer from "@/components/app/timer/timer";
import { PihuCat } from "@/components/app/rooms/pihu-cat";
import LoadingScreen from "@/components/app/loading-screen";
import { RoomMember } from "@/lib/definitions";

export default function Home() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  // Query to find if the user is currently a member of any room
  const memberDocsQuery = useMemo(() => {
    if (!user || !firestore) return null;
    return query(
      collectionGroup(firestore, "members"),
      where("userId", "==", user.uid)
    );
  }, [user, firestore]);

  const { data: memberDocs, loading: memberLoading } = useCollection<RoomMember>(memberDocsQuery);

  useEffect(() => {
    if (userLoading || memberLoading) return;

    if (user && memberDocs && memberDocs.length > 0) {
      // User is logged in and already a member of a room — redirect directly to the room
      const roomId = memberDocs[0].roomId;
      router.replace(`/rooms/${roomId}`);
    }
  }, [user, userLoading, memberDocs, memberLoading, router]);

  // Show a loading screen while resolving authentication and room membership status
  if (userLoading || (user && memberLoading)) {
    return <LoadingScreen />;
  }

  // Otherwise, render the main timer page
  return (
    <div className="flex h-full w-full items-center justify-center p-4">
      <Timer />
      <PihuCat greetingMode={true} />
    </div>
  );
}
