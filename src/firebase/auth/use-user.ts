
'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, type User as FirebaseAuthUser } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { useFirebase } from '../provider';
import { type User as AppUser } from '@/lib/definitions';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

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

    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        const userRef = doc(firestore, `users/${authUser.uid}`);
        
        try {
          const userSnap = await getDoc(userRef);

          if (!userSnap.exists()) {
            const userData: Omit<AppUser, 'createdAt'> & { createdAt: any; lastLogin: any } = {
              uid: authUser.uid,
              displayName: authUser.displayName || 'Anonymous',
              email: authUser.email || '',
              photoURL: authUser.photoURL || '',
              createdAt: serverTimestamp(),
              lastLogin: serverTimestamp(),
            };
            
            await setDoc(userRef, userData).catch((serverError) => {
                const permissionError = new FirestorePermissionError({
                    path: userRef.path,
                    operation: 'create',
                    requestResourceData: userData,
                });
                errorEmitter.emit('permission-error', permissionError);
            });

          } else {
            const updateData = { lastLogin: serverTimestamp() };
            await setDoc(userRef, updateData, { merge: true }).catch((serverError) => {
                const permissionError = new FirestorePermissionError({
                    path: userRef.path,
                    operation: 'update',
                    requestResourceData: updateData,
                });
                errorEmitter.emit('permission-error', permissionError);
            });
          }
        } catch (e) {
            const permissionError = new FirestorePermissionError({
                path: userRef.path,
                operation: 'get',
            });
            errorEmitter.emit('permission-error', permissionError);
        }

        setUser(authUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth, firestore, firebaseLoading]);

  return { user, loading };
}
