import * as React from 'react';
import * as SplashScreen from 'expo-splash-screen';
import {
  View, Animated, StyleSheet, Image, ImageBackground, Dimensions, Platform, AppState,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

SplashScreen.preventAutoHideAsync();

// Preload skeleton immediately - no lazy loading for skeleton
const HomeSkeletonScreen = require('./src/screens/HomeSkeletonScreen').default;

// Heavy shell is lazy — zero parse cost at startup
const AppShell = React.lazy(() => import('./src/AppShell'));

const { width: W, height: H } = Dimensions.get('screen');

// Inlined splash — no extra module to parse, renders in the first JS frame
function InlineSplash({ onFinish }) {
  const [logoOpacity] = React.useState(() => new Animated.Value(0));
  const [logoScale] = React.useState(() => new Animated.Value(0.92));
  const [screenOpacity] = React.useState(() => new Animated.Value(1));
  const [pointerEvents, setPointerEvents] = React.useState('auto');

  React.useEffect(() => {
    // Hide native splash safely when the app is active to avoid SurfaceControl NPE
    let isHidden = false;
    const hideSplashSafely = async () => {
      if (isHidden) return;
      // Only hide if the app is active
      if (AppState.currentState === 'active') {
        try {
          await SplashScreen.hideAsync();
          isHidden = true;
        } catch (e) {}
      }
    };

    hideSplashSafely();
    
    // In case the app was backgrounded during launch, listen for it to become active
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        hideSplashSafely();
      }
    });

    // Fast animation: 150 fade-in + 600 hold + 150 fade-out = 900ms (~1 second total)
    const safety = setTimeout(() => {
      setPointerEvents('none');
      onFinish();
    }, 1000);

    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.spring(logoScale, { toValue: 1, friction: 6, tension: 120, useNativeDriver: true }),
      ]),
      Animated.delay(600), // Hold for 600ms
      Animated.timing(screenOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      clearTimeout(safety);
      setPointerEvents('none');
      onFinish();
    });

    return () => {
      clearTimeout(safety);
      subscription.remove();
    };
  }, [logoOpacity, logoScale, onFinish, screenOpacity]);

  return (
    <Animated.View style={[styles.splashRoot, { opacity: screenOpacity }]} pointerEvents={pointerEvents}>
      <ImageBackground
        source={require('./src/screens/welcome-screen-bg.webp')}
        style={styles.splashBg}
        resizeMode="cover"
      >
        <View style={styles.splashOverlay} />
        <Animated.View style={{ opacity: logoOpacity, transform: [{ scale: logoScale }] }}>
          <Image
            source={require('./src/screens/text-logo.png')}
            style={styles.splashLogo}
            resizeMode="contain"
          />
        </Animated.View>
      </ImageBackground>
    </Animated.View>
  );
}

if (Platform.OS === 'web') {
  const style = document.createElement('style');
  style.textContent = `
    @font-face { font-family: 'Manrope-Regular';     src: local('Manrope'), local('Manrope-Regular');     font-weight: 400; }
    @font-face { font-family: 'Manrope-SemiBold';    src: local('Manrope'), local('Manrope-SemiBold');    font-weight: 600; }
    @font-face { font-family: 'Manrope-Bold';         src: local('Manrope'), local('Manrope-Bold');         font-weight: 700; }
    @font-face { font-family: 'DancingScript-Regular'; src: local('Dancing Script');                       font-weight: 400; }
    @font-face { font-family: 'Merriweather-Regular';  src: local('Merriweather');                         font-weight: 400; }
    @font-face { font-family: 'Quicksand-Regular';     src: local('Quicksand');                            font-weight: 400; }
    @font-face { font-family: 'PlayfairDisplay-Regular'; src: local('Playfair Display');                   font-weight: 400; }
    @font-face { font-family: 'Poppins-Regular';       src: local('Poppins');                              font-weight: 400; }

    [data-testid="custom-alert-modal"],
    div:has(> [data-testid="custom-alert-modal"]),
    div:has([data-testid="custom-alert-modal"]) {
      z-index: 99999999 !important;
    }
  `;
  document.head.appendChild(style);
}

export default function App() {
  const [splashDone, setSplashDone] = React.useState(false);
  const [shellReady, setShellReady] = React.useState(false);
  const [shellFadeAnim] = React.useState(() => new Animated.Value(0));
  const [skeletonFadeAnim] = React.useState(() => new Animated.Value(0));
  const [shellVisible, setShellVisible] = React.useState(false);
  const [splashStartTime] = React.useState(() => Date.now());

  const handleSplashFinish = React.useCallback(() => {
    setSplashDone(true);
    // Only show skeleton if shell isn't ready yet
    if (!shellReady) {
      skeletonFadeAnim.setValue(1);
    }
  }, [shellReady, skeletonFadeAnim]);
  
  const handleShellReady = React.useCallback(() => {
    setShellReady(true);
  }, []);

  React.useEffect(() => {
    if (splashDone && shellReady) {
      const elapsed = Date.now() - splashStartTime;
      const minDisplayTime = 1200; // Minimum 1.2s total display time
      
      // If we're still under minimum time, wait a bit before transitioning
      const remainingTime = Math.max(0, minDisplayTime - elapsed);
      
      setTimeout(() => {
        // Fade out skeleton and fade in shell simultaneously
        Animated.parallel([
          Animated.timing(skeletonFadeAnim, {
            toValue: 0, duration: 200, useNativeDriver: true,
          }),
          Animated.timing(shellFadeAnim, {
            toValue: 1, duration: 200, useNativeDriver: true,
          }),
        ]).start(() => setShellVisible(true));
      }, remainingTime);
    }
  }, [splashDone, shellReady, shellFadeAnim, skeletonFadeAnim, splashStartTime]);

  // Show skeleton only if splash is done but shell isn't visible yet
  const showSkeleton = splashDone && !shellVisible;

  return (
    <View style={styles.root}>
      {/* Shell always mounted, opacity controlled */}
      <Animated.View style={{ flex: 1, opacity: shellFadeAnim }}>
        <React.Suspense fallback={null}>
          <AppShell onReady={handleShellReady} />
        </React.Suspense>
      </Animated.View>

      {/* Skeleton covers the shell until it's fully faded in */}
      {showSkeleton && (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: skeletonFadeAnim }]}>
          <SafeAreaProvider>
            <HomeSkeletonScreen />
          </SafeAreaProvider>
        </Animated.View>
      )}

      {/* Inline splash on top of everything */}
      {!splashDone && <InlineSplash onFinish={handleSplashFinish} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FAF7F2',
  },
  splashRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
  splashBg: {
    flex: 1,
    width: W,
    height: H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(250, 247, 242, 0.30)',
  },
  splashLogo: {
    width: W * 0.9,
    height: H * 0.3,
    maxWidth: 500,
    maxHeight: 300,
  },
});
