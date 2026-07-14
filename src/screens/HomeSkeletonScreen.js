import { HapticButton } from '../components/HapticButton';
import React, { useEffect, useState } from 'react';
import { View, Animated, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../contexts/ThemeContext';

const BG = '#FAF7F2';
const SKEL = '#EAE0D5';
const WHITE = '#ffffff';

// Single shimmer bar with an elegant opacity pulse
export function SkeletonBar({ w, h, radius = 8, style }) {
  const { theme: t } = useTheme();
  const [anim] = useState(() => new Animated.Value(0.3));

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [anim]);

  return (
    <Animated.View
      style={[{ width: w, height: h, borderRadius: radius, backgroundColor: t.border, opacity: anim }, style]}
    />
  );
}

export default function HomeSkeletonScreen({ hasScheduledEmails = false, navigation }) {
  const insets = useSafeAreaInsets();
  const { theme: t } = useTheme();
  const navHeight = 64 + insets.bottom;
  
  // Progressive loading animation - header and nav appear first, then content
  const [headerOpacity] = useState(() => new Animated.Value(0));
  const [navOpacity] = useState(() => new Animated.Value(0));
  const [contentOpacity] = useState(() => new Animated.Value(0));
  const [navBarWidth, setNavBarWidth] = useState(0);

  useEffect(() => {
    // Ultra-fast stagger: header → nav → content (25ms delays)
    Animated.sequence([
      // Header appears instantly
      Animated.timing(headerOpacity, { 
        toValue: 1, 
        duration: 80, 
        useNativeDriver: true 
      }),
      // Nav appears 25ms after header
      Animated.timing(navOpacity, { 
        toValue: 1, 
        duration: 80, 
        delay: 25,
        useNativeDriver: true 
      }),
      // Content appears 25ms after nav
      Animated.timing(contentOpacity, { 
        toValue: 1, 
        duration: 100, 
        delay: 25,
        useNativeDriver: true 
      }),
    ]).start();
  }, [headerOpacity, navOpacity, contentOpacity]);

  return (
    <View style={[styles.root, { backgroundColor: t.bg, paddingTop: insets.top, paddingBottom: navHeight }]}>
      {/* Header bar - loads first */}
      <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
        <SkeletonBar w={24} h={24} radius={12} />
        <SkeletonBar w={120} h={28} radius={6} />
        <SkeletonBar w={24} h={24} radius={12} />
      </Animated.View>

      {/* Content - loads last */}
      <Animated.View style={[styles.content, { opacity: contentOpacity }]}>
        {/* Golden Bouquet Banner Skeleton */}
        <SkeletonBar w="100%" h={110} radius={20} style={{ marginBottom: 16 }} />

        {/* ActionCardsRow Skeleton (2 columns) */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
          <View style={{ flex: 1, backgroundColor: t.cardBg, borderRadius: 20, padding: 16, minHeight: 120 }}>
            <SkeletonBar w={44} h={44} radius={22} style={{ marginBottom: 14 }} />
            <SkeletonBar w={100} h={16} radius={6} style={{ marginBottom: 8 }} />
            <SkeletonBar w="90%" h={12} radius={6} />
            <SkeletonBar w="60%" h={12} radius={6} style={{ marginTop: 4 }} />
          </View>
          <View style={{ flex: 1, backgroundColor: t.cardBg, borderRadius: 20, padding: 16, minHeight: 120 }}>
            <SkeletonBar w={44} h={44} radius={22} style={{ marginBottom: 14 }} />
            <SkeletonBar w={100} h={16} radius={6} style={{ marginBottom: 8 }} />
            <SkeletonBar w="90%" h={12} radius={6} />
            <SkeletonBar w="60%" h={12} radius={6} style={{ marginTop: 4 }} />
          </View>
        </View>

        {/* DashboardActions Skeleton (Three col row) */}
        <View style={styles.threeCol}>
          <SkeletonBar w="31%" h={90} radius={16} />
          <SkeletonBar w="31%" h={90} radius={16} />
          <SkeletonBar w="31%" h={90} radius={16} />
        </View>

        {/* Features Card Skeleton (Schedule only) */}
        {hasScheduledEmails && (
          <View style={{ backgroundColor: t.cardBg, borderRadius: 14, padding: 14, marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <SkeletonBar w={40} h={40} radius={12} style={{ marginRight: 16 }} />
              <View style={{ flex: 1 }}>
                <SkeletonBar w={130} h={14} radius={6} style={{ marginBottom: 8 }} />
                <SkeletonBar w={180} h={10} radius={6} />
              </View>
            </View>
          </View>
        )}

        {/* Open Link card */}
        <SkeletonBar w="100%" h={64} radius={16} style={{ marginBottom: 24 }} />

        {/* Section header */}
        <View style={styles.sectionHeader}>
          <SkeletonBar w={120} h={14} radius={6} />
          <SkeletonBar w={50} h={14} radius={6} />
        </View>

        {/* Bouquet rows */}
        {[0, 1].map((i) => (
          <View key={i} style={[styles.bouquetRow, { backgroundColor: t.cardBg }]}>
            <SkeletonBar w={64} h={52} radius={12} />
            <View style={styles.bouquetText}>
              <SkeletonBar w={120} h={14} radius={6} style={{ marginBottom: 8 }} />
              <SkeletonBar w={80} h={10} radius={6} />
            </View>
          </View>
        ))}
      </Animated.View>


    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 60,
  },
  content: { paddingHorizontal: 20, paddingTop: 32, flex: 1 },
  threeCol: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  bouquetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: WHITE,
    borderRadius: 14,
    padding: 12,
  },
  bouquetText: { flex: 1, marginLeft: 14 },
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
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: -8,
    borderWidth: 3.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
});
