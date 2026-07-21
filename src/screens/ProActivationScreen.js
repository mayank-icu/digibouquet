import { HapticButton } from '../components/HapticButton';
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, Animated, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAccessibility } from '../contexts/AccessibilityContext';

const BRAND = '#7A5C58';
const CREAM = '#FAF7F2';
const DARK = '#5C4844';
const WHITE = '#fff';

export default function ProActivationScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { theme: t, isDark } = useTheme();
  const { t: tr } = useLanguage();
  const { getTextSize } = useAccessibility();
  const lottieRef = useRef(null);
  const [scaleAnim] = useState(() => new Animated.Value(0.9));
  const [opacityAnim] = useState(() => new Animated.Value(0));
  const [showAnimation, setShowAnimation] = useState(true);

  useEffect(() => {
    // Animate in the content
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // Play animation
    if (lottieRef.current && typeof lottieRef.current.play === 'function') {
      lottieRef.current.play();
    }
  }, [scaleAnim, opacityAnim]);

  const handleAnimationFinish = () => {
    setShowAnimation(false);
  };

  const handleContinue = () => {
    setTimeout(() => {
      if (route.params?.fromScreen === 'CreateBouquet') {
        navigation.navigate('CreateBouquet');
      } else {
        navigation.replace('MainTabs');
      }
    }, 0);
  };

  return (
    <View style={[styles.root, { backgroundColor: t.bg, paddingTop: insets.top }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={t.bg} />

      <Animated.View
        style={[
          styles.container,
          {
            opacity: opacityAnim,
            transform: [{ scale: scaleAnim }],
            paddingBottom: insets.bottom + 20,
          },
        ]}
      >
        {/* Content */}
        <View style={styles.content}>
          <Text style={[styles.title, { color: t.text, fontSize: getTextSize(28) }]}>
            {tr('pro.activationTitle')}
          </Text>

          <Text style={[styles.subtitle, { color: t.textMuted, fontSize: getTextSize(15) }]}>
            {tr('pro.activationSubtitle')}
          </Text>

          {/* Features list */}
          <View style={styles.featuresList}>
            <FeatureItem
              icon="flower-tulip"
              title={tr('pro.feature1Title') || 'Unlimited Bouquets'}
              desc={tr('pro.feature1Desc') || 'Create as many bouquets as you want'}
              textColor={t.text}
              mutedColor={t.textMuted}
              brandColor={t.brand}
            />
            <FeatureItem
              icon="email-outline"
              title={tr('pro.feature2Title') || 'Scheduled Emails'}
              desc={tr('pro.feature2Desc') || 'Send bouquets at the perfect time'}
              textColor={t.text}
              mutedColor={t.textMuted}
              brandColor={t.brand}
            />
            <FeatureItem
              icon="palette-outline"
              title={tr('pro.feature3Title') || 'Premium Styles'}
              desc={tr('pro.feature3Desc') || 'Access exclusive themes and designs'}
              textColor={t.text}
              mutedColor={t.textMuted}
              brandColor={t.brand}
            />
          </View>
        </View>

        {/* Button */}
        <HapticButton
          style={[styles.button, { backgroundColor: t.brand }]}
          onPress={handleContinue}
          activeOpacity={0.85}
        >
          <Text style={[styles.buttonText, { fontSize: getTextSize(16) }]}>
            {tr('pro.getStarted')}
          </Text>
        </HapticButton>
      </Animated.View>

      {/* Animation Overlay */}
      {showAnimation && (
        <View style={[StyleSheet.absoluteFill, styles.animationOverlay]} pointerEvents="none">
          <LottieView
            ref={lottieRef}
            source={require('../../assets/animations/pro-activate.json')}
            autoPlay={true}
            loop={false}
            style={styles.overlayAnimation}
            onAnimationFinish={handleAnimationFinish}
          />
        </View>
      )}
    </View>
  );
}

function FeatureItem({ icon, title, desc, textColor, mutedColor, brandColor }) {
  const { getTextSize } = useAccessibility();
  return (
    <View style={styles.featureItem}>
      <View style={[styles.iconCircle, { backgroundColor: brandColor + '20' }]}>
        <MaterialCommunityIcons name={icon} size={24} color={brandColor} />
      </View>
      <View style={styles.featureContent}>
        <Text style={[styles.featureTitle, { color: textColor, fontSize: getTextSize(16) }]}>{title}</Text>
        <Text style={[styles.featureDesc, { color: mutedColor, fontSize: getTextSize(14) }]}>{desc}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: CREAM,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    width: '100%',
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingTop: 40,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Manrope-Bold',
    fontSize: 28,
    color: DARK,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Manrope-Regular',
    fontSize: 15,
    color: '#997E7A',
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 22,
  },
  featuresList: {
    gap: 20,
    marginTop: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 16,
    color: DARK,
    marginBottom: 4,
  },
  featureDesc: {
    fontFamily: 'Manrope-Regular',
    fontSize: 14,
    color: '#997E7A',
    lineHeight: 20,
  },
  button: {
    backgroundColor: BRAND,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
    shadowColor: BRAND,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  buttonText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 16,
    color: WHITE,
  },
  animationOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  overlayAnimation: {
    width: 300,
    height: 300,
  },
});
