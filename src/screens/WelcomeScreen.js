import { PremiumImage } from '../components/PremiumImage';
import { HapticButton } from '../components/HapticButton';
import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ImageBackground, Platform, ActivityIndicator } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

function GoogleG({ size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </Svg>
  );
}

export default function WelcomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { t, locale } = useLanguage();
  const { theme, isDark, toggleTheme } = useTheme();
  const { signInWithGoogle, googleLoading, currentUser } = useAuth();

  useEffect(() => {
    if (currentUser) {
      navigation.replace('Home');
    }
  }, [currentUser, navigation]);

  const handleGoogle = async () => {
    try {
      await signInWithGoogle();
    } catch (e) {
      console.log('Google login error:', e);
    }
  };

  const getLanguageLabel = (code) => {
    return (code || 'EN').toUpperCase();
  };

  return (
    <ImageBackground
      source={require('./welcome-screen-bg.webp')}
      style={styles.bg}
      resizeMode="cover"
    >
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom, backgroundColor: isDark ? 'rgba(26, 22, 20, 0.7)' : 'rgba(250, 247, 242, 0.45)' }]}>
        <StatusBar style={isDark ? "light" : "dark"} />

        {/* Top Controls Container */}
        <View style={{ position: 'absolute', top: insets.top + 20, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', zIndex: 10 }}>
          {/* Theme Toggle Pill */}
          <HapticButton
            style={[styles.themeToggle, { backgroundColor: isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.85)' }]}
            onPress={toggleTheme}
            activeOpacity={0.85}
          >
            {/* Sun side */}
            <View style={[styles.activeIconHighlight, !isDark && { backgroundColor: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(122, 92, 88, 0.15)' }]}>
              <MaterialCommunityIcons name="weather-sunny" size={18} color={!isDark ? theme.text : theme.textMuted ?? '#997E7A'} />
            </View>
            {/* Moon side */}
            <View style={[styles.activeIconHighlight, isDark && { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
              <MaterialCommunityIcons name="weather-night" size={18} color={isDark ? theme.text : theme.textMuted ?? '#997E7A'} />
            </View>
          </HapticButton>

          {/* Language Selector Button */}
          <HapticButton 
            style={[styles.languageBtn, { backgroundColor: isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.85)' }]}
            onPress={() => navigation.navigate('Language')}
            activeOpacity={0.8}
          >
            <Text style={[styles.languageText, { color: theme.text }]}>{getLanguageLabel(locale)}</Text>
            <MaterialCommunityIcons name="chevron-down" size={18} color={theme.text} style={{ opacity: 0.6 }} />
          </HapticButton>
        </View>

        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <PremiumImage 
              source={require('./text-logo.png')} 
              style={[styles.logo, isDark && { tintColor: theme.text }]} 
              resizeMode="contain" 
            />
          </View>

          <Text style={[styles.subtitle, { color: theme.text }]}>
            {t('welcome.subtitle')}
          </Text>

          <View style={styles.featuresList}>
            <View style={styles.featureRow}>
              <Feather name="check" size={18} color={theme.text} />
              <Text style={[styles.featureText, { color: theme.text }]}>Save & sync your bouquets</Text>
            </View>
            <View style={styles.featureRow}>
              <Feather name="check" size={18} color={theme.text} />
              <Text style={[styles.featureText, { color: theme.text }]}>Get notified when viewed</Text>
            </View>
            <View style={styles.featureRow}>
              <Feather name="gift" size={18} color={theme.text} />
              <Text style={[styles.featureText, { color: theme.text }]}>Enjoy DigiBouquet Pro for free!</Text>
            </View>
          </View>

          <HapticButton
            style={styles.googleBtn}
            onPress={handleGoogle}
            disabled={googleLoading}
            activeOpacity={0.85}
          >
            {googleLoading ? <ActivityIndicator color="#000" /> : (
              <View style={styles.googleInner}>
                <GoogleG size={20} />
                <Text style={styles.googleText}>Continue with Google</Text>
              </View>
            )}
          </HapticButton>

          <HapticButton
            style={styles.guestBtn}
            onPress={() => navigation.replace('MainTabs')}
            activeOpacity={0.8}
            disabled={googleLoading}
          >
            <Text style={[styles.guestText, { color: theme.text }]}>Continue as guest</Text>
          </HapticButton>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    ...(Platform.OS === 'web' && {
      maxWidth: 600,
      alignSelf: 'center',
      width: '100%',
    }),
  },
  logoContainer: {
    marginBottom: 40,
    alignItems: 'center',
  },
  logo: {
    width: 400,
    height: 180,
  },
  subtitle: {
    fontFamily: 'Manrope-Regular',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 28,
    opacity: 0.8,
  },
  featuresList: {
    marginBottom: 40,
    alignSelf: 'stretch',
    paddingHorizontal: 10,
    gap: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontFamily: 'Manrope-Medium',
    fontSize: 16,
  },
  googleBtn: { 
    backgroundColor: '#fff', 
    borderRadius: 28, 
    paddingVertical: 14, 
    paddingHorizontal: 24,
    alignItems: 'center', 
    alignSelf: 'stretch',
    marginBottom: 16,
    shadowColor: '#000', 
    shadowOpacity: 0.1, 
    shadowRadius: 8, 
    elevation: 3 
  },
  googleInner: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    gap: 12 
  },
  googleText: { 
    fontFamily: 'Manrope-Bold', 
    fontSize: 16, 
    color: '#000' 
  },
  guestBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  guestText: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 14,
    opacity: 0.7,
    textDecorationLine: 'underline',
  },
  button: {
    paddingVertical: 13,
    paddingHorizontal: 36,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 15,
    letterSpacing: 0.3,
  },
  languageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 4,
  },
  languageText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 14,
  },
  themeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 5,
    gap: 2,
  },
  activeIconHighlight: {
    borderRadius: 14,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
});
