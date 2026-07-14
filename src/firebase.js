import { getApp, getApps, initializeApp } from 'firebase/app';
import { initializeFirestore, getFirestore, persistentLocalCache } from 'firebase/firestore';
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
};

// Capture whether Firebase was already initialized BEFORE calling initializeApp.
// This is the correct flag — after initializeApp() runs, getApps().length is always >= 1.
const isAlreadyInitialized = getApps().length > 0;
const app = isAlreadyInitialized ? getApp() : initializeApp(firebaseConfig);

// Guard against double-initialization: initializeFirestore throws if called
// a second time on the same app instance. Fall back to getFirestore() safely.
let db;
try {
  db = isAlreadyInitialized
    ? getFirestore(app)
    : initializeFirestore(app, { 
        experimentalForceLongPolling: true,
        experimentalAutoDetectLongPolling: true,
        localCache: persistentLocalCache()
      });
} catch {
  db = getFirestore(app);
}
export { db };

// Same guard for auth.
let auth;
try {
  auth = isAlreadyInitialized
    ? getAuth(app)
    : initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
} catch {
  auth = getAuth(app);
}
export { auth };

import { getFunctions } from 'firebase/functions';

let functionsInstance;
try {
  functionsInstance = getFunctions(app, 'asia-south1');
} catch {
  // Ignored if already initialized or error
}
export { functionsInstance as functions };

export default app;
