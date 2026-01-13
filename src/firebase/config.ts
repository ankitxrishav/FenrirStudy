
import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

// Configuration is now read from environment variables for security.
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};


let app: FirebaseApp;
let auth: Auth;
let firestore: Firestore;

function initializeFirebase() {
    if (typeof window !== 'undefined') {
        if (!getApps().length) {
            try {
                app = initializeApp(firebaseConfig);
                auth = getAuth(app);
                firestore = getFirestore(app);
            } catch (e) {
                console.error("Firebase initialization error", e);
            }
        } else {
            app = getApp();
            auth = getAuth(app);
            firestore = getFirestore(app);
        }
    }
    return { app, auth, firestore };
}

export { initializeFirebase };
