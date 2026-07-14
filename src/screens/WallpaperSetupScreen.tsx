/**
 * WallpaperSetupScreen
 *
 * Fixes in this version:
 *  - Solid flat bg colour per theme — no gradients at all on the base fill
 *  - Background has only soft bokeh texture circles (very subtle, same hue family)
 *  - Layout is split into strict thirds:
 *      Top layout    → text BOTTOM, flowers TOP-CENTRE
 *      Centre layout → text TOP, flowers CENTRE  (text never behind flowers)
 *      Bottom layout → text TOP, flowers BOTTOM
 *  - Bouquet size dialled back — default canvas = W * 0.82 (was 1.05)
 *  - No empty strip at bottom — ScrollView padds for sticky bar height exactly
 *  - captureRef captures the ref view which is sized at full W×H, so it matches preview 1-to-1
 *  - 7 curated font pairs with nice names
 *  - Header always visible (not behind status bar)
 */

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, StatusBar, TouchableOpacity,
  Image, ActivityIndicator, Dimensions, ScrollView, Modal,
  Platform, Switch, Animated, PanResponder, PixelRatio,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { useSwipeNavigation } from '../hooks/useSwipeNavigation';
import { getFlowerImage } from '../utils/bouquetData';
import * as MediaLibrary from 'expo-media-library';
import { captureRef } from 'react-native-view-shot';
import Toast from 'react-native-toast-message';
import ManageWallpaper, { TYPE } from 'react-native-manage-wallpaper';
import { useNavigation, useRoute } from '@react-navigation/native';
import Svg, {
  Defs, RadialGradient,
  Stop, Rect, Circle, Ellipse, Path, G,
} from 'react-native-svg';

const { width: W, height: H } = Dimensions.get('window');

// ─── Preview frame ────────────────────────────────────────────────────────────
const PREV_W  = W * 0.54;
const PREV_H  = PREV_W * 2.08;
const SCALE   = PREV_W / W;

// Sticky bar height so ScrollView can pad correctly
const STICKY_H = 80;

// ─── Themes — solid flat base colour, no gradient ────────────────────────────
type Theme = {
  label:        string;
  icon:         string;
  bg:           string;   // solid base fill — NO gradient
  bokeh:        string[]; // soft same-hue blobs for depth
  textAccent:   string;
  nameColor:    string;
  labelColor:   string;
  dividerColor: string;
};

const THEMES: Record<string, Theme> = {
  // ── Warm neutrals ─────────────────────────────────────────────────────────
  linen: {
    label: 'Linen',        icon: '🤍',
    bg:           '#F7F2EC',   // warm off-white
    bokeh:        ['#EDE5D8', '#F2ECE2', '#E8DDD0', '#F0E8DC'],
    textAccent:   '#8A6E56',
    nameColor:    '#3D2B1A',
    labelColor:   'rgba(61,43,26,0.45)',
    dividerColor: 'rgba(138,110,86,0.30)',
  },
  sand: {
    label: 'Sand',         icon: '🌾',
    bg:           '#EFE8D8',
    bokeh:        ['#E6DCC8', '#F4EEE2', '#DDD0BA', '#EAE0CC'],
    textAccent:   '#7A6040',
    nameColor:    '#3E2C12',
    labelColor:   'rgba(62,44,18,0.45)',
    dividerColor: 'rgba(122,96,64,0.28)',
  },
  // ── Soft pinks ────────────────────────────────────────────────────────────
  blush: {
    label: 'Blush',        icon: '🌸',
    bg:           '#F5E8E6',   // very soft dusty rose — not saturated
    bokeh:        ['#EED8D4', '#F8EDEB', '#E8CCC8', '#F2E2DE'],
    textAccent:   '#A0625A',
    nameColor:    '#5C2822',
    labelColor:   'rgba(92,40,34,0.45)',
    dividerColor: 'rgba(160,98,90,0.28)',
  },
  petal: {
    label: 'Petal',        icon: '💮',
    bg:           '#F9EEF2',   // pale pink-white
    bokeh:        ['#F0E0E8', '#FCF4F7', '#E8D4DC', '#F4E8EE'],
    textAccent:   '#B07088',
    nameColor:    '#6E2E46',
    labelColor:   'rgba(110,46,70,0.45)',
    dividerColor: 'rgba(176,112,136,0.28)',
  },
  // ── Cool neutrals & nature ─────────────────────────────────────────────────
  sage: {
    label: 'Sage',         icon: '🌿',
    bg:           '#E8EEEA',   // desaturated sage — not garish
    bokeh:        ['#DAE6DC', '#EEF5F0', '#CCD8CE', '#E0EBE2'],
    textAccent:   '#4A7058',
    nameColor:    '#1E3D2A',
    labelColor:   'rgba(30,61,42,0.45)',
    dividerColor: 'rgba(74,112,88,0.28)',
  },
  mist: {
    label: 'Mist',         icon: '🩵',
    bg:           '#E8EEF4',   // cool blue-grey
    bokeh:        ['#D8E2EC', '#EEF3F8', '#CCD6E4', '#E0EAF2'],
    textAccent:   '#4A6880',
    nameColor:    '#1E3448',
    labelColor:   'rgba(30,52,72,0.45)',
    dividerColor: 'rgba(74,104,128,0.28)',
  },
  // ── Evening / dark ─────────────────────────────────────────────────────────
  dusk: {
    label: 'Dusk',         icon: '🌙',
    bg:           '#2A2434',   // deep plum-navy
    bokeh:        ['#332B44', '#3E354E', '#2A2238', '#3A3048'],
    textAccent:   '#D0B8E8',
    nameColor:    '#F0E8FF',
    labelColor:   'rgba(240,232,255,0.55)',
    dividerColor: 'rgba(208,184,232,0.35)',
  },
  noir: {
    label: 'Noir',         icon: '🖤',
    bg:           '#1C1C22',   // near-black with warm undertone
    bokeh:        ['#242430', '#2A2A36', '#1E1E28', '#262632'],
    textAccent:   '#C8B89A',
    nameColor:    '#F4EEE4',
    labelColor:   'rgba(244,238,228,0.55)',
    dividerColor: 'rgba(200,184,154,0.35)',
  },
};

// ─── Font options — synced with CreateBouquet Stage 3 fontFamilyMap ────────────
// Keys match the fontStyle keys used in Stage 3 message formatting.
const FONTS: { key: string; label: string; font: string; size: number; preview: string }[] = [
  { key: 'default',     label: 'Default',     font: 'Manrope-Regular',         size: 34, preview: 'With Love' },
  { key: 'handwritten', label: 'Handwritten', font: 'DancingScript-Regular',   size: 46, preview: 'With Love' },
  { key: 'elegant',     label: 'Elegant',     font: 'PlayfairDisplay-Regular', size: 38, preview: 'With Love' },
  { key: 'modern',      label: 'Modern',      font: 'Manrope-ExtraLight',      size: 34, preview: 'WITH LOVE' },
  { key: 'classic',     label: 'Classic',     font: 'Lora-Italic',             size: 36, preview: 'With Love' },
  { key: 'casual',      label: 'Casual',      font: 'Satisfy-Regular',         size: 42, preview: 'With Love' },
];

// ─── Layout config ────────────────────────────────────────────────────────────
// Each layout defines absolute vertical positions inside the W×H canvas.
// flowers and text never overlap.

type LayoutConfig = {
  key:          string;
  label:        string;
  icon:         string;
  // flowers
  flowerTop:    number;   // absolute top of flower area
  flowerH:      number;   // height reserved for flowers
  // attribution
  attrTop?:     number;   // absolute top (used when text is at top)
  attrBottom?:  number;   // absolute bottom (used when text is at bottom)
  attrAlign:    'top' | 'bottom';
};

const LAYOUTS: LayoutConfig[] = [
  {
    // Flowers fill top half; text sits safely above the lock-screen gesture bar
    key: 'top', label: 'Flowers Top', icon: '⬆',
    flowerTop: H * 0.03,  flowerH: H * 0.50,
    attrBottom: H * 0.22, attrAlign: 'bottom',  // raised well clear of swipe indicator
  },
  {
    // Bouquet centred just ABOVE screen midpoint; attribution at top
    key: 'center', label: 'Centre', icon: '⊙',
    flowerTop: H * 0.28,  flowerH: H * 0.46,    // slightly above true centre
    attrTop:   H * 0.05,  attrAlign: 'top',
  },
  {
    // Flowers in lower third; attribution at top
    key: 'bottom', label: 'Flowers Bottom', icon: '⬇',
    flowerTop: H * 0.46,  flowerH: H * 0.46,
    attrTop:   H * 0.06,  attrAlign: 'top',
  },
];

// ─── Bouquet size options ─────────────────────────────────────────────────────
const SIZES = [
  { val: 0.62, label: 'Small',  emoji: '🌸' },
  { val: 0.78, label: 'Medium', emoji: '🌸🌸' },
  { val: 0.94, label: 'Large',  emoji: '🌸🌸🌸' },
];

// ─── Painted background (SVG, NO gradient on base fill) ───────────────────────
const PaintedBg = ({ themeKey, showPetals }: { themeKey: string; showPetals: boolean }) => {
  const th = THEMES[themeKey];

  const bokeh = [
    { cx: W * 0.08,  cy: H * 0.07,  r: W * 0.38 },
    { cx: W * 0.88,  cy: H * 0.14,  r: W * 0.30 },
    { cx: W * 0.50,  cy: H * 0.42,  r: W * 0.44 },
    { cx: W * 0.12,  cy: H * 0.60,  r: W * 0.32 },
    { cx: W * 0.90,  cy: H * 0.55,  r: W * 0.34 },
    { cx: W * 0.35,  cy: H * 0.82,  r: W * 0.40 },
    { cx: W * 0.78,  cy: H * 0.78,  r: W * 0.30 },
    { cx: W * 0.55,  cy: H * 0.96,  r: W * 0.36 },
  ];

  const sparkles = [
    { cx: W*0.18, cy: H*0.10, r: 2.4 }, { cx: W*0.80, cy: H*0.20, r: 1.8 },
    { cx: W*0.44, cy: H*0.07, r: 2.0 }, { cx: W*0.66, cy: H*0.34, r: 1.5 },
    { cx: W*0.10, cy: H*0.44, r: 2.2 }, { cx: W*0.92, cy: H*0.52, r: 1.8 },
    { cx: W*0.32, cy: H*0.67, r: 2.0 }, { cx: W*0.60, cy: H*0.76, r: 1.5 },
    { cx: W*0.84, cy: H*0.84, r: 2.2 }, { cx: W*0.22, cy: H*0.90, r: 1.8 },
    { cx: W*0.70, cy: H*0.96, r: 2.0 },
  ];

  const petals = showPetals ? [
    { cx: W*0.16, cy: H*0.16, rx: 11, ry: 6, rot: 28  },
    { cx: W*0.84, cy: H*0.26, rx: 9,  ry: 5, rot: -18 },
    { cx: W*0.36, cy: H*0.44, rx: 13, ry: 7, rot: 52  },
    { cx: W*0.74, cy: H*0.58, rx: 10, ry: 5, rot: -38 },
    { cx: W*0.24, cy: H*0.70, rx: 12, ry: 6, rot: 14  },
    { cx: W*0.88, cy: H*0.76, rx: 8,  ry: 5, rot: -58 },
    { cx: W*0.54, cy: H*0.86, rx: 11, ry: 6, rot: 44  },
    { cx: W*0.07, cy: H*0.60, rx: 9,  ry: 5, rot: -8  },
    { cx: W*0.93, cy: H*0.40, rx: 10, ry: 5, rot: 68  },
  ] : [];

  return (
    <Svg width={W} height={H} style={StyleSheet.absoluteFillObject}>
      <Defs>
        {bokeh.map((_, i) => (
          <RadialGradient key={i} id={`bk${i}`} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={th.bokeh[i % th.bokeh.length]} stopOpacity="0.38" />
            <Stop offset="1" stopColor={th.bokeh[i % th.bokeh.length]} stopOpacity="0"   />
          </RadialGradient>
        ))}
        {/* Soft white centre lift */}
        <RadialGradient id="lift" cx="50%" cy="40%" r="55%">
          <Stop offset="0" stopColor="#ffffff" stopOpacity="0.28" />
          <Stop offset="1" stopColor="#ffffff" stopOpacity="0"    />
        </RadialGradient>
      </Defs>

      {/* ── Flat solid base — NO gradient ── */}
      <Rect width={W} height={H} fill={th.bg} />

      {/* Bokeh texture */}
      {/* Only show 5 bokeh blobs, at lower opacity, for a cleaner minimal look */}
      {bokeh.slice(0, 5).map((b, i) => (
        <Circle key={i} cx={b.cx} cy={b.cy} r={b.r} fill={`url(#bk${i})`} />
      ))}

      {/* Centre lift for luminosity */}
      <Rect width={W} height={H} fill="url(#lift)" />

      {/* Scattered petals */}
      {petals.map((p, i) => (
        <G key={i} transform={`rotate(${p.rot}, ${p.cx}, ${p.cy})`}>
          <Ellipse cx={p.cx} cy={p.cy} rx={p.rx} ry={p.ry} fill="#ffffff" fillOpacity="0.40" />
        </G>
      ))}

      {/* Sparkle dots */}
      {sparkles.map((s, i) => (
        <G key={i}>
          <Circle cx={s.cx} cy={s.cy} r={s.r}     fill="#ffffff" fillOpacity="0.80" />
          <Circle cx={s.cx} cy={s.cy} r={s.r*2.4} fill="none" stroke="#ffffff" strokeWidth="0.5" strokeOpacity="0.28" />
        </G>
      ))}
    </Svg>
  );
};

// ─── Decorative SVG divider ───────────────────────────────────────────────────
const Divider = ({ color }: { color: string }) => (
  <Svg width={160} height={16} viewBox="0 0 160 16">
    <Path d="M 0 8 L 54 8"   stroke={color} strokeWidth="0.7" strokeLinecap="round" />
    <Circle cx="63"  cy="8" r="1.8" fill={color} fillOpacity="0.60" />
    <Circle cx="72"  cy="8" r="1.2" fill={color} fillOpacity="0.40" />
    <Circle cx="80"  cy="8" r="3.2" fill="none" stroke={color} strokeWidth="1" strokeOpacity="0.85" />
    <Circle cx="80"  cy="8" r="1.2" fill={color} />
    <Circle cx="88"  cy="8" r="1.2" fill={color} fillOpacity="0.40" />
    <Circle cx="97"  cy="8" r="1.8" fill={color} fillOpacity="0.60" />
    <Path d="M 106 8 L 160 8" stroke={color} strokeWidth="0.7" strokeLinecap="round" />
  </Svg>
);

// ─── Corner botanical ornament ────────────────────────────────────────────────
const Corner = ({ color, size = 72 }: { color: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 72 72">
    <Path d="M 7 65 Q 25 40 46 22 Q 57 13 65 7" stroke={color} strokeWidth="0.9" fill="none" strokeLinecap="round" strokeOpacity="0.65" />
    <Path d="M 25 40 Q 12 27 23 18 Q 31 30 25 40" fill={color} fillOpacity="0.28" />
    <Path d="M 46 22 Q 56 11 63 17 Q 54 24 46 22" fill={color} fillOpacity="0.28" />
    <Circle cx="65" cy="7"  r="3.5" fill="none" stroke={color} strokeWidth="0.85" strokeOpacity="0.60" />
    <Circle cx="65" cy="7"  r="1.3" fill={color} fillOpacity="0.65" />
    <Circle cx="52" cy="17" r="2.4" fill="none" stroke={color} strokeWidth="0.7" strokeOpacity="0.45" />
    <Circle cx="52" cy="17" r="0.9" fill={color} fillOpacity="0.55" />
  </Svg>
);

// ─── Types ────────────────────────────────────────────────────────────────────
interface FlowerV2 {
  id: string; x: number; y: number;
  rotation: number; scale: number; zIndex: number; uniqueId?: string;
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
}

// ─── Attribution block (reused in both canvas and nothing else) ───────────────
const Attribution = ({
  senderName,
  font,
  fontSize,
  nameColor,
  labelColor,
  dividerColor,
  showBrand,
  showMessage,
  message,
}: {
  senderName:   string;
  font:         string;
  fontSize:     number;
  nameColor:    string;
  labelColor:   string;
  dividerColor: string;
  showBrand:    boolean;
  showMessage:  boolean;
  message:      string;
}) => (
  <View style={{ alignItems: 'center', paddingHorizontal: 24 }}>
    <View style={{ width: 1, height: 20, backgroundColor: dividerColor, marginBottom: 12 }} />
    <Divider color={dividerColor} />
    <View style={{ height: 14 }} />
    <Text style={{
      fontFamily: 'Manrope-Light',
      fontSize: 10,
      letterSpacing: 4.5,
      textTransform: 'uppercase',
      color: labelColor,
      marginBottom: 4,
    }}>
      — from —
    </Text>
    <Text style={{
      fontFamily:   font,
      fontSize:     fontSize,
      color:        nameColor,
      textAlign:    'center',
      lineHeight:   fontSize * 1.2,
      textShadowColor:  'rgba(255,255,255,0.55)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 5,
    }}>
      {senderName}
    </Text>
    {showMessage && !!message && (
      <Text style={{
        marginTop: 10,
        fontFamily: 'Manrope-LightItalic',
        fontSize: 12,
        color: labelColor,
        textAlign: 'center',
        lineHeight: 18,
        paddingHorizontal: 16,
      }} numberOfLines={2}>
        {message}
      </Text>
    )}
    <View style={{ height: 14 }} />
    <Divider color={dividerColor} />
    {showBrand && (
      <Text style={{
        marginTop: 10,
        fontFamily: 'Manrope-SemiBold',
        fontSize: 8,
        letterSpacing: 4,
        textTransform: 'uppercase',
        color: labelColor,
      }}>
        ✦  DigiBouquet  ✦
      </Text>
    )}
    <View style={{ width: 1, height: 18, backgroundColor: dividerColor, marginTop: 10 }} />
  </View>
);

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function WallpaperSetupScreen() {
  const navigation = useNavigation<any>();
  const route      = useRoute<any>();
  const insets     = useSafeAreaInsets();
  const { theme: t, isDark } = useTheme();
  const { t: tr }  = useLanguage();
  const { getTextSize } = useAccessibility();

  // ── Swipe left to go back ────────────────────────────────────────────────
  const swipeHandlers = useSwipeNavigation({
    onSwipeRight: () => navigation.goBack(),
  });

  const { id } = (route.params || {}) as { id?: string };

  const [bouquetData, setBouquetData] = useState<BouquetData | null>(null);
  // Start with loading=false if we have no id — avoids any flash.
  // For id-based loads, we start loading only if no cache is immediately available.
  const [loading,     setLoading]     = useState(!!id);
  // ── Custom wallpaper placement modal ─────────────────────────────────────
  const [wallpaperUri,    setWallpaperUri]    = useState<string | null>(null);
  const [showPlaceModal,  setShowPlaceModal]  = useState(false);

  const placeSlideAnim = useRef(new Animated.Value(H)).current;
  const placeOverlayAnim = useRef(new Animated.Value(0)).current;

  const openPlaceModal = useCallback(() => {
    placeSlideAnim.stopAnimation();
    placeOverlayAnim.stopAnimation();
    placeSlideAnim.setValue(H);
    setShowPlaceModal(true);
    Animated.parallel([
      Animated.spring(placeSlideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
      Animated.timing(placeOverlayAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  }, [placeSlideAnim, placeOverlayAnim]);

  const closePlaceModal = useCallback(() => {
    Animated.parallel([
      Animated.timing(placeSlideAnim, { toValue: H, duration: 180, useNativeDriver: true }),
      Animated.timing(placeOverlayAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => setShowPlaceModal(false));
  }, [placeSlideAnim, placeOverlayAnim]);

  const placePanResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 2,
    onPanResponderMove: (_, gs) => { if (gs.dy > 0) placeSlideAnim.setValue(gs.dy); },
    onPanResponderRelease: (_, gs) => {
      if (gs.dy > 80 || gs.vy > 0.5) {
        closePlaceModal();
      } else if (Math.abs(gs.dy) < 10 && Math.abs(gs.dx) < 10) {
        closePlaceModal();
      } else {
        Animated.spring(placeSlideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }).start();
      }
    },
    onPanResponderTerminate: () => { Animated.spring(placeSlideAnim, { toValue: 0, useNativeDriver: true }).start(); },
  })).current;

  // Customisation
  const [themeKey,  setThemeKey]  = useState('linen');
  const [fontKey,   setFontKey]   = useState('handwritten');
  const [layoutKey, setLayoutKey] = useState('center');
  const [sizeVal,   setSizeVal]   = useState(0.78);
  const [showPetals,  setShowPetals]  = useState(true);
  const [showMessage, setShowMessage] = useState(false);
  const [showBrand,   setShowBrand]   = useState(true);
  const [isCapturing, setIsCapturing] = useState(false);

  const wallpaperRef = useRef<View>(null);
  // Defer the heavy SVG PaintedBg until after the screen slide-in animation (80ms)
  const [canvasReady, setCanvasReady] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setCanvasReady(true), 80);
    return () => clearTimeout(timer);
  }, []);

  // ── Fetch — show cached data instantly, fetch fresh in background ────────
  useEffect(() => {
    if (!id) { setLoading(false); return; }
    const go = async () => {
      // 1) Try UUID cache first — instant display
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      if (isUuid) {
        const raw = await AsyncStorage.getItem(`bouquet_${id}`);
        if (raw) {
          try {
            setBouquetData(JSON.parse(raw));
            setLoading(false);  // show cached immediately
          } catch {}
          // Still refresh in background
          try {
            const snap = await getDoc(doc(db, 'bouquet-cards', id));
            if (snap.exists()) {
              const data = snap.data() as BouquetData;
              setBouquetData(data);
              await AsyncStorage.setItem(`bouquet_${id}`, JSON.stringify(data));
            }
          } catch {}
          return;
        }
      }
      try {
        let bouquetId = id;
        // Check slug caches first (both formats)
        const cachedSlugTarget = await AsyncStorage.getItem(`slug_target_${id}`);
        if (cachedSlugTarget) {
          bouquetId = cachedSlugTarget;
        } else {
          const s1 = await getDoc(doc(db, 'slugs', `bouquet__${id}`));
          if (s1.exists()) {
            bouquetId = s1.data().cardId;
            await AsyncStorage.setItem(`slug_target_${id}`, bouquetId);
          } else {
            const s2 = await getDoc(doc(db, 'slugs', id));
            if (s2.exists()) {
              const d = s2.data();
              if (d.cardType === 'bouquet' || d.type === 'bouquet') {
                bouquetId = d.cardId;
                await AsyncStorage.setItem(`slug_target_${id}`, bouquetId);
              }
            }
          }
        }
        // Show cached immediately
        const cached = await AsyncStorage.getItem(`bouquet_${bouquetId}`) ||
                       await AsyncStorage.getItem(`bouquet_${id}`);
        if (cached) {
          try {
            setBouquetData(JSON.parse(cached));
            setLoading(false);  // show instantly
          } catch {}
        }
        // Refresh in background
        const snap = await getDoc(doc(db, 'bouquet-cards', bouquetId));
        if (snap.exists()) {
          const data = snap.data() as BouquetData;
          setBouquetData(data);
          await AsyncStorage.setItem(`bouquet_${bouquetId}`, JSON.stringify(data));
          await AsyncStorage.setItem(`bouquet_${id}`,        JSON.stringify(data));
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    go();
  }, [id]);

  const doSetWallpaper = useCallback((type: string) => {
    if (!wallpaperUri) return;
    closePlaceModal();
    Toast.show({ type: 'info', text1: 'Setting wallpaper…' });
    ManageWallpaper.setWallpaper({ uri: wallpaperUri }, (res: any) => {
      Toast.show(res.status === 'success'
        ? { type: 'success', text1: 'Done!', text2: 'Wallpaper applied.' }
        : { type: 'error',   text1: 'Could not set wallpaper.' });
      navigation.goBack();
    }, type);
  }, [wallpaperUri, navigation]);

  const handleApply = useCallback(async () => {
    try {
      setIsCapturing(true);
      await new Promise(r => setTimeout(r, 300));
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({ type: 'error', text1: 'Permission denied' });
        return;
      }
      if (!wallpaperRef.current) return;
      const pixelRatio = PixelRatio.get();
      const uri = await captureRef(wallpaperRef.current, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
        width: Math.round(W * pixelRatio),
        height: Math.round(H * pixelRatio),
      });
      setWallpaperUri(uri);
      openPlaceModal();
    } catch (e) {
      console.error(e);
      Toast.show({ type: 'error', text1: 'Could not capture wallpaper.' });
    } finally {
      setIsCapturing(false);
    }
  }, []);

  // ── Derived values (must be before useMemo — no early returns allowed after hooks) ──
  const th          = THEMES[themeKey] ?? THEMES['linen'];
  const fontDef     = FONTS.find(f => f.key === fontKey) || FONTS[0];
  const layout      = LAYOUTS.find(l => l.key === layoutKey) || LAYOUTS[1];
  const isV2        = bouquetData?.version === 2;
  const senderName  = bouquetData?.senderName || bouquetData?.messageCard?.senderName || 'With Love';
  const cardMessage = bouquetData?.message    || bouquetData?.messageCard?.message    || '';
  const CANVAS      = W * sizeVal;

  // ── Memoized canvas inner content ────────────────────────────────────────
  // MUST be before any conditional return — useMemo is a hook.
  // wallpaperRef is on the outer View (below) so captureRef always works.
  const CanvasInner = useMemo(() => (
    <>
      {canvasReady && <PaintedBg themeKey={themeKey} showPetals={showPetals} />}

      {/* Greenery plant overlay — sits above BG, below all flowers */}
      {bouquetData?.greeneryBg && getFlowerImage(bouquetData.greeneryBg) && (
        <Image
          source={getFlowerImage(bouquetData.greeneryBg)}
          style={[
            {
              position: 'absolute',
              top: 0,
              left: 0,
              width: W,
              height: H,
              zIndex: 0,
              opacity: 0.85,
            },
            bouquetData.greeneryBg === 'baby-blue-eucalyptus' && { transform: [{ translateY: -25 }, { scale: 1.1 }] }
          ]}
          resizeMode="cover"
        />
      )}

      <View style={{ position: 'absolute', top: 52, left: 14 }}>
        <Corner color={th.textAccent} size={70} />
      </View>
      <View style={{ position: 'absolute', top: 52, right: 14, transform: [{ scaleX: -1 }] }}>
        <Corner color={th.textAccent} size={70} />
      </View>
      <View style={{ position: 'absolute', bottom: 52, left: 14, transform: [{ scaleY: -1 }] }}>
        <Corner color={th.textAccent} size={52} />
      </View>
      <View style={{ position: 'absolute', bottom: 52, right: 14, transform: [{ scaleX: -1 }, { scaleY: -1 }] }}>
        <Corner color={th.textAccent} size={52} />
      </View>

      {layout.attrAlign === 'top' ? (
        <View style={[styles.attrWrapper, { top: layout.attrTop }]}>
          <Attribution
            senderName={senderName} font={fontDef.font} fontSize={fontDef.size}
            nameColor={th.nameColor} labelColor={th.labelColor} dividerColor={th.dividerColor}
            showBrand={showBrand} showMessage={showMessage} message={cardMessage}
          />
        </View>
      ) : (
        <View style={[styles.attrWrapper, { bottom: layout.attrBottom }]}>
          <Attribution
            senderName={senderName} font={fontDef.font} fontSize={fontDef.size}
            nameColor={th.nameColor} labelColor={th.labelColor} dividerColor={th.dividerColor}
            showBrand={showBrand} showMessage={showMessage} message={cardMessage}
          />
        </View>
      )}

      <View style={[styles.flowerArea, { top: layout.flowerTop, height: layout.flowerH }]}>
        <View style={{ width: CANVAS, height: CANVAS, alignItems: 'center', justifyContent: 'center' }}>
          {isV2
            ? ([...(bouquetData?.selectedFlowers as FlowerV2[] || [])]
                .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
                .map((fl, i) => {
                  const img = getFlowerImage(fl.id);
                  if (!img) return null;
                  const fs   = CANVAS * 0.22 * (fl.scale || 1);
                  const left = (fl.x / 100) * CANVAS - fs / 2;
                  const top  = (fl.y / 100) * CANVAS - fs / 2;
                  return (
                    <View key={fl.uniqueId || i} style={{
                      position: 'absolute', left, top, width: fs, height: fs,
                      transform: [{ rotate: `${fl.rotation || 0}deg` }],
                      zIndex: fl.zIndex || i + 1,
                    }}>
                      <Image source={img} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
                    </View>
                  );
                }))
            : (
              <View style={styles.legacyRow}>
                {(bouquetData?.selectedFlowers as string[] || []).map((fid, i) => {
                  const img = getFlowerImage(fid);
                  return img
                    ? <Image key={i} source={img} style={{ width: CANVAS * 0.22, height: CANVAS * 0.22, margin: 4 }} resizeMode="contain" />
                    : null;
                })}
              </View>
            )
          }
        </View>
      </View>
    </>
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [canvasReady, themeKey, fontKey, layoutKey, sizeVal, showPetals, showMessage, showBrand, bouquetData]);

  // Outer View holds the ref — must NOT be inside useMemo
  const WallpaperCanvas = (
    <View ref={wallpaperRef} collapsable={false}
      style={{ width: W, height: H, overflow: 'hidden', backgroundColor: th.bg }}>
      {CanvasInner}
    </View>
  );

  // ── Render — no early returns past this point ─────────────────────────────
  // Loading spinner shown inline so we never break hook call order.
  if (!canvasReady && loading && !bouquetData) {
    return (
      <View style={[styles.center, { backgroundColor: t.bg }]}>
        <ActivityIndicator color={t.brand} size="large" />
        <Text style={{ marginTop: 12, color: t.textMuted, fontFamily: 'Manrope-Regular' }}>Preparing…</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: t.bg }]} {...swipeHandlers}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={t.bg} />

      {/* Header — sits above everything, always visible */}
      <View style={[styles.header, {
        paddingTop: insets.top + 4,
        backgroundColor: t.bg,
        borderBottomColor: t.border,
      }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={t.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: t.text, fontSize: getTextSize(17) }]}>
          Wallpaper Setup
        </Text>
        <View style={{ width: 38 }} />
      </View>

      {/* Scrollable body — pad bottom for sticky bar */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: STICKY_H + insets.bottom + 24 }}
      >
        {/* ── Phone preview ─────────────────────────────────────────────── */}
        <View style={styles.previewOuter}>
          <View style={[styles.phoneShadow, { width: PREV_W + 4, height: PREV_H + 4 }]} />
          <View style={[styles.phoneFrame, { width: PREV_W, height: PREV_H }]}>
            <View style={styles.notch} />
            {/* Clipping container at preview size */}
            <View style={{ width: PREV_W, height: PREV_H, overflow: 'hidden' }}>
              {/* Scale W×H down to PREV_W×PREV_H */}
              <View style={{
                width: W,
                height: H,
                transform: [{ scale: SCALE }],
                transformOrigin: 'top left',
              }}>
                {WallpaperCanvas}
              </View>
            </View>
          </View>
        </View>

        {/* ── Options panel ─────────────────────────────────────────────── */}
        <View style={[styles.panel, { backgroundColor: t.cardBg, borderColor: t.border }]}>

          {/* Theme */}
          <Text style={[styles.sectionLabel, { color: t.textMuted }]}>BACKGROUND</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {Object.entries(THEMES).map(([key, th2]) => {
              const active = themeKey === key;
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => setThemeKey(key)}
                  activeOpacity={0.8}
                  style={[styles.themeChip, {
                    borderColor: active ? t.brand : t.border,
                    backgroundColor: active ? (isDark ? t.surface : '#FAF5F0') : 'transparent',
                  }]}
                >
                  {/* Colour swatch circle */}
                  <View style={[styles.swatch, { backgroundColor: th2.bg, borderColor: active ? t.brand : 'rgba(0,0,0,0.1)' }]} />
                  <Text style={[styles.chipLabel, { color: active ? t.brand : t.text }]}>{th2.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={[styles.sep, { backgroundColor: t.border }]} />

          {/* Font */}
          <Text style={[styles.sectionLabel, { color: t.textMuted }]}>FONT</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {FONTS.map(f => {
              const active = fontKey === f.key;
              return (
                <TouchableOpacity
                  key={f.key}
                  onPress={() => setFontKey(f.key)}
                  activeOpacity={0.8}
                  style={[styles.fontChip, {
                    borderColor: active ? t.brand : t.border,
                    backgroundColor: active ? (isDark ? t.surface : '#FAF5F0') : 'transparent',
                  }]}
                >
                  <Text style={{
                    fontFamily: f.font,
                    fontSize:   16,
                    color:      active ? t.brand : t.text,
                    lineHeight: 20,
                  }}>
                    {f.preview}
                  </Text>
                  <Text style={[styles.fontChipLabel, { color: active ? t.brand : t.textMuted }]}>{f.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={[styles.sep, { backgroundColor: t.border }]} />

          {/* Layout */}
          <Text style={[styles.sectionLabel, { color: t.textMuted }]}>LAYOUT</Text>
          <View style={styles.gridRow}>
            {LAYOUTS.map(l => {
              const active = layoutKey === l.key;
              return (
                <TouchableOpacity
                  key={l.key}
                  onPress={() => setLayoutKey(l.key)}
                  activeOpacity={0.8}
                  style={[styles.gridChip, {
                    flex: 1,
                    borderColor: active ? t.brand : t.border,
                    backgroundColor: active ? (isDark ? t.surface : '#FAF5F0') : 'transparent',
                  }]}
                >
                  <Text style={{ fontSize: 16, color: active ? t.brand : t.text }}>{l.icon}</Text>
                  <Text style={[styles.gridChipLabel, { color: active ? t.brand : t.textMuted }]}>{l.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={[styles.sep, { backgroundColor: t.border }]} />

          {/* Bouquet size */}
          <Text style={[styles.sectionLabel, { color: t.textMuted }]}>BOUQUET SIZE</Text>
          <View style={styles.gridRow}>
            {SIZES.map(s => {
              const active = sizeVal === s.val;
              return (
                <TouchableOpacity
                  key={s.val}
                  onPress={() => setSizeVal(s.val)}
                  activeOpacity={0.8}
                  style={[styles.gridChip, {
                    flex: 1,
                    borderColor: active ? t.brand : t.border,
                    backgroundColor: active ? (isDark ? t.surface : '#FAF5F0') : 'transparent',
                  }]}
                >
                  <Text style={{ fontSize: 15 }}>{s.emoji}</Text>
                  <Text style={[styles.gridChipLabel, { color: active ? t.brand : t.textMuted }]}>{s.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={[styles.sep, { backgroundColor: t.border }]} />

          {/* Toggles */}
          <Text style={[styles.sectionLabel, { color: t.textMuted }]}>EXTRAS</Text>
          {([
            { label: 'Falling Petals',   val: showPetals,  set: setShowPetals  },
            { label: 'Show Message',     val: showMessage, set: setShowMessage },
            { label: 'Show DigiBouquet', val: showBrand,   set: setShowBrand   },
          ] as const).map(item => (
            <View key={item.label} style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { color: t.text }]}>{item.label}</Text>
              <Switch
                value={item.val}
                onValueChange={item.set}
                trackColor={{ false: t.border, true: t.brand }}
                thumbColor="#fff"
              />
            </View>
          ))}

        </View>
      </ScrollView>

      {/* ── Sticky apply bar ──────────────────────────────────────────────── */}
      <View style={[styles.stickyBar, {
        backgroundColor: t.cardBg,
        borderTopColor:  t.border,
        paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 20 : 16),
      }]}>
        <TouchableOpacity
          style={[styles.applyBtn, { backgroundColor: t.brand }]}
          onPress={handleApply}
          activeOpacity={0.86}
        >
          {isCapturing
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.applyBtnText}>Apply as Wallpaper</Text>
          }
        </TouchableOpacity>
      </View>

      {/* ── Custom wallpaper placement modal ─────────────────────────────── */}
      <Modal visible={showPlaceModal} transparent animationType="none" onRequestClose={closePlaceModal}>
        <View style={StyleSheet.absoluteFill}>
          <Animated.View
            pointerEvents="auto"
            style={[styles.modalBackdrop, { opacity: placeOverlayAnim }]}
            {...placePanResponder.panHandlers}
          />
          <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            <Animated.View style={{ flex: 1 }} {...placePanResponder.panHandlers} />
            <Animated.View
              style={[styles.modalCard, { backgroundColor: t.cardBg, transform: [{ translateY: placeSlideAnim }] }]}
              {...placePanResponder.panHandlers}
            >
              <View style={[styles.modalHandle, { backgroundColor: t.border }]} />

              <Text style={[styles.modalTitle, { color: t.text }]}>Set Wallpaper</Text>
              <Text style={[styles.modalSubtitle, { color: t.textMuted }]}>Choose where to apply your bouquet</Text>

              <View style={styles.modalOptions}>
                {[
                  { label: 'Home Screen', icon: 'home', type: TYPE.HOME },
                  { label: 'Lock Screen', icon: 'lock', type: TYPE.LOCK },
                  { label: 'Both',        icon: 'layers', type: TYPE.BOTH },
                ].map(opt => (
                  <TouchableOpacity
                    key={opt.type}
                    style={[styles.modalOptionBtn, { borderColor: t.border, backgroundColor: t.bg }]}
                    onPress={() => doSetWallpaper(opt.type)}
                    activeOpacity={0.8}
                  >
                    <Feather name={opt.icon as any} size={22} color={t.brand} />
                    <Text style={[styles.modalOptionText, { color: t.text }]}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.modalCancelBtn, { backgroundColor: isDark ? t.surface2 : '#f0f0f0', marginBottom: insets.bottom > 0 ? insets.bottom : 8 }]}
                onPress={closePlaceModal}
                activeOpacity={0.8}
              >
                <Text style={[styles.modalCancelText, { color: t.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:  { flex: 1 },
  center:     { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection:    'row',
    alignItems:       'center',
    justifyContent:   'space-between',
    paddingHorizontal: 16,
    paddingBottom:    12,
    borderBottomWidth: 1,
  },
  backBtn:     { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontFamily: 'Manrope-Bold' },

  previewOuter: { alignItems: 'center', paddingVertical: 24 },
  phoneShadow: {
    position: 'absolute',
    borderRadius: 44,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.22,
    shadowRadius: 28,
    elevation: 20,
  },
  phoneFrame: {
    borderRadius: 40,
    overflow: 'hidden',
    borderWidth: 2.5,
    borderColor: 'rgba(0,0,0,0.10)',
  },
  notch: {
    position: 'absolute', top: 10, alignSelf: 'center',
    width: 60, height: 12, borderRadius: 7,
    backgroundColor: 'rgba(0,0,0,0.40)',
    zIndex: 999,
  },

  // Wallpaper internals
  attrWrapper: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  flowerArea:  { position: 'absolute', left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
  legacyRow:   { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', padding: 16 },

  // Panel
  panel: {
    marginHorizontal: 16, marginBottom: 12,
    borderRadius: 20, borderWidth: 1,
    padding: 20,
  },
  sectionLabel: { fontFamily: 'Manrope-SemiBold', fontSize: 9, letterSpacing: 2, marginBottom: 10 },
  sep:          { height: 1, marginVertical: 14 },

  chipRow: { gap: 6, paddingBottom: 4 },
  themeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 7,
  },
  swatch: { width: 13, height: 13, borderRadius: 7, borderWidth: 1 },
  chipLabel: { fontFamily: 'Manrope-Medium', fontSize: 12 },

  fontChip: {
    alignItems: 'center', gap: 2,
    borderWidth: 1.5, borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 7,
    minWidth: 60,
  },
  fontChipLabel: { fontFamily: 'Manrope-Medium', fontSize: 9 },

  gridRow:  { flexDirection: 'row', gap: 6 },
  gridChip: {
    borderWidth: 1.5, borderRadius: 12,
    paddingVertical: 9,
    alignItems: 'center', gap: 4,
  },
  gridChipLabel: { fontFamily: 'Manrope-Medium', fontSize: 10, textAlign: 'center' },

  toggleRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  toggleLabel:{ fontFamily: 'Manrope-Regular', fontSize: 15 },

  stickyBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingTop: 14, paddingHorizontal: 20,
    borderTopWidth: 1,
    elevation: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.07, shadowRadius: 10,
  },
  applyBtn: { paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  applyBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Manrope-Bold', letterSpacing: 0.3 },

  // ── Custom modal ───────────────────────────────────────────────────────
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingTop: 12, paddingBottom: 32,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12, shadowRadius: 16,
    elevation: 24,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    alignSelf: 'center', marginBottom: 20,
  },
  modalTitle: {
    fontFamily: 'Manrope-Bold', fontSize: 20, textAlign: 'center', marginBottom: 6,
  },
  modalSubtitle: {
    fontFamily: 'Manrope-Regular', fontSize: 13, textAlign: 'center', marginBottom: 24,
  },
  modalOptions: { gap: 10, marginBottom: 16 },
  modalOptionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderWidth: 1.5, borderRadius: 16,
    paddingHorizontal: 18, paddingVertical: 16,
  },
  modalOptionText: {
    fontFamily: 'Manrope-SemiBold', fontSize: 16,
  },
  modalCancelBtn: {
    marginTop: 4, paddingVertical: 14, borderRadius: 14, alignItems: 'center',
  },
  modalCancelText: { fontFamily: 'Manrope-SemiBold', fontSize: 15 },
});