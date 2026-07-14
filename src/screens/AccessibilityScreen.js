import { HapticButton } from '../components/HapticButton';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Animated } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { useLanguage } from '../contexts/LanguageContext';
import { useSwipeNavigation } from '../hooks/useSwipeNavigation';
import { useAccessibility } from '../contexts/AccessibilityContext';
import * as Haptics from '../utils/haptics';

const BRAND = '#7A5C58';
const CREAM = '#FAF7F2';
const DARK = '#5C4844';
const MUTED = '#997E7A';
const MID = '#EAE0D5';
const WHITE = '#fff';

// Sleek Custom Toggle Component
function CustomToggle({ active, onPress }) {
  const [animValue] = React.useState(() => new Animated.Value(active ? 1 : 0));

  React.useEffect(() => {
    Animated.timing(animValue, {
      toValue: active ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [active]);

  const translateX = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 22],
  });

  return (
    <HapticButton 
      activeOpacity={0.8} 
      onPress={onPress}
      style={[styles.toggleContainer, active && styles.toggleActive]}
    >
      <Animated.View style={[styles.toggleThumb, { transform: [{ translateX }] }]} />
    </HapticButton>
  );
}

export default function AccessibilityScreen() {
  const { theme: rawTheme, isDark } = useTheme();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { t: translate } = useLanguage();
  const { 
    fontScale, 
    setFontScale, 
    reduceMotion, 
    setReduceMotion, 
    highContrast, 
    setHighContrast, 
    swipeNavigation, 
    setSwipeNavigation, 
    getTextSize, 
    getEffectiveTheme 
  } = useAccessibility();
  const t = getEffectiveTheme(rawTheme);

  const swipeHandlers = useSwipeNavigation({
    onSwipeRight: () => navigation.goBack(),
  });

  const handleToggle = (setter, value) => {
    setter(!value);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleFontScaleChange = (scale) => {
    setFontScale(scale);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top, backgroundColor: t.bg }]} {...swipeHandlers}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={t.bg} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: t.bg, borderBottomColor: t.border }]}>
        <HapticButton onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={t.text} />
        </HapticButton>
        <Text style={[styles.headerTitle, { color: t.text, fontSize: getTextSize(18) }]}>
          {translate('accessibilityScreen.title') || 'Accessibility'}
        </Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView 
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.desc, { color: t.textMuted, fontSize: getTextSize(14) }]}>
          {translate('accessibilityScreen.desc')}
        </Text>

        {/* Unified Modern Settings Card */}
        <View style={[styles.card, { backgroundColor: t.surface || t.cardBg }]}>
          
          {/* Font Size Row */}
          <View style={styles.settingItemRow}>
            <View style={[styles.iconContainer, { backgroundColor: '#EBF5FF' }]}>
              <Feather name="type" size={18} color="#2b6cb0" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingTitle, { color: t.text, fontSize: getTextSize(15) }]}>
                {translate('accessibilityScreen.fontSize')}
              </Text>
              <Text style={[styles.settingDesc, { color: t.textMuted, fontSize: getTextSize(12) }]}>
                {translate('accessibilityScreen.largeTextDesc')}
              </Text>
              
              {/* Segmented Controller */}
              <View style={[styles.fontScaleRow, { borderColor: t.border, backgroundColor: t.bg }]}>
                <HapticButton
                  style={[
                    styles.fontBtn, 
                    fontScale === 1.0 && { backgroundColor: BRAND }
                  ]}
                  onPress={() => handleFontScaleChange(1.0)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.fontBtnText, 
                    { color: fontScale === 1.0 ? WHITE : t.textMuted }
                  ]}>
                    {translate('accessibilityScreen.standard')}
                  </Text>
                </HapticButton>

                <HapticButton
                  style={[
                    styles.fontBtn, 
                    fontScale === 1.2 && { backgroundColor: BRAND }
                  ]}
                  onPress={() => handleFontScaleChange(1.2)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.fontBtnText, 
                    { color: fontScale === 1.2 ? WHITE : t.textMuted }
                  ]}>
                    {translate('accessibilityScreen.large')}
                  </Text>
                </HapticButton>

                <HapticButton
                  style={[
                    styles.fontBtn, 
                    fontScale === 1.4 && { backgroundColor: BRAND }
                  ]}
                  onPress={() => handleFontScaleChange(1.4)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.fontBtnText, 
                    { color: fontScale === 1.4 ? WHITE : t.textMuted }
                  ]}>
                    {translate('accessibilityScreen.extra')}
                  </Text>
                </HapticButton>
              </View>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: t.border }]} />

          {/* Reduce Motion Row */}
          <HapticButton 
            style={styles.settingItemRow}
            onPress={() => handleToggle(setReduceMotion, reduceMotion)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#FFF5F5' }]}>
              <Feather name="wind" size={18} color="#c53030" />
            </View>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={[styles.settingTitle, { color: t.text, fontSize: getTextSize(15) }]}>
                {translate('accessibilityScreen.reduceMotion')}
              </Text>
              <Text style={[styles.settingDesc, { color: t.textMuted, fontSize: getTextSize(12) }]}>
                {translate('accessibilityScreen.reduceMotionDesc')}
              </Text>
            </View>
            <CustomToggle active={reduceMotion} onPress={() => handleToggle(setReduceMotion, reduceMotion)} />
          </HapticButton>

          <View style={[styles.divider, { backgroundColor: t.border }]} />

          {/* High Contrast Row */}
          <HapticButton 
            style={styles.settingItemRow}
            onPress={() => handleToggle(setHighContrast, highContrast)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#F0FFF4' }]}>
              <Feather name="eye" size={18} color="#2f855a" />
            </View>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={[styles.settingTitle, { color: t.text, fontSize: getTextSize(15) }]}>
                {translate('accessibilityScreen.highContrast')}
              </Text>
              <Text style={[styles.settingDesc, { color: t.textMuted, fontSize: getTextSize(12) }]}>
                {translate('accessibilityScreen.highContrastDesc')}
              </Text>
            </View>
            <CustomToggle active={highContrast} onPress={() => handleToggle(setHighContrast, highContrast)} />
          </HapticButton>

          <View style={[styles.divider, { backgroundColor: t.border }]} />

          {/* Swipe Navigation Row */}
          <HapticButton 
            style={styles.settingItemRow}
            onPress={() => handleToggle(setSwipeNavigation, swipeNavigation)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#FAF5FF' }]}>
              <Feather name="sliders" size={18} color="#6b46c1" />
            </View>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={[styles.settingTitle, { color: t.text, fontSize: getTextSize(15) }]}>
                {translate('accessibilityScreen.swipeNavigation')}
              </Text>
              <Text style={[styles.settingDesc, { color: t.textMuted, fontSize: getTextSize(12) }]}>
                {translate('accessibilityScreen.swipeDesc')}
              </Text>
            </View>
            <CustomToggle active={swipeNavigation} onPress={() => handleToggle(setSwipeNavigation, swipeNavigation)} />
          </HapticButton>

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    paddingVertical: 14, 
    borderBottomWidth: 1 
  },
  backBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontFamily: 'Manrope-Bold' },
  content: { padding: 24 },
  desc: { fontSize: 14, marginBottom: 24, lineHeight: 22, fontFamily: 'Manrope-Regular' },
  card: {
    borderRadius: 20,
    padding: 16,
  },
  settingItemRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  settingTitle: { fontFamily: 'Manrope-Bold', marginBottom: 2 },
  settingDesc: { fontFamily: 'Manrope-Regular', lineHeight: 18 },
  divider: {
    height: 1,
    marginVertical: 8,
  },
  fontScaleRow: { 
    flexDirection: 'row', 
    gap: 6, 
    width: '100%', 
    marginTop: 14,
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
  },
  fontBtn: { 
    flex: 1, 
    paddingVertical: 10, 
    paddingHorizontal: 12,
    borderRadius: 8, 
    alignItems: 'center',
    justifyContent: 'center',
  },
  fontBtnText: { fontFamily: 'Manrope-Bold', fontSize: 13 },
  
  // Custom switch styles
  toggleContainer: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E5E5EA',
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: BRAND,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: WHITE,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
});
