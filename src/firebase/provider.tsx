
"use client";

import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Auth } from 'firebase/auth';
import { Firestore } from 'firebase/firestore';
import FirebaseErrorListener from '@/components/FirebaseErrorListener';

interface FirebaseContextType {
  app: FirebaseApp | undefined;
  auth: Auth | undefined;
  firestore: Firestore | undefined;
  loading: boolean;
}

const FirebaseContext = createContext<FirebaseContextType>({ app: undefined, auth: undefined, firestore: undefined, loading: true });

interface FirebaseProviderProps {
    children: ReactNode;
    app: FirebaseApp | undefined;
    auth: Auth | undefined;
    firestore: Firestore | undefined;
    loading: boolean;
}

export function FirebaseProvider({ children, app, auth, firestore, loading }: FirebaseProviderProps) {
    const value = useMemo(() => ({
        app,
        auth,
        firestore,
        loading
    }), [app, auth, firestore, loading]);

    return (
        <FirebaseContext.Provider value={value}>
          {process.env.NODE_ENV === 'development' && <FirebaseErrorListener />}
          {children}
        </FirebaseContext.Provider>
    );
}

export const useFirebase = (): FirebaseContextType => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
};

export const useFirebaseApp = (): FirebaseApp | undefined => {
  const { app } = useFirebase();
  return app;
}

export const useAuth = (): Auth | undefined => {
  const { auth } = useFirebase();
  return auth;
}

export const useFirestore = (): Firestore | undefined => {
  const { firestore } = useFirebase();
  return firestore;
}
