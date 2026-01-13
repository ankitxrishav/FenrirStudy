
"use client";

import React, { useState, useEffect, ReactNode, useMemo } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Auth } from 'firebase/auth';
import { Firestore } from 'firebase/firestore';
import { initializeFirebase } from './config';
import { FirebaseProvider } from './provider';
import LoadingScreen from '@/components/app/loading-screen';

// This provider is responsible for initializing Firebase on the client-side
// and ensuring it's only done once.
export function FirebaseClientProvider({ children }: { children: ReactNode }) {
    const [firebaseServices, setFirebaseServices] = useState<{
        app?: FirebaseApp;
        auth?: Auth;
        firestore?: Firestore;
        loading: boolean;
    }>({ loading: true });

    useEffect(() => {
        // The check for `typeof window !== 'undefined'` ensures this code
        // only runs on the client.
        if (typeof window !== 'undefined') {
            const { app, auth, firestore } = initializeFirebase();
            setFirebaseServices({ app, auth, firestore, loading: false });
        }
    }, []);

    const { app, auth, firestore, loading } = firebaseServices;

    return (
        <FirebaseProvider app={app} auth={auth} firestore={firestore} loading={loading}>
            {children}
        </FirebaseProvider>
    );
}
