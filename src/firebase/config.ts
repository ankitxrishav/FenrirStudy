
import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

// Provided by the user. This connects the app to your Firebase project.
const firebaseConfig = {
  apiKey: "AIzaSyAQvLgnyJODW_rC9XbMyh8OdD4dNXQ7t_A",
  authDomain: "fenrirstudyx.firebaseapp.com",
  projectId: "fenrirstudyx",
  storageBucket: "fenrirstudyx.firebasestorage.app",
  messagingSenderId: "475370976510",
  appId: "1:475370976510:web:247ee49c0da89bb6d461af",
  measurementId: "G-BJ6LFCWL1T"
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
            } catch(e) {
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
