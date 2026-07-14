import { HapticButton } from '../components/HapticButton';
import React, { useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { useSwipeNavigation } from '../hooks/useSwipeNavigation';

export default function CreativeStudioScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { theme: rawTheme, isDark } = useTheme();
  const { t: translate } = useLanguage();
  const { getTextSize, getEffectiveTheme } = useAccessibility();
  const t = getEffectiveTheme(rawTheme);

  const swipeHandlers = useSwipeNavigation({
    onSwipeLeft: () => navigation.navigate('History', { fade: true }),
    onSwipeRight: () => navigation.navigate('Home', { fade: true }),
  });

  // Scroll Animations for Floating Tab Bar
  const tabTranslateY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const isTabHidden = useRef(false);

  const handleScroll = (event) => {
    const currentY = event.nativeEvent.contentOffset.y;
    const delta = currentY - lastScrollY.current;

    if (currentY <= 0) {
      if (isTabHidden.current) {
        isTabHidden.current = false;
        Animated.spring(tabTranslateY, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 3,
          speed: 12,
        }).start();
      }
    } else if (delta > 15 && !isTabHidden.current && currentY > 60) {
      isTabHidden.current = true;
      Animated.spring(tabTranslateY, {
        toValue: 180,
        useNativeDriver: true,
        bounciness: 0,
        speed: 10,
      }).start();
    } else if (delta < -15 && isTabHidden.current) {
      isTabHidden.current = false;
      Animated.spring(tabTranslateY, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 3,
        speed: 12,
      }).start();
    }
    lastScrollY.current = currentY;
  };

  const tools = [
    {
      id: 'FlowerLanguage',
      title: 'Flower Keyboard',
      desc: 'Spell names in beautiful floriography bouquets.',
      iconName: 'type',
      bgLight: '#FAF0E6', // soft linen
      bgDark: '#2A201E',
    },
    {
      id: 'BirthFlowerWallpaper',
      title: 'Birth Wallpaper',
      desc: 'Personalized birth month lockscreen builder.',
      iconName: 'image',
      bgLight: '#F3E8EE', // soft lavender/rose
      bgDark: '#291F21',
    },
    {
      id: 'FloristRecipeCard',
      title: 'Florist Recipes',
      desc: 'Create stem recipes & cards for physical gifting.',
      iconName: 'gift',
      bgLight: '#E8F0EA', // soft sage green
      bgDark: '#1E2721',
    }
  ];

  return (
    <View style={[styles.safe, { backgroundColor: t.bg }]} {...swipeHandlers}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={t.bg} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: t.border, paddingTop: insets.top }]}>
        <HapticButton onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={t.text} />
        </HapticButton>
        <Text style={[styles.headerTitle, { color: t.text, fontSize: getTextSize(17) }]}>Creative Studio</Text>
        <View style={{ width: 38 }} />
      </View>

      <Animated.ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: 16, paddingBottom: 40 }]}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <View style={styles.grid}>
          {tools.map((tool) => {
            const cardBgColor = isDark ? tool.bgDark : tool.bgLight;
            return (
              <HapticButton
                key={tool.id}
                style={[
                  styles.card,
                  {
                    backgroundColor: cardBgColor,
                    borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.01)',
                  },
                ]}
                onPress={() => navigation.navigate(tool.id, { fade: true })}
                activeOpacity={0.9}
              >
                <View style={styles.cardTop}>
                  <View style={[styles.iconWrap, { backgroundColor: t.cardBg }]}>
                    <Feather name={tool.iconName} size={20} color={t.brand} />
                  </View>
                  <View style={[styles.arrowWrap, { backgroundColor: t.cardBg }]}>
                    <Feather name="arrow-up-right" size={16} color={t.brand} />
                  </View>
                </View>

                <View style={styles.cardBottom}>
                  <Text style={[styles.cardTitle, { color: t.text, fontSize: getTextSize(15) }]}>{tool.title}</Text>
                  <Text style={[styles.cardDesc, { color: t.textMuted, fontSize: getTextSize(11.5) }]}>{tool.desc}</Text>
                </View>
              </HapticButton>
            );
          })}
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  bottomNav: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 12,
    height: 66,
    zIndex: 1000,
  },
  activeIconContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 18,
  },
  navItem: { 
    alignItems: 'center', 
    justifyContent: 'center',
    flex: 1,
    height: '100%',
  },
  navLabel: { 
    fontFamily: 'Manrope-SemiBold', 
    fontSize: 8.5, 
    letterSpacing: 0.5, 
    marginTop: 3,
  },
  fabWrapper: { 
    width: 60,
    height: '100%',
    alignItems: 'center', 
    justifyContent: 'center',
    position: 'relative',
  },
  fab: {
    width: 56, 
    height: 56, 
    borderRadius: 28,
    alignItems: 'center', 
    justifyContent: 'center',
    position: 'absolute',
    top: -8,
    borderWidth: 3.5,
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
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 20 },
  introSection: { marginBottom: 20, paddingHorizontal: 4 },
  introTitle: { fontFamily: 'Manrope-Bold' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    minHeight: 200,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBottom: {
    marginTop: 16,
  },
  cardTitle: { fontFamily: 'Manrope-Bold', marginBottom: 4 },
  cardDesc: { fontFamily: 'Manrope-Regular', lineHeight: 16 },
});
