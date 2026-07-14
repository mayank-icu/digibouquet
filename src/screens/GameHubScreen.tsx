import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
  StatusBar,
  Animated,
  InteractionManager,
  PanResponder,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from '../utils/haptics';
import { useTheme } from '../contexts/ThemeContext';
import { soundManager } from '../utils/soundManager';

const { width: SCREEN_W } = Dimensions.get('window');

export default function GameHubScreen() {
  const navigation = useNavigation() as any;
  const { theme: t, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const swipeRef = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) => {
        const { dx, dy } = gs;
        return Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.5;
      },
      onPanResponderRelease: (_, gs) => {
        const { dx, vx } = gs;
        if (Math.abs(dx) < 40 && Math.abs(vx) < 0.3) return;
        if (dx > 0) {
          navigation.navigate('Home');
        } else {
          navigation.navigate('History');
        }
      },
    })
  ).current;

  const [tabIndicatorAnim] = useState(new Animated.Value(1));
  const [navBarWidth, setNavBarWidth] = useState(0);

  useEffect(() => {
    soundManager.preloadSounds();
  }, []);

  const animateTabTo = useCallback((index: number) => {
    Animated.spring(tabIndicatorAnim, {
      toValue: index,
      useNativeDriver: true,
      tension: 68,
      friction: 11,
    }).start();
  }, [tabIndicatorAnim]);


  const handlePlayGame = (screenName: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate(screenName, { fade: true });
  };

  return (
    <View style={[styles.container, { backgroundColor: t.bg }]} {...swipeRef.panHandlers}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={t.bg} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + 24, paddingHorizontal: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Title / Description */}
        <View style={{ marginBottom: 28 }}>
          <Text style={[styles.title, { color: t.text }]}>Blossom Garden Games</Text>
          <Text style={[styles.subtitle, { color: t.textMuted }]}>
            Relax and play our cozy flower mini-games to unlock new bouquet designs and ideas.
          </Text>
        </View>

        {/* Games list */}
        <View style={{ gap: 20 }}>
          {/* Game 1: Blossom Sort */}
          <TouchableOpacity
            style={[styles.gameCard, { backgroundColor: t.cardBg, borderColor: t.border }]}
            activeOpacity={0.85}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              navigation.navigate('GameLevelPath', { gameId: 'sort', title: 'Blossom Sort' });
            }}
          >
            <View style={[styles.iconContainer, { backgroundColor: t.brand + '15' }]}>
              <MaterialCommunityIcons name="flower-tulip-outline" size={32} color={t.brand} />
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={[styles.gameTitle, { color: t.text }]}>Blossom Sort Puzzle</Text>
              <Text style={[styles.gameDesc, { color: t.textMuted }]}>
                Sort matching flower stems into identical slots. Tap to select and move.
              </Text>
              <View style={styles.playRow}>
                <Text style={[styles.playText, { color: t.brand }]}>Play Now</Text>
                <Feather name="arrow-right" size={14} color={t.brand} style={{ marginLeft: 4 }} />
              </View>
            </View>
          </TouchableOpacity>

          {/* Game 2: Blossom Blast Match-3 */}
          <TouchableOpacity
            style={[styles.gameCard, { backgroundColor: t.cardBg, borderColor: t.border }]}
            activeOpacity={0.85}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              navigation.navigate('GameLevelPath', { gameId: 'match3', title: 'Blossom Match' });
            }}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#FF8A8A15' }]}>
              <MaterialCommunityIcons name="grid" size={32} color="#FF8A8A" />
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={[styles.gameTitle, { color: t.text }]}>Blossom Match</Text>
              <Text style={[styles.gameDesc, { color: t.textMuted }]}>
                Swap adjacent flowers to match 3 or more in a row and trigger cascading combos.
              </Text>
              <View style={styles.playRow}>
                <Text style={[styles.playText, { color: t.brand }]}>Play Now</Text>
                <Feather name="arrow-right" size={14} color={t.brand} style={{ marginLeft: 4 }} />
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>


    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontFamily: 'Manrope-Bold',
    fontSize: 24,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Manrope-Regular',
    fontSize: 13.5,
    lineHeight: 19,
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 28,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontFamily: 'Manrope-ExtraBold',
    fontSize: 18,
    marginBottom: 2,
  },
  statLabel: {
    fontFamily: 'Manrope-Regular',
    fontSize: 11,
  },
  statDivider: {
    width: 1,
    height: 30,
  },
  gameCard: {
    flexDirection: 'row',
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 16,
    marginBottom: 4,
  },
  gameDesc: {
    fontFamily: 'Manrope-Regular',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 8,
  },
  playRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 12,
  },
  bottomNav: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: 66,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 12,
    zIndex: 1000,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  activeIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabWrapper: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center', 
    justifyContent: 'center',
    position: 'absolute',
    top: -12,
    borderWidth: 3.5,
  },
});
