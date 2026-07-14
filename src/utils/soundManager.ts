import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SOUNDS: Record<string, string> = {
  button_click: 'https://cdn.jsdelivr.net/gh/mayank-icu/digibouquet-assets@main/audios/button_click.mp3',
  chest_open: 'https://cdn.jsdelivr.net/gh/mayank-icu/digibouquet-assets@main/audios/chest_open.mp3',
  confetti_pop: 'https://cdn.jsdelivr.net/gh/mayank-icu/digibouquet-assets@main/audios/confetti_pop.mp3',
  hint_magic: 'https://cdn.jsdelivr.net/gh/mayank-icu/digibouquet-assets@main/audios/hint_magic.mp3',
  level_complete: 'https://cdn.jsdelivr.net/gh/mayank-icu/digibouquet-assets@main/audios/level_complete.mp3',
  locked_error: 'https://cdn.jsdelivr.net/gh/mayank-icu/digibouquet-assets@main/audios/locked_error.mp3',
  match_success: 'https://cdn.jsdelivr.net/gh/mayank-icu/digibouquet-assets@main/audios/match_success.mp3',
  shuffle_items: 'https://cdn.jsdelivr.net/gh/mayank-icu/digibouquet-assets@main/audios/shuffle_items.mp3',
  undo_move: 'https://cdn.jsdelivr.net/gh/mayank-icu/digibouquet-assets@main/audios/undo_move.mp3',
};

class SoundManager {
  private loadedSounds: Record<string, Audio.Sound> = {};
  private loadingPromise: Promise<void> | null = null;
  private soundEnabled: boolean = true;

  constructor() {
    this.initSettings();
  }

  private async initSettings() {
    try {
      const value = await AsyncStorage.getItem('touch_sound_enabled');
      if (value === 'false') {
        this.soundEnabled = false;
      } else {
        this.soundEnabled = true;
      }
    } catch (e) {
      console.log('[SoundManager] Error reading settings:', e);
    }
  }

  public async updateSoundSettings() {
    await this.initSettings();
  }

  public preloadSounds(): Promise<void> {
    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    this.loadingPromise = (async () => {
      // Configure audio session
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          playThroughEarpieceAndroid: false,
        });
      } catch (e) {
        console.log('[SoundManager] Error setting audio mode:', e);
      }

      const promises = Object.entries(SOUNDS).map(async ([key, url]) => {
        if (this.loadedSounds[key]) return;
        try {
          const { sound } = await Audio.Sound.createAsync(
            { uri: url },
            { shouldPlay: false, positionMillis: 0, volume: 1.0 }
          );
          this.loadedSounds[key] = sound;
        } catch (error) {
          console.error(`[SoundManager] Failed to load sound: ${key}`, error);
        }
      });

      await Promise.all(promises);
      console.log('[SoundManager] Preloaded all sounds successfully.');
    })();

    return this.loadingPromise;
  }

  public async play(key: keyof typeof SOUNDS) {
    if (!this.soundEnabled) return;

    const sound = this.loadedSounds[key];
    if (!sound) {
      // If sound is not yet loaded (e.g. still preloading), try loading it on the fly
      try {
        console.log(`[SoundManager] Sound ${key} not preloaded, loading on the fly...`);
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: SOUNDS[key] },
          { shouldPlay: true, positionMillis: 0 }
        );
        this.loadedSounds[key] = newSound;
      } catch (e) {
        console.error(`[SoundManager] Failed to play sound on the fly: ${key}`, e);
      }
      return;
    }

    try {
      // replayAsync atomically seeks to 0 and plays — faster, especially on Android
      await sound.replayAsync();
    } catch (e) {
      // Fallback for older Expo versions that don't support replayAsync
      try {
        await sound.setPositionAsync(0);
        await sound.playAsync();
      } catch (e2: any) {
        if (!e2?.message?.includes('AudioFocusNotAcquiredException')) {
          console.error(`[SoundManager] Error playing sound: ${key}`, e2);
        }
      }
    }
  }

  // Cleanup all loaded sounds
  public async unloadAll() {
    const promises = Object.values(this.loadedSounds).map(async (sound) => {
      try {
        await sound.unloadAsync();
      } catch (e) {
        // ignore
      }
    });
    await Promise.all(promises);
    this.loadedSounds = {};
    this.loadingPromise = null;
  }
}

export const soundManager = new SoundManager();
