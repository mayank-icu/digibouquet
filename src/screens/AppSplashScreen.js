import { PremiumImage } from '../components/PremiumImage';
import { ExpoImageBackground as ImageBackground } from '../components/ExpoImageBackground';
import React, { useEffect, useState } from 'react';
import { preloadAllFlowerImages } from '../utils/bouquetData';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
  AppState} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';

const { width: W, height: H } = Dimensions.get('screen');

export default function AppSplashScreen({ onFinish }) {
  const [logoOpacity] = useState(() => new Animated.Value(0));
  const [logoScale] = useState(() => new Animated.Value(0.88));
  const [screenOpacity] = useState(() => new Animated.Value(1));
  const [pointerEvents, setPointerEvents] = useState('auto');

  // Called once the background image is laid out — we know it's painted,
  // so it's safe to hide the native splash with no visible gap.
  const handleLayout = () => {
    if (AppState.currentState === 'active') {
      SplashScreen.hideAsync().catch(() => {});
    }
  };

  useEffect(() => {
    preloadAllFlowerImages();

    const safety = setTimeout(() => {
      setPointerEvents('none');
      onFinish();
    }, 2000);

    Animated.sequence([
      // Fade + scale logo in
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }),
      ]),
      // Hold — total visible time ~1.5s
      Animated.delay(700),
      // Fade out
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      clearTimeout(safety);
      setPointerEvents('none');
      onFinish();
    });

    return () => clearTimeout(safety);
  }, [logoOpacity, logoScale, onFinish, screenOpacity]);

  return (
    <Animated.View
      style={[styles.root, { opacity: screenOpacity }]}
      pointerEvents={pointerEvents}
    >
      <StatusBar style="light" />
      <ImageBackground
        source={require('./welcome-screen-bg.webp')}
        style={styles.bg}
        resizeMode="cover"
        onLayout={handleLayout}
      >
        <View style={styles.overlay} />
        <Animated.View
          style={[
            styles.logoWrap,
            { opacity: logoOpacity, transform: [{ scale: logoScale }] },
          ]}
        >
          <PremiumImage
            source={require('./text-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>
      </ImageBackground>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
  bg: {
    flex: 1,
    width: W,
    height: H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(250, 247, 242, 0.30)',
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 340,
    height: 155,
  },
});
