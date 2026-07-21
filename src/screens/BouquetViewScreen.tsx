import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Dimensions,
  Animated,
  Modal,
  ActivityIndicator,
  Linking,
  ImageBackground,
  FlatList,
  StatusBar,
  Platform,
  PanResponder,
  Alert,
  Share,
  AppState,
  PixelRatio,
  KeyboardAvoidingView } from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Music, Play, ExternalLink } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Audio } from 'expo-av';
import YoutubePlayer from 'react-native-youtube-iframe';
import * as Speech from 'expo-speech';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LottieView from 'lottie-react-native';
import { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';

import { Accelerometer } from 'expo-sensors';
import Svg, { Defs, Mask, Rect, Path, G, Text as SvgText, Polygon } from 'react-native-svg';
import { useAuth } from '../contexts/AuthContext';
import { getDeviceId } from '../utils/deviceId';
import { useLanguage } from '../contexts/LanguageContext';
import { detectCountryFromIP, getLanguageForCountry, getCountryFlag } from '../utils/countryLanguageMapping';
import { 
  getBouquet,
  saveBouquet,
  isBouquetCreated,
  markBouquetReceived,
  hasBouquetBeenReplied,
  markBouquetReplied,
  getBouquetReplies,
  saveBouquetReplies,
  syncWidgetDataWithBouquet
} from '../utils/storageManager';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { useTheme } from '../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ShareModal from '../components/ShareModal';
import { getFlowerTranslation } from '../flower-translations';

import { getFlowerImage } from '../utils/bouquetData';
import { CachedImage } from '../components/CachedImage';
import { Image } from 'expo-image';
import { useSwipeToClose } from '../hooks/useSwipeToClose';
// react-native-manage-wallpaper is a native module that can throw on import
// on some Android versions (notably SDK 36). Lazy-require it with a guard.
let ManageWallpaper: any = null;
let TYPE: any = {};
try {
  const wallpaperMod = require('react-native-manage-wallpaper');
  ManageWallpaper = wallpaperMod.default;
  TYPE = wallpaperMod.TYPE;
} catch (e) {
  console.warn('react-native-manage-wallpaper not available on this device:', e);
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Font family map (matches CreateBouquetScreen) ────────────────────────────
const FONT_FAMILY_MAP: Record<string, string> = {
  default: 'Manrope-Regular',
  minimalist: 'JosefinSans-Regular',
  elegant: 'PlayfairDisplay-Regular',
  modern: 'Poppins-Regular',
  classic: 'Merriweather-Regular',
  casual: 'Quicksand-Regular',
};

// ─── Background images ─────────────────────────────────────────────────────────
const BACKGROUNDS = [
  { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/1.webp' },
  { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/2.webp' },
  { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/3.webp' },
  { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/4.webp' },
  { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/5.webp' },
];

// ─── Flower meanings ───────────────────────────────────────────────────────────
const FLOWER_MEANINGS: Record<string, { name: string; meaning: string; purpose: string }> = {
  rose: { name: 'Rose', meaning: 'Love & Passion', purpose: 'Perfect for expressing deep romantic love.' },
  'red-rose': { name: 'Red Rose', meaning: 'Deep Love & Romance', purpose: 'The ultimate symbol of passionate love.' },
  'purple-rose': { name: 'Purple Rose', meaning: 'Enchantment & Love at First Sight', purpose: 'For magical moments and new love.' },
  'yellow-rose': { name: 'Yellow Rose', meaning: 'Friendship & Joy', purpose: 'Celebrating friendship and happiness.' },
  'ivory-rose': { name: 'Ivory Rose', meaning: 'Charm & Thoughtfulness', purpose: 'Elegant expression of care.' },
  tulip: { name: 'Tulip', meaning: 'Perfect Love', purpose: 'Ideal for declaring new love or happy thoughts.' },
  'red-tulip': { name: 'Red Tulip', meaning: 'True Love', purpose: 'Declaration of eternal love.' },
  'purple-tulip': { name: 'Purple Tulip', meaning: 'Royalty', purpose: 'For someone truly special.' },
  'yellow-tulip': { name: 'Yellow Tulip', meaning: 'Cheerful Thoughts', purpose: 'Bringing sunshine to your day.' },
  'orange-tulip': { name: 'Orange Tulip', meaning: 'Energy & Enthusiasm', purpose: 'For vibrant personalities.' },
  'ivory-tulip': { name: 'Ivory Tulip', meaning: 'Forgiveness', purpose: 'Making amends with grace.' },
  lily: { name: 'Lily', meaning: 'Purity & Refined Beauty', purpose: 'Great for weddings or showing admiration.' },
  orchid: { name: 'Orchid', meaning: 'Exotic Beauty & Strength', purpose: 'For someone unique, strong, and beautiful.' },
  'pink-orchid': { name: 'Pink Orchid', meaning: 'Grace & Joy', purpose: 'Celebrating elegance and happiness.' },
  'white-orchid': { name: 'White Orchid', meaning: 'Purity & Elegance', purpose: 'Refined beauty and innocence.' },
  'yellow-orchid': { name: 'Yellow Orchid', meaning: 'Friendship & New Beginnings', purpose: 'Fresh starts and lasting bonds.' },
  peony: { name: 'Peony', meaning: 'Prosperity & Romance', purpose: 'Often used for good luck and happy relationships.' },
  'red-peony': { name: 'Red Peony', meaning: 'Honor & Respect', purpose: 'Deep admiration and respect.' },
  'peach-peony': { name: 'Peach Peony', meaning: 'Gratitude', purpose: 'Thankfulness and appreciation.' },
  'white-peony': { name: 'White Peony', meaning: 'Bashfulness', purpose: 'Shy but sincere affection.' },
  daisy: { name: 'Daisy', meaning: 'Innocence & New Beginnings', purpose: 'Cheer up a friend or celebrate a fresh start.' },
  'pink-petals-daisy': { name: 'Pink Daisy', meaning: 'Gentleness', purpose: 'Soft and caring love.' },
  'white-yellow-daisy': { name: 'Classic Daisy', meaning: 'True Love', purpose: 'Simple and pure affection.' },
  'gerbera-daisy': { name: 'Gerbera Daisy', meaning: 'Cheerfulness', purpose: 'Bringing joy and smiles.' },
  carnation: { name: 'Carnation', meaning: 'Fascination & Love', purpose: 'A versatile flower for friends, family, or lovers.' },
  chrysanthemum: { name: 'Chrysanthemum', meaning: 'Joy & Optimism', purpose: "Bring happiness and positivity to someone's day." },
  lotus: { name: 'Lotus', meaning: 'Purity & Enlightenment', purpose: 'For spiritual growth or overcoming challenges.' },
  camellia: { name: 'Camellia', meaning: 'Adoration & Longing', purpose: 'Expressing that you mean it deeply.' },
  'red-camellia': { name: 'Red Camellia', meaning: "You're a Flame in My Heart", purpose: 'Passionate and intense love.' },
  'peach-camellia': { name: 'Peach Camellia', meaning: 'Longing for You', purpose: 'Missing someone special.' },
  'white-camellia': { name: 'White Camellia', meaning: "You're Adorable", purpose: 'Sweet and innocent affection.' },
  sunflower: { name: 'Sunflower', meaning: 'Adoration & Loyalty', purpose: 'For unwavering devotion and happiness.' },
  alstroemeria: { name: 'Alstroemeria', meaning: 'Friendship & Devotion', purpose: 'Perfect for lasting friendships.' },
  anemone: { name: 'Anemone', meaning: 'Anticipation', purpose: 'Looking forward to something special.' },
  buttercup: { name: 'Buttercup', meaning: 'Childishness & Joy', purpose: 'Playful and joyful moments.' },
  coreopsis: { name: 'Coreopsis', meaning: 'Always Cheerful', purpose: 'Constant happiness and joy.' },
  cosmos: { name: 'Cosmos', meaning: 'Order & Harmony', purpose: 'Peace and tranquility.' },
  freesia: { name: 'Freesia', meaning: 'Trust', purpose: 'Building trust and friendship.' },
  gaillardia: { name: 'Gaillardia', meaning: 'Strength', purpose: 'Inner strength and resilience.' },
  hellebore: { name: 'Hellebore', meaning: 'Serenity', purpose: 'Calm and peaceful feelings.' },
  zinnia: { name: 'Zinnia', meaning: 'Remembrance', purpose: 'Thinking of absent friends.' },
};

// Helper function to get translated flower meaning
const getTranslatedFlowerMeaning = (locale: string, flowerId: string) => {
  const englishMeaning = FLOWER_MEANINGS[flowerId];
  if (!englishMeaning) return null;
  
  const translation = getFlowerTranslation(locale, flowerId);
  return {
    name: translation?.name || englishMeaning.name,
    meaning: translation?.meaning || englishMeaning.meaning,
    purpose: translation?.purpose || englishMeaning.purpose,
  };
};

// ─── Types ─────────────────────────────────────────────────────────────────────
interface FlowerV2 {
  id: string;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  zIndex: number;
  uniqueId?: string;
}

interface Reply {
  message: string;
  timestamp: number;
}

interface BouquetData {
  version?: number;
  selectedFlowers: (string | FlowerV2)[];
  background: number;
  greeneryBg?: string | null;
  message?: string;
  recipientName?: string;
  senderName?: string;
  messageCard?: { message?: string; recipientName?: string; senderName?: string };
  messageImageUrl?: string;
  messageImageUrls?: string[];
  messageAudioUrl?: string;
  song?: { previewUrl?: string; url?: string; albumArt?: string; name?: string; artist?: string; id?: string; startTime?: number; clipDuration?: number; duration?: string; isItunes?: boolean };
  arrangement?: number;
  selectedFont?: string;
  textFormatting?: { bold?: boolean; italic?: boolean; underline?: boolean };
  messageFormatting?: { fontStyle?: string; bold?: boolean; italic?: boolean; underline?: boolean };
  additionalSettings?: {
    animation?: string;
    largeText?: boolean;
    dyslexiaFriendly?: boolean;
    colorBlindMode?: string;
    blindFriendly?: boolean;
    translateEnabled?: boolean;
  };
  drawnFlowers?: Record<string, string>;
}

// ─── Floating flower for wallpaper overlay ────────────────────────────────────
interface FloatingFlower {
  id: string;
  left: number; // percent
  top: number;  // percent
  size: number;
  rotation: number;
}

// ─── Language options ──────────────────────────────────────────────────────────
const LANGUAGE_OPTIONS = [
  { label: 'Spanish', value: 'es' },
  { label: 'French', value: 'fr' },
  { label: 'German', value: 'de' },
  { label: 'Hindi', value: 'hi' },
  { label: 'Arabic', value: 'ar' },
  { label: 'Chinese', value: 'zh' },
  { label: 'Japanese', value: 'ja' },
  { label: 'Korean', value: 'ko' },
  { label: 'Portuguese', value: 'pt' },
  { label: 'Italian', value: 'it' },
  { label: 'Russian', value: 'ru' },
  { label: 'Turkish', value: 'tr' },
  { label: 'Dutch', value: 'nl' },
  { label: 'Polish', value: 'pl' },
  { label: 'Swedish', value: 'sv' },
  { label: 'Tamil', value: 'ta' },
  { label: 'Telugu', value: 'te' },
  { label: 'Bengali', value: 'bn' },
  { label: 'Urdu', value: 'ur' },
  { label: 'Indonesian', value: 'id' },
];

// ─── Fallback flower IDs ───────────────────────────────────────────────────────
const FALLBACK_IDS = ['rose', 'peony', 'daisy', 'tulip', 'orchid', 'camellia', 'sunflower', 'lily'];

// ─── Particle drop component — matches web CSS shapes exactly ────────────────
const PARTICLE_CONFIGS: Record<string, { size: number; color: string; shape: 'circle' | 'square' | 'star' | 'heart' | 'cherry'; blur?: boolean; twinkle?: boolean }[]> = {
  'cherry-blossom': [{ size: 24, color: '#ffb7c5', shape: 'cherry' }],
  snow:             [
    { size: 10, color: '#ffffff', shape: 'circle', blur: true },
    { size: 14, color: '#ffffff', shape: 'circle', blur: true },
    { size: 8, color: '#ffffff', shape: 'circle', blur: true }
  ],
  confetti: [
    { size: 10, color: '#f1c40f', shape: 'square' },
    { size: 10, color: '#e67e22', shape: 'square' },
    { size: 10, color: '#2ecc71', shape: 'square' },
    { size: 10, color: '#3498db', shape: 'square' },
    { size: 10, color: '#9b59b6', shape: 'square' },
    { size: 10, color: '#e74c3c', shape: 'square' },
  ],
  sparkles: [{ size: 6, color: '#f1c40f', shape: 'star', twinkle: true }],
  'golden-sparkles': [
    { size: 16, color: '#D4AF37', shape: 'star', twinkle: true }, 
    { size: 10, color: '#F5C842', shape: 'star', twinkle: true }, 
    { size: 12, color: '#C9960C', shape: 'star', twinkle: true },
    { size: 14, color: '#FFDF73', shape: 'star', twinkle: true },
    { size: 8, color: '#FFF3A1', shape: 'star', twinkle: true }
  ],
  hearts:   [{ size: 12, color: '#e74c3c', shape: 'heart' }],
};

function ParticleShape({ config }: { config: typeof PARTICLE_CONFIGS[string][0] }) {
  const { size, color, shape, blur } = config;
  if (shape === 'cherry') {
    return (
      <View style={{ width: size, height: size, shadowColor: color, shadowOpacity: 0.3, shadowRadius: 2, shadowOffset: { width: 0, height: 0 } }}>
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M12 2C12 2 4 10 4 15C4 18 7 21 10.5 21L12 18L13.5 21C17 21 20 18 20 15C20 10 12 2 12 2Z" fill={color} opacity={blur ? 0.9 : 0.85} />
        </Svg>
      </View>
    );
  }
  if (shape === 'circle') {
    return (
      <View style={{
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: color,
        opacity: blur ? 1 : 0.8,
        ...(blur ? { shadowColor: color, shadowOpacity: 0.8, shadowRadius: 3, shadowOffset: { width: 0, height: 0 } } : {}),
      }} />
    );
  }
  if (shape === 'square') {
    return (
      <View style={{ width: size, height: size, backgroundColor: color }} />
    );
  }
  if (shape === 'star') {
    return (
      <View style={{ width: size, height: size, shadowColor: color, shadowOpacity: 0.8, shadowRadius: 4, shadowOffset: { width: 0, height: 0 } }}>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Polygon points="50,0 65,35 100,50 65,65 50,100 35,65 0,50 35,35" fill={color} />
        </Svg>
      </View>
    );
  }
  if (shape === 'heart') {
    return (
      <View style={{ width: size, height: size, shadowColor: color, shadowOpacity: 0.4, shadowRadius: 2, shadowOffset: { width: 0, height: 0 } }}>
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill={color} />
        </Svg>
      </View>
    );
  }
  return null;
}

function ParticleDrop({ particle, screenHeight }: { particle: any; screenHeight: number }) {
  const translateY = useRef(new Animated.Value(-50)).current;
  const lifetimeOpacity = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const twinkleScale = useRef(new Animated.Value(0.8)).current;
  const twinkleOpacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.sequence([
        Animated.timing(lifetimeOpacity, { toValue: 1, duration: particle.duration * 0.1, useNativeDriver: true }),
        Animated.timing(lifetimeOpacity, { toValue: 1, duration: particle.duration * 0.8, useNativeDriver: true }),
        Animated.timing(lifetimeOpacity, { toValue: 0, duration: particle.duration * 0.1, useNativeDriver: true }),
      ]),
      Animated.timing(translateY, {
        toValue: screenHeight + 50,
        duration: particle.duration,
        useNativeDriver: true,
      }),
      Animated.timing(rotate, {
        toValue: particle.rotationEnd,
        duration: particle.duration,
        useNativeDriver: true,
      }),
    ]).start();

    if (particle.config.twinkle) {
       Animated.loop(
         Animated.parallel([
           Animated.sequence([
             Animated.timing(twinkleScale, { toValue: 1.2, duration: 750, useNativeDriver: true }),
             Animated.timing(twinkleScale, { toValue: 0.8, duration: 750, useNativeDriver: true }),
           ]),
           Animated.sequence([
             Animated.timing(twinkleOpacity, { toValue: 1, duration: 750, useNativeDriver: true }),
             Animated.timing(twinkleOpacity, { toValue: 0.3, duration: 750, useNativeDriver: true }),
           ])
         ])
       ).start();
    }
  }, []);

  const rotateStr = rotate.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: particle.left,
        top: 0,
        transform: [{ translateY }, { rotate: rotateStr }],
        opacity: lifetimeOpacity,
      }}
    >
      {particle.config.twinkle ? (
         <Animated.View style={{ transform: [{ scale: twinkleScale }], opacity: twinkleOpacity }}>
           <ParticleShape config={particle.config} />
         </Animated.View>
      ) : (
         <ParticleShape config={particle.config} />
      )}
    </Animated.View>
  );
}

function TouchEffect({ effect }: { effect: any }) {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scale, { toValue: 2, duration: 600, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 600, useNativeDriver: true })
    ]).start();
  }, []);

  let emoji = '✨';
  if (effect.anim === 'cherry-blossom') emoji = '🌸';
  if (effect.anim === 'snow') emoji = '❄️';
  if (effect.anim === 'confetti') emoji = '🎊';
  if (effect.anim === 'hearts') emoji = '💕';

  return (
    <Animated.Text style={{
      position: 'absolute', left: effect.x - 20, top: effect.y - 20, fontSize: 40,
      transform: [{ scale }], opacity, pointerEvents: 'none', zIndex: 100
    }}>
      {emoji}
    </Animated.Text>
  );
}

function ScratchOffOverlay({ onRevealed, onScratchingChange, initiallyRevealed }: { onRevealed?: () => void, onScratchingChange?: (isScratching: boolean) => void, initiallyRevealed?: boolean }) {
  const [strokes, setStrokes] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [isRevealed, setIsRevealed] = useState(initiallyRevealed || false);
  const opacity = useRef(new Animated.Value(initiallyRevealed ? 0 : 1)).current;
  const moveCount = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isRevealed,
      onMoveShouldSetPanResponder: () => !isRevealed,
      onStartShouldSetPanResponderCapture: () => !isRevealed,
      onMoveShouldSetPanResponderCapture: () => !isRevealed,
      onPanResponderGrant: (evt) => {
        onScratchingChange?.(true);
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentPath(`M${locationX},${locationY}`);
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentPath(prev => `${prev} L${locationX},${locationY}`);
        moveCount.current += 1;
        if (moveCount.current > 15 && !isRevealed) {
           setIsRevealed(true);
           onScratchingChange?.(false);
           Animated.timing(opacity, { toValue: 0, duration: 800, useNativeDriver: true }).start(() => {
             onRevealed?.();
           });
        }
      },
      onPanResponderRelease: () => {
        onScratchingChange?.(false);
        setStrokes(prev => [...prev, currentPath]);
        setCurrentPath('');
      },
      onPanResponderTerminate: () => {
        onScratchingChange?.(false);
        setCurrentPath('');
      }
    })
  ).current;

  if (initiallyRevealed) return null;
  if (isRevealed && (opacity as any) === 0) return null;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity, zIndex: 50, borderRadius: 12, overflow: 'hidden' }]} pointerEvents={isRevealed ? 'none' : 'auto'} {...panResponder.panHandlers}>
      <Svg style={StyleSheet.absoluteFill}>
        <Defs>
          <Mask id="scratchMask">
            <Rect width="100%" height="100%" fill="white" />
            {strokes.map((d, i) => (
               <Path key={i} d={d} stroke="black" strokeWidth={100} strokeLinecap="round" strokeLinejoin="round" />
            ))}
            {currentPath ? <Path d={currentPath} stroke="black" strokeWidth={100} strokeLinecap="round" strokeLinejoin="round" /> : null}
          </Mask>
        </Defs>
        <G mask="url(#scratchMask)">
          <Rect width="100%" height="100%" fill="#D1D5DB" />
          <SvgText x="50%" y="50%" fill="#4B5563" fontSize="16" fontWeight="bold" textAnchor="middle" alignmentBaseline="middle">
            Scratch to reveal message
          </SvgText>
        </G>
      </Svg>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
const ParticlesOverlay = React.memo(({ type, SCREEN_WIDTH, SCREEN_HEIGHT }: { type: string, SCREEN_WIDTH: number, SCREEN_HEIGHT: number }) => {
  const [particles, setParticles] = useState<any[]>([]);
  const particleTimerRef = useRef<any>(null);

  useEffect(() => {
    if (!type || type === 'none') {
      setParticles([]);
      return;
    }
    
    if (particleTimerRef.current) clearInterval(particleTimerRef.current);

    const configs = PARTICLE_CONFIGS[type];
    if (!configs) return;

    const makeParticle = () => {
      const config = configs[Math.floor(Math.random() * configs.length)];
      return {
        id: Math.random().toString(36).slice(2),
        config,
        left: Math.random() * (SCREEN_WIDTH - 20),
        duration: 2500 + Math.random() * 2500,
        rotationEnd: (Math.random() - 0.5) * 720,
      };
    };

    const isSnow = type === 'snow';
    const initialCount = isSnow ? 8 : 5;
    setParticles(Array.from({ length: initialCount }, makeParticle));

    particleTimerRef.current = setInterval(() => {
      setParticles(prev => {
        const newParticles = isSnow 
          ? [makeParticle(), makeParticle()]
          : [makeParticle()];
        return [...prev.slice(isSnow ? -20 : -12), ...newParticles];
      });
    }, 800);

    return () => {
      if (particleTimerRef.current) clearInterval(particleTimerRef.current);
    };
  }, [type, SCREEN_WIDTH]);

  if (particles.length === 0) return null;

  return (
    <View style={styles.particleOverlay} pointerEvents="none">
      {particles.map((p) => (
        <ParticleDrop key={p.id} particle={p} screenHeight={SCREEN_HEIGHT} />
      ))}
    </View>
  );
});

ParticlesOverlay.displayName = 'ParticlesOverlay';

export default function BouquetViewScreen({ navigation }: any) {
  const route = useRoute();
  const { id, openWallpaperModal, shouldGoToHomeOnClose, inlineData } = (route.params || {}) as { id?: string; openWallpaperModal?: boolean; shouldGoToHomeOnClose?: boolean; inlineData?: any };
  const { currentUser } = useAuth();
  const { t, locale } = useLanguage();
  const { getTextSize } = useAccessibility();
  const { theme: rawTheme } = useTheme();
  const { getEffectiveTheme } = useAccessibility();
  const insets = useSafeAreaInsets();

  // ── Core state ──────────────────────────────────────────────────────────────
  const [bouquetData, setBouquetData] = useState<BouquetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreator, setIsCreator] = useState(false); // true if this device created the bouquet
  
  const [isScratching, setIsScratching] = useState(false);
  const [isScratchRevealed, setIsScratchRevealed] = useState(false);
  const [showScratchAnimation, setShowScratchAnimation] = useState(false);
  const parallaxCleanupRef = useRef<(() => void) | null>(null);

  const handleScratchRevealed = useCallback(async () => {
    setIsScratchRevealed(true);
    setShowScratchAnimation(true);
    if (id) {
      await AsyncStorage.setItem(`bouquet_scratch_revealed_${id}`, 'true');
    }
  }, [id]);
  
  // ── Time Capsule ────────────────────────────────────────────────────────────
  const [isLocked, setIsLocked] = useState(false);
  const [countdownText, setCountdownText] = useState('');
  const [unlockTargetDate, setUnlockTargetDate] = useState<Date | null>(null);

  // ── Playback ────────────────────────────────────────────────────────────────
  const [isPlayingSong, setIsPlayingSong] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);
  
  // ── YouTube Player ──────────────────────────────────────────────────────────
  const [youtubeReady, setYoutubeReady] = useState(false);
  const [youtubePlaying, setYoutubePlaying] = useState(false);
  const [showYoutubePlayer, setShowYoutubePlayer] = useState(false);
  const [youtubeVideoMode, setYoutubeVideoMode] = useState(false); // Toggle between audio-only and video
  const shouldAutoplayYoutubeRef = useRef(false); // Track user interaction for autoplay
  const youtubeRef = useRef<any>(null);

  // ── Reply ───────────────────────────────────────────────────────────────────
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [replySubmitted, setReplySubmitted] = useState(false);
  const [existingReplies, setExistingReplies] = useState<Reply[]>([]);
  const [hasReplied, setHasReplied] = useState(false);
  const [showRepliesSection, setShowRepliesSection] = useState(false);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [resolvedBouquetId, setResolvedBouquetId] = useState<string | null>(null);

  // ── Particle effects ────────────────────────────────────────────────────────
  const [activeAnimType, setActiveAnimType] = useState<string | null>(null);

  const [touchEffects, setTouchEffects] = useState<any[]>([]);
  const tiltX = useRef(new Animated.Value(0)).current;
  const tiltY = useRef(new Animated.Value(0)).current;
  const flowerInfoAnimatingOut = useRef(false);

  // ── Translation ─────────────────────────────────────────────────────────────
  const [translatedData, setTranslatedData] = useState<{ message: string; recipient: string; sender: string } | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translateLang, setTranslateLang] = useState('es');
  const [showTranslatePicker, setShowTranslatePicker] = useState(false);
  const [showLangModal, setShowLangModal] = useState(false);
  const [langSearch, setLangSearch] = useState('');
  const [detectedCountry, setDetectedCountry] = useState<string | null>(null);
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);

  // ── TTS ─────────────────────────────────────────────────────────────────────
  const [isSpeaking, setIsSpeaking] = useState(false);

  // ── Voice Note ──────────────────────────────────────────────────────────────
  const [isPlayingVoiceNote, setIsPlayingVoiceNote] = useState(false);
  const voiceNoteSoundRef = useRef<Audio.Sound | null>(null);

  // ── Overlay / entrance ──────────────────────────────────────────────────────
  const [showImageFullScreen, setShowImageFullScreen] = useState(false);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);
  const [showFullScreenFlowers, setShowFullScreenFlowers] = useState(!openWallpaperModal);
  const [floatingFlowers, setFloatingFlowers] = useState<FloatingFlower[]>([]);

  // ── Flower info modal ───────────────────────────────────────────────────────
  const [selectedFlowerInfo, setSelectedFlowerInfo] = useState<(typeof FLOWER_MEANINGS)[string] & { id: string } | null>(null);

  const {
    slideAnim: flowerInfoSlide,
    panY: flowerInfoPanY,
    overlayOpacity: flowerInfoOverlay,
    panHandlers: flowerInfoPanHandlers,
    isInteractive: flowerInfoInteractive,
  } = useSwipeToClose(!!selectedFlowerInfo, () => setSelectedFlowerInfo(null));

  // ── Download & Wallpaper ──────────────────────────────────────────────────
  const bouquetViewRef = useRef<View>(null);
  const bouquetCanvasRef = useRef<View>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [saveOptionsModalVisible, setSaveOptionsModalVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      // Screen is focused
      return () => {
        // Screen is blurred
        if (isPlayingSong) {
          setIsPlayingSong(false);
        }
        if (youtubePlaying) {
          setYoutubePlaying(false);
        }
        if (soundRef.current) {
          soundRef.current.pauseAsync().catch(() => {});
        }
        if (isPlayingVoiceNote) {
          setIsPlayingVoiceNote(false);
        }
        if (voiceNoteSoundRef.current) {
          voiceNoteSoundRef.current.pauseAsync().catch(() => {});
        }
      };
    }, [isPlayingSong, youtubePlaying, isPlayingVoiceNote])
  );

  const handleSaveCard = () => {
    setShareInitialTab('image');
    setShareModalVisible(true);
  };

  const handleDownloadCard = async () => {
    setSaveOptionsModalVisible(false);
    if (isCapturing) return;
    setIsCapturing(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync(true);
      if (status !== 'granted') {
        Alert.alert(
          t('bouquetView.permissionRequired') || 'Permission required',
          'We need permission to save the card to your gallery.'
        );
        return;
      }

      if (!bouquetViewRef.current) {
        Alert.alert(
          t('bouquetView.error') || 'Error',
          'The bouquet canvas is not ready yet.'
        );
        return;
      }

      const uri = await captureRef(bouquetViewRef.current, {
        format: 'png',
        quality: 1.0,
      });

      await MediaLibrary.saveToLibraryAsync(uri);
      
      Toast.show({
        type: 'success',
        text1: t('bouquetView.savedSuccess') || 'Saved Successfully!',
        text2: t('bouquetView.savedSuccessDesc') || 'Bouquet has been saved to your photo gallery.',
      });
    } catch (error) {
      console.error('Error saving card:', error);
      Alert.alert(
        t('bouquetView.error') || 'Error',
        'Failed to save the bouquet to your gallery.'
      );
    } finally {
      setIsCapturing(false);
    }
  };

  const handleDownloadImage = async () => {
    setSaveOptionsModalVisible(false);
    if (isCapturing) return;
    setIsCapturing(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync(true);
      if (status !== 'granted') {
        Alert.alert(
          t('bouquetView.permissionRequired') || 'Permission required',
          'We need permission to save the card to your gallery.'
        );
        return;
      }

      if (!bouquetCanvasRef.current) {
        Alert.alert(
          t('bouquetView.error') || 'Error',
          'The bouquet canvas is not ready yet.'
        );
        return;
      }

      const pixelRatio = PixelRatio.get();
      const uri = await captureRef(bouquetCanvasRef.current, {
        format: 'png',
        quality: 1.0,
        result: 'tmpfile',
        width: Math.round(canvasWidth * pixelRatio),
        height: Math.round(canvasWidth * pixelRatio),
      });

      await MediaLibrary.saveToLibraryAsync(uri);
      
      Toast.show({
        type: 'success',
        text1: t('bouquetView.savedSuccess') || 'Saved Successfully!',
        text2: t('bouquetView.savedSuccessDesc') || 'Image has been saved to your photo gallery.',
      });
    } catch (error) {
      console.error('Error saving image:', error);
      Alert.alert(
        t('bouquetView.error') || 'Error',
        'Failed to save the image to your gallery.'
      );
    } finally {
      setIsCapturing(false);
    }
  };

  const handleShareImage = async () => {
    if (!bouquetCanvasRef.current) return;
    try {
      const pixelRatio = PixelRatio.get();
      const uri = await captureRef(bouquetCanvasRef.current, {
        format: 'png',
        quality: 1.0,
        result: 'tmpfile',
        width: Math.round(canvasWidth * pixelRatio),
        height: Math.round(canvasWidth * pixelRatio),
      });
      await Share.share({ url: uri });
    } catch (e) {
      console.error(e);
    }
  };

  // ── Share modal ─────────────────────────────────────────────────────────────
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [shareInitialTab, setShareInitialTab] = useState('link');
  const [shareUrl, setShareUrl] = useState('');
  const [shareRecipientName, setShareRecipientName] = useState('');

  // ── Vinyl spin animation ────────────────────────────────────────────────────
  const vinylRotation = useRef(new Animated.Value(0)).current;
  const vinylAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  // ─── Helpers ────────────────────────────────────────────────────────────────
  const isV2 = bouquetData?.version === 2;

  const th = getEffectiveTheme((bouquetData as any)?.isGoldenEdition ? {
    ...rawTheme,
    bg: '#0F0C0A',
    surface: '#1F1A15',
    surface2: '#2A1F1A',
    border: '#3D2E27',
    text: '#F5C842',
    textMuted: '#D4AF37',
    brand: '#C9960C',
    cardBg: '#1A1200'
  } : rawTheme);

  const recipientName =
    translatedData?.recipient ||
    bouquetData?.recipientName ||
    bouquetData?.messageCard?.recipientName ||
    t('bouquetView.anonymous');

  const senderName =
    translatedData?.sender ||
    bouquetData?.senderName ||
    bouquetData?.messageCard?.senderName ||
    t('bouquetView.anonymous');

  const displayMessage =
    translatedData?.message ||
    bouquetData?.message ||
    bouquetData?.messageCard?.message ||
    '';

  // ─── Generate floating flowers for the wallpaper overlay ────────────────────
  const generateFloatingFlowers = useCallback((flowerTypes: string[]) => {
    const isMobile = SCREEN_WIDTH <= 768;
    const baseSize = isMobile ? 80 : 100;
    const stepX = isMobile ? 160 : 155;
    const stepY = isMobile ? 160 : 155;
    const cols = Math.ceil(SCREEN_WIDTH / stepX) + 1;
    const rows = Math.ceil(SCREEN_HEIGHT / stepY) + 1;
    const maxFlowers = isMobile ? 12 : 30;

    const generated: FloatingFlower[] = [];
    let count = 0;

    for (let row = 0; row < rows && count < maxFlowers; row++) {
      for (let col = 0; col < cols && count < maxFlowers; col++) {
        const xOffset = row % 2 === 0 ? 0 : stepX * 0.5;
        const jitterX = (Math.random() - 0.5) * stepX * 0.4;
        const jitterY = (Math.random() - 0.5) * stepY * 0.4;
        const cx = col * stepX + xOffset + jitterX;
        const cy = row * stepY + jitterY;
        if (Math.random() < 0.1) continue;
        const size = baseSize + Math.random() * (baseSize * 0.3);
        const flowerId = flowerTypes[Math.floor(Math.random() * flowerTypes.length)];
        generated.push({
          id: `${flowerId}-${count}`,
          left: (cx / SCREEN_WIDTH) * 100,
          top: (cy / SCREEN_HEIGHT) * 100,
          size,
          rotation: Math.random() * 360,
        });
        count++;
      }
    }
    setFloatingFlowers(generated);
  }, []);

  // ─── Load inline data (for Together bouquets — no Firestore needed) ──────────
  useEffect(() => {
    if (!inlineData) return;
    setBouquetData(inlineData);
    setIsScratchRevealed(false); // always show scratch for reveals
    setLoading(false);
    const flowerIds = (inlineData.selectedFlowers || [])
      .map((f: any) => (typeof f === 'string' ? f : f.id))
      .filter(Boolean);
    if (flowerIds.length > 0) generateFloatingFlowers(flowerIds);
    else generateFloatingFlowers(FALLBACK_IDS);
  }, [inlineData]);

  // ─── Fetch bouquet from Firestore / cache ────────────────────────────────────
  useEffect(() => {
    if (!id || inlineData) return; // skip fetch if inline data was passed

    const fetchBouquet = async () => {
      // Generate fallback flowers immediately for instant wallpaper
      generateFloatingFlowers(FALLBACK_IDS);

      const scratchKey = `bouquet_scratch_revealed_${id}`;
      const scratchRevealedBefore = await AsyncStorage.getItem(scratchKey);
      if (scratchRevealedBefore === 'true') {
        setIsScratchRevealed(true);
      }

      try {
        let bouquetId = id;

        // 1. Resolve slug to ID
        const looksLikeUuid =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

        if (!looksLikeUuid) {
          const scopedSlugRef = doc(db, 'slugs', `bouquet__${id}`);
          const scopedSlugSnap = await getDoc(scopedSlugRef);

          if (scopedSlugSnap.exists()) {
            bouquetId = scopedSlugSnap.data().cardId;
          } else {
            const slugRef = doc(db, 'slugs', id);
            const slugSnap = await getDoc(slugRef);
            if (slugSnap.exists()) {
              const slugData = slugSnap.data();
              if (slugData.cardType === 'bouquet' || slugData.type === 'bouquet') {
                bouquetId = slugData.cardId;
              }
            }
          }
        }

        setResolvedBouquetId(bouquetId);

        // 2. Try AsyncStorage FIRST for instant load
        const cacheKey = `bouquet_${bouquetId}`;
        const cachedRaw = await AsyncStorage.getItem(cacheKey);
        if (cachedRaw) {
          try {
            const parsed: BouquetData = JSON.parse(cachedRaw);
            setBouquetData(parsed);
            setLoading(false); // Show the bouquet immediately

            // Set creator state from cached data
            const deviceId = await getDeviceId();
            const createdKey = `bouquet_created_${bouquetId}`;
            const didCreate = await AsyncStorage.getItem(createdKey);
            if (didCreate === 'true') setIsCreator(true);
            if (currentUser && (parsed as any).userId === currentUser.uid) setIsCreator(true);
            if ((parsed as any).userId === deviceId) setIsCreator(true);

            // Load cached replies
            const repliesCacheKey = `bouquet_replies_${bouquetId}`;
            const cachedReplies = await AsyncStorage.getItem(repliesCacheKey);
            if (cachedReplies) {
              const parsedReplies = JSON.parse(cachedReplies);
              if (parsedReplies && parsedReplies.length > 0) {
                setExistingReplies(parsedReplies);
                setHasReplied(true);
              }
            }
            
            // Generate flowers for wallpaper
            const flowerIds = (parsed.selectedFlowers || [])
              .map((f) => (typeof f === 'string' ? f : (f as FlowerV2).id))
              .filter(Boolean);
            if (flowerIds.length > 0) generateFloatingFlowers(flowerIds);
          } catch (e) {
            console.error('Cache parse error:', e);
          }
        }

        // 3. Fetch from Firestore to update cache/check for changes
        const docRef = doc(db, 'bouquet-cards', bouquetId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as BouquetData;
          setBouquetData(data);
          
          // Update cache
          await AsyncStorage.setItem(`bouquet_${bouquetId}`, JSON.stringify(data));
          await AsyncStorage.setItem(`bouquet_${id}`, JSON.stringify(data));
          await syncWidgetDataWithBouquet(bouquetId, data);

          const repliedKey = `bouquet_replied_${id}`;
          const hasRepliedBefore = await AsyncStorage.getItem(repliedKey);
          setHasReplied(hasRepliedBefore === 'true');

          const deviceId = await getDeviceId();
          const createdKey = `bouquet_created_${bouquetId}`;
          const didCreate = await AsyncStorage.getItem(createdKey);
          if (didCreate === 'true') setIsCreator(true);
          if (currentUser && (data as any).userId === currentUser.uid) setIsCreator(true);
          if ((data as any).userId === deviceId) setIsCreator(true);
        }
      } catch (error) {
        console.error('Error fetching bouquet:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBouquet();
  }, [id, generateFloatingFlowers, currentUser]);

  // ─── Listen to replies in real-time ───────────────────────────────────────────
  useEffect(() => {
    if (!resolvedBouquetId) return;

    const replyRef = doc(db, 'bouquet-replies', `${resolvedBouquetId}_replies`);
    const unsubscribe = onSnapshot(replyRef, async (docSnap) => {
      if (docSnap.exists()) {
        const replies: Reply[] = docSnap.data().replies || [];
        setExistingReplies(replies);
        if (replies.length > 0) {
          setHasReplied(true);
          await AsyncStorage.setItem(`bouquet_replies_${resolvedBouquetId}`, JSON.stringify(replies));
          await AsyncStorage.setItem(`bouquet_replied_${id}`, 'true');
        }
      }
    }, (error) => {
      console.error('Error listening to replies:', error);
    });

    return () => unsubscribe();
  }, [resolvedBouquetId, id]);

  // ─── Re-generate flowers with actual flower types when data arrives ───────────
  useEffect(() => {
    if (!bouquetData) return;
    const flowerIds = (bouquetData.selectedFlowers || [])
      .map((f) => (typeof f === 'string' ? f : (f as FlowerV2).id))
      .filter(Boolean);
    if (flowerIds.length > 0) {
      generateFloatingFlowers(flowerIds);
    }
  }, [bouquetData, generateFloatingFlowers]);

  // ─── Time Capsule Logic ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!bouquetData) {
      setIsLocked(false);
      return;
    }
    
    let targetDate: Date | null = null;
    const unlockVal = (bouquetData.additionalSettings as any)?.unlockDate;
    
    if (unlockVal) {
      if (typeof (unlockVal as any).toDate === 'function') {
        targetDate = (unlockVal as any).toDate();
      } else if ((unlockVal as any).seconds) {
        targetDate = new Date((unlockVal as any).seconds * 1000);
      } else {
        targetDate = new Date(unlockVal as string | number);
      }
    }
    
    if (targetDate && targetDate.getTime() > Date.now()) {
      setUnlockTargetDate(targetDate);
      setIsLocked(true);
      
      const interval = setInterval(() => {
        const now = Date.now();
        const diff = targetDate!.getTime() - now;
        if (diff <= 0) {
          setIsLocked(false);
          clearInterval(interval);
        } else {
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const secs = Math.floor((diff % (1000 * 60)) / 1000);
          setCountdownText(`${days > 0 ? `${days}d ` : ''}${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
        }
      }, 1000);
      
      return () => clearInterval(interval);
    } else {
      setIsLocked(false);
    }
  }, [bouquetData]);

  // ─── Vinyl spin animation ─────────────────────────────────────────────────────
  useEffect(() => {
    if (isPlayingSong || youtubePlaying) {
      vinylAnimRef.current = Animated.loop(
        Animated.timing(vinylRotation, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
        })
      );
      vinylAnimRef.current.start();
    } else {
      vinylAnimRef.current?.stop();
      vinylRotation.setValue(0);
    }
  }, [isPlayingSong, youtubePlaying, vinylRotation]);

  useEffect(() => {
    const unsubscribeBlur = navigation.addListener('blur', () => {
      if (soundRef.current) {
        soundRef.current.stopAsync().catch(() => {});
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
      if (voiceNoteSoundRef.current) {
        voiceNoteSoundRef.current.stopAsync().catch(() => {});
        voiceNoteSoundRef.current.unloadAsync().catch(() => {});
        voiceNoteSoundRef.current = null;
      }
      Speech.stop();
      setIsPlayingSong(false);
      setIsPlayingVoiceNote(false);
      setYoutubePlaying(false);
    });

    return () => {
      unsubscribeBlur();
      if (soundRef.current) {
        soundRef.current.stopAsync().catch(() => {});
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
      if (voiceNoteSoundRef.current) {
        voiceNoteSoundRef.current.stopAsync().catch(() => {});
        voiceNoteSoundRef.current.unloadAsync().catch(() => {});
        voiceNoteSoundRef.current = null;
      }
      Speech.stop();
    };
  }, [navigation]);

  // ─── Detect user's country and language from IP ───────────────────────────────
  useEffect(() => {
    const detectUserLocation = async () => {
      try {
        const country = await detectCountryFromIP();
        if (country) {
          setDetectedCountry(country);
          const lang = getLanguageForCountry(country);
          setDetectedLanguage(lang);
          // Set as default translation language if we have it
          if (lang && LANGUAGE_OPTIONS.find(opt => opt.value === lang)) {
            setTranslateLang(lang);
          }
        }
      } catch (error) {
        console.log('Failed to detect country:', error);
      }
    };
    detectUserLocation();
  }, []);

  // ─── Handle exit when coming from card creation success screen ───────────────
  useEffect(() => {
    if (!shouldGoToHomeOnClose) return;

    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      e.preventDefault();
      navigation.navigate('MainTabs' as never);
    });

    return unsubscribe;
  }, [navigation, shouldGoToHomeOnClose]);

  // ─── Open bouquet handler ──────────────────────────────────────────────────────
  const handleOpenBouquet = useCallback(async () => {
    if (!bouquetData) return;
    setShowFullScreenFlowers(false);

    // Start parallax and particle effects if configured
    const animType = (bouquetData as any)?.isGoldenEdition ? 'golden-sparkles' : bouquetData.additionalSettings?.animation;
    if (animType && animType !== 'none') {
      parallaxCleanupRef.current = startParallax();
      setActiveAnimType(animType);
    }

    // Save to received history (only if not the creator)
    if (!isCreator && id) {
      try {
        const receivedKey = `bouquet_received_${id}`;
        const alreadySaved = await AsyncStorage.getItem(receivedKey);
        if (!alreadySaved) {
          await AsyncStorage.setItem(receivedKey, 'true');
          // Store minimal data for the received tab
          const receivedListRaw = await AsyncStorage.getItem('received_bouquets');
          const receivedList = receivedListRaw ? JSON.parse(receivedListRaw) : [];
          const entry = {
            id,
            recipientName: bouquetData.recipientName || bouquetData.messageCard?.recipientName || '',
            senderName: bouquetData.senderName || bouquetData.messageCard?.senderName || '',
            selectedFlowers: bouquetData.selectedFlowers || [],
            openedAt: Date.now(),
          };
          // Keep last 50, newest first
          const updated = [entry, ...receivedList.filter((r: any) => r.id !== id)].slice(0, 50);
          await AsyncStorage.setItem('received_bouquets', JSON.stringify(updated));
        }
      } catch (_) {}
    }

    // Auto-play / indicate song
    if (bouquetData.song?.id && !bouquetData.song?.isItunes) {
      // YouTube song — show embedded player and trigger autoplay after user interaction
      setShowYoutubePlayer(true);
      setYoutubeVideoMode(false); // Start in audio mode
      shouldAutoplayYoutubeRef.current = true; // Enable autoplay since user clicked "Open"
      setYoutubePlaying(true); // Fire event immediately just in case
    } else if (bouquetData.song?.previewUrl || bouquetData.song?.url) {
      try {
        const audioUri = bouquetData.song.previewUrl || bouquetData.song.url;
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        const { sound } = await Audio.Sound.createAsync(
          { uri: audioUri! },
          { shouldPlay: true, isLooping: true }
        );
        soundRef.current = sound;
        setIsPlayingSong(true);
        sound.setOnPlaybackStatusUpdate((status) => {
          if (!status.isLoaded) setIsPlayingSong(false);
        });
      } catch (err) {
        console.log('Auto-play error:', err);
      }
    }
  }, [bouquetData, isCreator, id]);

  // ─── Particle system ──────────────────────────────────────────────────────────
  const startParallax = useCallback(() => {
    // ── Accelerometer for Parallax ──
    let accelerometerSub: any = null;
    Accelerometer.setUpdateInterval(200);
    accelerometerSub = Accelerometer.addListener(({ x, y }) => {
      Animated.spring(tiltX, {
        toValue: x * 20, // parallax strength
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }).start();
      Animated.spring(tiltY, {
        toValue: y * 20,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }).start();
    });

    return () => {
      if (accelerometerSub) accelerometerSub.remove();
    };
  }, []);

  // ─── Toggle song playback ─────────────────────────────────────────────────────
  const toggleSongPlayback = useCallback(async () => {
    if (!bouquetData?.song) return;

    if (bouquetData.song.id && !bouquetData.song.isItunes) {
      // YouTube — manually toggle state and control player
      if (youtubePlaying) {
        setYoutubePlaying(false);
        setIsPlayingSong(false);
      } else {
        setYoutubePlaying(true);
        setIsPlayingSong(true);
      }
      return;
    }

    if (!bouquetData.song?.previewUrl && !bouquetData.song?.url) return;

    if (isPlayingSong) {
      await soundRef.current?.pauseAsync();
      setIsPlayingSong(false);
    } else {
      if (soundRef.current) {
        await soundRef.current.playAsync();
      } else {
        try {
          const audioUri = bouquetData.song.previewUrl || bouquetData.song.url;
          if (!audioUri) return;
          
          await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
          const { sound } = await Audio.Sound.createAsync(
            { uri: audioUri },
            { shouldPlay: true, isLooping: true }
          );
          soundRef.current = sound;
        } catch (err) {
          console.log('Play error:', err);
        }
      }
      setIsPlayingSong(true);
    }
  }, [bouquetData, isPlayingSong, youtubePlaying]);

  // ─── YouTube Player Callbacks ─────────────────────────────────────────────────
  const handleYouTubeReady = useCallback(() => {
    setYoutubeReady(true);
    
    // Seek to start time if specified
    setTimeout(() => {
      if (youtubeRef.current && bouquetData?.song?.startTime) {
        try {
          youtubeRef.current.seekTo(bouquetData.song.startTime, true);
        } catch (err) {
          console.log('Seek error:', err);
        }
      }
      
      // Autoplay only if user clicked "Open"
      if (youtubeRef.current && shouldAutoplayYoutubeRef.current) {
        try {
          setYoutubePlaying(true);
          shouldAutoplayYoutubeRef.current = false; // Reset flag
        } catch (err) {
          console.log('Autoplay error:', err);
        }
      }
    }, 100);
  }, [bouquetData?.song?.startTime]);

  const handleYouTubeStateChange = useCallback((state: string) => {
    const playing = state === 'playing';
    setYoutubePlaying(playing);
    setIsPlayingSong(playing); // Sync vinyl animation
  }, []);

  // ── YouTube polling to enforce clip duration ──────────────────────────────────
  useEffect(() => {
    if (!youtubePlaying || !bouquetData?.song?.clipDuration) return;
    
    const startTime = bouquetData.song.startTime || 0;
    const clipDuration = bouquetData.song.clipDuration;
    const endTime = startTime + clipDuration;

    const id = setInterval(async () => {
      if (!youtubeRef.current) return;
      try {
        const currentTime: number = await youtubeRef.current.getCurrentTime();
        // Stop when reaching the end of the clip
        if (currentTime >= endTime - 0.1) {
          setYoutubePlaying(false);
          setIsPlayingSong(false);
          // Seek back to start of clip
          await youtubeRef.current.seekTo(startTime, true);
        }
      } catch {}
    }, 500); // was 100 — slower polling prevents listener accumulation

    return () => clearInterval(id);
  }, [youtubePlaying, bouquetData?.song?.startTime, bouquetData?.song?.clipDuration]);

  const openYouTubeApp = useCallback(() => {
    if (bouquetData?.song?.id) {
      const startTime = bouquetData.song.startTime || 0;
      const youtubeUrl = `https://www.youtube.com/watch?v=${bouquetData.song.id}&t=${startTime}s`;
      Linking.openURL(youtubeUrl);
    }
  }, [bouquetData?.song]);

  // ─── Fetch replies ────────────────────────────────────────────────────────────
  const handleShowReplies = useCallback(async () => {
    if (showRepliesSection) {
      setShowRepliesSection(false);
      return;
    }

    const repliesCacheKey = `bouquet_replies_${id}`;
    const cachedReplies = await AsyncStorage.getItem(repliesCacheKey);
    if (cachedReplies) {
      try {
        setExistingReplies(JSON.parse(cachedReplies));
        setShowRepliesSection(true);
        return;
      } catch (e) {
        console.error('Replies cache parse error:', e);
      }
    }

    setLoadingReplies(true);
    try {
      let bouquetId = id!;
      const scopedSlugSnap = await getDoc(doc(db, 'slugs', `bouquet__${id}`));
      if (scopedSlugSnap.exists()) {
        bouquetId = scopedSlugSnap.data().cardId;
      } else {
        const legacySnap = await getDoc(doc(db, 'slugs', id!));
        if (legacySnap.exists()) {
          const d = legacySnap.data();
          if (d.cardType === 'bouquet' || d.type === 'bouquet') bouquetId = d.cardId;
        }
      }

      const repliesSnap = await getDoc(doc(db, 'bouquet-replies', `${bouquetId}_replies`));
      if (repliesSnap.exists()) {
        const replies: Reply[] = repliesSnap.data().replies || [];
        setExistingReplies(replies);
        await AsyncStorage.setItem(repliesCacheKey, JSON.stringify(replies));
      }
      setShowRepliesSection(true);
    } catch (error) {
      console.error('Error fetching replies:', error);
    } finally {
      setLoadingReplies(false);
    }
  }, [id, showRepliesSection]);

  // ─── Submit reply ─────────────────────────────────────────────────────────────
  const handleReplySubmit = useCallback(async () => {
    if (!replyMessage.trim() || hasReplied || isCreator || submittingReply) return;

    setSubmittingReply(true);
    try {
      let bouquetId = id!;
      const scopedSlugSnap = await getDoc(doc(db, 'slugs', `bouquet__${id}`));
      if (scopedSlugSnap.exists()) {
        bouquetId = scopedSlugSnap.data().cardId;
      } else {
        const legacySnap = await getDoc(doc(db, 'slugs', id!));
        if (legacySnap.exists()) {
          const d = legacySnap.data();
          if (d.cardType === 'bouquet' || d.type === 'bouquet') bouquetId = d.cardId;
        }
      }

      const replyRef = doc(db, 'bouquet-replies', `${bouquetId}_replies`);
      const replyDoc = await getDoc(replyRef);

      // Enforce 1-reply max at write time too
      const existingCount = replyDoc.exists() ? (replyDoc.data().replies || []).length : 0;
      if (existingCount >= 1) {
        setHasReplied(true);
        await AsyncStorage.setItem(`bouquet_replied_${id}`, 'true');
        setShowReplyBox(false);
        setReplyMessage('');
        return;
      }

      const newReply: Reply = { message: replyMessage.trim(), timestamp: Date.now() };

      await setDoc(replyRef, {
        bouquetId,
        replies: [newReply],
        lastUpdated: serverTimestamp(),
      });

      const updated = [newReply];
      setExistingReplies(updated);
      await AsyncStorage.setItem(`bouquet_replies_${id}`, JSON.stringify(updated));
      await AsyncStorage.setItem(`bouquet_replied_${id}`, 'true');
      setHasReplied(true);
      setReplySubmitted(true);
      setShowReplyBox(false);
      setReplyMessage('');

      Toast.show({
        type: 'success',
        text1: t('bouquetView.replySent') || 'Reply sent!',
        text2: `We have notified ${(bouquetData as any)?.senderName || 'the sender'} of your message.`,
      });

      // Send push notification to the bouquet creator (Cloud Function handles it via Firestore trigger)
      // The onWrite trigger on bouquet-replies will fire automatically.
    } catch (error) {
      console.error('Error submitting reply:', error);
      Toast.show({
        type: 'error',
        text1: t('bouquetView.errorReply'),
        text2: t('bouquetView.errorReplyDesc'),
      });
    } finally {
      setSubmittingReply(false);
    }
  }, [id, replyMessage, hasReplied, isCreator, existingReplies, submittingReply, bouquetData]);

  // ─── Translate ────────────────────────────────────────────────────────────────
  const handleTranslate = useCallback(async (lang: string) => {
    if (isTranslating) return;

    if (translatedData) {
      setTranslatedData(null);
      return;
    }

    setIsTranslating(true);
    const message = bouquetData?.message || bouquetData?.messageCard?.message || '';
    const recipient = bouquetData?.recipientName || bouquetData?.messageCard?.recipientName || '';
    const sender = bouquetData?.senderName || bouquetData?.messageCard?.senderName || '';

    const translateText = async (text: string): Promise<string> => {
      if (!text) return text;
      const res = await fetch(
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${lang}&dt=t&q=${encodeURIComponent(text)}`
      );
      const data = await res.json();
      return data[0].map((item: any) => item[0]).join('');
    };

    try {
      const [tMessage, tRecipient, tSender] = await Promise.all([
        translateText(message),
        translateText(recipient),
        translateText(sender),
      ]);
      setTranslatedData({ message: tMessage, recipient: tRecipient, sender: tSender });
    } catch {
      Toast.show({
        type: 'error',
        text1: t('bouquetView.errorTranslate'),
        text2: t('bouquetView.errorTranslateDesc'),
      });
    } finally {
      setIsTranslating(false);
    }
  }, [bouquetData, isTranslating, translatedData]);

  // ─── Text-to-Speech ───────────────────────────────────────────────────────────
  const handleTextToSpeech = useCallback(async () => {
    if (isSpeaking) {
      await Speech.stop();
      setIsSpeaking(false);
      return;
    }

    if (!bouquetData) return;

    if (isPlayingSong) {
      soundRef.current?.pauseAsync();
      setIsPlayingSong(false);
    }
    if (youtubePlaying && youtubeRef.current) {
      setYoutubePlaying(false);
    }

    const message = bouquetData.message || bouquetData.messageCard?.message || '';
    const sender = bouquetData.senderName || bouquetData.messageCard?.senderName || '';
    const recipient = bouquetData.recipientName || bouquetData.messageCard?.recipientName || '';
    const flowerNames = (bouquetData.selectedFlowers || [])
      .map((f) => (typeof f === 'string' ? f : (f as FlowerV2).id).replace(/-/g, ' '))
      .join(', ');

    const fullText = `This is a digital bouquet card. ${recipient ? `To ${recipient}.` : ''} The bouquet contains the following flowers: ${flowerNames}. The message reads: ${message}. From ${sender}.`;

    setIsSpeaking(true);
    Speech.speak(fullText, {
      rate: 0.9,
      pitch: 1,
      onDone: () => setIsSpeaking(false),
      onError: () => {
        setIsSpeaking(false);
        Toast.show({
          type: 'error',
          text1: t('bouquetView.errorTTS'),
          text2: t('bouquetView.errorTTSDesc'),
        });
      },
    });
  }, [bouquetData, isSpeaking]);

  // ─── Share ────────────────────────────────────────────────────────────────────
  const handleShare = useCallback(async () => {
    const url = `https://egreet.in/bouquet/${id}`;
    const recipientName = bouquetData?.recipientName || bouquetData?.messageCard?.recipientName || 'Friend';
    setShareUrl(url);
    setShareInitialTab('link');
    setShareModalVisible(true);
  }, [id, bouquetData]);

  // ─── WhatsApp share — now just opens ShareModal ───────────────────────────────
  const handleWhatsAppShare = useCallback(async () => {
    const url = `https://egreet.in/bouquet/${id}`;
    setShareUrl(url);
    setShareInitialTab('whatsapp');
    setShareModalVisible(true);
  }, [id]);

  // Animate flower info bottom-sheet in/out
  useEffect(() => {
    if (selectedFlowerInfo) {
      flowerInfoAnimatingOut.current = false;
      flowerInfoPanY.setValue(0);
      flowerInfoSlide.setValue(800);
      Animated.parallel([
        Animated.spring(flowerInfoSlide, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
        Animated.timing(flowerInfoOverlay, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      if (flowerInfoAnimatingOut.current) {
        flowerInfoAnimatingOut.current = false;
        return;
      }
      Animated.parallel([
        Animated.timing(flowerInfoSlide, { toValue: 800, duration: 220, useNativeDriver: true }),
        Animated.timing(flowerInfoOverlay, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [selectedFlowerInfo]);

  // ─── Reset animations on data change ──────────────────────────────────────────
  useEffect(() => {
    if (!bouquetData) return;
    const animType = (bouquetData as any)?.isGoldenEdition ? 'none' : bouquetData.additionalSettings?.animation;

    // Reset standard flower animations (flowerAnimRefs was not defined)
  }, [bouquetData]);

  // ─── Save Wallpaper to Camera Roll ──────────────────────────────────────────
  const handleReport = () => {
    Toast.show({
      type: 'success',
      text1: t('bouquetView.reportSuccess') || 'Report Submitted',
      text2: t('bouquetView.reportDesc') || 'Thank you for helping keep our community safe.',
      visibilityTime: 4000,
    });
  };

  // ─── Canvas size for bouquet visual ──────────────────────────────────────────
  const canvasWidth = Math.min(SCREEN_WIDTH - 32, 600);
  const canvasHeight = canvasWidth; // Square canvas to match CreateBouquetScreen

  // ─── Vinyl spin interpolation ─────────────────────────────────────────────────
  const spin = vinylRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const handleCanvasTouch = (e: any) => {
    const anim = (bouquetData as any)?.isGoldenEdition ? 'golden-sparkles' : (bouquetData?.additionalSettings?.animation || 'sparkles');
    if (!PARTICLE_CONFIGS[anim]) return;
    
    const { locationX, locationY } = e.nativeEvent;
    const newEffect = { id: Math.random().toString(), x: locationX, y: locationY, anim };
    setTouchEffects(prev => [...prev.slice(-4), newEffect]);
    setTimeout(() => {
      setTouchEffects(prev => prev.filter(p => p.id !== newEffect.id));
    }, 1500);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Loading
  // ─────────────────────────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────
  const renderFormattedText = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|__.*?__|<br>|\[.*?\]\(.*?\))/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <Text key={i} style={{ fontWeight: 'bold' }}>{part.slice(2, -2)}</Text>;
      } else if (part.startsWith('*') && part.endsWith('*')) {
        return <Text key={i} style={{ fontStyle: 'italic' }}>{part.slice(1, -1)}</Text>;
      } else if (part.startsWith('__') && part.endsWith('__')) {
        return <Text key={i} style={{ textDecorationLine: 'underline' }}>{part.slice(2, -2)}</Text>;
      } else if (part === '<br>') {
        return '\n';
      } else if (part.startsWith('[') && part.includes('](') && part.endsWith(')')) {
        const titleMatch = part.match(/\[(.*?)\]/);
        const urlMatch = part.match(/\((.*?)\)/);
        const title = titleMatch ? titleMatch[1] : '';
        const url = urlMatch ? urlMatch[1] : '';
        return (
          <Text
            key={i}
            style={{ color: '#0066cc', textDecorationLine: 'underline' }}
            onPress={() => Linking.openURL(url).catch(() => {})}
          >
            {title || url}
          </Text>
        );
      }
      return <Text key={i}>{part}</Text>;
    });
  };

  const filteredLanguages = LANGUAGE_OPTIONS.filter(l => 
    l.label.toLowerCase().includes(langSearch.toLowerCase())
  );

  // Sort languages to show detected language first
  const sortedLanguages = React.useMemo(() => {
    if (!detectedLanguage) return filteredLanguages;
    
    const detected = filteredLanguages.find(lang => lang.value === detectedLanguage);
    if (!detected) return filteredLanguages;
    
    return [detected, ...filteredLanguages.filter(lang => lang.value !== detectedLanguage)];
  }, [filteredLanguages, detectedLanguage]);

  return (
    <View style={[styles.pageContainer, { backgroundColor: th.bg }]}>
      <StatusBar barStyle={(bouquetData as any)?.isGoldenEdition ? "light-content" : "dark-content"} />

      {/* Persistent X Button (Overlay style) - Hidden during capture */}
      {!isCapturing && (
        <TouchableOpacity
          style={[styles.overlayCloseBtn, { top: 50 + (Platform.OS === 'ios' ? 0 : 20) }]}
          onPress={() => navigation.goBack()}
        >
          <Feather name="x" size={18} color="#2d2d2d" />
        </TouchableOpacity>
      )}

      {/* Report Button - REMOVED for cleaner design */}

      {/* ── Full-screen flower wallpaper overlay ──────────────────────────── */}
      {showFullScreenFlowers && (
        <View style={styles.overlayContainer}>

          {/* Wallpaper flowers */}
          {floatingFlowers.map((flower) => {
            const img = getFlowerImage(flower.id.split('-').slice(0, -1).join('-')) ||
                        getFlowerImage(flower.id);
            if (!img) return null;
            return (
              <React.Fragment key={flower.id}>
                <Image
                  source={img}
                  style={[
                    styles.wallpaperFlower as any,
                    {
                      left: `${flower.left}%` as any,
                      top: `${flower.top}%` as any,
                      width: flower.size,
                      height: flower.size,
                      transform: [{ rotate: `${flower.rotation}deg` }],
                    }
                  ]}
                  resizeMode="contain"
                />
                {(bouquetData as any)?.isGoldenEdition && (
                  <Image
                    source={img}
                    style={[
                      styles.wallpaperFlower as any,
                      {
                        left: `${flower.left}%` as any,
                        top: `${flower.top}%` as any,
                        width: flower.size,
                        height: flower.size,
                        transform: [{ rotate: `${flower.rotation}deg` }],
                        shadowColor: '#D4AF37',
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 1,
                        shadowRadius: 8
                      }
                    ]}
                    resizeMode="contain"
                  />
                )}
              </React.Fragment>
            );
          })}


          {/* Open button */}
          {!loading && bouquetData && (
            <TouchableOpacity
              style={styles.openButton}
              onPress={handleOpenBouquet}
              activeOpacity={0.85}
            >
              <Text style={styles.openButtonText}>{t('bouquetView.openNow')}</Text>
            </TouchableOpacity>
          )}

          {loading && (
            <View style={styles.openButton}>
               <ActivityIndicator color="#7A5C58" style={{ marginBottom: 4 }} />
               <Text style={styles.openButtonText}>{t('bouquetView.preparing')}</Text>
            </View>
          )}

          {!loading && !bouquetData && (
            <View style={styles.openButton}>
              <Text style={styles.openButtonText}>{t('bouquetView.notFound')}</Text>
            </View>
          )}
        </View>
      )}

      {/* ── Main content ──────────────────────────────────────────────────── */}
      {!showFullScreenFlowers && bouquetData && (
        <View style={{ flex: 1 }}>

          {/* ── Particle effects overlay ──────────────────────────────────── */}
          {activeAnimType && (
            <ParticlesOverlay 
              type={activeAnimType} 
              SCREEN_WIDTH={SCREEN_WIDTH} 
              SCREEN_HEIGHT={SCREEN_HEIGHT} 
            />
          )}

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            scrollEnabled={!isScratching}
          >
          {/* ─── GOLDEN BOUQUET FEATURE ─────────────────────────────────────────────────── */}
          {(bouquetData as any)?.isGoldenEdition && (
            <View style={{ marginBottom: 16, marginTop: 16, alignSelf: 'center' }}>
              <View style={{ backgroundColor: '#D4AF37', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, shadowColor: '#D4AF37', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 6, elevation: 4 }}>
                <Text style={{ fontFamily: 'Manrope-Bold', fontSize: 9, color: '#1A1200', letterSpacing: 1.2 }}>LIMITED EDITION</Text>
              </View>
            </View>
          )}
          {/* ─── END GOLDEN BOUQUET FEATURE ────────────────────────────────────────────── */}

          {/* ── Bouquet visual ────────────────────────────────────────────── */}
          <View style={[styles.visualCard, { overflow: 'visible' }]}>
            <View style={styles.visualWrapper}>
              <View
                ref={bouquetViewRef}
                collapsable={false}
                style={[styles.canvasFrame, { width: canvasWidth, backgroundColor: 'transparent', shadowOpacity: 0, elevation: 0, borderRadius: 12, padding: 0 }]}
              >
                <View ref={bouquetCanvasRef} collapsable={false} style={[styles.bouquetCanvas, { width: canvasWidth, height: canvasWidth, borderRadius: 12, overflow: 'hidden', alignSelf: 'center' }]}>
                  <TouchableOpacity activeOpacity={1} onPress={handleCanvasTouch} style={{ width: '100%', height: '100%' }}>
                  {/* Unified Background / Greenery layer */}
                  {(() => {
                    const activeBg = bouquetData.greeneryBg || (bouquetData.background !== undefined && bouquetData.background !== null ? `bg-${bouquetData.background + 1}` : 'bg-1');
                    const img = getFlowerImage(activeBg);
                    if (!img) return null;
                    const isGreenery = activeBg && !activeBg.startsWith('bg-');
                    const isEucalyptus = activeBg === 'baby-blue-eucalyptus';
                    return (
                      <Animated.Image
                        source={img}
                        style={[
                          StyleSheet.absoluteFillObject,
                          { width: canvasWidth, height: canvasWidth, zIndex: 0 },
                          isEucalyptus
                            ? { transform: [{translateX: Animated.multiply(tiltX, 0.5)}, {translateY: Animated.add(Animated.multiply(tiltY, 0.5), -25)}, {scale: 1.1}] }
                            : { transform: [{translateX: Animated.multiply(tiltX, 0.5)}, {translateY: Animated.multiply(tiltY, 0.5)}] },
                          (bouquetData as any)?.isGoldenEdition && { shadowColor: '#D4AF37', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 10, elevation: 10 }
                        ]}
                        resizeMode={isGreenery ? "cover" : "stretch"}
                      />
                    );
                  })()}
                  {isV2 ? (
                    // V2 — absolute positioning sorted by zIndex (matches CreateBouquetScreen exactly)
                    [...(bouquetData.selectedFlowers as FlowerV2[])].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0)).map((flower, index) => {
                      const drawnUri = (bouquetData.drawnFlowers as any)?.[flower.id];
                      const img = drawnUri ? { uri: drawnUri } : getFlowerImage(flower.id);
                      if (!img) return null;
                      const flowerInfo = getTranslatedFlowerMeaning(locale, flower.id);
                      const flowerSize = canvasWidth * 0.22 * (flower.scale || 1);
                      const left = (flower.x / 100) * canvasWidth - flowerSize / 2;
                      const top = (flower.y / 100) * canvasWidth - flowerSize / 2;
                      return (
                        <TouchableOpacity
                          key={flower.uniqueId || index}
                          style={[
                            styles.flowerV2,
                            {
                              left,
                              top,
                              width: flowerSize,
                              height: flowerSize,
                              zIndex: flower.zIndex || index,
                            },
                          ]}
                          onPress={() => flowerInfo && setSelectedFlowerInfo({ ...flowerInfo, id: flower.id })}
                          activeOpacity={0.85}
                        >
                          <Animated.Image source={img as any} style={[styles.flowerV2Img as any, { transform: [{translateX: tiltX}, {translateY: tiltY}, { rotate: `${flower.rotation}deg` }] }, (bouquetData as any)?.isGoldenEdition && { shadowColor: '#D4AF37', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 8, elevation: 8 }]} resizeMode="contain" />
                        </TouchableOpacity>
                      );
                    })
                  ) : (
                    // V1 — legacy row layout
                    <Animated.View style={[styles.legacyArrangement, { zIndex: 10, transform: [{translateX: tiltX}, {translateY: tiltY}] }]}>
                      {(bouquetData.selectedFlowers as string[]).map((flowerId, index) => {
                        const drawnUri = (bouquetData.drawnFlowers as any)?.[flowerId];
                        const img = drawnUri ? { uri: drawnUri } : getFlowerImage(flowerId);
                        if (!img) return null;
                        const flowerInfo = getTranslatedFlowerMeaning(locale, flowerId);
                        return (
                          <TouchableOpacity
                            key={index}
                            onPress={() => flowerInfo && setSelectedFlowerInfo({ ...flowerInfo, id: flowerId })}
                            activeOpacity={0.85}
                          >
                            <Image source={img as any} style={[styles.flowerLegacy as any, (bouquetData as any)?.isGoldenEdition && { shadowColor: '#D4AF37', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 8, elevation: 8 }]} resizeMode="contain" />
                          </TouchableOpacity>
                        );
                      })}
                    </Animated.View>
                  )}

                  {/* Render Touch Effects */}
                  {touchEffects.map(effect => (
                    <TouchEffect key={effect.id} effect={effect} />
                  ))}
                </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          {/* ── Message card ──────────────────────────────────────────────── */}
          <View style={[styles.messageCard, { backgroundColor: (th as any).cardBg || '#fff', borderColor: th.border || '#eaeaea' }]}>
            <View style={{ padding: 24, paddingTop: 8 }}>
              <View style={[styles.messageCardHeader, { borderBottomColor: th.border || '#f0f0f0' }]}>
                <Text style={[styles.recipientTitle, { color: th.text }]}>{t('bouquetView.forLabel')} {recipientName}</Text>
                <Text style={[styles.senderSubtitle, { color: th.textMuted }]}>{t('bouquetView.fromLabel')} {senderName}</Text>
                {(() => {
                  const dateVal = (bouquetData as any).updatedAt || (bouquetData as any).createdAt;
                  if (!dateVal) return null;
                  let validDate = null;
                  if (typeof dateVal.toMillis === 'function') validDate = new Date(dateVal.toMillis());
                  else if (dateVal.seconds) validDate = new Date(dateVal.seconds * 1000);
                  else validDate = new Date(dateVal);
                  if (!validDate || isNaN(validDate.getTime())) return null;
                  
                  return (
                    <Text style={[styles.dateText, { color: th.textMuted }]}>
                      {validDate.toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </Text>
                  );
                })()}
              </View>

            {/* Body */}
            <View style={styles.messageBody}>
              <View style={{ position: 'relative', overflow: 'hidden', minHeight: 120, paddingBottom: 8 }}>
                <View style={styles.messageHeader}>
                  <Text
                    style={[
                      styles.messageText,
                      { 
                        fontFamily: bouquetData.additionalSettings?.dyslexiaFriendly 
                          ? 'Courier' // Monospace fonts are often easier for dyslexic readers
                          : FONT_FAMILY_MAP[bouquetData.messageFormatting?.fontStyle || 'default'], 
                        color: th.text 
                      },
                      bouquetData.messageFormatting?.bold && { fontWeight: 'bold' },
                      bouquetData.messageFormatting?.italic && { fontStyle: 'italic' },
                      bouquetData.additionalSettings?.largeText && { fontSize: 22 },
                      bouquetData.additionalSettings?.dyslexiaFriendly && { 
                        letterSpacing: 1.5, 
                        lineHeight: 36
                      },
                    ]}
                  >
                    {renderFormattedText(displayMessage)}
                  </Text>
                  <TouchableOpacity 
                    style={styles.copyMessageBtn}
                    onPress={async () => {
                      try {
                        await Clipboard.setStringAsync(displayMessage);
                        Toast.show({
                          type: 'success',
                          text1: t('bouquetView.copiedMessage'),
                          text2: t('bouquetView.copiedMessageDesc'),
                          visibilityTime: 1500,
                        });
                      } catch (error) {
                        Toast.show({
                          type: 'error',
                          text1: t('bouquetView.errorCopy'),
                          text2: t('bouquetView.errorCopyDesc'),
                        });
                      }
                    }}
                  >
                    <Feather name="copy" size={14} color="#999" />
                  </TouchableOpacity>
                </View>

                {translatedData && (
                  <Text style={styles.translatedLabel}>{t('bouquetView.translated')}</Text>
                )}

                
                <ScratchOffOverlay 
                  onRevealed={handleScratchRevealed} 
                  onScratchingChange={setIsScratching} 
                  initiallyRevealed={isScratchRevealed || isCreator} 
                />
              </View>

              {/* Image Attachment – mosaic collage grid */}
              {(() => {
                const imgUrls = bouquetData.messageImageUrls?.length
                  ? bouquetData.messageImageUrls
                  : bouquetData.messageImageUrl
                  ? [bouquetData.messageImageUrl]
                  : [];
                if (imgUrls.length === 0) return null;
                const GAP = 3;
                const openGallery = (index: number) => {
                  setActiveGalleryIndex(index);
                  setShowImageFullScreen(true);
                };
                const ImgThumb = ({ uri, idx }: { uri: string; idx: number }) => (
                  <TouchableOpacity
                    onPress={() => openGallery(idx)}
                    activeOpacity={0.88}
                    style={{ flex: 1, borderRadius: 8, overflow: 'hidden', backgroundColor: '#f0ece8' }}
                  >
                    <CachedImage source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    {imgUrls.length > 1 && (
                      <View style={{ position: 'absolute', right: 8, bottom: 8, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 10, padding: 4 }}>
                        <Feather name="maximize-2" size={12} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
                const count = imgUrls.length;
                return (
                  <View style={{ marginTop: 16, marginBottom: 8 }}>
                    {count === 1 && (
                      <View style={{ height: 240, borderRadius: 12, overflow: 'hidden' }}>
                        <ImgThumb uri={imgUrls[0]} idx={0} />
                        <View style={{ position: 'absolute', right: 12, bottom: 12, backgroundColor: 'rgba(0,0,0,0.5)', padding: 6, borderRadius: 20 }}>
                          <Feather name="maximize-2" size={16} color="#fff" />
                        </View>
                      </View>
                    )}
                    {count === 2 && (
                      <View style={{ height: 190, flexDirection: 'row', gap: GAP, borderRadius: 12, overflow: 'hidden' }}>
                        <ImgThumb uri={imgUrls[0]} idx={0} />
                        <ImgThumb uri={imgUrls[1]} idx={1} />
                      </View>
                    )}
                    {count === 3 && (
                      <View style={{ height: 210, flexDirection: 'row', gap: GAP, borderRadius: 12, overflow: 'hidden' }}>
                        <View style={{ flex: 1.4 }}><ImgThumb uri={imgUrls[0]} idx={0} /></View>
                        <View style={{ flex: 1, gap: GAP }}>
                          <ImgThumb uri={imgUrls[1]} idx={1} />
                          <ImgThumb uri={imgUrls[2]} idx={2} />
                        </View>
                      </View>
                    )}
                    {count === 4 && (
                      <View style={{ height: 220, gap: GAP, borderRadius: 12, overflow: 'hidden' }}>
                        <View style={{ flex: 1, flexDirection: 'row', gap: GAP }}>
                          <ImgThumb uri={imgUrls[0]} idx={0} />
                          <ImgThumb uri={imgUrls[1]} idx={1} />
                        </View>
                        <View style={{ flex: 1, flexDirection: 'row', gap: GAP }}>
                          <ImgThumb uri={imgUrls[2]} idx={2} />
                          <ImgThumb uri={imgUrls[3]} idx={3} />
                        </View>
                      </View>
                    )}
                    {count >= 5 && (
                      <View style={{ height: 240, flexDirection: 'row', gap: GAP, borderRadius: 12, overflow: 'hidden' }}>
                        <View style={{ flex: 1.3 }}><ImgThumb uri={imgUrls[0]} idx={0} /></View>
                        <View style={{ flex: 1, gap: GAP }}>
                          <View style={{ flex: 1, flexDirection: 'row', gap: GAP }}>
                            <ImgThumb uri={imgUrls[1]} idx={1} />
                            <ImgThumb uri={imgUrls[2]} idx={2} />
                          </View>
                          <View style={{ flex: 1, flexDirection: 'row', gap: GAP }}>
                            <ImgThumb uri={imgUrls[3]} idx={3} />
                            <ImgThumb uri={imgUrls[4]} idx={4} />
                          </View>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })()}

              {/* Voice Note Attachment */}
              {bouquetData.messageAudioUrl && (
                <View style={{ marginTop: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FA', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#EAE0D5' }}>
                  <TouchableOpacity 
                    style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#7A5C58', alignItems: 'center', justifyContent: 'center' }}
                    onPress={async () => {
                      if (isPlayingVoiceNote) {
                        await voiceNoteSoundRef.current?.pauseAsync();
                        setIsPlayingVoiceNote(false);
                      } else {
                        if (voiceNoteSoundRef.current) {
                          await voiceNoteSoundRef.current.playAsync();
                          setIsPlayingVoiceNote(true);
                        } else {
                          try {
                            const { sound } = await Audio.Sound.createAsync(
                              { uri: bouquetData.messageAudioUrl! },
                              { shouldPlay: true }
                            );
                            voiceNoteSoundRef.current = sound;
                            setIsPlayingVoiceNote(true);
                            sound.setOnPlaybackStatusUpdate((status: any) => {
                              if (status.didJustFinish) setIsPlayingVoiceNote(false);
                            });
                          } catch (e) {
                            console.error('Play voice note error:', e);
                          }
                        }
                      }
                    }}
                  >
                    {isPlayingVoiceNote ? <Feather name="pause" size={18} color="white" /> : <Feather name="play" size={18} color="white" style={{ marginLeft: 2 }} />}
                  </TouchableOpacity>
                  <View style={{ marginLeft: 12 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#5C4844' }}>{t('createBouquet.voiceNote') || 'Voice Note'}</Text>
                    <Text style={{ fontSize: 12, color: '#997E7A', marginTop: 2 }}>{isPlayingVoiceNote ? 'Playing...' : 'Tap to listen'}</Text>
                  </View>
                </View>
              )}
            </View>

            {/* ── Translate ──────────────────────────────────────────────── */}
            {!isCapturing && bouquetData.additionalSettings?.translateEnabled && (
              <View style={styles.translateSection}>
                {showTranslatePicker && (
                  <View style={styles.translateRow}>
                    <TouchableOpacity
                      style={styles.langPickerBtn}
                      onPress={() => setShowLangModal(true)}
                    >
                      <Text style={styles.langPickerText}>
                        {LANGUAGE_OPTIONS.find((l) => l.value === translateLang)?.label || 'Spanish'}
                      </Text>
                      <Text style={styles.langPickerArrow}>▾</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.translateBtn, isTranslating && { opacity: 0.6 }]}
                      onPress={() => handleTranslate(translateLang)}
                      disabled={isTranslating}
                    >
                      <Text style={styles.translateBtnText}>
                        {isTranslating ? 'Translating...' : 'Translate'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
                <TouchableOpacity
                  style={[styles.actionChip, translatedData && styles.actionChipActive]}
                  onPress={() => {
                    setShowTranslatePicker(!showTranslatePicker);
                    if (translatedData) setTranslatedData(null);
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Feather name="globe" size={13} color={translatedData ? '#fff' : undefined} />
                    <Text style={[styles.actionChipText, translatedData && { color: '#fff' }]}>
                      {translatedData ? t('bouquetView.original') : t('bouquetView.translatePage')}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* ── Reply section ──────────────────────────────────────────── */}
            {!isCapturing && ((bouquetData as any)?.isRandomAct ? (
              <View style={{ marginTop: 24 }}>
                <TouchableOpacity 
                  style={{ backgroundColor: '#fff', borderColor: '#E74C3C', borderWidth: 1, padding: 12, borderRadius: 8, alignItems: 'center' }} 
                  onPress={async () => {
                    const { moderateWithSarvam } = await import('../utils/raokSafety');
                    const res = await moderateWithSarvam((bouquetData as any)?.message || '');
                    if (!res.isSafe) {
                      try {
                        await deleteDoc(doc(db, 'bouquet-cards', id!));
                        Alert.alert('Report Successful', 'This bouquet has been flagged and permanently deleted.');
                        navigation.goBack();
                      } catch (e) {
                        Alert.alert('Error', 'Failed to delete the bouquet.');
                      }
                    } else {
                      Alert.alert('Report Reviewed', 'Our AI determined this message does not violate safety guidelines.');
                    }
                  }}
                >
                  <Text style={{ color: '#E74C3C', fontWeight: 'bold' }}>Flag / Report Message</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {isCreator && existingReplies.length > 0 && (
                  <View style={[styles.repliesContainer, { backgroundColor: '#fff', borderColor: '#EAE0D5', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }]}>
                    <Text style={[styles.repliesTitle, { fontFamily: 'PlayfairDisplay-Bold', color: '#5C4844', fontSize: 16, marginBottom: 8 }]}>Reply from Recipient</Text>
                    <View style={[styles.replyItem, { backgroundColor: th.surface || '#FFF5F0', borderWidth: 0, padding: 16, borderRadius: 12 }]}>
                      <Text style={[styles.replyText, { color: th.text || '#333', fontSize: 15, lineHeight: 24, fontStyle: 'italic' }]}>{"\"" + existingReplies[0].message + "\""}</Text>
                      <Text style={[styles.replyTimestamp, { color: th.textMuted || '#999', marginTop: 8 }]}>
                        {new Date(existingReplies[0].timestamp).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                )}

                {!isCreator && (
                  hasReplied || existingReplies.length >= 1 ? (
                    existingReplies.length > 0 ? (
                      <View style={[styles.repliesContainer, { backgroundColor: '#fff', borderColor: '#EAE0D5', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }]}>
                        <Text style={[styles.repliesTitle, { fontFamily: 'PlayfairDisplay-Bold', color: '#5C4844', fontSize: 16, marginBottom: 8 }]}>Your Reply</Text>
                        <View style={[styles.replyItem, { backgroundColor: th.surface || '#FFF5F0', borderWidth: 0, padding: 16, borderRadius: 12 }]}>
                          <Text style={[styles.replyText, { color: th.text || '#333', fontSize: 15, lineHeight: 24, fontStyle: 'italic' }]}>{"\"" + existingReplies[0].message + "\""}</Text>
                          <Text style={[styles.replyTimestamp, { color: th.textMuted || '#999', marginTop: 8 }]}>
                            {new Date(existingReplies[0].timestamp).toLocaleString()}
                          </Text>
                        </View>
                      </View>
                    ) : (
                      <View style={[styles.alreadyReplied, { padding: 16, flexDirection: 'row', alignItems: 'center' }]}>
                        <ActivityIndicator size="small" color="#7A5C58" style={{ marginRight: 10 }} />
                        <Text style={[styles.alreadyRepliedText, { fontWeight: '600', fontSize: 15, color: '#7A5C58' }]}>
                          Loading your reply...
                        </Text>
                      </View>
                    )
                  ) : (
                  <>
                    {!showReplyBox && !isCreator && (
                      <TouchableOpacity
                        style={styles.replyBtn}
                        onPress={() => setShowReplyBox(true)}
                      >
                        <Feather name="message-circle" size={15} color="#fff" style={{ marginRight: 6 }} />
                        <Text style={styles.replyBtnText}>{t('bouquetView.sendReply')}</Text>
                      </TouchableOpacity>
                    )}
                    <Modal
                      visible={showReplyBox}
                      transparent={true}
                      animationType="fade"
                      onRequestClose={() => { if (!submittingReply) setShowReplyBox(false); }}
                    >
                      <KeyboardAvoidingView 
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={{ flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 20 }}
                      >
                        <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 5 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <Text style={{ fontSize: 18, fontFamily: 'PlayfairDisplay-Bold', color: '#333' }}>{t('bouquetView.sendReply')}</Text>
                            <TouchableOpacity 
                              onPress={() => { if (!submittingReply) { setShowReplyBox(false); setReplyMessage(''); } }}
                              disabled={submittingReply}
                              style={submittingReply && { opacity: 0.5 }}
                            >
                              <Feather name="x" size={24} color={submittingReply ? "#ccc" : "#666"} />
                            </TouchableOpacity>
                          </View>
                          
                          <View style={styles.replyInputWrapper}>
                            <TextInput
                              style={[styles.replyInput, { minHeight: 140, backgroundColor: th.surface || '#f8f9fa', borderColor: th.border || '#e9ecef', fontSize: 16, color: th.text }]}
                              value={replyMessage}
                              onChangeText={setReplyMessage}
                              placeholder={t('bouquetView.writeReplyHere')}
                              placeholderTextColor={th.textMuted || "#adb5bd"}
                              maxLength={500}
                              multiline
                              numberOfLines={5}
                              autoFocus
                              editable={!submittingReply}
                            />
                            <Text style={styles.charCountInside}>{replyMessage.length}/500</Text>
                          </View>
                          
                          <TouchableOpacity
                            style={[{ marginTop: 20, backgroundColor: '#7A5C58', paddingVertical: 14, borderRadius: 12, alignItems: 'center' }, (!replyMessage.trim() || submittingReply) && { opacity: 0.5 }]}
                            onPress={handleReplySubmit}
                            disabled={!replyMessage.trim() || submittingReply}
                          >
                            {submittingReply ? (
                              <ActivityIndicator color="#fff" size="small" />
                            ) : (
                              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>{t('bouquetView.sendReply')}</Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      </KeyboardAvoidingView>
                    </Modal>
                  </>
                  )
                )}
              </>
            ))}
            </View>
          </View>

          {/* ── Music Player ─────────────────────────────────────────────────── */}
          {bouquetData.song && (
            <View style={styles.musicPlayerContainer}>
              {/* YouTube Player - Always render when YouTube song, position off-screen in audio mode */}
              {bouquetData.song.id && !bouquetData.song.isItunes && showYoutubePlayer && (
                <View style={[
                  styles.youtubePlayerWrapper,
                  !youtubeVideoMode && styles.youtubePlayerHidden
                ]}>
                  <View style={styles.youtubePlayerContainer}>
                    <YoutubePlayer
                      ref={youtubeRef}
                      height={220}
                      width={SCREEN_WIDTH - 64}
                      play={youtubePlaying}
                      videoId={bouquetData.song.id}
                      onReady={handleYouTubeReady}
                      onChangeState={handleYouTubeStateChange}
                      forceAndroidAutoplay={Platform.OS === 'android'}
                      webViewProps={{
                        mediaPlaybackRequiresUserAction: false,
                        androidLayerType: 'hardware',
                      }}
                      initialPlayerParams={{
                        controls: true,
                        rel: false,
                        start: bouquetData.song.startTime || 0,
                      }}
                    />
                  </View>
                  {youtubeVideoMode && (
                    <View style={styles.youtubePlayerControls}>
                      <Text style={styles.youtubePlayerHint}>
                        {bouquetData.song.startTime 
                          ? `${t('youtubeSearch.startsAt').replace('{time}', bouquetData.song.startTime.toString())}${bouquetData.song.clipDuration ? ` • ${bouquetData.song.clipDuration}s clip` : ''}`
                          : t('bouquetView.playingFromStart') || 'Playing from the beginning'
                        }
                      </Text>
                      <TouchableOpacity 
                        style={styles.switchModeBtn}
                        onPress={() => setYoutubeVideoMode(false)}
                      >
                        <Music size={14} color="#7A5C58" />
                        <Text style={styles.switchModeBtnText}>
                          {t('bouquetView.switchToAudio') || 'Audio Only'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}

              {/* Vinyl Turntable Player - Only show when NOT in video mode */}
              {(!bouquetData.song.id || bouquetData.song.isItunes || !youtubeVideoMode) && (
                <View style={styles.turntable}>
                {/* Platter */}
                <View style={styles.platter}>
                  <Animated.View style={[styles.vinylDisc, { transform: [{ rotate: spin }] }]}>
                    {/* Grooves - decorative rings */}
                    {[0.55, 0.48, 0.40, 0.32].map((r, i) => (
                      <View
                        key={i}
                        style={[
                          styles.groove,
                          {
                            width: 200 * r,
                            height: 200 * r,
                            borderRadius: 200 * r * 0.5,
                            top: (200 - 200 * r) / 2,
                            left: (200 - 200 * r) / 2,
                          },
                        ]}
                      />
                    ))}
                    {/* Album art center — YouTube thumbnail or iTunes art */}
                    {bouquetData.song.albumArt ? (
                      <CachedImage
                        source={{ uri: bouquetData.song.albumArt }}
                        style={styles.albumArt as any}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.albumArt, { backgroundColor: '#333' }]} />
                    )}
                    {/* Source badge overlay */}
                    <View style={styles.sourceBadge}>
                      <Text style={styles.sourceBadgeText}>
                        {bouquetData.song.id ? 'YT' : 'iTunes'}
                      </Text>
                    </View>
                    {/* Spindle */}
                    <View style={styles.spindle} />
                  </Animated.View>

                  {/* Needle arm */}
                  <TouchableOpacity
                    onPress={(bouquetData.song.previewUrl || bouquetData.song.id) ? toggleSongPlayback : undefined}
                    style={[
                      styles.needleArm,
                      (isPlayingSong || youtubePlaying) ? styles.needleArmPlaying : styles.needleArmLifted,
                    ]}
                    activeOpacity={0.8}
                  >
                    <View style={styles.needlePivot} />
                    <View style={[styles.needleBody, (isPlayingSong || youtubePlaying) && styles.needleBodyPlaying]} />
                    <View style={[styles.needleTip, (isPlayingSong || youtubePlaying) && styles.needleTipPlaying]} />
                  </TouchableOpacity>
                </View>

                {/* Song info */}
                <Text style={styles.songTitle}>{bouquetData.song.name}</Text>
                <Text style={styles.songArtist}>{bouquetData.song.artist}</Text>
                
                {/* YouTube-specific controls */}
                {bouquetData.song.id && (
                  <View style={styles.youtubeControls}>
                    {!youtubeVideoMode && (
                      <TouchableOpacity 
                        style={styles.youtubeActionBtn}
                        onPress={() => setYoutubeVideoMode(true)}
                      >
                        <Play size={14} color="#7A5C58" fill="#7A5C58" />
                        <Text style={styles.youtubeActionBtnText}>
                          {t('bouquetView.switchToVideo') || 'Watch Video'}
                        </Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity 
                      style={[styles.youtubeActionBtn, styles.youtubeActionBtnSecondary]}
                      onPress={openYouTubeApp}
                    >
                      <ExternalLink size={14} color="#666" />
                      <Text style={[styles.youtubeActionBtnText, { color: '#666' }]}>
                        {t('bouquetView.listenOnYouTube') || 'Open in YouTube'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
                
                <Text style={styles.needleHint}>
                  {bouquetData.song.id
                    ? youtubePlaying
                      ? t('bouquetView.tapNeedleStop') || 'Tap needle to stop'
                      : t('bouquetView.tapNeedlePlay') || 'Tap needle to play'
                    : bouquetData.song.previewUrl
                      ? isPlayingSong
                        ? t('bouquetView.tapNeedleStop') || 'Tap needle to stop'
                        : t('bouquetView.tapNeedlePlay') || 'Tap needle to play'
                      : t('bouquetView.noPreview') || 'No preview available'}
                </Text>
              </View>
              )}
            </View>
          )}

          {/* ── Share buttons - Hidden during capture ─────────────────────────────────────────────── */}
          {!isCapturing && (
            <TouchableOpacity style={styles.modernShareBtn} onPress={handleShare}>
              <View style={styles.shareIconContainer}>
                <Feather name="share-2" size={20} color="#7A5C58" />
              </View>
              <View style={styles.shareTextContainer}>
                <Text style={styles.shareBtnTitle}>{t('bouquetView.shareBouquetTitle')}</Text>
                <Text style={styles.shareBtnSubtitle}>{t('bouquetView.shareBouquetSubtitle')}</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* ── Accessibility ──────────────────────────────────────────────── */}
          {(bouquetData.additionalSettings?.blindFriendly ||
            (bouquetData.additionalSettings?.colorBlindMode &&
              bouquetData.additionalSettings.colorBlindMode !== 'none')) && (
            <View style={styles.accessibilityBox}>
              <Text style={styles.accessibilityTitle}>{t('bouquetView.accessibilityOptions')}</Text>

              {bouquetData.additionalSettings?.blindFriendly && (
                <TouchableOpacity
                  style={[styles.ttsBtn, isSpeaking && styles.ttsBtnActive]}
                  onPress={handleTextToSpeech}
                >
                  <Feather name={isSpeaking ? 'volume-x' : 'volume-2'} size={16} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.ttsBtnText}>
                    {isSpeaking ? t('bouquetView.stopReading') : t('bouquetView.readAloud')}
                  </Text>
                </TouchableOpacity>
              )}

              {bouquetData.additionalSettings?.colorBlindMode &&
                bouquetData.additionalSettings.colorBlindMode !== 'none' && (
                  <View style={styles.colorBlindNote}>
                    <Feather name="info" size={13} color="#1976d2" style={{ marginRight: 6 }} />
                    <Text style={styles.colorBlindNoteText}>
                      {t('bouquetView.colorsAdjusted').replace('{mode}', bouquetData.additionalSettings.colorBlindMode)}
                    </Text>
                  </View>
                )}
            </View>
          )}

          {/* ── Bottom actions ─────────────────────────────────────────────── */}
          <View style={styles.bottomActions}>
            <TouchableOpacity
              style={{ flex: 1, width: '100%' }}
              onPress={handleSaveCard}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#8E6E69', '#7A5C58']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={{
                  paddingVertical: 16,
                  paddingHorizontal: 24,
                  borderRadius: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#7A5C58',
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.3,
                  shadowRadius: 12,
                  elevation: 6,
                }}
              >
                <Feather name="image" size={18} color="#fff" style={{ marginRight: 10 }} />
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16, letterSpacing: 0.5 }}>
                  {t('bouquetView.saveCard') || 'Save as Image'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
        </View>
      )}

      {/* ── Flower info modal ────────────────────────────────────────────── */}
      <Modal
        visible={!!selectedFlowerInfo}
        transparent
        animationType="none"
        onRequestClose={() => setSelectedFlowerInfo(null)}
      >
        <View style={StyleSheet.absoluteFill}>
          {/* Overlay */}
          <Animated.View
            pointerEvents={selectedFlowerInfo ? 'auto' : 'none'}
            style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.55)', opacity: flowerInfoOverlay }]}
          >
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setSelectedFlowerInfo(null)} />
          </Animated.View>

          {/* Sheet */}
          <Animated.View
            pointerEvents={flowerInfoInteractive ? 'auto' : 'none'}
            style={[
              styles.modalCard,
              {
                position: 'absolute', left: 0, right: 0, bottom: 0,
                borderRadius: 24, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, paddingBottom: 32,
                backgroundColor: rawTheme.cardBg,
                transform: [{ translateY: Animated.add(flowerInfoSlide, flowerInfoPanY) }],
              },
            ]}
            {...flowerInfoPanHandlers}
          >
            {/* Pull handle */}
            <TouchableOpacity activeOpacity={1} style={{ alignSelf: 'center', paddingTop: 10, paddingBottom: 6, marginBottom: 10, marginTop: -10 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: rawTheme.border }} />
            </TouchableOpacity>

            {selectedFlowerInfo && (
              <>
                {getFlowerImage(selectedFlowerInfo.id) && (
                  <Image
                    source={getFlowerImage(selectedFlowerInfo.id)}
                    style={styles.modalFlowerImg as any}
                    resizeMode="contain"
                  />
                )}
                <Text style={[styles.modalFlowerName, { color: rawTheme.text }]}>{selectedFlowerInfo.name}</Text>
                <Text style={[styles.modalFlowerMeaning, { color: rawTheme.text }]}>{selectedFlowerInfo.meaning}</Text>
                <View style={[styles.modalInfoBox, { backgroundColor: rawTheme.surface, borderColor: rawTheme.border }]}>
                  <Text style={[styles.modalPurpose, { color: rawTheme.text }]}>{selectedFlowerInfo.purpose}</Text>
                  <View style={[styles.modalDivider, { backgroundColor: rawTheme.border }]} />
                  <Text style={[styles.modalPersonal, { color: rawTheme.textMuted }]}>
                    {t('bouquetView.personalNote').replace('{sender}', senderName).replace('{recipient}', recipientName)}
                  </Text>
                </View>
              </>
            )}
          </Animated.View>
        </View>
      </Modal>
      {/* Image Gallery Full-Screen Modal */}
      <Modal hardwareAccelerated={true} visible={showImageFullScreen} transparent={true} animationType="fade" onRequestClose={() => setShowImageFullScreen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.97)', justifyContent: 'center', alignItems: 'center' }}>
          {/* Close */}
          <TouchableOpacity
            style={{ position: 'absolute', top: Platform.OS === 'ios' ? 60 : 40, right: 20, zIndex: 10, padding: 10 }}
            onPress={() => setShowImageFullScreen(false)}
          >
            <Feather name="x" size={28} color="#fff" />
          </TouchableOpacity>
          {/* Download active image */}
          <TouchableOpacity
            style={{ position: 'absolute', top: Platform.OS === 'ios' ? 60 : 40, left: 20, zIndex: 10, padding: 10 }}
            onPress={async () => {
              try {
                const imgUrls = bouquetData?.messageImageUrls?.length
                  ? bouquetData.messageImageUrls
                  : bouquetData?.messageImageUrl
                  ? [bouquetData.messageImageUrl]
                  : [];
                const activeUrl = imgUrls[activeGalleryIndex];
                if (!activeUrl) return;
                const { status } = await MediaLibrary.requestPermissionsAsync(true);
                if (status !== 'granted') {
                  Alert.alert(t('bouquetView.permissionRequired') || 'Permission required', 'We need permission to save the image.');
                  return;
                }
                const uri = FileSystem.documentDirectory + `attached_image_${activeGalleryIndex}.jpg`;
                const { uri: downloadedUri } = await FileSystem.downloadAsync(activeUrl, uri);
                await MediaLibrary.saveToLibraryAsync(downloadedUri);
                Alert.alert('Success', 'Image saved to gallery.');
              } catch (error) {
                Alert.alert('Error', 'Failed to save the image.');
              }
            }}
          >
            <Feather name="download" size={24} color="#fff" />
          </TouchableOpacity>
          {/* Image display */}
          {(() => {
            const imgUrls = bouquetData?.messageImageUrls?.length
              ? bouquetData.messageImageUrls
              : bouquetData?.messageImageUrl
              ? [bouquetData.messageImageUrl]
              : [];
            const total = imgUrls.length;
            const activeUrl = imgUrls[activeGalleryIndex];
            return (
              <View style={{ width: SCREEN_WIDTH, alignItems: 'center' }}>
                {activeUrl && (
                  <CachedImage
                    key={activeUrl}
                    source={{ uri: activeUrl }}
                    style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.75 }}
                    resizeMode="contain"
                  />
                )}
                {/* Page indicator */}
                {total > 1 && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 }}>
                    <TouchableOpacity
                      onPress={() => setActiveGalleryIndex(i => Math.max(0, i - 1))}
                      style={{ padding: 10, opacity: activeGalleryIndex === 0 ? 0.3 : 1 }}
                    >
                      <Feather name="chevron-left" size={28} color="#fff" />
                    </TouchableOpacity>
                    <Text style={{ color: '#fff', fontSize: 14, fontFamily: 'Manrope-SemiBold', minWidth: 50, textAlign: 'center' }}>
                      {activeGalleryIndex + 1} / {total}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setActiveGalleryIndex(i => Math.min(total - 1, i + 1))}
                      style={{ padding: 10, opacity: activeGalleryIndex === total - 1 ? 0.3 : 1 }}
                    >
                      <Feather name="chevron-right" size={28} color="#fff" />
                    </TouchableOpacity>
                  </View>
                )}
                {/* Thumbnail indicators */}
                {total > 1 && (
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                    {imgUrls.map((url, i) => (
                      <TouchableOpacity key={i} onPress={() => setActiveGalleryIndex(i)}>
                        <View style={{
                          width: 48,
                          height: 48,
                          borderRadius: 8,
                          overflow: 'hidden',
                          borderWidth: 2,
                          borderColor: i === activeGalleryIndex ? '#fff' : 'transparent',
                          opacity: i === activeGalleryIndex ? 1 : 0.5,
                        }}>
                          <CachedImage source={{ uri: url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            );
          })()}
        </View>
      </Modal>

      <ShareModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
        recipientName={shareRecipientName}
        url={`https://egreet.in/bouquet/${id}`}
        title={t('history.share') || 'Share Bouquet'}
        subtitle={t('share.subtitle') || 'Choose how to share this bouquet'}
        shareText={t('share.defaultText') || 'I made a digital bouquet for you! 🌸'}
        onShareImage={handleShareImage}
        bouquetData={bouquetData}
        initialTab={shareInitialTab}
      />



      {/* ── Language picker modal ────────────────────────────────────────── */}
      <Modal
        visible={showLangModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLangModal(false)}
      >
        <TouchableOpacity
          style={styles.langModalOverlay}
          activeOpacity={1}
          onPress={() => setShowLangModal(false)}
        >
          <View style={styles.langModalCard}>
            <Text style={styles.langModalTitle}>{t('bouquetView.selectLanguage')}</Text>
            
            {/* Language Search */}
            <View style={styles.langSearchBox}>
              <Feather name="search" size={16} color="#888" />
              <TextInput
                style={styles.langSearchInput}
                placeholder={t('common.search') || 'Search...'}
                value={langSearch}
                onChangeText={setLangSearch}
                placeholderTextColor="#999"
              />
              {langSearch.length > 0 && (
                <TouchableOpacity onPress={() => setLangSearch('')}>
                  <Feather name="x" size={16} color="#888" />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={sortedLanguages}
              keyExtractor={(item) => item.value}
              getItemLayout={(data, index) => ({ length: 51, offset: 51 * index, index })}
              renderItem={({ item }) => {
                const isDetected = detectedLanguage && item.value === detectedLanguage;
                return (
                  <TouchableOpacity
                    style={[
                      styles.langOption,
                      translateLang === item.value && styles.langOptionActive,
                      isDetected && { backgroundColor: '#f8f4f0' }
                    ]}
                    onPress={() => {
                      setTranslateLang(item.value);
                      setShowLangModal(false);
                      setLangSearch('');
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                      <Text
                        style={[
                          styles.langOptionText,
                          translateLang === item.value && styles.langOptionTextActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                      {isDetected && detectedCountry && (
                        <View style={styles.detectedBadgeView}>
                          <Text style={styles.detectedFlagText}>{getCountryFlag(detectedCountry)}</Text>
                          <Text style={styles.detectedLabelText}>Your Language</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <Text style={{ textAlign: 'center', color: '#999', marginTop: 20 }}>{t('bouquetView.noLanguagesFound')}</Text>
              }
            />
          </View>
        </TouchableOpacity>
      </Modal>
      
      {/* ── Time Capsule Lock Overlay ────────────────────────────────────────────── */}
      {isLocked && unlockTargetDate && (
        <View style={[StyleSheet.absoluteFill, { zIndex: 9999, justifyContent: 'center', alignItems: 'center', backgroundColor: Platform.OS === 'web' ? 'rgba(250, 248, 245, 0.98)' : 'rgba(250, 248, 245, 0.85)' }]}>

          <TouchableOpacity 
            style={styles.overlayCloseBtn} 
            onPress={() => {
              if (shouldGoToHomeOnClose) {
                navigation.navigate('MainTabs' as never);
              } else if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate('MainTabs' as never);
              }
            }}
          >
            <Feather name="x" size={24} color="#2d2d2d" />
          </TouchableOpacity>
          <View style={{ backgroundColor: '#fff', padding: 40, borderRadius: 32, alignItems: 'center', width: '85%', maxWidth: 400, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 30, shadowOffset: { width: 0, height: 15 }, borderWidth: 1, borderColor: '#f0ece6' }}>
            <Text style={{ fontSize: 28, fontWeight: '600', color: '#2d2d2d', marginBottom: 16, textAlign: 'center', fontFamily: FONT_FAMILY_MAP.elegant }}>Time Capsule</Text>
            <Text style={{ fontSize: 16, color: '#888', textAlign: 'center', marginBottom: 32, lineHeight: 24 }}>
              This bouquet is locked until{'\n'}
              <Text style={{ fontWeight: '600', color: '#2d2d2d' }}>
                {unlockTargetDate.toLocaleDateString()} at {unlockTargetDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </Text>
            <View style={{ backgroundColor: '#faf8f5', paddingHorizontal: 32, paddingVertical: 20, borderRadius: 24, borderWidth: 1, borderColor: '#eaeaea' }}>
              <Text style={{ fontSize: 36, fontWeight: '800', color: '#7A5C58', fontVariant: ['tabular-nums'], letterSpacing: 1 }}>{countdownText}</Text>
            </View>
            <Text style={{ fontSize: 14, color: '#a0a0a0', marginTop: 24, textAlign: 'center' }}>Come back when the countdown ends</Text>
          </View>
        </View>
      )}

      {showScratchAnimation && (
        <View style={[StyleSheet.absoluteFillObject, { zIndex: 9999, elevation: 9999 }]} pointerEvents="none">
          <LottieView
            source={require('../../assets/animations/scratch.json')}
            autoPlay
            loop={false}
            onAnimationFinish={() => setShowScratchAnimation(false)}
            style={StyleSheet.absoluteFillObject}
          />
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // ── Page ────────────────────────────────────────────────────────────────────
  pageContainer: {
    flex: 1,
    backgroundColor: '#faf8f5', // Cream style
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 32,
    alignItems: 'center',
  },

  // ── Error ────────────────────────────────────────────────────────────────────
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#faf8f5', // Cream style
    padding: 32,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#2d2d2d',
    marginBottom: 20,
  },
  homeBtn: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    backgroundColor: '#2d2d2d',
    borderRadius: 50,
  },
  homeBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },

  // ── Overlay ────────────────────────────────────────────────────────────────
  overlayContainer: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    width: SCREEN_WIDTH, height: SCREEN_HEIGHT,
    backgroundColor: '#faf8f5', // Cream style
    zIndex: 100, overflow: 'hidden',
  },
  overlayCloseBtn: {
    position: 'absolute',
    top: 50, // Moved up
    left: 20,
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 2000,
    borderWidth: 1, borderColor: '#eaeaea',
  },
  reportBtn: {
    position: 'absolute',
    top: 80, // Increased from 60 to match close button
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  langSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
    height: 48,
  },
  langSearchInput: {
    flex: 1,
    fontSize: 15,
    color: '#2d2d2d',
    marginLeft: 8,
  },
  mainHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4,
  },
  mainBackBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)',
  },
  mainBackText: { fontSize: 20, color: '#2d2d2d', fontWeight: '700', lineHeight: 22 },
  particleOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 50, pointerEvents: 'none' as any,
  },
  wallpaperFlower: {
    position: 'absolute',
    opacity: 0.85,
  },
  lottieOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  openButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -100 }, { translateY: -30 }],
    width: 200,
    paddingVertical: 18,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderRadius: 50,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 8,
    zIndex: 200,
  },
  openButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2d2d2d',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // ── Bouquet visual ────────────────────────────────────────────────────────────
  visualWrapper: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 0,
    zIndex: 10,
  },
  canvasFrame: {
    padding: 0,
    backgroundColor: 'transparent',
    borderRadius: 6,
    shadowOpacity: 0,
    elevation: 0,
    alignSelf: 'center',
  },
  bouquetCanvas: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 6,
  },
  flowersLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    overflow: 'visible',
  },

  // V2 flower
  flowerV2: {
    position: 'absolute',
  },
  flowerV2Img: {
    width: '100%',
    height: '100%',
  },

  // V1 legacy flower
  legacyArrangement: {
    position: 'absolute',
    bottom: 0,
    left: '50%',
    transform: [{ translateX: '-40%' }],
    width: '80%',
    height: '70%',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  flowerLegacy: {
    width: 80,
    height: 150,
    marginHorizontal: 2,
  },

  // ── Message card ──────────────────────────────────────────────────────────────
  visualCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eaeaea',
    marginBottom: 16,
    marginTop: 16,
    padding: 0,
    overflow: 'hidden',
    zIndex: 1,
  },
  messageCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eaeaea',
    marginBottom: 24,
    shadowColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
    zIndex: 1,
  },
  editTrackingText: {
    fontSize: 10,
    color: '#aaa',
    fontFamily: 'Manrope-Regular',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  messageCardHeader: {
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    marginBottom: 16,
  },
  recipientTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#2d2d2d',
    fontFamily: 'Manrope-Bold',
    marginBottom: 4,
  },
  senderSubtitle: {
    fontSize: 14,
    color: '#888',
    fontFamily: 'Manrope-Regular',
  },
  messageBody: {
    marginBottom: 16,
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 8,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  copyMessageBtn: {
    padding: 8,
    marginLeft: 8,
    marginTop: -4,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  messageText: {
    fontSize: 17,
    lineHeight: 30,
    color: '#2d2d2d',
    fontFamily: 'Manrope-Regular',
    marginBottom: 12,
  },
  translatedLabel: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 6,
  },
  signatureText: {
    fontSize: 16,
    fontFamily: 'Manrope-Regular',
    textAlign: 'right',
    color: '#2d2d2d',
    marginTop: 8,
  },

  // ── Translate ─────────────────────────────────────────────────────────────────
  translateSection: {
    marginTop: 12,
    marginBottom: 8,
  },
  translateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  langPickerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  langPickerText: {
    fontSize: 14,
    color: '#2d2d2d',
  },
  langPickerArrow: {
    fontSize: 14,
    color: '#888',
  },
  translateBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#667eea',
    borderRadius: 8,
  },
  translateBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  actionChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  actionChipActive: {
    backgroundColor: '#6c757d',
  },
  actionChipText: {
    fontSize: 14,
    color: '#2d2d2d',
  },

  // ── Replies ───────────────────────────────────────────────────────────────────
  showRepliesBtn: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#6c757d',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  showRepliesBtnText: {
    color: '#fff',
    fontSize: 14,
  },
  repliesContainer: {
    marginTop: 12,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  repliesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 10,
  },
  replyItem: {
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginBottom: 8,
  },
  replyText: {
    fontSize: 14,
    color: '#212529',
    lineHeight: 22,
    marginBottom: 4,
  },
  replyTimestamp: {
    fontSize: 11,
    color: '#6c757d',
    fontStyle: 'italic',
  },
  replyBtn: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#7A5C58',
    borderRadius: 8,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
  },
  replyBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  alreadyReplied: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FFF5F0',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EAE0D5',
    flexDirection: 'row',
    alignItems: 'center',
  },
  alreadyRepliedText: {
    color: '#5C4844',
    fontSize: 14,
  },
  creatorNote: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FFF5F0',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EAE0D5',
    flexDirection: 'row',
    alignItems: 'center',
  },
  creatorNoteText: {
    color: '#7A5C58',
    fontSize: 14,
    fontStyle: 'italic',
  },
  replyBox: {
    marginTop: 12,
    padding: 0,
    backgroundColor: 'transparent',
    borderRadius: 8,
  },
  replyInputWrapper: {
    position: 'relative',
    width: '100%',
  },
  replyInput: {
    width: '100%',
    minHeight: 120,
    padding: 16,
    paddingBottom: 36,
    borderWidth: 1,
    borderColor: '#eaeaea',
    borderRadius: 12,
    fontSize: 15,
    lineHeight: 24,
    textAlignVertical: 'top',
    backgroundColor: '#fff',
  },
  charCountInside: {
    position: 'absolute',
    bottom: 12,
    right: 16,
    fontSize: 11,
    color: '#999',
    fontFamily: 'Manrope-SemiBold',
  },
  replyInputFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 12,
  },
  charCount: {
    fontSize: 12,
    color: '#6c757d',
  },
  replyBtns: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#6c757d',
    borderRadius: 6,
  },
  cancelBtnText: {
    color: '#fff',
    fontSize: 13,
  },
  sendBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#28a745',
    borderRadius: 6,
  },
  sendBtnDisabled: {
    backgroundColor: '#ccc',
  },
  sendBtnText: {
    color: '#fff',
    fontSize: 13,
  },
  replySuccess: {
    padding: 20,
    backgroundColor: '#d4edda',
    borderRadius: 8,
    alignItems: 'center',
  },
  replySuccessTitle: {
    color: '#155724',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  replySuccessMsg: {
    color: '#155724',
    fontSize: 14,
    opacity: 0.8,
    textAlign: 'center',
  },

  // ── Turntable ─────────────────────────────────────────────────────────────────
  turntable: {
    width: '100%',
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  platter: {
    width: 216,
    height: 216,
    borderRadius: 108,
    backgroundColor: '#2a2a3e',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 6,
    position: 'relative',
  },
  vinylDisc: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  groove: {
    position: 'absolute',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  albumArt: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: '#333',
    position: 'absolute',
  },
  spindle: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1a1a2e',
    position: 'absolute',
    zIndex: 2,
  },
  needleArm: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 70,
    height: 70,
    zIndex: 10,
  },
  needleArmLifted: {
    transform: [{ rotate: '-28deg' }],
  },
  needleArmPlaying: {
    transform: [{ rotate: '-8deg' }],
  },
  needlePivot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#888',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 2,
  },
  needleBody: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 3,
    height: 54,
    backgroundColor: '#aaa',
    borderRadius: 2,
    transformOrigin: 'top right',
  },
  needleBodyPlaying: {
    backgroundColor: '#ccc',
  },
  needleTip: {
    position: 'absolute',
    bottom: 0,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e74c3c',
  },
  needleTipPlaying: {
    backgroundColor: '#c0392b',
    shadowColor: '#e74c3c',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 2,
  },
  songTitle: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
    marginBottom: 4,
    textAlign: 'center',
  },
  songArtist: {
    color: '#aaa',
    fontSize: 13,
    marginBottom: 8,
    textAlign: 'center',
  },
  needleHint: {
    color: '#666',
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
  },

  // ── Music Player Container ────────────────────────────────────────────────────
  musicPlayerContainer: {
    width: '100%',
    marginBottom: 24,
  },
  youtubePlayerWrapper: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  youtubePlayerHidden: {
    position: 'absolute',
    left: -9999,
    top: -9999,
    width: 1,
    height: 1,
    padding: 0,
    margin: 0,
    overflow: 'hidden',
  },
  youtubePlayerContainer: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: 12,
  },
  youtubePlayerControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  youtubePlayerHint: {
    color: '#aaa',
    fontSize: 12,
    flex: 1,
    fontStyle: 'italic',
  },
  switchModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#FAF7F2',
    borderRadius: 12,
  },
  switchModeBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#7A5C58',
  },
  youtubeControls: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    marginBottom: 8,
  },
  youtubeActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#FAF7F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EAE0D5',
  },
  youtubeActionBtnSecondary: {
    backgroundColor: 'transparent',
  },
  youtubeActionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7A5C58',
  },
  sourceBadge: {
    position: 'absolute',
    bottom: 72,
    right: 72,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 8,
    width: 28,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceBadgeText: {
    color: 'white',
    fontSize: 8,
    fontWeight: '700',
  },

  // ── Share / action buttons ────────────────────────────────────────────────────
  whatsappBtn: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: '#25D366',
    borderRadius: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  whatsappBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  shareBtn: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: '#7A5C58',
    borderRadius: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#7A5C58',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  shareBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },

  // ── Accessibility ─────────────────────────────────────────────────────────────
  accessibilityBox: {
    width: '100%',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginBottom: 24,
  },
  accessibilityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2d2d2d',
    marginBottom: 12,
  },
  ttsBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#7A5C58',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  ttsBtnActive: {
    backgroundColor: '#997E7A',
  },
  ttsBtnText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 14,
  },
  colorBlindNote: {
    padding: 10,
    backgroundColor: '#e3f2fd',
    borderRadius: 6,
  },
  colorBlindNoteText: {
    fontSize: 13,
    color: '#1976d2',
  },

  // ── Bottom actions ────────────────────────────────────────────────────────────
  bottomActions: {
    width: '100%',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    marginTop: 8,
  },
  createOwnBtn: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#FAF7F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EAE0D5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createOwnBtnText: {
    color: '#7A5C58',
    fontWeight: '600',
    fontSize: 14,
  },
  downloadRow: {
    flex: 1,
  },
  downloadBtn: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#FAF7F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EAE0D5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadBtnText: {
    color: '#7A5C58',
    fontWeight: '600',
    fontSize: 14,
  },
  wallpaperOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FAF7F2',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EAE0D5',
  },
  wallpaperOptionText: {
    fontSize: 16,
    fontFamily: 'Manrope-SemiBold',
    color: '#2d2d2d',
  },

  // ── Flower info modal ─────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 12,
  },
  modalClose: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    color: '#2d2d2d',
  },
  modalFlowerImg: {
    width: 110,
    height: 110,
    marginBottom: 14,
  },
  modalFlowerName: {
    fontSize: 26,
    fontWeight: '700',
    color: '#2d2d2d',
    marginBottom: 6,
    textAlign: 'center',
  },
  modalFlowerMeaning: {
    fontSize: 17,
    color: '#667eea',
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInfoBox: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 18,
    width: '100%',
  },
  modalPurpose: {
    fontSize: 15,
    lineHeight: 24,
    color: '#495057',
    marginBottom: 12,
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#dee2e6',
    marginBottom: 12,
  },
  modalPersonal: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#6c757d',
    lineHeight: 22,
  },

  // ── Language picker modal ─────────────────────────────────────────────────────
  langModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    zIndex: 9999,
  },
  langModalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: SCREEN_HEIGHT * 0.8,
  },
  langModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2d2d2d',
    marginBottom: 16,
    textAlign: 'center',
  },
  langOption: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
  },
  langOptionActive: {
    backgroundColor: '#7A5C58',
  },
  langOptionText: {
    fontSize: 16,
    color: '#2d2d2d',
  },
  langOptionTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  detectedBadgeView: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: '#7A5C58',
    gap: 4,
  },
  detectedFlagText: {
    fontSize: 12,
  },
  detectedLabelText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },

  // ── Modern Share Button ───────────────────────────────────────────────────────
  modernShareBtn: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#eaeaea',
  },
  shareIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#f8f6f4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  shareTextContainer: {
    flex: 1,
  },
  shareBtnTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d2d2d',
    marginBottom: 2,
  },
  shareBtnSubtitle: {
    fontSize: 14,
    color: '#666',
  },

  // ── Improved Date Text ────────────────────────────────────────────────────────
  dateText: {
    fontSize: 13,
    color: '#999',
    fontFamily: 'Manrope-Regular',
    marginTop: 4,
  },
  // ─── GOLDEN BOUQUET FEATURE ───────────────────────────────────────────────────
  goldenHeaderBanner: {
    backgroundColor: '#FBF3DC',
    borderColor: '#D4AF37',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#C9960C',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    alignItems: 'center',
  },
  goldenHeaderTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 18,
    color: '#8B6914',
    marginBottom: 4,
  },
  goldenHeaderSub: {
    fontFamily: 'Manrope-Regular',
    fontSize: 13,
    color: '#8B6914',
    opacity: 0.85,
  },
  // ─── END GOLDEN BOUQUET FEATURE ──────────────────────────────────────────────
});