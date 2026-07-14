import { useCallback, useState } from 'react';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../firebase';
import { getDeviceId } from '../utils/deviceId';
import { useAuth } from '../contexts/AuthContext';
import { getReceivedBouquets, saveHomeCache, saveHistoryCache } from '../utils/storageManager';

export function useBouquetData() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);

  // Helper to fetch bouquets the user created (Firestore + local created cache)
  const fetchCreatedBouquets = useCallback(async (limitCount = 30) => {
    try {
      const userId = currentUser?.uid || await getDeviceId();
      let results = [];
      const firestoreIds = new Set();
      
      const q = query(
        collection(db, 'bouquet-cards'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      
      const snap = await getDocs(q);
      snap.forEach(d => {
        firestoreIds.add(d.id);
        results.push({ id: d.id, ...d.data() });
      });

      const localKeys = await AsyncStorage.getAllKeys();
      const localIds = localKeys
        .filter(k => k.startsWith('bouquet_created_'))
        .map(k => k.replace('bouquet_created_', ''))
        .filter(id => !firestoreIds.has(id));

      if (localIds.length > 0) {
        const { getDoc, doc: fsDoc } = await import('firebase/firestore');
        const extras = await Promise.all(localIds.map(id => getDoc(fsDoc(db, 'bouquet-cards', id))));
        extras.forEach(d => { 
          if (d.exists()) {
            results.push({ id: d.id, ...d.data() });
          }
        });
      }

      results.sort((a, b) => {
        const ta = a.createdAt?.toMillis?.() ?? a.createdAt?._millis ?? 0;
        const tb = b.createdAt?.toMillis?.() ?? b.createdAt?._millis ?? 0;
        return tb - ta;
      });

      return results;
    } catch (e) {
      console.error('Error fetching created bouquets:', e);
      return [];
    }
  }, [currentUser]);

  // Helper to fetch bouquets sent to the user (Received cache)
  const fetchReceivedBouquets = useCallback(async () => {
    try {
      const receivedLocal = await getReceivedBouquets() || [];
      const resultsMap = new Map();
      receivedLocal.forEach(b => resultsMap.set(b.id, b));

      // Fetch RAOK matched bouquets from Firestore
      if (currentUser?.uid) {
        const q = query(
          collection(db, 'bouquet-cards'),
          where('matchedRecipient', '==', currentUser.uid),
          where('isRandomAct', '==', true)
        );
        const snap = await getDocs(q);
        snap.docs.forEach(docSnap => {
          resultsMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() });
        });
      }

      const results = Array.from(resultsMap.values());
      // Sort by descending created/matched date
      results.sort((a, b) => {
        const ta = a.matchedAt || a.createdAt?.toMillis?.() || a.createdAt?._millis || 0;
        const tb = b.matchedAt || b.createdAt?.toMillis?.() || b.createdAt?._millis || 0;
        return tb - ta;
      });

      return results;
    } catch (e) {
      console.error('Error fetching received bouquets:', e);
      return [];
    }
  }, [currentUser]);

  return {
    fetchCreatedBouquets,
    fetchReceivedBouquets,
    loading,
    setLoading
  };
}
