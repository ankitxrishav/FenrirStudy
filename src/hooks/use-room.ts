'use client';

import { useMemo, useState, useEffect } from 'react';
import {
  collection,
  collectionGroup,
  query,
  where,
  orderBy,
  limit,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  setDoc,
  arrayUnion,
  arrayRemove,
  increment,
  getDoc,
  Firestore,
} from 'firebase/firestore';
import { format, startOfDay, subDays } from 'date-fns';
import { useUser, useFirestore, useCollection, useDoc } from '@/firebase';
import {
  Room,
  RoomMember,
  RoomMessage,
  RoomChallenge,
  RoomGoal,
} from '@/lib/definitions';
import type { User as FirebaseUser } from 'firebase/auth';

// ─── Helper ────────────────────────────────────────────────────────────────

/** Generate a random 6-char uppercase room code (no ambiguous 0/O/1/I/L) */
function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// ─── useRoom ───────────────────────────────────────────────────────────────

export function useRoom(roomId: string) {
  const firestore = useFirestore();

  const roomDoc = useMemo(() => {
    if (!firestore || !roomId) return null;
    return doc(firestore, 'rooms', roomId);
  }, [firestore, roomId]);

  const { data: room, loading: roomLoading } = useDoc<Room>(roomDoc);

  const membersQuery = useMemo(() => {
    if (!firestore || !roomId) return null;
    return query(collection(firestore, 'rooms', roomId, 'members'));
  }, [firestore, roomId]);

  const { data: membersRaw, loading: membersLoading } = useCollection<RoomMember>(membersQuery);

  // Sort: running first, paused, stopped/idle, offline
  const members = useMemo(() => {
    if (!membersRaw) return [];
    // Prefer timerStatus (live timer presence) if available, else fall back to legacy status
    const timerOrder: Record<string, number> = { running: 0, paused: 1, stopped: 2 };
    const statusOrder: Record<string, number> = { studying: 0, break: 1, idle: 2, offline: 3 };
    return [...membersRaw].sort((a, b) => {
      const aOrder = a.timerStatus !== undefined
        ? (timerOrder[a.timerStatus] ?? 3)
        : (statusOrder[a.status] ?? 4);
      const bOrder = b.timerStatus !== undefined
        ? (timerOrder[b.timerStatus] ?? 3)
        : (statusOrder[b.status] ?? 4);
      if (aOrder !== bOrder) return aOrder - bOrder;
      return (a.displayName || "").localeCompare(b.displayName || "");
    });
  }, [membersRaw]);

  const messagesQuery = useMemo(() => {
    if (!firestore || !roomId) return null;
    return query(
      collection(firestore, 'rooms', roomId, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(50)
    );
  }, [firestore, roomId]);

  const { data: messages, loading: messagesLoading } = useCollection<RoomMessage>(messagesQuery);

  const challengesQuery = useMemo(() => {
    if (!firestore || !roomId) return null;
    return query(
      collection(firestore, 'rooms', roomId, 'challenges'),
      where('status', '==', 'active')
    );
  }, [firestore, roomId]);

  const { data: challenges, loading: challengesLoading } = useCollection<RoomChallenge>(challengesQuery);

  const goalsQuery = useMemo(() => {
    if (!firestore || !roomId) return null;
    return query(
      collection(firestore, 'rooms', roomId, 'goals'),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, roomId]);

  const { data: roomGoals, loading: goalsLoading } = useCollection<RoomGoal>(goalsQuery);

  const loading = roomLoading || membersLoading || messagesLoading || challengesLoading || goalsLoading;

  return {
    room: room ?? null,
    members,
    messages: messages ?? [],
    challenges: challenges ?? [],
    roomGoals: roomGoals ?? [],
    loading,
  };
}

// ─── useMyRooms ────────────────────────────────────────────────────────────

export function useMyRooms() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  // We use collectionGroup for the member docs, then fetch room docs
  const memberDocsQuery = useMemo(() => {
    if (!user || !firestore) return null;
    return query(
      collectionGroup(firestore, 'members'),
      where('userId', '==', user.uid)
    );
  }, [user, firestore]);

  const { data: memberDocs, loading: memberDocsLoading } = useCollection<RoomMember>(memberDocsQuery);

  useEffect(() => {
    if (memberDocsLoading || !firestore || !memberDocs) return;

    if (memberDocs.length === 0) {
      setRooms([]);
      setLoading(false);
      return;
    }

    const fetchRooms = async () => {
      try {
        const roomIds = [...new Set(memberDocs.map(m => m.roomId))];
        const roomDocs = await Promise.all(
          roomIds.map(id => getDoc(doc(firestore, 'rooms', id)))
        );
        const fetched = roomDocs
          .filter(d => d.exists())
          .map(d => ({ id: d.id, ...d.data() } as Room));
        setRooms(fetched);
      } catch (e) {
        console.error('useMyRooms fetch error', e);
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
  }, [memberDocs, memberDocsLoading, firestore]);

  return { rooms, loading };
}

// ─── Async helpers ─────────────────────────────────────────────────────────

type RoomUserLike = Pick<FirebaseUser, 'uid' | 'displayName' | 'photoURL'>;

export async function createRoom(
  firestore: Firestore,
  user: RoomUserLike,
  opts: { name: string; description?: string; password?: string }
): Promise<string> {
  // Enforce maximum 1 room limit
  const memberDocsQuery = query(
    collectionGroup(firestore, 'members'),
    where('userId', '==', user.uid)
  );
  const snapMembers = await getDocs(memberDocsQuery);
  if (!snapMembers.empty) {
    throw new Error('You can only be in one study room at a time. Please leave your current room first.');
  }

  const code = generateRoomCode();
  const now = new Date().toISOString();

  const roomRef = await addDoc(collection(firestore, 'rooms'), {
    name: opts.name,
    description: opts.description ?? '',
    code,
    password: opts.password ?? '',
    ownerId: user.uid,
    memberIds: [user.uid],
    createdAt: now,
    totalMemberCount: 1,
    collectiveStreak: 0,
    lastCollectiveStreakUpdate: '',
  });

  const roomId = roomRef.id;

  // Write owner member doc
  await setDoc(doc(firestore, 'rooms', roomId, 'members', user.uid), {
    roomId,
    userId: user.uid,
    role: 'owner',
    joinedAt: now,
    status: 'idle',
    displayName: user.displayName ?? '',
    photoURL: user.photoURL ?? '',
    lastSeen: now,
  });

  // System message
  await addDoc(collection(firestore, 'rooms', roomId, 'messages'), {
    type: 'system',
    text: `Room created by ${user.displayName ?? 'Someone'}`,
    createdAt: now,
    userId: user.uid,
    displayName: user.displayName ?? '',
    photoURL: user.photoURL ?? '',
    roomId,
  });

  return roomId;
}

export async function joinRoomByCode(
  firestore: Firestore,
  user: RoomUserLike,
  opts: { code: string; password?: string }
): Promise<string> {
  // Enforce maximum 1 room limit
  const memberDocsQuery = query(
    collectionGroup(firestore, 'members'),
    where('userId', '==', user.uid)
  );
  const snapMembers = await getDocs(memberDocsQuery);
  if (!snapMembers.empty) {
    throw new Error('You can only be in one study room at a time. Please leave your current room first.');
  }

  const roomsQuery = query(
    collection(firestore, 'rooms'),
    where('code', '==', opts.code.toUpperCase())
  );
  const snap = await getDocs(roomsQuery);

  if (snap.empty) throw new Error('Room not found');

  const roomDoc = snap.docs[0];
  const room = { id: roomDoc.id, ...roomDoc.data() } as Room;

  if (room.password && room.password !== (opts.password ?? '')) {
    throw new Error('Wrong password');
  }

  const memberDocRef = doc(firestore, 'rooms', room.id, 'members', user.uid);
  const memberDocSnap = await getDoc(memberDocRef);
  if (memberDocSnap.exists()) {
    throw new Error('Already a member');
  }

  const now = new Date().toISOString();

  await setDoc(doc(firestore, 'rooms', room.id, 'members', user.uid), {
    roomId: room.id,
    userId: user.uid,
    role: 'member',
    joinedAt: now,
    status: 'idle',
    displayName: user.displayName ?? '',
    photoURL: user.photoURL ?? '',
    lastSeen: now,
  });

  await updateDoc(doc(firestore, 'rooms', room.id), {
    memberIds: arrayUnion(user.uid),
    totalMemberCount: increment(1),
  });

  await addDoc(collection(firestore, 'rooms', room.id, 'messages'), {
    type: 'system',
    text: `${user.displayName ?? 'Someone'} joined the room`,
    createdAt: now,
    userId: user.uid,
    displayName: user.displayName ?? '',
    photoURL: user.photoURL ?? '',
    roomId: room.id,
  });

  return room.id;
}

export async function leaveRoom(
  firestore: Firestore,
  user: { uid: string; displayName?: string | null },
  roomId: string,
  targetUserId?: string // if set, owner removing another member
): Promise<void> {
  const uid = targetUserId ?? user.uid;
  const now = new Date().toISOString();

  // Only write message for self-leave (not kicks)
  if (!targetUserId) {
    await addDoc(collection(firestore, 'rooms', roomId, 'messages'), {
      type: 'system',
      text: `${user.displayName ?? 'Someone'} left the room`,
      createdAt: now,
      userId: user.uid,
      displayName: user.displayName ?? '',
      photoURL: '',
      roomId,
    });
  }

  await deleteDoc(doc(firestore, 'rooms', roomId, 'members', uid));

  await updateDoc(doc(firestore, 'rooms', roomId), {
    memberIds: arrayRemove(uid),
    totalMemberCount: increment(-1),
  });
}

export async function updateMyPresence(
  firestore: Firestore,
  userId: string,
  roomId: string,
  update: Partial<RoomMember>
): Promise<void> {
  await updateDoc(doc(firestore, 'rooms', roomId, 'members', userId), {
    ...update,
    lastSeen: new Date().toISOString(),
  });
}

export async function sendMessage(
  firestore: Firestore,
  user: RoomUserLike,
  roomId: string,
  text: string,
  imageUrl?: string,
  replyTo?: {
    id: string;
    displayName: string;
    text?: string;
    imageUrl?: string;
  },
  cloudinaryPublicId?: string
): Promise<void> {
  const payload: any = {
    roomId,
    userId: user.uid,
    displayName: user.displayName ?? '',
    photoURL: user.photoURL ?? '',
    text,
    createdAt: new Date().toISOString(),
    type: 'message',
  };
  
  if (imageUrl) payload.imageUrl = imageUrl;
  if (replyTo) payload.replyTo = replyTo;
  if (cloudinaryPublicId) payload.cloudinaryPublicId = cloudinaryPublicId;

  await addDoc(collection(firestore, 'rooms', roomId, 'messages'), payload);
}

export async function checkAndUpdateCollectiveStreak(
  firestore: Firestore,
  roomId: string
): Promise<void> {
  try {
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    const yesterdayStr = format(subDays(today, 1), 'yyyy-MM-dd');
    const startOfToday = startOfDay(today).toISOString();

    // Get room doc
    const roomSnap = await getDoc(doc(firestore, 'rooms', roomId));
    if (!roomSnap.exists()) return;
    const room = { id: roomSnap.id, ...roomSnap.data() } as Room;

    // Query sessions for any member today
    const memberIds = room.memberIds;
    if (memberIds.length === 0) return;

    // Batch into chunks of 30 (Firestore 'in' limit)
    const chunks: string[][] = [];
    for (let i = 0; i < memberIds.length; i += 30) {
      chunks.push(memberIds.slice(i, i + 30));
    }

    let hasStudyToday = false;
    for (const chunk of chunks) {
      const sessSnap = await getDocs(
        query(
          collection(firestore, 'sessions'),
          where('userId', 'in', chunk),
          where('startTime', '>=', startOfToday)
        )
      );
      if (!sessSnap.empty) {
        hasStudyToday = true;
        break;
      }
    }

    if (!hasStudyToday) return;

    const last = room.lastCollectiveStreakUpdate ?? '';
    let newStreak = 1;
    if (last === todayStr) return; // Already updated today
    if (last === yesterdayStr) newStreak = (room.collectiveStreak ?? 0) + 1;

    await updateDoc(doc(firestore, 'rooms', roomId), {
      collectiveStreak: newStreak,
      lastCollectiveStreakUpdate: todayStr,
    });
  } catch (e) {
    console.error('checkAndUpdateCollectiveStreak error', e);
  }
}
