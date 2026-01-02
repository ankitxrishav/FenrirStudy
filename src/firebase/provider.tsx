
"use client";

import React, { createContext, useContext, ReactNode, useEffect, useState, useMemo } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Auth } from 'firebase/auth';
import { Firestore } from 'firebase/firestore';
import { initializeFirebase } from './config';
import FirebaseErrorListener from '@/components/FirebaseErrorListener';

interface FirebaseContextType {
  app: FirebaseApp | undefined;
  auth: Auth | undefined;
  firestore: Firestore | undefined;
  loading: boolean;
}

const FirebaseContext = createContext<FirebaseContextType>({ app: undefined, auth: undefined, firestore: undefined, loading: true });

export function FirebaseProvider({ children }: { children: ReactNode }) {
    const [firebaseServices, setFirebaseServices] = useState<{ app?: FirebaseApp, auth?: Auth, firestore?: Firestore }>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const { app, auth, firestore } = initializeFirebase();
        setFirebaseServices({ app, auth, firestore });
        setLoading(false);
    }, []);

    const value = useMemo(() => ({
        app: firebaseServices.app,
        auth: firebaseServices.auth,
        firestore: firebaseServices.firestore,
        loading: loading
    }), [firebaseServices, loading]);

    return (
        <FirebaseContext.Provider value={value}>
          {process.env.NODE_ENV === 'development' && <FirebaseErrorListener />}
          {!loading ? children : null /* Or a global loader */}
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
