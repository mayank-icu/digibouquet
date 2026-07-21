import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Image } from 'expo-image';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  Dimensions,
  Animated,
  Platform,
  Share,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Sparkles, Download, Share2, Scissors, Info, Heart, Check, Trash2 } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from '../utils/haptics';
import Toast from 'react-native-toast-message';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { getFlowerImage, BG_IMAGES } from '../utils/bouquetData';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── Alphabet to Flower Mapping ──────────────────────────────────────────────
export const ALPHABET_FLOWER_MAP: Record<string, { id: string; name: string; meaning: string; hex: string }> = {
  A: { id: 'alstroemeria', name: 'Alstroemeria', meaning: 'Lasting Friendship', hex: '#FF69B4' },
  B: { id: 'buttercup', name: 'Buttercup', meaning: 'Childlike Joy', hex: '#FFD700' },
  C: { id: 'camellia', name: 'Pink Camellia', meaning: 'Longing for You', hex: '#FFB6C1' },
  D: { id: 'daisy', name: 'White Daisy', meaning: 'Innocence & Purity', hex: '#FFFFFF' },
  E: { id: 'purple-rose', name: 'Enchantment Rose', meaning: 'Enchantment & Love', hex: '#9370DB' },
  F: { id: 'freesia', name: 'Freesia', meaning: 'Trust & Innocence', hex: '#FFFFFF' },
  G: { id: 'gaillardia', name: 'Gaillardia', meaning: 'Strength & Courage', hex: '#FF6347' },
  H: { id: 'hellebore', name: 'Hellebore', meaning: 'Serenity & Calm', hex: '#9370DB' },
  I: { id: 'ivory-rose', name: 'Ivory Rose', meaning: 'Charm & Grace', hex: '#FFFFF0' },
  J: { id: 'gerbera-daisy', name: 'Gerbera Daisy', meaning: 'Cheerfulness', hex: '#FF6347' },
  K: { id: 'pink-orchid', name: 'Pink Orchid', meaning: 'Grace & Joy', hex: '#FFB6C1' },
  L: { id: 'lily', name: 'White Lily', meaning: 'Purity & Refined Beauty', hex: '#FFFFFF' },
  M: { id: 'lotus', name: 'Lotus', meaning: 'Spiritual Awakening', hex: '#FFB6C1' },
  N: { id: 'anemone', name: 'Noble Anemone', meaning: 'Anticipation', hex: '#9370DB' },
  O: { id: 'orange-tulip', name: 'Orange Tulip', meaning: 'Energy & Passion', hex: '#FF8C00' },
  P: { id: 'peony', name: 'Pink Peony', meaning: 'Romance & Prosperity', hex: '#FFB6C1' },
  Q: { id: 'white-orchid', name: 'White Orchid', meaning: 'Purity & Elegance', hex: '#FFFFFF' },
  R: { id: 'red-rose', name: 'Red Rose', meaning: 'Deep Love & Romance', hex: '#DC143C' },
  S: { id: 'sunflower', name: 'Sunflower', meaning: 'Adoration & Loyalty', hex: '#FFD700' },
  T: { id: 'tulip', name: 'Pink Tulip', meaning: 'Affection & Care', hex: '#FFB6C1' },
  U: { id: 'purple-tulip', name: 'Purple Tulip', meaning: 'Royalty & Elegance', hex: '#9370DB' },
  V: { id: 'white-peony', name: 'White Peony', meaning: 'Compassion', hex: '#FFFFFF' },
  W: { id: 'white-camellia', name: 'White Camellia', meaning: "You're Adorable", hex: '#FFFFFF' },
  X: { id: 'yellow-orchid', name: 'Yellow Orchid', meaning: 'Friendship', hex: '#FFD700' },
  Y: { id: 'yellow-tulip', name: 'Yellow Tulip', meaning: 'Cheerful Thoughts', hex: '#FFD700' },
  Z: { id: 'zinnia', name: 'Zinnia', meaning: 'Remembrance', hex: '#FF69B4' },
};

// Custom Wrappers
const WRAPPERS = [
  { id: 'none', label: 'Bare', hex: 'transparent' },
  { id: 'blush', label: 'Blush Pink', hex: '#FADADD' },
  { id: 'sage', label: 'Sage Green', hex: '#C2D1C2' },
  { id: 'kraft', label: 'Kraft Paper', hex: '#D2B48C' },
  { id: 'night', label: 'Charcoal', hex: '#2F4F4F' },
];

// Custom Ribbons
const RIBBONS = [
  { id: 'none', label: 'None', hex: 'transparent' },
  { id: 'gold', label: 'Satin Gold', hex: '#FFD700' },
  { id: 'pink', label: 'Silk Pink', hex: '#FFC0CB' },
  { id: 'red', label: 'Red Velvet', hex: '#8B0000' },
  { id: 'green', label: 'Forest Green', hex: '#228B22' },
];

// QWERTY Layout rows
const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
];

// ─── MEMOIZED KEYBOARD COMPONENT FOR MAXIMUM PERFORMANCE ─────────────────────
interface KeyboardProps {
  onKeyPress: (letter: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  theme: any;
  keyAnimValues: Record<string, Animated.Value>;
}

const MemoizedKeyboard = React.memo(({ onKeyPress, onBackspace, onClear, theme, keyAnimValues }: KeyboardProps) => {
  // Use slightly narrower width to avoid side cropping on Q and P
  const keyboardWidth = SCREEN_W - 32;
  // Subtracting margins for 10 keys in a row (6px margin total per key to prevent clipping)
  const letterKeyWidth = (keyboardWidth - 60) / 10;

  return (
    <View style={[styles.keyboardContainer, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
      <View style={styles.keyboardInner}>
        {KEYBOARD_ROWS.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.keyboardRow}>
            {row.map((letter) => {
              const flower = ALPHABET_FLOWER_MAP[letter];
              const scaleAnim = keyAnimValues[letter] || new Animated.Value(1);
              return (
                <TouchableOpacity
                  key={letter}
                  activeOpacity={0.7}
                  style={[styles.keyButton, { width: letterKeyWidth, height: letterKeyWidth * 1.3, borderColor: theme.border }]}
                  onPress={() => onKeyPress(letter)}
                >
                  <Animated.View style={[styles.keyAnimatedContainer, { transform: [{ scale: scaleAnim }] }]}>
                    {flower && (
                      <Image
                        source={getFlowerImage(flower.id)}
                        style={styles.keyFlowerBg}
                        resizeMode="contain"
                      />
                    )}
                    <Text style={[styles.keyLetterText, { color: theme.text }]}>{letter}</Text>
                  </Animated.View>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        {/* Bottom row (Special Action row) */}
        <View style={styles.keyboardRow}>
          <TouchableOpacity
            activeOpacity={0.75}
            style={[styles.specialKeyButton, { flex: 2, backgroundColor: theme.bg, borderColor: theme.border }]}
            onPress={onClear}
          >
            <Trash2 size={13} color={theme.textMuted} />
            <Text style={[styles.specialKeyText, { color: theme.textMuted, fontSize: 10 }]} numberOfLines={1} adjustsFontSizeToFit>CLEAR</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.75}
            style={[styles.specialKeyButton, { flex: 4, backgroundColor: theme.bg, borderColor: theme.border }]}
            onPress={() => onKeyPress(' ')}
          >
            <Text style={[styles.specialKeyText, { color: theme.text }]}>SPACE</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.75}
            style={[styles.specialKeyButton, { flex: 2, backgroundColor: theme.bg, borderColor: theme.border }]}
            onPress={onBackspace}
          >
            <Text style={[styles.specialKeyText, { color: theme.text }]} numberOfLines={1}>⌫</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

MemoizedKeyboard.displayName = 'MemoizedKeyboard';

export default function FlowerLanguageScreen() {
  const navigation = useNavigation() as any;
  const insets = useSafeAreaInsets();
  const { theme: t, isDark } = useTheme();
  const { t: translate } = useLanguage();
  const { getTextSize } = useAccessibility();

  // Removed default written name "AMOUR" - starting fresh/empty
  const [name, setName] = useState('');
  const [selectedBgIndex, setSelectedBgIndex] = useState(0);
  const [selectedWrapper, setSelectedWrapper] = useState('kraft');
  const [selectedRibbon, setSelectedRibbon] = useState('gold');

  // Animated inputs
  const previewScale = useRef(new Animated.Value(0.95)).current;
  const previewOpacity = useRef(new Animated.Value(0)).current;

  // Key tap bounce animation states
  const keyAnimValues = useRef<Record<string, Animated.Value>>({}).current;
  
  // Initialize scale bounce hooks
  Object.keys(ALPHABET_FLOWER_MAP).forEach((letter) => {
    if (!keyAnimValues[letter]) {
      keyAnimValues[letter] = new Animated.Value(1);
    }
  });

  // Run initial preview animation
  useEffect(() => {
    Animated.parallel([
      Animated.spring(previewScale, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
      Animated.timing(previewOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  // Performance-focused, zero-dependency callbacks to keep keyboard completely lag-free
  const handleKeyPress = useCallback((letter: string) => {
    setName((prev) => {
      if (prev.length >= 10) {
        return prev;
      }
      
      // Trigger bounce visual feedback
      if (keyAnimValues[letter]) {
        keyAnimValues[letter].setValue(0.85);
        Animated.spring(keyAnimValues[letter], {
          toValue: 1,
          friction: 4,
          useNativeDriver: true
        }).start();
      }

      return prev + letter;
    });

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleBackspace = useCallback(() => {
    setName((prev) => prev.slice(0, -1));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleClear = useCallback(() => {
    setName('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  // Convert name into list of flower items
  const bouquetFlowers = useMemo(() => {
    const letters = name.split('');
    return letters.map((letter, index) => {
      const flower = ALPHABET_FLOWER_MAP[letter];
      if (!flower) return null;

      // Arrange in a beautiful fanned out shape automatically
      const total = letters.length;
      let x = 50;
      let y = 42;
      let rotation = 0;
      let scale = 1.0;

      if (total > 1) {
        const angleStep = 45 / (total - 1 || 1); // 45 degree spread
        const startAngle = -22.5;
        const currentAngle = startAngle + angleStep * index;
        const radians = (currentAngle * Math.PI) / 180;
        
        const radius = 16 + (index % 2) * 4; // Zigzag radius for lush depth
        x = 50 + radius * Math.sin(radians);
        y = 40 - radius * Math.cos(radians);
        rotation = currentAngle * 0.85;
        scale = 0.95 - (index % 3) * 0.04;
      }

      return {
        ...flower,
        uniqueId: `${letter}_${index}`,
        x,
        y,
        rotation,
        scale,
        zIndex: 10 + index,
      };
    }).filter(Boolean) as any[];
  }, [name]);

  const handleSaveToEditor = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Convert local bouquet flowers to the structure required by CreateBouquetScreen
    const mappedPlacedFlowers = bouquetFlowers.map((bf) => ({
      id: bf.id,
      uniqueId: bf.uniqueId,
      x: bf.x,
      y: bf.y,
      rotation: bf.rotation,
      scale: bf.scale,
      zIndex: bf.zIndex,
    }));

    // Prepopulate CreateBouquet with this bouquet
    navigation.navigate('CreateBouquet', {
      prepopulatedFlowers: mappedPlacedFlowers,
      prepopulatedGreenery: `bg-${selectedBgIndex + 1}`,
      occasion: { label: `${name}'s Name Bouquet` },
      prepopulatedMessage: `This bouquet spells your name: ${name}.\n\n` + 
        bouquetFlowers.map(f => `🌸 ${f.uniqueId.split('_')[0]}: ${f.name} (${f.meaning})`).join('\n'),
      fade: true,
    });
  };

  const handleDownloadWallpaper = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Toast.show({
      type: 'success',
      text1: 'Wallpaper Saved!',
      text2: 'The high-res name bouquet has been saved to your Photos.',
    });
  };

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const flowersList = bouquetFlowers.map(f => `${f.uniqueId.split('_')[0]} -> ${f.name} (${f.meaning})`).join('\n');
      const shareText = `I generated a custom "Flower Language" Name Bouquet for "${name}" spelling out:\n\n${flowersList}\n\nCreate yours on Digibouquet App! 🌸`;
      
      await Share.share({
        message: shareText,
        title: `${name}'s Flower Language Bouquet`,
      });
    } catch (_) {}
  };

  const canvasSize = SCREEN_W - 32;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.bg }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={t.bg} />
      
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: t.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <ArrowLeft size={22} color={t.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: t.text, fontSize: getTextSize(17) }]}>Flower Language</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ─── Custom CSS Name Display Box ─── */}
        <View style={[styles.nameDisplayContainer, { backgroundColor: t.cardBg, borderColor: t.border }]}>
          {name.length === 0 ? (
            <Text style={[styles.placeholderText, { color: t.textMuted }]}>TAP FLOWERS TO SPELL NAME...</Text>
          ) : (
            <View style={styles.lettersDisplayRow}>
              {name.split('').map((char, index) => {
                const flInfo = ALPHABET_FLOWER_MAP[char];
                return (
                  <View key={index} style={[styles.letterTagBadge, { backgroundColor: t.brand + '12', borderColor: t.brand + '30' }]}>
                    <Text style={[styles.letterTagChar, { color: t.brand }]}>{char}</Text>
                    {flInfo && (
                      <Image
                        source={getFlowerImage(flInfo.id)}
                        style={styles.letterTagFlowerImg}
                        resizeMode="contain"
                      />
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* ─── Visual Bouquet Canvas ─── */}
        <Animated.View style={[
          styles.canvasWrapper,
          {
            width: canvasSize,
            height: canvasSize,
            transform: [{ scale: previewScale }],
            opacity: previewOpacity,
            borderColor: t.border,
            backgroundColor: t.cardBg,
          }
        ]}>
          {/* Background Wallpaper */}
          <Image source={BG_IMAGES[selectedBgIndex]} style={StyleSheet.absoluteFill} resizeMode="cover" />

          {/* Wrapper Backing Graphic (Blush, Sage, Kraft, Night) */}
          {selectedWrapper !== 'none' && (
            <View style={[styles.wrapperBack, { backgroundColor: WRAPPERS.find(w => w.id === selectedWrapper)?.hex }]} />
          )}

          {/* Flowers Stack */}
          {bouquetFlowers.length === 0 ? (
            <View style={styles.emptyCanvas}>
              <Heart size={32} color={t.border} style={{ marginBottom: 12 }} />
              <Text style={[styles.emptyCanvasText, { color: t.textMuted }]}>Tap letters on the floral keyboard to start growing your bouquet...</Text>
            </View>
          ) : (
            bouquetFlowers.map((flower: any) => {
              const flowerSize = canvasSize * 0.28 * flower.scale;
              return (
                <View
                  key={flower.uniqueId}
                  style={{
                    position: 'absolute',
                    left: (flower.x / 100) * canvasSize - flowerSize / 2,
                    top: (flower.y / 100) * canvasSize - flowerSize / 2,
                    width: flowerSize,
                    height: flowerSize,
                    zIndex: flower.zIndex,
                    transform: [{ rotate: `${flower.rotation}deg` }],
                  }}
                >
                  <Image
                    source={getFlowerImage(flower.id)}
                    style={styles.flowerImg}
                    resizeMode="contain"
                  />
                </View>
              );
            })
          )}

          {/* Wrapping Paper Foreground Cover */}
          {selectedWrapper !== 'none' && bouquetFlowers.length > 0 && (
            <View style={styles.wrapperOverlayContainer} pointerEvents="none">
              {/* Triangular bouquet fold overlay */}
              <View style={[styles.wrapperTriangleLeft, { borderBottomColor: WRAPPERS.find(w => w.id === selectedWrapper)?.hex }]} />
              <View style={[styles.wrapperTriangleRight, { borderBottomColor: WRAPPERS.find(w => w.id === selectedWrapper)?.hex }]} />
            </View>
          )}

          {/* Wrapping Ribbon Bow */}
          {selectedRibbon !== 'none' && bouquetFlowers.length > 0 && (
            <View style={styles.ribbonContainer} pointerEvents="none">
              <View style={[styles.ribbonKnot, { backgroundColor: RIBBONS.find(r => r.id === selectedRibbon)?.hex }]} />
              <View style={styles.ribbonTailRow}>
                <View style={[styles.ribbonLoop, { borderColor: RIBBONS.find(r => r.id === selectedRibbon)?.hex }]} />
                <View style={[styles.ribbonLoop, { borderColor: RIBBONS.find(r => r.id === selectedRibbon)?.hex }]} />
              </View>
            </View>
          )}

          {/* Watermark */}
          {bouquetFlowers.length > 0 && (
            <View style={styles.watermark}>
              <Text style={styles.watermarkText}>Digibouquet • Secret Flower Language</Text>
            </View>
          )}
        </Animated.View>

        {/* ─── MEMOIZED KEYBOARD ─── */}
        <MemoizedKeyboard
          onKeyPress={handleKeyPress}
          onBackspace={handleBackspace}
          onClear={handleClear}
          theme={t}
          keyAnimValues={keyAnimValues}
        />

        {/* ─── customization Pickers ─── */}
        {bouquetFlowers.length > 0 && (
          <View style={styles.customSection}>
            
            {/* 1. Background wallpaper selection */}
            <Text style={[styles.sectionTitle, { color: t.text }]}>1. Choose Backdrop Wallpaper</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pickerRow}>
              {BG_IMAGES.map((img, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.bgThumb,
                    { borderColor: selectedBgIndex === index ? t.brand : 'transparent' }
                  ]}
                  onPress={() => {
                    setSelectedBgIndex(index);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Image source={img} style={styles.thumbImg} />
                  {selectedBgIndex === index && (
                    <View style={[styles.selectedCheck, { backgroundColor: t.brand }]}>
                      <Check size={10} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* 2. Wrapper Selection */}
            <Text style={[styles.sectionTitle, { color: t.text }]}>2. Select Wrapping Paper</Text>
            <View style={styles.selectorGrid}>
              {WRAPPERS.map((wrap) => (
                <TouchableOpacity
                  key={wrap.id}
                  style={[
                    styles.selectorPill,
                    {
                      backgroundColor: t.cardBg,
                      borderColor: selectedWrapper === wrap.id ? t.brand : t.border,
                    }
                  ]}
                  onPress={() => {
                    setSelectedWrapper(wrap.id);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  {wrap.id !== 'none' && <View style={[styles.colorIndicator, { backgroundColor: wrap.hex }]} />}
                  <Text style={[styles.selectorLabel, { color: t.text }]}>{wrap.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 3. Ribbon Bow selection */}
            <Text style={[styles.sectionTitle, { color: t.text }]}>3. Select Decorative Ribbon</Text>
            <View style={styles.selectorGrid}>
              {RIBBONS.map((rib) => (
                <TouchableOpacity
                  key={rib.id}
                  style={[
                    styles.selectorPill,
                    {
                      backgroundColor: t.cardBg,
                      borderColor: selectedRibbon === rib.id ? t.brand : t.border,
                    }
                  ]}
                  onPress={() => {
                    setSelectedRibbon(rib.id);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  {rib.id !== 'none' && <View style={[styles.colorIndicator, { backgroundColor: rib.hex, borderRadius: 3 }]} />}
                  <Text style={[styles.selectorLabel, { color: t.text }]}>{rib.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

          </View>
        )}

        {/* ─── Floriography Dictionary breakdown ─── */}
        {bouquetFlowers.length > 0 && (
          <View style={[styles.dictContainer, { backgroundColor: t.cardBg, borderColor: t.border }]}>
            <View style={styles.dictHeader}>
              <Info size={16} color={t.brand} />
              <Text style={[styles.dictTitle, { color: t.text }]}>Bouquet Flower Breakdown</Text>
            </View>
            
            {bouquetFlowers.map((flower: any, idx) => (
              <View key={flower.uniqueId} style={[styles.dictRow, { borderBottomColor: t.border }]}>
                <View style={[styles.letterBadge, { backgroundColor: t.brand }]}>
                  <Text style={styles.letterText}>{flower.uniqueId.split('_')[0]}</Text>
                </View>
                <View style={styles.dictRowContent}>
                  <Text style={[styles.flowerName, { color: t.text }]}>{flower.name}</Text>
                  <Text style={[styles.flowerMeaning, { color: t.textMuted }]}>Meaning: {flower.meaning}</Text>
                </View>
                <Image source={getFlowerImage(flower.id)} style={styles.dictThumb} resizeMode="contain" />
              </View>
            ))}
          </View>
        )}

        {/* ─── Bottom Actions ─── */}
        {bouquetFlowers.length > 0 && (
          <View style={styles.actionBlock}>
            
            {/* Primary Action: Go to editor pre-populated */}
            <TouchableOpacity style={[styles.primaryActionBtn, { backgroundColor: t.brand }]} onPress={handleSaveToEditor}>
              <Scissors size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.primaryActionText}>Open in Main Editor</Text>
            </TouchableOpacity>
            
            {/* Secondary: Download Lockscreen Wallpaper */}
            <TouchableOpacity style={[styles.secondaryActionBtn, { backgroundColor: t.cardBg, borderColor: t.border }]} onPress={handleDownloadWallpaper}>
              <Download size={18} color={t.text} style={{ marginRight: 6 }} />
              <Text style={[styles.secondaryActionText, { color: t.text }]}>Download lockscreen wallpaper</Text>
            </TouchableOpacity>

          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: 'Manrope-SemiBold' },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  descBanner: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  sparkleIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  descText: {
    flex: 1,
    fontFamily: 'Manrope-Regular',
    lineHeight: 18,
  },
  nameDisplayContainer: {
    borderWidth: 1.5,
    borderRadius: 18,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  placeholderText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 13,
    letterSpacing: 2,
  },
  lettersDisplayRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },
  letterTagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    minWidth: 42,
    height: 58,
  },
  letterTagChar: {
    fontFamily: 'Poppins-Bold',
    fontSize: 14,
    lineHeight: 16,
  },
  letterTagFlowerImg: {
    width: 24,
    height: 24,
    marginTop: 2,
  },
  canvasWrapper: {
    borderRadius: 24,
    borderWidth: 1.5,
    overflow: 'hidden',
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyCanvas: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyCanvasText: {
    fontFamily: 'Manrope-Medium',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  flowerImg: {
    width: '100%',
    height: '100%',
  },
  wrapperBack: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.65,
    borderRadius: 24,
  },
  wrapperOverlayContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  wrapperTriangleLeft: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    width: 0,
    height: 0,
    borderStyle: 'solid',
    borderRightWidth: SCREEN_W * 0.45,
    borderBottomWidth: SCREEN_W * 0.45,
    borderRightColor: 'transparent',
    opacity: 0.85,
  },
  wrapperTriangleRight: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 0,
    height: 0,
    borderStyle: 'solid',
    borderLeftWidth: SCREEN_W * 0.45,
    borderBottomWidth: SCREEN_W * 0.45,
    borderLeftColor: 'transparent',
    opacity: 0.9,
  },
  ribbonContainer: {
    position: 'absolute',
    bottom: '22%',
    alignSelf: 'center',
    width: 70,
    height: 35,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  ribbonKnot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    zIndex: 10,
  },
  ribbonTailRow: {
    flexDirection: 'row',
    position: 'absolute',
  },
  ribbonLoop: {
    width: 25,
    height: 18,
    borderRadius: 9,
    borderWidth: 5,
    marginHorizontal: -4,
  },
  watermark: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  watermarkText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 8,
    color: '#fff',
    letterSpacing: 0.5,
  },
  keyboardContainer: {
    borderWidth: 1.5,
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 24,
  },
  keyboardInner: {
    gap: 8,
  },
  keyboardRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
  },
  keyButton: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  keyAnimatedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyFlowerBg: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.28,
  },
  keyLetterText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 14,
  },
  specialKeyButton: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    gap: 2,
    paddingHorizontal: 2,
  },
  specialKeyText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 12,
  },
  customSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 14,
    marginBottom: 10,
    marginTop: 14,
  },
  pickerRow: {
    paddingVertical: 4,
  },
  bgThumb: {
    width: 60,
    height: 80,
    borderRadius: 12,
    borderWidth: 2,
    marginRight: 10,
    overflow: 'hidden',
  },
  thumbImg: {
    width: '100%',
    height: '100%',
  },
  selectedCheck: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  selectorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    marginHorizontal: 4,
    marginVertical: 6,
  },
  colorIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  selectorLabel: {
    fontFamily: 'Manrope-Medium',
    fontSize: 12,
  },
  dictContainer: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 28,
  },
  dictHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  dictTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 15,
  },
  dictRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  letterBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  letterText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#fff',
  },
  dictRowContent: {
    flex: 1,
  },
  flowerName: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 14,
  },
  flowerMeaning: {
    fontFamily: 'Manrope-Regular',
    fontSize: 12,
    marginTop: 2,
  },
  dictThumb: {
    width: 36,
    height: 36,
  },
  actionBlock: {
    gap: 12,
  },
  primaryActionBtn: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  primaryActionText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 16,
    color: '#fff',
  },
  secondaryActionBtn: {
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderWidth: 1,
  },
  secondaryActionText: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 14,
  },
});
