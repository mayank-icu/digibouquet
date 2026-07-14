import React, { createContext, useContext, useEffect, useState } from 'react';
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

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [isProActivationShown, setIsProActivationShown] = useState(false);

  // Configure Google Sign-In
  // NOTE: Do NOT set offlineAccess or forceCodeForRefreshToken here.
  // Those flags trigger a second OAuth consent screen after account selection.
  // We only need the idToken for Firebase credential — no server-side Google API access needed.
  useEffect(() => {
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
    });
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
      await GoogleSignin.hasPlayServices();

      const { data } = await GoogleSignin.signIn();

      if (!data?.idToken) {
        throw new Error('No idToken received from Google');
      }

      const credential = GoogleAuthProvider.credential(data.idToken);
      const userCredential = await signInWithCredential(auth, credential);
      const additionalInfo = getAdditionalUserInfo(userCredential);

      if (additionalInfo && !additionalInfo.isNewUser) {
        Toast.show({
          type: 'success',
          text1: 'Welcome back!',
          text2: 'You have successfully signed in with Google.',
          visibilityTime: 3000,
        });
      }
    } catch (error) {
      console.error('Google sign-in error:', error);
      // Re-throw so LoginScreen / RegisterScreen can show an error message
      throw error;
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{
      currentUser, loading, googleLoading,
      signUp, signIn, signOut, resetPassword, signInWithGoogle,
      isProActivationShown, setIsProActivationShown,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
