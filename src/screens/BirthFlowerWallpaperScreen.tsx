import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  Dimensions,
  Animated,
  Platform,
  Share,
  StatusBar,
  LayoutAnimation,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Download, Share2, Scissors, Info, Sparkles, ChevronLeft } from 'lucide-react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import ManageWallpaper, { TYPE } from 'react-native-manage-wallpaper';
import * as Haptics from '../utils/haptics';
import Toast from 'react-native-toast-message';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { getFlowerImage, BG_IMAGES } from '../utils/bouquetData';
import Svg, { Circle, Defs, G, Path, Rect, Text as SvgText, LinearGradient, Stop } from 'react-native-svg';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const CARD_W = SCREEN_W - 32;
const WALLPAPER_H = CARD_W * (SCREEN_H / SCREEN_W);
const TARGET_SCALE = 0.75;
const PREVIEW_MARGIN = -(WALLPAPER_H * (1 - TARGET_SCALE)) / 2;

// ─── Types ────────────────────────────────────────────────────────────────────

interface BirthFlowerInfo {
  month: string;
  shortMonth: string;
  flowerId: string;
  flowerName: string;
  meaning: string;
  traits: string[];
  description: string;
  accentColor: string;
  element: string;
  zodiac: string;
  luckyNumber: number;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const BIRTH_FLOWERS: BirthFlowerInfo[] = [
  {
    month: 'January', shortMonth: 'JAN',
    flowerId: 'carnation', flowerName: 'Carnation',
    meaning: 'Gratitude, Grace & Admiration',
    traits: ['Dedicated', 'Loyal', 'Warm-hearted'],
    description: 'A symbol of fascinating allure and deep maternal love. Those born in January are fiercely loyal, deeply caring, and protective of their loved ones.',
    accentColor: '#E8A0BF', element: 'Earth', zodiac: 'Capricorn · Aquarius', luckyNumber: 3,
  },
  {
    month: 'February', shortMonth: 'FEB',
    flowerId: 'purple-rose', flowerName: 'Violet Rose',
    meaning: 'Enchantment, Wisdom & Hope',
    traits: ['Intuitive', 'Wise', 'Dreamy'],
    description: 'Radiating enchantment and secret wisdom. February individuals possess an active imagination, deep spiritual clarity, and a quiet, magnetic charm.',
    accentColor: '#B89FD8', element: 'Water', zodiac: 'Aquarius · Pisces', luckyNumber: 7,
  },
  {
    month: 'March', shortMonth: 'MAR',
    flowerId: 'yellow-tulip', flowerName: 'Daffodil Tulip',
    meaning: 'New Beginnings & Sunshine Joy',
    traits: ['Optimistic', 'Creative', 'Joyful'],
    description: 'Bringing sunshine and cheerfulness to all. March souls welcome fresh starts with open arms, spreading creative optimism and joyful warmth.',
    accentColor: '#F5C842', element: 'Air', zodiac: 'Pisces · Aries', luckyNumber: 1,
  },
  {
    month: 'April', shortMonth: 'APR',
    flowerId: 'white-yellow-daisy', flowerName: 'Daisy',
    meaning: 'Innocence, Purity & Gentleness',
    traits: ['Pure', 'Cheerful', 'Honest'],
    description: 'Representing absolute honesty and gentle simplicity. April born people are natural peace-makers, cherishing loyal relationships and simple joys.',
    accentColor: '#A8D8A8', element: 'Earth', zodiac: 'Aries · Taurus', luckyNumber: 4,
  },
  {
    month: 'May', shortMonth: 'MAY',
    flowerId: 'lily', flowerName: 'White Lily',
    meaning: 'Purity, Sweetness & Happiness',
    traits: ['Refined', 'Generous', 'Graceful'],
    description: 'Symbolizing refined beauty and returning happiness. May individuals have a sweet presence, generous spirit, and bring harmony wherever they walk.',
    accentColor: '#C8E6C9', element: 'Earth', zodiac: 'Taurus · Gemini', luckyNumber: 6,
  },
  {
    month: 'June', shortMonth: 'JUN',
    flowerId: 'red-rose', flowerName: 'Red Rose',
    meaning: 'Deep Romance, Love & Passion',
    traits: ['Passionate', 'Charismatic', 'Bold'],
    description: 'The ultimate symbol of deep romantic love. June borns are highly expressive, bold in action, and completely devoted to their life passions.',
    accentColor: '#F08080', element: 'Fire', zodiac: 'Gemini · Cancer', luckyNumber: 9,
  },
  {
    month: 'July', shortMonth: 'JUL',
    flowerId: 'lotus', flowerName: 'Lotus',
    meaning: 'Purity, Strength & Spiritual Awakening',
    traits: ['Resilient', 'Serene', 'Pure'],
    description: 'Rising above mud to bloom in pure light. July individuals possess rare resilience, inner calm, and a beautiful ability to heal and inspire others.',
    accentColor: '#F4A0C0', element: 'Water', zodiac: 'Cancer · Leo', luckyNumber: 2,
  },
  {
    month: 'August', shortMonth: 'AUG',
    flowerId: 'gaillardia', flowerName: 'Gladiolus',
    meaning: 'Inner Strength & Moral Integrity',
    traits: ['Strong', 'Independent', 'Honourable'],
    description: 'Steadfast like a sword of honor. August born individuals carry immense personal strength, moral clarity, and standard-setting independence.',
    accentColor: '#FFB347', element: 'Fire', zodiac: 'Leo · Virgo', luckyNumber: 5,
  },
  {
    month: 'September', shortMonth: 'SEP',
    flowerId: 'cosmos', flowerName: 'Cosmos Aster',
    meaning: 'Elegance, Patience & Harmony',
    traits: ['Patient', 'Elegant', 'Harmonious'],
    description: 'Perfect symmetry and peaceful order. September souls live life with careful grace, deep patience, and an enduring quest for beauty and balance.',
    accentColor: '#9EC4D6', element: 'Air', zodiac: 'Virgo · Libra', luckyNumber: 8,
  },
  {
    month: 'October', shortMonth: 'OCT',
    flowerId: 'orange-tulip', flowerName: 'Marigold Tulip',
    meaning: 'Warm Affection & Creative Energy',
    traits: ['Warm', 'Creative', 'Affectionate'],
    description: 'Radiating rich, autumnal warmth. October borns are intensely creative, naturally comforting, and foster deep emotional connections.',
    accentColor: '#E8935A', element: 'Air', zodiac: 'Libra · Scorpio', luckyNumber: 11,
  },
  {
    month: 'November', shortMonth: 'NOV',
    flowerId: 'chrysanthemum', flowerName: 'Chrysanthemum',
    meaning: 'Joy, Cheerfulness & Abundance',
    traits: ['Cheerful', 'Abundant', 'Sociable'],
    description: 'Representing laughter and long life. November individuals are a beacon of cheerful energy, bringing prosperity, sociability, and good luck.',
    accentColor: '#D4A96A', element: 'Water', zodiac: 'Scorpio · Sagittarius', luckyNumber: 3,
  },
  {
    month: 'December', shortMonth: 'DEC',
    flowerId: 'freesia', flowerName: 'Freesia',
    meaning: 'Trust, Hope & Sweet Innocence',
    traits: ['Trustworthy', 'Optimistic', 'Charming'],
    description: 'Expressing trust and charming sweet thoughts. December souls are incredibly trustworthy, looking at the future with perpetual hope and joy.',
    accentColor: '#8EC5D6', element: 'Fire', zodiac: 'Sagittarius · Capricorn', luckyNumber: 6,
  },
];

const WALLPAPER_BACKGROUNDS = [
  { id: 'cream',    label: 'Vintage Cream',    hex: '#FAF5EF', textDark: true },
  { id: 'blush',    label: 'Blush Rose',        hex: '#FDF0ED', textDark: true },
  { id: 'lavender', label: 'Lilac Mist',        hex: '#F3EFFF', textDark: true },
  { id: 'sage',     label: 'Sage Silver',       hex: '#EFF5EF', textDark: true },
  { id: 'dusk',     label: 'Dusty Mauve',       hex: '#EDE0E8', textDark: true },
  { id: 'dark',     label: 'Velvet Midnight',   hex: '#1C1615', textDark: false },
  { id: 'navy',     label: 'Deep Indigo',       hex: '#181B2E', textDark: false },
  { id: 'forest',   label: 'Emerald Forest',    hex: '#141F1A', textDark: false },
];

// ─── Decorative SVG Corners ───────────────────────────────────────────────────

const CornerDecor = ({ color, size = 60 }: { color: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 60 60">
    <Path d="M2 2 L2 22 M2 2 L22 2" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none" opacity={0.6} />
    <Circle cx="2" cy="2" r="2.5" fill={color} opacity={0.5} />
    <Path d="M8 8 Q15 5 22 8 Q25 15 22 22" stroke={color} strokeWidth="0.8" fill="none" opacity={0.3} />
    <Circle cx="16" cy="14" r="1" fill={color} opacity={0.3} />
  </Svg>
);

// ─── Petal Divider ────────────────────────────────────────────────────────────

const PetalDivider = ({ color }: { color: string }) => (
  <Svg width={160} height={14} viewBox="0 0 160 14">
    <Path d="M0 7 L60 7" stroke={color} strokeWidth="0.8" opacity={0.4} />
    <Path d="M100 7 L160 7" stroke={color} strokeWidth="0.8" opacity={0.4} />
    <Path d="M72 7 Q76 3 80 7 Q84 11 80 7" stroke={color} strokeWidth="1" fill="none" opacity={0.7} />
    <Circle cx="66" cy="7" r="1.2" fill={color} opacity={0.4} />
    <Circle cx="94" cy="7" r="1.2" fill={color} opacity={0.4} />
    <Circle cx="80" cy="4" r="0.8" fill={color} opacity={0.3} />
  </Svg>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BirthFlowerWallpaperScreen() {
  const navigation = useNavigation() as any;
  const insets = useSafeAreaInsets();
  const { theme: t, isDark } = useTheme();
  const { t: translate } = useLanguage();
  const { getTextSize } = useAccessibility();

  const [userName, setUserName] = useState('');
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(4);
  const [bgStyle, setBgStyle] = useState('cream');
  const [activeTab, setActiveTab] = useState<'preview' | 'traits'>('preview');
  const [showBranding, setShowBranding] = useState(true);

  const currentFlower = useMemo(() => BIRTH_FLOWERS[selectedMonthIndex], [selectedMonthIndex]);
  const currentBg = useMemo(() => WALLPAPER_BACKGROUNDS.find(b => b.id === bgStyle) || WALLPAPER_BACKGROUNDS[0], [bgStyle]);

  // Colors derived from bg
  const textPrimary   = currentBg.textDark ? '#2D221E' : '#F5F0EC';
  const textSecondary = currentBg.textDark ? '#6B5B54' : '#A89993';
  const accentAlpha   = currentBg.textDark ? `${currentFlower.accentColor}CC` : `${currentFlower.accentColor}99`;
  const dividerColor  = currentBg.textDark ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.15)';

  const viewScale   = useRef(new Animated.Value(0.96)).current;
  const viewOpacity = useRef(new Animated.Value(0)).current;
  const wallpaperRef = useRef(null);

  useEffect(() => {
    viewScale.setValue(0.96);
    viewOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(viewScale,   { toValue: TARGET_SCALE, friction: 9, tension: 50, useNativeDriver: true }),
      Animated.timing(viewOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  }, [selectedMonthIndex, bgStyle]);

  const handleNameChange = (text: string) => {
    setUserName(text.toUpperCase().slice(0, 14));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleDownload = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({ type: 'error', text1: 'Permission to access photos denied.' });
        return;
      }
      const uri = await captureRef(wallpaperRef, { format: 'png', quality: 1 });
      await MediaLibrary.saveToLibraryAsync(uri);
      Toast.show({ type: 'success', text1: 'HD Wallpaper Saved!', text2: 'Set it as your Lockscreen under Photos.', visibilityTime: 4000 });
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to save image.' });
    }
  };

  const handleApplyWallpaper = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const uri = await captureRef(wallpaperRef, { format: 'png', quality: 1 });
      ManageWallpaper.setWallpaper(
        { uri, type: TYPE.BOTH },
        () => Toast.show({ type: 'success', text1: 'Wallpaper Applied!', text2: 'Your wallpaper has been updated.', visibilityTime: 4000 }),
        () => Toast.show({ type: 'error', text1: 'Failed to apply wallpaper.' })
      );
    } catch {
      Toast.show({ type: 'error', text1: 'Error generating HD image.' });
    }
  };

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: `🌸 My Birth Flower is the ${currentFlower.flowerName} (${currentFlower.month})!\n\n✨ ${currentFlower.meaning}\n\n💫 Personality: ${currentFlower.traits.join(' · ')}\n\n"${currentFlower.description}"\n\nCreate yours on Digibouquet! 💐`,
        title: `${userName || 'My'} Birth Flower Wallpaper`,
      });
    } catch {}
  };

  const handleLaunchEditor = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('CreateBouquet', {
      prepopulatedFlowers: [{ id: currentFlower.flowerId, uniqueId: `${currentFlower.flowerId}_birth_center`, x: 50, y: 44, rotation: 0, scale: 1.1, zIndex: 10 }],
      occasion: { label: `${currentFlower.month} Birth Flower` },
      prepopulatedMessage: `Birth Month Flower: ${currentFlower.flowerName}\nMeaning: ${currentFlower.meaning}\n\n"${currentFlower.description}"`,
      fade: true,
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: t.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={t.bg} />

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top, backgroundColor: t.bg, borderBottomColor: t.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={t.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: t.text, fontSize: getTextSize(17) }]}>Birth Flower Wallpaper</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Name Input ── */}
        <View style={[styles.inputRow, { backgroundColor: t.cardBg, borderColor: t.border }]}>
          <TextInput
            style={[styles.nameInput, { color: t.text }]}
            value={userName}
            onChangeText={handleNameChange}
            placeholder="Name"
            placeholderTextColor={t.textMuted}
            autoCapitalize="characters"
            maxLength={14}
            autoCorrect={false}
          />
          <Text style={[styles.charCount, { color: t.textMuted }]}>{userName.length}/14</Text>
        </View>

        {/* ── Wallpaper Preview ── */}
        <Animated.View style={{ transform: [{ scale: viewScale }], opacity: viewOpacity, alignItems: 'center', marginTop: PREVIEW_MARGIN, marginBottom: PREVIEW_MARGIN + 24 }}>
          <View style={{ borderWidth: 2, borderColor: t.border, borderRadius: 40, overflow: 'hidden' }}>
            <View
              ref={wallpaperRef}
              collapsable={false}
              style={[styles.lockscreen, { backgroundColor: currentBg.hex }]}
            >
              {/* Name header */}
            <Text style={[styles.wallpaperName, { color: textPrimary }]}>{userName || 'YOUR NAME'}</Text>

            {/* Petal divider */}
            <View style={{ marginTop: 8, marginBottom: 4, alignItems: 'center' }}>
              <PetalDivider color={currentFlower.accentColor} />
            </View>

            {/* Month badge */}
            <View style={[styles.monthBadge, { borderColor: `${currentFlower.accentColor}60`, backgroundColor: `${currentFlower.accentColor}18` }]}>
              <Text style={[styles.monthBadgeText, { color: textPrimary }]}>
                {currentFlower.shortMonth}  ·  {currentFlower.flowerName.toUpperCase()}
              </Text>
            </View>

            {/* Flower image – sized well */}
            <View style={styles.flowerBox}>
              <Image
                source={getFlowerImage(currentFlower.flowerId)}
                style={styles.flowerImg}
                resizeMode="contain"
              />
            </View>

            {/* Meaning ribbon */}
            <View style={[styles.meaningRibbon, { borderTopColor: dividerColor, borderBottomColor: dividerColor }]}>
              <Text style={[styles.meaningText, { color: textSecondary }]}>{currentFlower.meaning}</Text>
            </View>

            {/* Trait pills row */}
            <View style={styles.traitRow}>
              {currentFlower.traits.map((trait, i) => (
                <View
                  key={i}
                  style={[styles.traitPill, { borderColor: `${currentFlower.accentColor}55`, backgroundColor: `${currentFlower.accentColor}18` }]}
                >
                  <Text style={[styles.traitText, { color: textPrimary }]}>{trait}</Text>
                </View>
              ))}
            </View>

            {/* Bottom metadata row */}
            <View style={styles.wallpaperMetaRow}>
              <Text style={[styles.wallpaperMetaItem, { color: textSecondary }]}>{currentFlower.element}</Text>
              <Text style={[styles.wallpaperMetaItem, { color: textSecondary }]}>{currentFlower.zodiac}</Text>
              <Text style={[styles.wallpaperMetaItem, { color: textSecondary }]}>Lucky {currentFlower.luckyNumber}</Text>
            </View>

            {/* Brand watermark */}
            {showBranding && <Text style={[styles.watermark, { color: `${textSecondary}66` }]}>digibouquet</Text>}
            </View>
          </View>
        </Animated.View>

        {/* ── Month Picker ── */}
        <Text style={[styles.sectionLabel, { color: t.text }]}>Birth Month</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.monthScrollRow}>
          {BIRTH_FLOWERS.map((bf, index) => {
            const isSelected = selectedMonthIndex === index;
            return (
              <TouchableOpacity
                key={bf.month}
                style={[
                  styles.monthPill,
                  {
                    backgroundColor: isSelected ? t.brand : t.cardBg,
                    borderColor: isSelected ? t.brand : t.border,
                  }
                ]}
                onPress={() => {
                  setSelectedMonthIndex(index);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                activeOpacity={0.75}
              >
                <Text style={[styles.monthPillShort, { color: isSelected ? '#fff' : t.textMuted }]}>{bf.shortMonth}</Text>
                <Text style={[styles.monthPillFull,  { color: isSelected ? '#fff' : t.text   }]}>{bf.month}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Background Picker ── */}
        <Text style={[styles.sectionLabel, { color: t.text }]}>Backdrop Styling</Text>
        <View style={styles.bgGrid}>
          {WALLPAPER_BACKGROUNDS.map((bg) => {
            const isSelected = bgStyle === bg.id;
            return (
              <TouchableOpacity
                key={bg.id}
                style={[
                  styles.bgPill,
                  { backgroundColor: t.cardBg, borderColor: isSelected ? t.brand : t.border, borderWidth: isSelected ? 1.8 : 1 }
                ]}
                onPress={() => {
                  setBgStyle(bg.id);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                activeOpacity={0.75}
              >
                <View style={[styles.bgSwatch, { backgroundColor: bg.hex, borderColor: isSelected ? t.brand : '#ccc' }]} />
                <Text style={[styles.bgPillLabel, { color: t.text }]}>{bg.label}</Text>
                {isSelected && <View style={[styles.bgPillDot, { backgroundColor: t.brand }]} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Branding Toggle ── */}
        <View style={[styles.toggleRow, { borderColor: t.border, backgroundColor: t.cardBg }]}>
          <Text style={[styles.toggleLabel, { color: t.text }]}>Show Digibouquet Branding</Text>
          <Switch
            value={showBranding}
            onValueChange={(val) => { setShowBranding(val); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            trackColor={{ false: '#ccc', true: t.brand }}
            thumbColor={'#fff'}
          />
        </View>

        {/* ── Tabs ── */}
        <View style={[styles.tabBar, { backgroundColor: t.cardBg, borderColor: t.border }]}>
          {(['preview', 'traits'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabBtn, activeTab === tab && [styles.tabBtnActive, { backgroundColor: t.brand }]]}
              onPress={() => { 
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setActiveTab(tab); 
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); 
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabLabel, { color: activeTab === tab ? '#fff' : t.textMuted }]}>
                {tab === 'preview' ? 'Flower Info' : 'Personality'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'preview' ? (
          /* ── Flower Info card ── */
          <View style={[styles.infoCard, { backgroundColor: t.cardBg, borderColor: t.border }]}>
            <View style={styles.infoCardBody}>
              <Text style={[styles.infoFlowerName, { color: t.text }]}>{currentFlower.flowerName}</Text>
              <Text style={[styles.infoMeaning, { color: t.text }]}>{currentFlower.meaning}</Text>
              <View style={[styles.infoMetaRow, { borderTopColor: t.border }]}>
                <View style={styles.infoMetaItem}>
                  <Text style={[styles.infoMetaKey, { color: t.textMuted }]}>ELEMENT</Text>
                  <Text style={[styles.infoMetaVal, { color: t.text }]}>{currentFlower.element}</Text>
                </View>
                <View style={[styles.infoMetaDivider, { backgroundColor: t.border }]} />
                <View style={styles.infoMetaItem}>
                  <Text style={[styles.infoMetaKey, { color: t.textMuted }]}>ZODIAC</Text>
                  <Text style={[styles.infoMetaVal, { color: t.text }]} numberOfLines={1} adjustsFontSizeToFit>{currentFlower.zodiac}</Text>
                </View>
                <View style={[styles.infoMetaDivider, { backgroundColor: t.border }]} />
                <View style={styles.infoMetaItem}>
                  <Text style={[styles.infoMetaKey, { color: t.textMuted }]}>LUCKY NO.</Text>
                  <Text style={[styles.infoMetaVal, { color: t.text }]}>{currentFlower.luckyNumber}</Text>
                </View>
              </View>
            </View>
          </View>
        ) : (
          /* ── Personality card ── */
          <View style={[styles.infoCard, { backgroundColor: t.cardBg, borderColor: t.border }]}>
            <View style={styles.infoCardBody}>
              <Text style={[styles.infoFlowerName, { color: t.text }]}>Personality Profile</Text>
              <View style={styles.traitsWrap}>
                {currentFlower.traits.map((tr, i) => (
                  <View key={i} style={[styles.traitBadge, { backgroundColor: `${currentFlower.accentColor}22`, borderColor: `${currentFlower.accentColor}55` }]}>
                    <Text style={[styles.traitBadgeText, { color: t.text }]}>{tr}</Text>
                  </View>
                ))}
              </View>
              <Text style={[styles.personalityDesc, { color: t.textMuted }]}>{currentFlower.description}</Text>
            </View>
          </View>
        )}

        {/* ── Bouquet Editor CTA ── */}
        <TouchableOpacity
          style={[styles.editorCta, { backgroundColor: t.cardBg, borderColor: `${currentFlower.accentColor}44` }]}
          onPress={handleLaunchEditor}
          activeOpacity={0.8}
        >
          <View style={[styles.editorCtaIcon, { backgroundColor: `${currentFlower.accentColor}22` }]}>
            <Scissors size={18} color={currentFlower.accentColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.editorCtaTitle, { color: t.text }]}>Arrange in Bouquet Editor</Text>
            <Text style={[styles.editorCtaSub, { color: t.textMuted }]}>Add your birth flower to a custom bouquet</Text>
          </View>
          <Feather name="chevron-right" size={18} color={t.textMuted} />
        </TouchableOpacity>

        {/* ── Action Buttons ── */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: t.cardBg, borderColor: t.border }]}
            onPress={handleDownload}
            activeOpacity={0.8}
          >
            <Text style={[styles.saveBtnText, { color: t.text }]}>Save HD</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.applyBtn, { backgroundColor: t.brand }]}
            onPress={handleApplyWallpaper}
            activeOpacity={0.85}
          >
            <Text style={styles.applyBtnText}>Apply Wallpaper</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:     { flex: 1 },

  // Header
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  backBtn:       { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerTitle:   { fontFamily: 'Manrope-SemiBold' },

  // Scroll
  scrollContent: { paddingHorizontal: 16, paddingBottom: 48 },

  // Name input
  inputRow:      { flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12, marginTop: 16, marginBottom: 20, gap: 10 },
  inputLabel:    { fontFamily: 'Manrope-SemiBold', fontSize: 11, letterSpacing: 1.5 },
  nameInput:     { flex: 1, fontFamily: 'Poppins-Regular', fontSize: 15, letterSpacing: 3, padding: 0 },
  charCount:     { fontFamily: 'Manrope-Regular', fontSize: 11 },

  // Lockscreen card
  lockscreen: {
    width: CARD_W,
    height: CARD_W * (SCREEN_H / SCREEN_W),
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingBottom: 48,
  },

  // Corner decor
  cornerTL:       { position: 'absolute', top: 16, left: 16 },
  cornerTR:       { position: 'absolute', top: 16, right: 16 },
  cornerBL:       { position: 'absolute', bottom: 16, left: 16 },
  cornerBR:       { position: 'absolute', bottom: 16, right: 16 },

  // Wallpaper text elements
  wallpaperName:  { fontFamily: 'Georgia', fontStyle: 'italic', fontSize: 22, fontWeight: '600', letterSpacing: 1.5, marginTop: 12 },
  monthBadge:     { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 4, marginTop: 8 },
  monthBadgeText: { fontFamily: 'Manrope-SemiBold', fontSize: 10, letterSpacing: 2.5 },
  flowerBox:      { width: '58%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  flowerImg:      { width: '100%', height: '100%' },
  meaningRibbon:  { width: '90%', paddingVertical: 7, alignItems: 'center', marginTop: 4 },
  meaningText:    { fontFamily: 'Georgia', fontStyle: 'italic', fontSize: 11, letterSpacing: 0.4, textAlign: 'center' },
  traitRow:       { flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap', justifyContent: 'center' },
  traitPill:      { borderWidth: 1, borderRadius: 30, paddingHorizontal: 10, paddingVertical: 3 },
  traitText:      { fontFamily: 'Manrope-SemiBold', fontSize: 9, letterSpacing: 0.8 },
  wallpaperMetaRow: { flexDirection: 'row', gap: 12, marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' },
  wallpaperMetaItem: { fontFamily: 'Manrope-Regular', fontSize: 9, letterSpacing: 0.5 },
  watermark:      { fontFamily: 'Georgia', fontStyle: 'italic', fontSize: 9, marginTop: 24, paddingTop: 10, letterSpacing: 1 },

  // Section labels
  sectionLabel:   { fontFamily: 'Manrope-SemiBold', fontSize: 13, letterSpacing: 0.5, marginTop: 4, marginBottom: 10 },

  // Month picker
  monthScrollRow: { paddingVertical: 4, paddingRight: 16, marginBottom: 20 },
  monthPill:      { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, borderWidth: 1, marginRight: 8, alignItems: 'center' },
  monthPillShort: { fontFamily: 'Manrope-Bold', fontSize: 10, letterSpacing: 1.5 },
  monthPillFull:  { fontFamily: 'Manrope-Regular', fontSize: 12, marginTop: 2 },

  // Background picker
  bgGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  bgPill:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 22, gap: 7 },
  bgSwatch:       { width: 14, height: 14, borderRadius: 7, borderWidth: 0.5 },
  bgPillLabel:    { fontFamily: 'Manrope-Medium', fontSize: 12 },
  bgPillDot:      { width: 6, height: 6, borderRadius: 3 },

  // Toggle
  toggleRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 18, borderWidth: 1, marginBottom: 20 },
  toggleLabel:    { fontFamily: 'Manrope-SemiBold', fontSize: 13 },

  // Tab bar
  tabBar:         { flexDirection: 'row', borderRadius: 18, borderWidth: 1, padding: 4, marginBottom: 14, gap: 4 },
  tabBtn:         { flex: 1, paddingVertical: 10, borderRadius: 14, alignItems: 'center' },
  tabBtnActive:   {},
  tabLabel:       { fontFamily: 'Manrope-SemiBold', fontSize: 13 },

  // Info card
  infoCard:       { flexDirection: 'row', borderRadius: 20, borderWidth: 1, marginBottom: 14, overflow: 'hidden' },
  infoCardBody:   { flex: 1, padding: 16 },
  infoFlowerName: { fontFamily: 'Manrope-Bold', fontSize: 15, marginBottom: 4 },
  infoMeaning:    { fontFamily: 'Georgia', fontStyle: 'italic', fontSize: 13, marginBottom: 14, lineHeight: 18 },
  infoMetaRow:    { flexDirection: 'row', borderTopWidth: 1, paddingTop: 12, gap: 0 },
  infoMetaItem:   { flex: 1, alignItems: 'center' },
  infoMetaDivider:{ width: 1, height: '100%' },
  infoMetaKey:    { fontFamily: 'Manrope-SemiBold', fontSize: 9, letterSpacing: 1.2, marginBottom: 4 },
  infoMetaVal:    { fontFamily: 'Manrope-Bold', fontSize: 13 },

  // Traits tab
  traitsWrap:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  traitBadge:     { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  traitBadgeText: { fontFamily: 'Manrope-SemiBold', fontSize: 13 },
  personalityDesc:{ fontFamily: 'Manrope-Regular', fontSize: 13, lineHeight: 20 },

  // Bouquet editor CTA
  editorCta:      { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 20 },
  editorCtaIcon:  { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  editorCtaTitle: { fontFamily: 'Manrope-SemiBold', fontSize: 14 },
  editorCtaSub:   { fontFamily: 'Manrope-Regular', fontSize: 12, marginTop: 2 },

  // Action row — MATCHED heights
  actionRow:      { flexDirection: 'row', gap: 12 },
  saveBtn: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveBtnText:    { fontFamily: 'Manrope-SemiBold', fontSize: 14 },
  applyBtn: {
    flex: 2,
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  applyBtnText:   { fontFamily: 'Manrope-Bold', fontSize: 16, color: '#fff' },
});