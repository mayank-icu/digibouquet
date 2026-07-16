import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { doc, getDoc, setDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';
import Toast from 'react-native-toast-message';

// We dynamically require expo-application to prevent issues on other platforms (like Web or iOS)
// since this native API is only supported on Android.
let Application = null;
if (Platform.OS === 'android') {
  try {
    Application = require('expo-application');
  } catch (e) {
    console.warn('Failed to require expo-application:', e);
  }
}

/**
 * Checks Google Play install referrer for a Golden Bouquet referral code.
 * Should be called once at startup (e.g. in AppShell).
 */
export async function checkForInstallReferrer() {
  if (Platform.OS !== 'android') {
    return;
  }

  try {
    const checked = await AsyncStorage.getItem('referrerChecked');
    if (checked === 'true') {
      return;
    }

    if (!Application || typeof Application.getInstallReferrerAsync !== 'function') {
      console.log('[Referral] expo-application is not available or getInstallReferrerAsync is missing.');
      return;
    }

    const referrer = await Application.getInstallReferrerAsync();
    console.log('[Referral] Retrieved install referrer:', referrer);

    if (referrer) {
      // Find the GLD-XXXXX code (case-insensitive, first 5 chars after GLD- are alphanumeric)
      const match = referrer.match(/GLD-[A-Z0-9]{5}/i);
      if (match) {
        const referralCode = match[0].toUpperCase();
        console.log('[Referral] Found pending referral code:', referralCode);
        await AsyncStorage.setItem('pendingReferralCode', referralCode);
      }
    }

    await AsyncStorage.setItem('referrerChecked', 'true');
  } catch (error) {
    console.error('[Referral] Error fetching install referrer:', error);
  }
}

/**
 * Checks for a pending referral code and applies it to the newly registered user.
 * @param {import('firebase/auth').User} user The Firebase user object
 */
export async function applyPendingReferral(user) {
  if (!user) return;

  try {
    const pendingCode = await AsyncStorage.getItem('pendingReferralCode');
    if (!pendingCode) {
      console.log('[Referral] No pending referral code found.');
      return;
    }

    const enteredCode = pendingCode.trim().toUpperCase();
    const userUniqueCode = `GLD-${user.uid.substring(0, 5).toUpperCase()}`;

    // Prevent using their own code (should not happen anyway)
    if (enteredCode === userUniqueCode) {
      console.log('[Referral] User cannot use their own referral code.');
      await AsyncStorage.removeItem('pendingReferralCode');
      return;
    }

    console.log(`[Referral] Applying pending code: ${enteredCode} for user: ${user.uid}`);

    // Check if code is valid
    const codeRef = doc(db, 'golden_codes', enteredCode);
    const codeSnap = await getDoc(codeRef);
    if (!codeSnap.exists()) {
      console.log('[Referral] Referral code does not exist in firestore database.');
      await AsyncStorage.removeItem('pendingReferralCode');
      return;
    }

    const creatorUid = codeSnap.data().ownerUid;

    // Check if already claimed to prevent double-claiming
    const claimRef = doc(db, `users/${user.uid}/claimed_codes`, enteredCode);
    const claimSnap = await getDoc(claimRef);
    if (claimSnap.exists()) {
      console.log('[Referral] Referral code was already claimed by this user.');
      await AsyncStorage.removeItem('pendingReferralCode');
      return;
    }

    // 1. Mark code as claimed in user's doc
    await setDoc(claimRef, { claimedAt: Date.now() });

    // 2. Add to creator's joined users list
    const joinedRef = doc(db, `golden_codes/${enteredCode}/joined_users`, user.uid);
    await setDoc(joinedRef, {
      name: user.displayName || user.email?.split('@')[0] || 'A Friend',
      date: new Date().toLocaleDateString()
    });

    // 3. Increment receiver's credits
    await setDoc(doc(db, 'users', user.uid), {
      goldenCredits: increment(1)
    }, { merge: true });

    // 4. Increment creator's credits
    await setDoc(doc(db, 'users', creatorUid), {
      goldenCredits: increment(1)
    }, { merge: true });

    // Successfully applied!
    await AsyncStorage.removeItem('pendingReferralCode');
    console.log('[Referral] Referral code claimed successfully!');

    Toast.show({
      type: 'success',
      text1: 'Golden Bouquet Unlocked!',
      text2: 'You received +1 Golden Credit from your invite.',
      visibilityTime: 4000
    });
  } catch (error) {
    console.error('[Referral] Error claiming pending referral:', error);
  }
}
