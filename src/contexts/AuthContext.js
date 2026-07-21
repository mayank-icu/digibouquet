import React, { createContext, useContext, useEffect, useRef, useState, useMemo } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithCredential,
  getAdditionalUserInfo,
} from 'firebase/auth';
import Toast from 'react-native-toast-message';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../firebase';
import { applyPendingReferral } from '../utils/referral';

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [isProActivationShown, setIsProActivationShown] = useState(false);

  // playServicesReady is set to true once hasPlayServices() resolves.
  // We call it eagerly on mount so it's done before the user taps "Continue with Google".
  const playServicesReady = useRef(false);

  useEffect(() => {
    // Pre-warm Google Play Services check so it's already resolved by tap time.
    // hasPlayServices() warms up the underlying GMS connection; subsequent calls
    // in the signIn flow are near-instant after this resolves.
    GoogleSignin.hasPlayServices({ autoResolve: true })
      .then(() => { playServicesReady.current = true; })
      .catch(() => { /* non-fatal — signInWithGoogle will handle it */ });
  }, []);


  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return unsub;
  }, []);


  const signUp = (email, password) =>
    createUserWithEmailAndPassword(auth, email, password);

  const signIn = (email, password) =>
    signInWithEmailAndPassword(auth, email, password);

  const signOut = async () => {
    try {
      await GoogleSignin.signOut();
    } catch {
      // Ignore errors if the user wasn't signed in with Google
    }

    // Wrap in its own try/catch — if storageManager fails to load/parse,
    // we must not let that unhandled rejection crash the app on sign out.
    try {
      const { clearAllBouquetData } = await import('../utils/storageManager');
      await clearAllBouquetData();
    } catch (e) {
      console.error('Error clearing bouquet data during sign out:', e);
    }

    await firebaseSignOut(auth);
  };

  const resetPassword = (email) => sendPasswordResetEmail(auth, email);

  const signInWithGoogle = async () => {
    try {
      setGoogleLoading(true);

      // Skip hasPlayServices() if already pre-warmed on mount — this removes it
      // from the critical tap-to-picker path for the common case.
      if (!playServicesReady.current) {
        await GoogleSignin.hasPlayServices({ autoResolve: true });
        playServicesReady.current = true;
      }

      const { data } = await GoogleSignin.signIn();

      if (!data?.idToken) {
        throw new Error('No idToken received from Google');
      }

      const credential = GoogleAuthProvider.credential(data.idToken);
      const userCredential = await signInWithCredential(auth, credential);
      const additionalInfo = getAdditionalUserInfo(userCredential);

      if (additionalInfo) {
        if (!additionalInfo.isNewUser) {
          Toast.show({
            type: 'success',
            text1: 'Welcome back!',
            text2: 'You have successfully signed in with Google.',
            visibilityTime: 3000,
          });
        } else {
          await applyPendingReferral(userCredential.user);
        }
      }
    } catch (error) {
      console.error('Google sign-in error:', error);
      // Re-throw so LoginScreen / RegisterScreen can show an error message
      throw error;
    } finally {
      setGoogleLoading(false);
    }
  };

  const value = useMemo(() => ({
    currentUser, loading, googleLoading,
    signUp, signIn, signOut, resetPassword, signInWithGoogle,
    isProActivationShown, setIsProActivationShown,
  }), [currentUser, loading, googleLoading, isProActivationShown]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
