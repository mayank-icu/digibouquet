import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

const KEY = '@digibouquet_device_id';
let _cachedId = null;

export async function getDeviceId() {
  if (_cachedId) return _cachedId;
  try {
    const stored = await AsyncStorage.getItem(KEY);
    if (stored) {
      _cachedId = stored;
      return stored;
    }
    const newId = uuidv4();
    await AsyncStorage.setItem(KEY, newId);
    _cachedId = newId;
    return newId;
  } catch {
    // Fallback: generate ephemeral ID (won't persist across restarts)
    if (!_cachedId) _cachedId = uuidv4();
    return _cachedId;
  }
}
