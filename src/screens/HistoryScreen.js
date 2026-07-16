import { PremiumImage } from '../components/PremiumImage';
import { HapticButton } from '../components/HapticButton';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, StatusBar, TouchableOpacity,
  Platform, ActivityIndicator,
  Animated, Dimensions, Share, Modal, PanResponder, InteractionManager} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons, Feather } from '@expo/vector-icons';
import { collection, query, where, orderBy, limit, getDocs, doc, deleteDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import Toast from 'react-native-toast-message';
import * as Haptics from 'expo-haptics';
import ShareModal from '../components/ShareModal';
import { db } from '../firebase';
import { SvgXml } from 'react-native-svg';
import { historySvg } from '../svgStrings';
import { getDeviceId } from '../utils/deviceId';
import { useAuth } from '../contexts/AuthContext';
import { useCustomAlert } from '../contexts/AlertContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { useSwipeNavigation } from '../hooks/useSwipeNavigation';
import { useBouquetData } from '../hooks/useBouquetData';
import SharedBottomSheet from '../components/SharedBottomSheet';
import {
  getHistoryCache,
  saveHistoryCache,
  deleteBouquet as deleteStoredBouquet,
  removeFromReceivedBouquets,
  syncWidgetDataWithBouquet
} from '../utils/storageManager';

import { getFlowerImage } from '../utils/bouquetData';

const BRAND_DARK = '#7A5C58';
const PINK_LIGHT = '#FAF7F2';
const PINK_MID   = '#EAE0D5';
const DARK       = '#5C4844';
const MUTED      = '#997E7A';
const WHITE      = '#ffffff';

const HISTORY_CACHE_KEY = 'history_bouquets_cache';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const indicatorWidth = (SCREEN_WIDTH - 56) / 2;

function getFlowerImg(id) { return getFlowerImage(id); }
function getFlowerIds(b) { return (b.selectedFlowers || []).slice(0, 3).map(f => (typeof f === 'string' ? f : f.id)).filter(Boolean); }
function formatDate(ts) {
  if (!ts) return '';
  const ms = ts.toMillis ? ts.toMillis() : ts;
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Action Sheet ──────────────────────────────────────────────────────────────
function ActionSheet({ visible, item, isSent, onClose, onView, onShare, onCopyLink, onEdit, onDelete }) {
  const insets = useSafeAreaInsets();
  const { theme: t } = useTheme();
  const { t: tr } = useLanguage();

  if (!item) return null;

  const displayName = isSent
    ? (item.messageCard?.recipientName || item.recipientName || 'Friend')
    : (item.senderName || item.messageCard?.senderName || 'Someone Special');
  const dateStr = formatDate(item.createdAt || item.openedAt);

  return (
    <SharedBottomSheet visible={visible} onClose={onClose} style={{ backgroundColor: t.cardBg, paddingBottom: insets.bottom + 8 }}>
      <View style={[styles.sheetHeader, { borderBottomColor: t.border }]}>
        <View style={[styles.sheetHandle, { backgroundColor: t.border }]} />
        <Text style={[styles.sheetRecipient, { color: t.text }]} numberOfLines={1}>
          {isSent ? `${tr('common.to')} ${displayName}` : `${tr('common.from')} ${displayName}`}
        </Text>
        {dateStr ? <Text style={[styles.sheetDate, { color: t.textMuted }]}>{dateStr}</Text> : null}
      </View>

      <View style={styles.sheetOptions}>
        <HapticButton style={styles.sheetRow} onPress={onView} activeOpacity={0.7}>
          <View style={[styles.sheetIconWrap, { backgroundColor: t.isDarkMode ? '#332E2C' : '#FAF7F2' }]}><Feather name="eye" size={20} color={t.brand} /></View>
          <Text style={[styles.sheetRowLabel, { color: t.text }]}>{tr('history.view')}</Text>
        </HapticButton>

        <HapticButton style={styles.sheetRow} onPress={onShare} activeOpacity={0.7}>
          <View style={[styles.sheetIconWrap, { backgroundColor: t.isDarkMode ? '#332E2C' : '#FAF7F2' }]}><Feather name="share-2" size={20} color={t.brand} /></View>
          <Text style={[styles.sheetRowLabel, { color: t.text }]}>{tr('history.share')}</Text>
        </HapticButton>

        {isSent && (
          <>
            <HapticButton style={styles.sheetRow} onPress={onCopyLink} activeOpacity={0.7}>
              <View style={[styles.sheetIconWrap, { backgroundColor: t.isDarkMode ? '#332E2C' : '#FAF7F2' }]}><Feather name="link" size={20} color={t.brand} /></View>
              <Text style={[styles.sheetRowLabel, { color: t.text }]}>{tr('history.copyLink')}</Text>
            </HapticButton>

            <HapticButton style={styles.sheetRow} onPress={onEdit} activeOpacity={0.7}>
              <View style={[styles.sheetIconWrap, { backgroundColor: t.isDarkMode ? '#332E2C' : '#FAF7F2' }]}><Feather name="edit-2" size={20} color={t.brand} /></View>
              <Text style={[styles.sheetRowLabel, { color: t.text }]}>{tr('history.edit')}</Text>
            </HapticButton>

            <HapticButton style={styles.sheetRow} onPress={onDelete} activeOpacity={0.7}>
              <View style={[styles.sheetIconWrap, styles.sheetIconDelete, { backgroundColor: t.isDarkMode ? '#3D2220' : '#FFF0F0' }]}><Feather name="trash-2" size={20} color="#E05252" /></View>
              <Text style={[styles.sheetRowLabel, styles.sheetRowDelete]}>{tr('history.delete')}</Text>
            </HapticButton>
          </>
        )}

        {!isSent && (
          <>
            <HapticButton style={styles.sheetRow} onPress={onDelete} activeOpacity={0.7}>
              <View style={[styles.sheetIconWrap, styles.sheetIconDelete, { backgroundColor: t.isDarkMode ? '#3D2220' : '#FFF0F0' }]}><Feather name="x-circle" size={20} color="#E05252" /></View>
              <Text style={[styles.sheetRowLabel, styles.sheetRowDelete]}>{tr('history.removeReceived')}</Text>
            </HapticButton>
          </>
        )}
      </View>
    </SharedBottomSheet>
  );
}

// ── Bouquet Card ──────────────────────────────────────────────────────────────
function BouquetCard({ item, onPress, onLongPress }) {
  const { theme: t } = useTheme();
  const { t: tr } = useLanguage();
  const flowerIds = getFlowerIds(item);
  const recipient = item.messageCard?.recipientName || item.recipientName || tr('history.friend');

  return (
    <HapticButton
      style={[styles.card, { backgroundColor: t.cardBg }]}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
      activeOpacity={0.85}
    >
      <View style={{ position: 'relative' }}>
        <View style={[styles.cardFlowerCard, { backgroundColor: t.bg, borderColor: t.border }]}>
          {flowerIds.length === 0
            ? <MaterialCommunityIcons name="flower-outline" size={26} color={t.border} />
            : flowerIds.map((fid, i) => (
                <PremiumImage key={i} source={getFlowerImg(fid)} style={[styles.cardFlowerImg, { zIndex: 3 - i, marginLeft: i > 0 ? -8 : 0 }]} resizeMode="contain" />
              ))
          }
        </View>
        {item.isGoldenEdition && (
          <View style={styles.limitedBadge}>
            <Text style={styles.limitedBadgeText}>✦ LIMITED</Text>
          </View>
        )}
      </View>
      <View style={styles.cardInfo}>
        <Text style={[styles.cardRecipient, { color: t.text }]} numberOfLines={1}>{tr('common.to')} {recipient}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
          <Text style={[styles.cardDate, { color: t.textMuted, marginRight: 8, marginTop: 0 }]}>{formatDate(item.createdAt)}</Text>
          {item.isRandomAct && (
            <View style={{ backgroundColor: '#f3e5f5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
              <Text style={{ fontSize: 10, color: '#8e24aa', fontWeight: 'bold' }}>ANONYMOUS ✨</Text>
            </View>
          )}
        </View>
        <Text style={[styles.cardLink, { color: t.brand }]} numberOfLines={1}>
          egreet.in/bouquet/{item.slug || item.id?.slice(0, 8)}…
        </Text>
      </View>
      <Feather name="chevron-right" size={18} color={t.textMuted} />
    </HapticButton>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function HistoryScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { theme: t, isDark } = useTheme();
  const mode = route?.params?.mode; // e.g., 'wallpaper'

  // Dynamic edge swipe & tab scroll handlers




  const { t: tr } = useLanguage();
  const { getTextSize, swipeNavigation } = useAccessibility();
  const navHeight = 64 + insets.bottom;
  const { currentUser } = useAuth();
  const { fetchCreatedBouquets, fetchReceivedBouquets } = useBouquetData();
  const [activeTab, setActiveTab] = useState('sent');
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef(null);
  const [bouquets, setBouquets] = useState([]);
  const [received, setReceived] = useState([]);
  const [loading, setLoading] = useState(true);
  const showAlert = useCustomAlert();
  const [sheetItem, setSheetItem] = useState(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetIsSent, setSheetIsSent] = useState(true);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [shareRecipientName, setShareRecipientName] = useState('');
  const [shareUrl, setShareUrl] = useState('');

  // Sliding tab indicator
  const [tabIndicatorAnim] = useState(() => new Animated.Value(2));
  const [navBarWidth, setNavBarWidth] = useState(0);
  const animateTabTo = useCallback((index) => {
    Animated.spring(tabIndicatorAnim, {
      toValue: index,
      useNativeDriver: true,
      tension: 68,
      friction: 11,
    }).start();
  }, [tabIndicatorAnim]);

  // Refs to avoid closures capturing stale state values in PanResponder
  const activeTabRef = useRef('sent');
  const sheetVisibleRef = useRef(false);
  const shareModalVisibleRef = useRef(false);

  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);
  useEffect(() => { sheetVisibleRef.current = sheetVisible; }, [sheetVisible]);
  useEffect(() => { shareModalVisibleRef.current = shareModalVisible; }, [shareModalVisible]);

  const historySwipeHandlers = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, gs) => {
        if (!swipeNavigation) return false;
        if (sheetVisibleRef.current || shareModalVisibleRef.current) return false;
        const { dx, dy } = gs;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        return absDx > 10 && absDx > absDy * 2;
      },
      onMoveShouldSetPanResponderCapture: (_, gs) => {
        if (!swipeNavigation) return false;
        if (sheetVisibleRef.current || shareModalVisibleRef.current) return false;
        const { dx, dy } = gs;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        return absDx > 10 && absDx > absDy * 2;
      },
      onPanResponderRelease: (evt, gs) => {
        if (!swipeNavigation) return;
        const { dx, vx } = gs;
        const absDx = Math.abs(dx);
        const absVx = Math.abs(vx);

        if (absDx < 40 || absVx < 0.2) return; // too short or too slow

        // ── ANY horizontal swipe navigates to another screen ──────────────────
        if (dx > 0) {
          navigation.navigate('GameHub', { fade: true }); // right swipe = go left (Games)
        } else {
          navigation.navigate('GameHub', { fade: true });        // left swipe = go right (Games)
        }
      },
      onPanResponderTerminate: () => {},
      onPanResponderTerminationRequest: () => true,
    })
  ).current;

  const fetchBouquets = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const results = await fetchCreatedBouquets(30);
      setBouquets(results);

      // Synchronize individual bouquet cache and widgets
      for (const item of results) {
        try {
          await AsyncStorage.setItem(`bouquet_${item.id}`, JSON.stringify(item));
          await syncWidgetDataWithBouquet(item.id, item);
        } catch (syncErr) {
          console.error(`Sync error in history for bouquet ${item.id}:`, syncErr);
        }
      }

      // Persist to cache (serialize timestamps)
      const serializable = results.map(item => ({
        ...item,
        createdAt: item.createdAt?.toMillis ? { _millis: item.createdAt.toMillis() } : item.createdAt,
      }));
      await saveHistoryCache(serializable);

      // Load received bouquets
      const receivedList = await fetchReceivedBouquets();
      setReceived(receivedList);
    } catch (e) {
      console.error('History fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [fetchCreatedBouquets, fetchReceivedBouquets]);

  useEffect(() => {
    const initData = async () => {
      const cached = await getHistoryCache();
      if (Array.isArray(cached) && cached.length > 0) {
        setBouquets(cached);
        setLoading(false);
        // Load fresh new data in the background
        fetchBouquets(true);
      } else {
        fetchBouquets(false);
      }
    };
    initData();
  }, [fetchBouquets]);
  useEffect(() => {
    const u = navigation.addListener('focus', () => {
      fetchBouquets(true);
    });
    return u;
  }, [navigation, fetchBouquets]);

  const openSheet = (item, isSent) => { 
    if (mode === 'wallpaper') {
      navigation.navigate('BouquetView', { id: item.slug || item.id, openWallpaperModal: true });
      return;
    }
    setSheetItem(item); 
    setSheetIsSent(isSent); 
    setSheetVisible(true); 
  };
  const closeSheet = () => setSheetVisible(false);

  const handleView = () => { closeSheet(); navigation.navigate('BouquetView', { id: sheetItem.slug || sheetItem.id }); };

  const handleShare = () => {
    closeSheet();
    const url = `https://egreet.in/bouquet/${sheetItem.slug || sheetItem.id}`;
    const recipientName = sheetItem.messageCard?.recipientName || sheetItem.recipientName || 'Friend';
    setShareUrl(url);
    setShareRecipientName(recipientName);
    setTimeout(() => setShareModalVisible(true), 350);
  };

  const handleCopyLink = async () => {
    closeSheet();
    const url = `https://egreet.in/bouquet/${sheetItem.slug || sheetItem.id}`;
    await Clipboard.setStringAsync(url);
    Toast.show({
      type: 'success',
      text1: tr('common.copied'),
      text2: tr('common.copiedDesc'),
      visibilityTime: 2000,
    });
  };

  const handleEdit = () => { closeSheet(); navigation.navigate('CreateBouquet', { editId: sheetItem.slug || sheetItem.id }); };

  const handleDelete = () => {
    closeSheet();
    const isSent = sheetIsSent;
    const item = sheetItem;
    if (!item) return;

    setTimeout(() => {
      showAlert(
        isSent ? tr('history.deleteConfirm') : tr('history.removeConfirm'),
        isSent ? tr('history.deleteConfirmDesc') : tr('history.removeConfirmDesc'),
        [
          { text: tr('common.cancel'), style: 'cancel' },
          { 
            text: isSent ? tr('history.delete') : tr('history.removeReceived'), 
            style: 'destructive', 
            onPress: async () => {
              if (!isSent) {
                try {
                  await removeFromReceivedBouquets(item.id);
                  fetchBouquets();
                  Toast.show({ type: 'success', text1: tr('common.deleted') });
                } catch {
                  Toast.show({ type: 'error', text1: tr('common.error') });
                }
              } else {
                try {
                  await deleteDoc(doc(db, 'bouquet-cards', item.id));
                  await deleteStoredBouquet(item.id);
                  fetchBouquets();
                  Toast.show({ type: 'success', text1: tr('common.deleted') });
                } catch {
                  Toast.show({ type: 'error', text1: tr('common.error'), text2: tr('register.errorGeneral') });
                }
              }
            } 
          }
        ]
      );
    }, 450);
  };

  const sentColor = scrollX.interpolate({
    inputRange: [0, SCREEN_WIDTH],
    outputRange: [t.brand, t.textMuted],
    extrapolate: 'clamp',
  });
  const receivedColor = scrollX.interpolate({
    inputRange: [0, SCREEN_WIDTH],
    outputRange: [t.textMuted, t.brand],
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: t.bg }, Platform.OS === 'web' && styles.containerWeb]} {...historySwipeHandlers.panHandlers}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={t.bg} />

      {mode === 'wallpaper' && (
        <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 }}>
          <Text style={{ fontFamily: 'Manrope-Bold', fontSize: 22, color: t.text }}>
            {tr('history.selectWallpaper') || 'Select for Wallpaper'}
          </Text>
          <Text style={{ fontFamily: 'Manrope-Regular', fontSize: 14, color: t.textMuted, marginTop: 4 }}>
            {tr('history.selectWallpaperDesc') || 'Choose a bouquet to generate a phone wallpaper.'}
          </Text>
        </View>
      )}

      <View style={[styles.tabBar, { backgroundColor: isDark ? '#2D2D2D' : '#EAE0D5' }]}>
        <Animated.View
          style={[
            styles.activeTab,
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
            setActiveTab('sent');
            scrollViewRef.current?.scrollTo({ x: 0, animated: true });
          }}
          activeOpacity={0.7}
        >
          <Animated.Text style={[styles.tabText, { color: sentColor, fontFamily: 'Manrope-SemiBold' }]}>
            {tr('history.sent')}
          </Animated.Text>
        </HapticButton>
        <HapticButton 
          style={styles.tab} 
          onPress={() => {
            setActiveTab('received');
            scrollViewRef.current?.scrollTo({ x: SCREEN_WIDTH, animated: true });
          }}
          activeOpacity={0.7}
        >
          <Animated.Text style={[styles.tabText, { color: receivedColor, fontFamily: 'Manrope-SemiBold' }]}>
            {tr('history.received')}
          </Animated.Text>
        </HapticButton>
      </View>

      <Animated.ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { 
            useNativeDriver: false,
            listener: (e) => {
              const x = e.nativeEvent.contentOffset.x;
              const index = Math.round(x / SCREEN_WIDTH);
              const targetTab = index === 0 ? 'sent' : 'received';
              if (activeTab !== targetTab) {
                setActiveTab(targetTab);
              }
            }
          }
        )}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          setActiveTab(index === 0 ? 'sent' : 'received');
        }}
        contentContainerStyle={{ width: SCREEN_WIDTH * 2 }}
      >
        <View style={{ width: SCREEN_WIDTH }}>
          {/* Regular bouquets */}
          {loading && bouquets.length === 0 ? (
            <View style={styles.center}><ActivityIndicator color={t.brand} size="large" /></View>
          ) : bouquets.length === 0 ? (
            <View style={styles.empty}>
              <SvgXml xml={historySvg} width={280} height={280} style={styles.emptySvg} />
              <Text style={[styles.emptyTitle, { color: t.text }]}>{tr('history.emptySent')}</Text>
              <Text style={[styles.emptyText, { color: t.textMuted }]}>{tr('history.emptySentDesc')}</Text>
            </View>
          ) : (
            <FlashList
              data={bouquets}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <BouquetCard item={item} onPress={() => openSheet(item, true)} onLongPress={() => openSheet(item, true)} />
              )}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              estimatedItemSize={90}
            />
          )}
        </View>

        <View style={{ width: SCREEN_WIDTH }}>
          {loading && received.length === 0 ? (
            <View style={styles.center}><ActivityIndicator color={t.brand} size="large" /></View>
          ) : received.length === 0 ? (
            <View style={styles.empty}>
              <SvgXml xml={historySvg} width={280} height={280} style={styles.emptySvg} />
              <Text style={[styles.emptyTitle, { color: t.text }]}>{tr('history.emptyReceived')}</Text>
              <Text style={[styles.emptyText, { color: t.textMuted }]}>{tr('history.emptyReceivedDesc')}</Text>
            </View>
          ) : (
            <FlashList
              data={received}
              keyExtractor={item => item.id}
              renderItem={({ item }) => {
                const flowerIds = getFlowerIds(item);
                return (
                  <HapticButton style={[styles.card, { backgroundColor: t.cardBg }]} onPress={() => openSheet(item, false)} onLongPress={() => openSheet(item, false)} delayLongPress={350} activeOpacity={0.85}>
                    <View style={{ position: 'relative' }}>
                      <View style={[styles.cardFlowerCard, { backgroundColor: t.bg, borderColor: t.border }]}>
                        {flowerIds.length === 0
                          ? <MaterialCommunityIcons name="flower-outline" size={26} color={t.border} />
                          : flowerIds.map((fid, i) => (
                              <PremiumImage key={i} source={getFlowerImg(fid)} style={[styles.cardFlowerImg, { zIndex: 3 - i, marginLeft: i > 0 ? -8 : 0 }]} resizeMode="contain" />
                            ))
                        }
                      </View>
                      {item.isGoldenEdition && (
                        <View style={styles.limitedBadge}>
                          <Text style={styles.limitedBadgeText}>✦ LIMITED</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.cardInfo}>
                      <Text style={[styles.cardRecipient, { color: t.text }]} numberOfLines={1}>{tr('common.from')} {item.senderName || tr('history.someoneSpecial')}</Text>
                      <Text style={[styles.cardDate, { color: t.textMuted }]}>{item.openedAt ? new Date(item.openedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : ''}</Text>
                    </View>
                    <Feather name="chevron-right" size={18} color={t.textMuted} />
                  </HapticButton>
                );
              }}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              estimatedItemSize={90}
            />
          )}
        </View>
      </Animated.ScrollView>

      <ActionSheet
        visible={sheetVisible}
        item={sheetItem}
        isSent={sheetIsSent}
        onClose={closeSheet}
        onView={handleView}
        onShare={handleShare}
        onCopyLink={handleCopyLink}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <ShareModal
        visible={shareModalVisible}
        url={shareUrl}
        recipientName={shareRecipientName}
        bouquetData={sheetItem}
        onClose={() => setShareModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PINK_LIGHT },
  containerWeb: { height: '100vh', overflow: 'hidden' },
  tabBar: {
    flexDirection: 'row', marginHorizontal: 24, marginTop: 12,
    backgroundColor: PINK_MID, borderRadius: 12, padding: 4, marginBottom: 16,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  activeTab: { backgroundColor: WHITE },
  tabText: { fontFamily: 'Manrope-Regular', fontSize: 13, color: MUTED },
  activeTabText: { color: BRAND_DARK },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 20, paddingBottom: 110, gap: 10 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: WHITE, borderRadius: 16, padding: 14,
  },
  cardFlowerCard: {
    width: 72, height: 56, borderRadius: 10,
    backgroundColor: PINK_LIGHT, borderWidth: 1, borderColor: PINK_MID,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginRight: 14, overflow: 'hidden', paddingHorizontal: 4,
  },
  cardFlowerImg: { width: 34, height: 34 },
  cardInfo: { flex: 1 },
  cardRecipient: { fontFamily: 'Manrope-Bold', fontSize: 15, color: DARK, marginBottom: 2 },
  cardDate: { fontFamily: 'Manrope-Regular', fontSize: 12, color: MUTED, marginBottom: 2 },
  cardLink: { fontFamily: 'Manrope-Regular', fontSize: 11, color: BRAND_DARK },
  limitedBadge: {
    position: 'absolute',
    bottom: 0,
    width: 72,
    backgroundColor: '#D4AF37',
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    alignItems: 'center',
    paddingVertical: 2,
  },
  limitedBadgeText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 7,
    color: '#1A1200',
    letterSpacing: 0.8,
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 40, marginTop: -140 },
  emptySvg: { transform: [{ translateY: -15 }] },
  emptyTitle: { fontFamily: 'Manrope-SemiBold', fontSize: 16, color: DARK },
  emptyText: { fontFamily: 'Manrope-Regular', fontSize: 13, color: MUTED, textAlign: 'center', lineHeight: 20 },
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
  // Action sheet
  sheetOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 1200 },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: WHITE, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    zIndex: 1201, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, elevation: 1201,
  },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: PINK_MID, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  sheetHeader: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: PINK_MID },
  sheetRecipient: { fontFamily: 'Manrope-Bold', fontSize: 17, color: DARK, marginTop: 8 },
  sheetDate: { fontFamily: 'Manrope-Regular', fontSize: 13, color: MUTED, marginTop: 2 },
  sheetOptions: { paddingTop: 8 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 24 },
  sheetIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  sheetIconDelete: {},
  sheetRowLabel: { fontFamily: 'Manrope-SemiBold', fontSize: 16, color: DARK },
  sheetRowDelete: { color: '#E05252' },
  sheetDivider: { height: 1, backgroundColor: PINK_MID, marginHorizontal: 24, marginVertical: 4 },
  sheetCancel: { marginHorizontal: 20, marginTop: 8, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  sheetCancelText: { fontFamily: 'Manrope-Bold', fontSize: 16, color: BRAND_DARK },
});
