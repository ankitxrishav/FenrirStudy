
'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, type User as FirebaseAuthUser } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { useFirebase } from '../provider';
import { type User as AppUser } from '@/lib/definitions';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

let lastSyncedUid: string | null = null;

export function useUser() {
  const { auth, firestore, loading: firebaseLoading } = useFirebase();
  const [user, setUser] = useState<FirebaseAuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (firebaseLoading) {
      setLoading(true);
      return;
    }

    if (!auth || !firestore) {
      setLoading(false);
      return;
    }

    console.log("[Auth] Attaching onAuthStateChanged listener...");
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      if (authUser) {
        setUser(authUser);
        setLoading(false);

        // Optimize: Only sync profile once per session/UID to avoid network storms
        if (lastSyncedUid !== authUser.uid) {
          lastSyncedUid = authUser.uid;
          console.log("[Auth] Performing one-time profile sync for:", authUser.uid);

          const userRef = doc(firestore, `users/${authUser.uid}`);
          getDoc(userRef).then((userSnap) => {
            if (!userSnap.exists()) {
              const userData: Omit<AppUser, 'createdAt' | 'lastLogin'> & {
                createdAt: any;
                lastLogin: any;
              } = {
                uid: authUser.uid,
                displayName: authUser.displayName || 'Anonymous',
                email: authUser.email || '',
                photoURL: authUser.photoURL || '',
                streak: 0,
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp(),
              };

              setDoc(userRef, userData).catch((serverError) => {
                const permissionError = new FirestorePermissionError({
                  path: userRef.path,
                  operation: 'create',
                  requestResourceData: userData,
                });
                errorEmitter.emit('permission-error', permissionError);
              });
            } else {
              const updateData = { lastLogin: serverTimestamp() };
              setDoc(userRef, updateData, { merge: true }).catch((serverError) => {
                const permissionError = new FirestorePermissionError({
                  path: userRef.path,
                  operation: 'update',
                  requestResourceData: updateData,
                });
                errorEmitter.emit('permission-error', permissionError);
              });
            }
          }).catch((e) => {
            const permissionError = new FirestorePermissionError({
              path: userRef.path,
              operation: 'get',
            });
            errorEmitter.emit('permission-error', permissionError);
          });
        }
      } else {
        setUser(null);
        setLoading(false);
        lastSyncedUid = null; // Clear on logout
      }
    });

    return () => unsubscribe();
  }, [auth, firestore, firebaseLoading]);

  return { user, loading };
}
