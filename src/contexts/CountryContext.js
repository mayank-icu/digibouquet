import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';
import { detectCountryFromIP, getAppsForCountry } from '../utils/countryUtils';

const CountryContext = createContext();

export const CountryProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [countryCode, setCountryCode] = useState(null); // Start with null instead of 'US'
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);

  // Initialize country on mount or when user changes
  useEffect(() => {
    const initCountry = async () => {
      setLoading(true);
      try {
        let detected = null;

        // If user is logged in, try to load from Firestore
        if (currentUser?.uid) {
          try {
            const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
            if (userDoc.exists() && userDoc.data().country) {
              detected = userDoc.data().country;
            } else {
              // First time — detect from IP (with timeout)
              const detectionPromise = detectCountryFromIP();
              const timeoutPromise = new Promise(resolve => setTimeout(() => resolve('US'), 8000));
              detected = await Promise.race([detectionPromise, timeoutPromise]);
              
              // Save to Firestore (don't wait for it)
              setDoc(doc(db, 'users', currentUser.uid), { country: detected }, { merge: true }).catch(() => {});
            }
          } catch {
            // Silently handle Firestore error
            const detectionPromise = detectCountryFromIP();
            const timeoutPromise = new Promise(resolve => setTimeout(() => resolve('US'), 8000));
            detected = await Promise.race([detectionPromise, timeoutPromise]);
          }
        } else {
          // Guest user — check local storage
          try {
            const cached = await AsyncStorage.getItem('user_country');
            if (cached) {
              detected = cached;
            } else {
              // Detect from IP
              const detectionPromise = detectCountryFromIP();
              const timeoutPromise = new Promise(resolve => setTimeout(() => resolve('US'), 8000));
              detected = await Promise.race([detectionPromise, timeoutPromise]);
              await AsyncStorage.setItem('user_country', detected).catch(() => {});
            }
          } catch {
            // Silently handle AsyncStorage error - detect from IP
            const detectionPromise = detectCountryFromIP();
            const timeoutPromise = new Promise(resolve => setTimeout(() => resolve('US'), 8000));
            detected = await Promise.race([detectionPromise, timeoutPromise]);
          }
        }

        setCountryCode(detected || 'US');
        setApps(getAppsForCountry(detected || 'US'));
      } catch {
        // Silently handle country init error
        setCountryCode('US');
        setApps(getAppsForCountry('US'));
      } finally {
        setLoading(false);
      }
    };

    initCountry();
  }, [currentUser?.uid]);

  // Update country code and persist
  const updateCountry = async (newCode) => {
    try {
      setCountryCode(newCode);
      setApps(getAppsForCountry(newCode));

      if (currentUser?.uid) {
        await setDoc(doc(db, 'users', currentUser.uid), { country: newCode }, { merge: true });
      } else {
        await AsyncStorage.setItem('user_country', newCode);
      }
    } catch {
      // Silently handle country update error
    }
  };

  return (
    <CountryContext.Provider value={{ countryCode, apps, loading, updateCountry }}>
      {children}
    </CountryContext.Provider>
  );
};

export const useCountry = () => {
  const context = useContext(CountryContext);
  if (!context) {
    throw new Error('useCountry must be used within CountryProvider');
  }
  return context;
};
