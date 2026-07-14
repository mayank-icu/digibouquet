import * as ExpoHaptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

let touchSoundEnabled = true;

// Initialize state
AsyncStorage.getItem('touch_sound_enabled').then(value => {
  if (value === 'false') touchSoundEnabled = false;
});

// Update state when it changes
export const setGlobalTouchSound = (enabled) => {
  touchSoundEnabled = enabled;
};

export const impactAsync = async (style = ExpoHaptics.ImpactFeedbackStyle.Light) => {
  if (!touchSoundEnabled) return;
  return ExpoHaptics.impactAsync(style);
};

export const notificationAsync = async (type = ExpoHaptics.NotificationFeedbackType.Success) => {
  if (!touchSoundEnabled) return;
  return ExpoHaptics.notificationAsync(type);
};

export { ImpactFeedbackStyle, NotificationFeedbackType } from 'expo-haptics';
