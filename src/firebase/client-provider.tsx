
"use client";

import React, { useState, useEffect, ReactNode, useMemo } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Auth } from 'firebase/auth';
import { Firestore } from 'firebase/firestore';
import { FirebaseStorage } from 'firebase/storage';
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
        storage?: FirebaseStorage;
        loading: boolean;
    }>({ loading: true });

    useEffect(() => {
        // The check for `typeof window !== 'undefined'` ensures this code
        // only runs on the client.
        if (typeof window !== 'undefined') {
            const { app, auth, firestore, storage } = initializeFirebase();
            setFirebaseServices({ app, auth, firestore, storage, loading: false });
        }
    }, []);

    const { app, auth, firestore, storage, loading } = firebaseServices;

    return (
        <FirebaseProvider app={app} auth={auth} firestore={firestore} storage={storage} loading={loading}>
            {children}
        </FirebaseProvider>
    );
}
