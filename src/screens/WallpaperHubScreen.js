import { PremiumImage } from '../components/PremiumImage';
import { HapticButton } from '../components/HapticButton';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, StatusBar, TouchableOpacity,
  FlatList, ActivityIndicator, Dimensions, ScrollView, Alert,
  Animated
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { getDeviceId } from '../utils/deviceId';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useSwipeNavigation } from '../hooks/useSwipeNavigation';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { SvgXml } from 'react-native-svg';
import { underConstructionSvg } from '../svgStrings';
import { getFlowerImage } from '../utils/bouquetData';
import { useBouquetData } from '../hooks/useBouquetData';
import * as MediaLibrary from 'expo-media-library';
import { captureRef } from 'react-native-view-shot';
import Toast from 'react-native-toast-message';
import ManageWallpaper, { TYPE } from 'react-native-manage-wallpaper';

const { width: W, height: H } = Dimensions.get('window');
const SCREEN_WIDTH = W;
const CARD_W = (W - 48) / 2;
const indicatorWidth = (SCREEN_WIDTH - 48) / 2;



export default function WallpaperHubScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { theme: t, isDark } = useTheme();
  const { t: tr } = useLanguage();
  const { getTextSize } = useAccessibility();
  const { currentUser } = useAuth();
  const { fetchCreatedBouquets, fetchReceivedBouquets } = useBouquetData();

  const swipeHandlers = useSwipeNavigation({
    onSwipeRight: () => navigation.goBack(),
  });

  const [tab, setTab] = useState('bouquet'); // 'bouquet' | 'premade'
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef(null);
  const [bouquets, setBouquets] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchBouquets = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { getHistoryCache, getReceivedBouquets: getRecvCache } = require('../utils/storageManager');
      const cachedCreated = await getHistoryCache();
      const cachedReceived = await getRecvCache();
      
      let initialResults = [...(cachedCreated || []), ...(cachedReceived || [])];
      if (initialResults.length > 0) {
        initialResults = initialResults.filter((v, i, a) => a.findIndex(x => x.id === v.id) === i);
        initialResults.sort((a, b) => {
          const ta = a.createdAt?.toMillis?.() ?? a.createdAt?._millis ?? a.createdAt ?? a.openedAt ?? 0;
          const tb = b.createdAt?.toMillis?.() ?? b.createdAt?._millis ?? b.createdAt ?? b.openedAt ?? 0;
          return tb - ta;
        });
        setBouquets(initialResults);
        if (!silent) setLoading(false);
      }

      const [created, received] = await Promise.all([
        fetchCreatedBouquets(30),
        fetchReceivedBouquets()
      ]);
      
      let finalResults = [...created, ...received];
      finalResults = finalResults.filter((v, i, a) => a.findIndex(x => x.id === v.id) === i);
      finalResults.sort((a, b) => {
        const ta = a.createdAt?.toMillis?.() ?? a.createdAt?._millis ?? a.createdAt ?? a.openedAt ?? 0;
        const tb = b.createdAt?.toMillis?.() ?? b.createdAt?._millis ?? b.createdAt ?? b.openedAt ?? 0;
        return tb - ta;
      });
      setBouquets(finalResults);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [fetchCreatedBouquets, fetchReceivedBouquets]);

  useEffect(() => {
    fetchBouquets(false);
  }, [fetchBouquets]);

  const doSetWallpaper = (uri, type) => {
    Toast.show({ type: 'info', text1: 'Setting wallpaper...' });
    ManageWallpaper.setWallpaper(
      { uri },
      (res) => {
        if (res.status === 'success') {
          Toast.show({ type: 'success', text1: 'Wallpaper applied successfully!' });
        } else {
          Toast.show({ type: 'error', text1: 'Failed to set wallpaper.' });
        }
      },
      type
    );
  };

  const handleSetHDWallpaper = (url) => {
    Alert.alert(
      'Set Wallpaper',
      'Where would you like to set this wallpaper?',
      [
        { text: 'Home Screen', onPress: () => doSetWallpaper(url, TYPE.HOME) },
        { text: 'Lock Screen', onPress: () => doSetWallpaper(url, TYPE.LOCK) },
        { text: 'Both', onPress: () => doSetWallpaper(url, TYPE.BOTH) },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const renderBouquetItem = ({ item }) => {
    const flowerIds = (item.selectedFlowers || []).slice(0, 3).map(f => (typeof f === 'string' ? f : f.id)).filter(Boolean);
    return (
      <HapticButton
        style={[styles.bouquetCard, { backgroundColor: t.cardBg, borderColor: t.border }]}
        onPress={() => navigation.navigate('WallpaperSetup', { id: item.slug || item.id })}
        activeOpacity={0.85}
      >
        <View style={styles.flowerRow}>
          {flowerIds.length === 0
            ? <MaterialCommunityIcons name="flower-outline" size={36} color={t.border} />
            : flowerIds.map((fid, i) => (
                <PremiumImage key={i} source={getFlowerImage(fid)} style={[styles.flowerImg, { marginLeft: i > 0 ? -14 : 0, zIndex: 3 - i }]} resizeMode="contain" />
              ))
          }
        </View>
        <Text style={[styles.bouquetName, { color: t.text }]} numberOfLines={1}>
          {item.messageCard?.recipientName || item.recipientName || 'Bouquet'}
        </Text>
        <View style={[styles.wallpaperChip, { backgroundColor: t.brand }]}>
          <Feather name="image" size={11} color="#fff" />
          <Text style={styles.wallpaperChipText}>{tr('home.wallpaper') || 'Wallpaper'}</Text>
        </View>
      </HapticButton>
    );
  };

  const myBouquetsColor = scrollX.interpolate({
    inputRange: [0, SCREEN_WIDTH],
    outputRange: [t.brand, t.textMuted],
    extrapolate: 'clamp',
  });
  const premadeColor = scrollX.interpolate({
    inputRange: [0, SCREEN_WIDTH],
    outputRange: [t.textMuted, t.brand],
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.container, { backgroundColor: t.bg }]} {...swipeHandlers}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={t.bg} />

      {/* Header — matches FeedbackScreen style */}
      <View style={[styles.header, { paddingTop: insets.top, backgroundColor: t.bg, borderBottomColor: t.border }]}>
        <HapticButton onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={t.text} />
        </HapticButton>
        <Text style={[styles.headerTitle, { color: t.text, fontSize: getTextSize(17) }]}>Wallpapers</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* Tab Bar */}
      <View style={[styles.tabBar, { backgroundColor: isDark ? t.surface2 : '#EAE0D5' }]}>
        <Animated.View
          style={[
            styles.tabActive,
            {
              position: 'absolute',
              top: 4,
              bottom: 4,
              left: 0,
              width: indicatorWidth,
              backgroundColor: t.cardBg,
              borderRadius: 8,
              transform: [
                {
                  translateX: scrollX.interpolate({
                    inputRange: [0, SCREEN_WIDTH],
                    outputRange: [4, 4 + indicatorWidth],
                    extrapolate: 'clamp',
                  }),
                },
              ],
            },
          ]}
        />
        <HapticButton
          style={styles.tab}
          onPress={() => {
            setTab('bouquet');
            scrollViewRef.current?.scrollTo({ x: 0, animated: true });
          }}
        >
          <Animated.Text style={[styles.tabText, { color: myBouquetsColor, fontFamily: 'Manrope-SemiBold' }]}>
            {tr('home.myBouquets')}
          </Animated.Text>
        </HapticButton>
        <HapticButton
          style={styles.tab}
          onPress={() => {
            setTab('premade');
            scrollViewRef.current?.scrollTo({ x: SCREEN_WIDTH, animated: true });
          }}
        >
          <Animated.Text style={[styles.tabText, { color: premadeColor, fontFamily: 'Manrope-SemiBold' }]}>
            {tr('home.premade')}
          </Animated.Text>
        </HapticButton>
      </View>

      <Animated.ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { 
            useNativeDriver: false,
            listener: (e) => {
              const x = e.nativeEvent.contentOffset.x;
              const index = Math.round(x / SCREEN_WIDTH);
              const targetTab = index === 0 ? 'bouquet' : 'premade';
              if (tab !== targetTab) {
                setTab(targetTab);
              }
            }
          }
        )}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          setTab(index === 0 ? 'bouquet' : 'premade');
        }}
        contentContainerStyle={{ width: SCREEN_WIDTH * 2 }}
      >
        <View style={{ width: SCREEN_WIDTH }}>
          {loading && bouquets.length === 0 ? (
            <View style={styles.center}><ActivityIndicator color={t.brand} size="large" /></View>
          ) : bouquets.length === 0 ? (
            <View style={styles.center}>
              <MaterialCommunityIcons name="flower-outline" size={56} color={t.border} style={{ marginBottom: 16 }} />
              <Text style={[styles.emptyText, { color: t.text }]}>{tr('home.noBouquetsYet')}</Text>
              <Text style={[styles.emptySubText, { color: t.textMuted }]}>{tr('home.createFirstThenComeBack')}</Text>
              <HapticButton
                style={[styles.createBtn, { backgroundColor: t.brand }]}
                onPress={() => navigation.navigate('CreateBouquet', {})}
              >
                <Text style={styles.createBtnText}>{tr('home.createBouquetTitle')}</Text>
              </HapticButton>
            </View>
          ) : (
            <FlatList
              data={bouquets}
              keyExtractor={item => item.id}
              renderItem={renderBouquetItem}
              numColumns={2}
              columnWrapperStyle={styles.row}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>

        <View style={{ width: SCREEN_WIDTH }}>
          <View style={styles.center}>
            <SvgXml xml={underConstructionSvg} width={220} height={220} style={{ marginBottom: 16 }} />
            <Text style={[styles.emptyText, { color: t.text }]}>Coming Soon</Text>
            <Text style={[styles.emptySubText, { color: t.textMuted }]}>Curated wallpapers are on the way!</Text>
          </View>
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: 'Manrope-SemiBold', fontSize: 17 },
  tabBar: { flexDirection: 'row', marginHorizontal: 20, marginTop: 16, marginBottom: 16, borderRadius: 12, padding: 4 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 8 },
  tabActive: {},
  tabText: { fontSize: 13 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  row: { justifyContent: 'space-between', marginBottom: 14 },
  bouquetCard: { width: CARD_W, borderRadius: 16, borderWidth: 1, padding: 14, alignItems: 'center' },
  flowerRow: { height: 80, width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  flowerImg: { width: 52, height: 52 },
  bouquetName: { fontFamily: 'Manrope-SemiBold', fontSize: 13, marginBottom: 8, textAlign: 'center' },
  wallpaperChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  wallpaperChipText: { color: '#fff', fontSize: 11, fontFamily: 'Manrope-SemiBold' },
  emptyText: { fontFamily: 'Manrope-SemiBold', fontSize: 16, marginBottom: 8 },
  emptySubText: { fontFamily: 'Manrope-Regular', fontSize: 13, textAlign: 'center', lineHeight: 20 },
  createBtn: { marginTop: 20, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 24 },
  createBtnText: { color: '#fff', fontFamily: 'Manrope-Bold', fontSize: 14 },
  sectionLabel: { fontFamily: 'Manrope-Regular', fontSize: 13, marginBottom: 16, textAlign: 'center' },
  premadeGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  premadeCard: { width: CARD_W, height: CARD_W * 1.4, borderRadius: 16, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  premadeEmoji: { fontSize: 40, marginBottom: 10 },
  premadeLabel: { color: '#fff', fontFamily: 'Manrope-Bold', fontSize: 14, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  saveChip: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10, backgroundColor: 'rgba(0,0,0,0.25)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  saveChipText: { color: '#fff', fontSize: 11, fontFamily: 'Manrope-SemiBold' },
});
