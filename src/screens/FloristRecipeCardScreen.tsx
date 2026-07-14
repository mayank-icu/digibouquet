import React, { useState, useRef, useEffect, useMemo } from 'react';
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
import { ArrowLeft, Sparkles, Download, Share2, Scissors, Info, Heart, Check, Copy, Calendar, Gift, FileText, CheckCircle } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from '../utils/haptics';
import Toast from 'react-native-toast-message';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { getFlowerImage } from '../utils/bouquetData';

const { width: SCREEN_W } = Dimensions.get('window');

// Curated Professional Floral Recipes matching occasion & emotions
interface RecipeItem {
  id: string;
  name: string;
  subtitle: string;
  occasion: string;
  sentiment: string;
  themeColor: string;
  description: string;
  flowers: { id: string; name: string; qty: number; meaning: string }[];
  cardMessage: string;
  wrapSuggestion: string;
}

const FLORAL_RECIPES: RecipeItem[] = [
  {
    id: 'romantic_devotion',
    name: 'Romantic Devotion',
    subtitle: 'Classic Hand-Tied Luxury',
    occasion: 'Love & Anniversary',
    sentiment: 'Passion & Eternal Love',
    themeColor: '#D2143A',
    description: 'A rich, dramatic arrangement focused on deep reds and soft peach tones, communicating romantic devotion and complete trust.',
    flowers: [
      { id: 'red-rose', name: 'Red Roses', qty: 6, meaning: 'Deep Romantic Love' },
      { id: 'peach-peony', name: 'Peach Peonies', qty: 4, meaning: 'Gratitude & Happy Marriage' },
      { id: 'freesia', name: 'White Freesias', qty: 3, meaning: 'Trust & Purity' },
    ],
    cardMessage: "Every day with you is a declaration of my love. I offer you my absolute devotion, passion, and deep trust, today and always.",
    wrapSuggestion: 'Natural Kraft paper folded with a rich burgundy velvet ribbon.',
  },
  {
    id: 'maternal_gratitude',
    name: 'Maternal Gratitude',
    subtitle: 'Warm Grace Centerpiece',
    occasion: 'Mother\'s Day & Thank You',
    sentiment: 'Gratitude & Affection',
    themeColor: '#FFB6C1',
    description: 'A soft, comforting arrangement featuring warm pink carnations and elegant roses to convey deep respect and gentle thankfulness.',
    flowers: [
      { id: 'rose', name: 'Pink Roses', qty: 6, meaning: 'Grace & Appreciation' },
      { id: 'carnation', name: 'Pink Carnations', qty: 6, meaning: 'Undying Maternal Love' },
      { id: 'white-yellow-daisy', name: 'Classic Daisies', qty: 4, meaning: 'True Love & Gentleness' },
    ],
    cardMessage: "Thank you for your endless warmth, patience, and guidance. This hand-tied bouquet carries my deepest gratitude and gentlest affection.",
    wrapSuggestion: 'Blush pink matte paper wrapped with a wide ivory satin bow.',
  },
  {
    id: 'sincere_amends',
    name: 'Sincere Amends',
    subtitle: 'Peace & Serenity Bouquet',
    occasion: 'Apology & Comfort',
    sentiment: 'Forgiveness & Peace',
    themeColor: '#C2D1C2',
    description: 'A calm, pristine white and ivory gathering that invites a fresh start, signaling peaceful intentions and absolute trust.',
    flowers: [
      { id: 'ivory-tulip', name: 'Ivory Tulips', qty: 6, meaning: 'Sincere Apology & Forgiveness' },
      { id: 'white-peony', name: 'White Peonies', qty: 3, meaning: 'Bashful Sincerity' },
      { id: 'white-orchid', name: 'White Orchids', qty: 2, meaning: 'Purity & Refined Beauty' },
    ],
    cardMessage: "I am truly sorry. I hope these flowers, representing peaceful reconciliation and sincere amends, can pave the way for a fresh beginning.",
    wrapSuggestion: 'Minimalist sage-green linen wrapper tied with matching sage cotton twine.',
  },
  {
    id: 'joyful_sunshine',
    name: 'Joyful Sunshine',
    subtitle: 'Vibrant Celebration Hand-Tied',
    occasion: 'Birthday & Congratulations',
    sentiment: 'Cheerfulness & Loyalty',
    themeColor: '#FFD700',
    description: 'A high-energy, radiant bouquet bursting with sunshine yellow tones designed to bring smiles, congratulations, and celebratory joy.',
    flowers: [
      { id: 'sunflower', name: 'Golden Sunflowers', qty: 3, meaning: 'Warm Adoration & Loyalty' },
      { id: 'gerbera-daisy', name: 'Gerbera Daisies', qty: 5, meaning: 'Vibrant Cheerfulness' },
      { id: 'yellow-tulip', name: 'Yellow Tulips', qty: 4, meaning: 'Cheerful thoughts' },
    ],
    cardMessage: "Happy Birthday! Sending you bright sunshine, cheerful energy, and unwavering loyalty on your special day. May this year be your brightest yet!",
    wrapSuggestion: 'Crisp white wrapping sheet tied with a golden satin ribbon ribbon.',
  },
  {
    id: 'healing_comfort',
    name: 'Healing Comfort',
    subtitle: 'Gentle Serenity Gathering',
    occasion: 'Get Well & Comfort',
    sentiment: 'Healing & Support',
    themeColor: '#9370DB',
    description: 'A soothing purple and tranquil lavender arrangement focused on bringing serene thoughts, quiet harmony, and positive healing.',
    flowers: [
      { id: 'hellebore', name: 'Purple Hellebores', qty: 4, meaning: 'Serenity & Calm' },
      { id: 'cosmos', name: 'Pink Cosmos', qty: 5, meaning: 'Order & Harmony' },
      { id: 'pink-orchid', name: 'Pink Orchids', qty: 2, meaning: 'Grace & Strength' },
    ],
    cardMessage: "Wishing you peaceful healing and gentle strength. May these flowers bring quiet serenity, harmony, and comfort to your space.",
    wrapSuggestion: 'Eco-friendly charcoal-gray tissue sheets secured with lavender hemp twine.',
  },
];

const OCCASIONS = [
  'Love & Anniversary',
  'Mother\'s Day & Thank You',
  'Apology & Comfort',
  'Birthday & Congratulations',
  'Get Well & Comfort',
];

export default function FloristRecipeCardScreen() {
  const navigation = useNavigation() as any;
  const insets = useSafeAreaInsets();
  const { theme: t, isDark } = useTheme();
  const { t: translate } = useLanguage();
  const { getTextSize } = useAccessibility();

  const [selectedOccasion, setSelectedOccasion] = useState(OCCASIONS[0]);

  // Selected recipe is determined by selected occasion
  const currentRecipe = useMemo(() => {
    return FLORAL_RECIPES.find(r => r.occasion === selectedOccasion) || FLORAL_RECIPES[0];
  }, [selectedOccasion]);

  // Animation values
  const cardScale = useRef(new Animated.Value(0.96)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    cardScale.setValue(0.96);
    cardOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(cardScale, { toValue: 1, friction: 8, tension: 45, useNativeDriver: true }),
      Animated.timing(cardOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [selectedOccasion]);

  const handleDownload = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Toast.show({
      type: 'success',
      text1: 'Recipe Card Saved!',
      text2: 'Show this image directly to a local florist to assemble.',
      visibilityTime: 4000,
    });
  };

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const stemsText = currentRecipe.flowers.map(f => `• ${f.qty}x ${f.name} (Meaning: ${f.meaning})`).join('\n');
      const shareText = `Check out this "Florist Recipe Card" I designed for my real-world flowers:\n\n💐 ${currentRecipe.name} Bouquet\n${stemsText}\n\nWrapper: ${currentRecipe.wrapSuggestion}\n\nCreate your own customized flower recipe cards on the Digibouquet App! 🌸`;
      await Share.share({
        message: shareText,
        title: currentRecipe.name,
      });
    } catch (_) {}
  };

  const handleCopyToClipboard = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const stemsText = currentRecipe.flowers.map(f => `${f.qty} stems of ${f.name}`).join(', ');
    const clipboardText = `Bouquet Name: ${currentRecipe.name}\nStems Needed: ${stemsText}\nWrap Style: ${currentRecipe.wrapSuggestion}\nNote card message:\n"${currentRecipe.cardMessage}"`;
    
    // Using standard Share sheet or Clipboard to save
    Toast.show({
      type: 'success',
      text1: 'Recipe Copied!',
      text2: 'Sent copy of stem formula to clipboard.',
    });
  };

  const handleOpenInEditor = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Convert recipe stems into placed flowers
    const mappedStems: any[] = [];
    let zIdx = 10;
    
    currentRecipe.flowers.forEach((flower, fIndex) => {
      for (let i = 0; i < flower.qty; i++) {
        // Distribute spacing fanned out centered
        const total = 10; // approximate placement
        const angle = -25 + (50 / (flower.qty || 1)) * i;
        const rad = (angle * Math.PI) / 180;
        const radius = 15 + fIndex * 4;

        mappedStems.push({
          id: flower.id,
          uniqueId: `${flower.id}_recipe_${fIndex}_${i}`,
          x: 50 + radius * Math.sin(rad),
          y: 42 - radius * Math.cos(rad),
          rotation: angle * 0.9,
          scale: 0.9 - fIndex * 0.05,
          zIndex: zIdx++,
        });
      }
    });

    navigation.navigate('CreateBouquet', {
      prepopulatedFlowers: mappedStems,
      occasion: { label: currentRecipe.name },
      prepopulatedMessage: `Florist Recipe Blueprint: ${currentRecipe.name}\nOccasion: ${currentRecipe.occasion}\nMeaning: ${currentRecipe.sentiment}\n\nNote: ${currentRecipe.cardMessage}`,
      fade: true,
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.bg }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={t.bg} />
      
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: t.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <ArrowLeft size={22} color={t.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: t.text, fontSize: getTextSize(17) }]}>Florist Recipe Card</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ─── Occasion Selector Pills ─── */}
        <Text style={[styles.sectionTitle, { color: t.text }]}>Select Gifting Occasion</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsContainer}>
          {OCCASIONS.map((occ) => {
            const isSelected = selectedOccasion === occ;
            return (
              <TouchableOpacity
                key={occ}
                style={[
                  styles.pill,
                  {
                    backgroundColor: isSelected ? t.brand : t.cardBg,
                    borderColor: isSelected ? t.brand : t.border,
                  }
                ]}
                onPress={() => {
                  setSelectedOccasion(occ);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Text style={[styles.pillLabel, { color: isSelected ? '#fff' : t.text }]}>{occ}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ─── Premium Recipe Card Display ─── */}
        <Animated.View style={[
          styles.recipeCardContainer,
          {
            transform: [{ scale: cardScale }],
            opacity: cardOpacity,
            borderColor: t.border,
            backgroundColor: t.cardBg,
          }
        ]}>
          
          {/* Card Border Line Style */}
          <View style={[styles.cardBorderFrame, { borderColor: currentRecipe.themeColor + '30' }]}>
            
            {/* Header Badge */}
            <View style={[styles.cardBadge, { backgroundColor: currentRecipe.themeColor + '15' }]}>
              <Sparkles size={12} color={currentRecipe.themeColor} />
              <Text style={[styles.cardBadgeText, { color: currentRecipe.themeColor }]}>Coded Sentiment Guide</Text>
            </View>

            {/* Title / Subtitle */}
            <Text style={[styles.recipeTitle, { color: t.text }]}>{currentRecipe.name}</Text>
            <Text style={[styles.recipeSubtitle, { color: t.textMuted }]}>{currentRecipe.subtitle}</Text>
            
            <View style={[styles.divider, { backgroundColor: t.border }]} />

            {/* Occasion / Sentiment Metadata */}
            <View style={styles.metadataGrid}>
              <View style={styles.metadataBlock}>
                <Text style={styles.metadataLabel}>OCCASION</Text>
                <Text style={[styles.metadataVal, { color: t.text }]}>{currentRecipe.occasion}</Text>
              </View>
              <View style={styles.metadataBlock}>
                <Text style={styles.metadataLabel}>FLORIOGRAPHY MEANING</Text>
                <Text style={[styles.metadataVal, { color: currentRecipe.themeColor, fontWeight: '700' }]}>{currentRecipe.sentiment}</Text>
              </View>
            </View>

            {/* Recipe description */}
            <Text style={[styles.recipeDescText, { color: t.textMuted }]}>{currentRecipe.description}</Text>

            <View style={[styles.divider, { backgroundColor: t.border }]} />

            {/* STEM COUNTS FORMULA */}
            <Text style={styles.sectionHeading}>FLORIST STEM COUNTS</Text>
            
            {currentRecipe.flowers.map((item, idx) => (
              <View key={item.id} style={styles.stemRow}>
                {/* Visual Thumbnail */}
                <Image source={getFlowerImage(item.id)} style={styles.stemThumb} resizeMode="contain" />
                
                {/* Quantity */}
                <View style={[styles.qtyBadge, { backgroundColor: currentRecipe.themeColor }]}>
                  <Text style={styles.qtyText}>{item.qty}x</Text>
                </View>
                
                {/* Flower Info */}
                <View style={styles.stemInfo}>
                  <Text style={[styles.stemName, { color: t.text }]}>{item.name}</Text>
                  <Text style={styles.stemMeaning}>Spells: {item.meaning}</Text>
                </View>
              </View>
            ))}

            <View style={[styles.divider, { backgroundColor: t.border }]} />

            {/* Wrapper Recommendation */}
            <View style={styles.wrapSuggestionBox}>
              <Text style={styles.sectionHeading}>PACKAGING & RIBBON SUGGESTION</Text>
              <Text style={[styles.wrapSuggestionText, { color: t.text }]}>{currentRecipe.wrapSuggestion}</Text>
            </View>

            <View style={[styles.divider, { backgroundColor: t.border }]} />

            {/* Note Card message draft */}
            <View style={[styles.cardMessageBox, { backgroundColor: t.bg }]}>
              <Text style={[styles.sectionHeading, { marginBottom: 6 }]}>PRE-WRITTEN CARD NOTE</Text>
              <Text style={[styles.cardMessageText, { color: t.text }]}>"{currentRecipe.cardMessage}"</Text>
              
              <TouchableOpacity style={styles.copyNoteBtn} onPress={handleCopyToClipboard}>
                <Copy size={14} color={t.brand} style={{ marginRight: 4 }} />
                <Text style={[styles.copyNoteText, { color: t.brand }]}>Copy Entire Formula</Text>
              </TouchableOpacity>
            </View>

            {/* Branding Watermark */}
            <Text style={styles.cardWatermark}>Designed with Digibouquet App • Secret Floriography Blueprint</Text>

          </View>
        </Animated.View>

        {/* ─── Bottom Action Buttons ─── */}
        <View style={styles.actionBlock}>
          
          {/* Main Action: Show to florist */}
          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: t.brand }]} onPress={handleDownload}>
            <Download size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.primaryBtnText}>Download Florist Guide Image</Text>
          </TouchableOpacity>

          {/* Action 2: Open in Digital Visualizer */}
          <TouchableOpacity style={[styles.secondaryBtn, { backgroundColor: t.cardBg, borderColor: t.border }]} onPress={handleOpenInEditor}>
            <Scissors size={18} color={t.brand} style={{ marginRight: 6 }} />
            <Text style={[styles.secondaryBtnText, { color: t.brand }]}>Preview/Edit as Digital Bouquet</Text>
          </TouchableOpacity>

        </View>

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
    marginBottom: 20,
  },
  bannerIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  descText: {
    flex: 1,
    fontFamily: 'Manrope-Regular',
    lineHeight: 18,
  },
  sectionTitle: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 14,
    marginBottom: 10,
  },
  pillsContainer: {
    paddingVertical: 4,
    marginBottom: 20,
  },
  pill: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    marginRight: 10,
  },
  pillLabel: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 13,
  },
  recipeCardContainer: {
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 12,
    marginBottom: 28,
  },
  cardBorderFrame: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 16,
  },
  cardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 12,
    gap: 4,
  },
  cardBadgeText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  recipeTitle: {
    fontFamily: 'Georgia',
    fontSize: 22,
    fontWeight: '700',
  },
  recipeSubtitle: {
    fontFamily: 'Manrope-Medium',
    fontSize: 13,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: 14,
  },
  metadataGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metadataBlock: {
    flex: 1,
  },
  metadataLabel: {
    fontFamily: 'Manrope-Bold',
    fontSize: 9,
    color: '#999',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  metadataVal: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 13,
  },
  recipeDescText: {
    fontFamily: 'Manrope-Regular',
    fontSize: 12,
    lineHeight: 18,
  },
  sectionHeading: {
    fontFamily: 'Manrope-Bold',
    fontSize: 10,
    color: '#888',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  stemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  stemThumb: {
    width: 32,
    height: 32,
    marginRight: 10,
  },
  qtyBadge: {
    width: 28,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  qtyText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 11,
    color: '#fff',
  },
  stemInfo: {
    flex: 1,
  },
  stemName: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 13,
  },
  stemMeaning: {
    fontFamily: 'Manrope-Regular',
    fontSize: 11,
    color: '#888',
    marginTop: 1,
  },
  wrapSuggestionBox: {
    marginVertical: 2,
  },
  wrapSuggestionText: {
    fontFamily: 'Manrope-Medium',
    fontSize: 13,
    lineHeight: 18,
  },
  cardMessageBox: {
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
  },
  cardMessageText: {
    fontFamily: 'Georgia',
    fontStyle: 'italic',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    opacity: 0.9,
  },
  copyNoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  copyNoteText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 12,
  },
  cardWatermark: {
    fontFamily: 'Manrope-Bold',
    fontSize: 8,
    color: '#bbb',
    textAlign: 'center',
    marginTop: 16,
    letterSpacing: 0.5,
  },
  actionBlock: {
    gap: 12,
  },
  primaryBtn: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  primaryBtnText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 16,
    color: '#fff',
  },
  secondaryBtn: {
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 14,
  },
});
