import { PremiumImage } from '../components/PremiumImage';
import { HapticButton } from '../components/HapticButton';
import React, { useEffect, useState, useCallback, useRef, forwardRef, useImperativeHandle, memo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar, Modal, Animated, Platform, Linking, TextInput,
  Dimensions, PanResponder, BackHandler, InteractionManager, LayoutAnimation, DeviceEventEmitter
} from 'react-native';
// ─── GOLDEN BOUQUET FEATURE: imports ─────────────────────────────────────────
import { LinearGradient } from 'expo-linear-gradient';
import * as Application from 'expo-application';
// ─── GOLDEN BOUQUET FEATURE END: imports ─────────────────────────────────────
import { ScrollView } from 'react-native-gesture-handler';

import * as StoreReview from 'expo-store-review';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons, Feather } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { collection, query, where, orderBy, limit, getDocs, doc, deleteDoc, onSnapshot } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import Toast from 'react-native-toast-message';
import * as Haptics from '../utils/haptics';
import ShareModal from '../components/ShareModal';
import { db } from '../firebase';
import { SvgXml } from 'react-native-svg';
import { cherryBlossomHamSvg, noBouquetHomeSvg } from '../svgStrings';
import { getDeviceId } from '../utils/deviceId';
import { useLanguage } from '../contexts/LanguageContext';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useCustomAlert } from '../contexts/AlertContext';
import { useSwipeNavigation } from '../hooks/useSwipeNavigation';
import HomeSkeletonScreen, { SkeletonBar } from './HomeSkeletonScreen';
import { getFlowerImage } from '../utils/bouquetData';
import packageJson from '../../package.json';
import { useBouquetData } from '../hooks/useBouquetData';
import SharedBottomSheet from '../components/SharedBottomSheet';
import {
  getHomeCache,
  saveHomeCache,
  deleteBouquet as deleteStoredBouquet,
  syncWidgetDataWithBouquet,
} from '../utils/storageManager';
import { LinkOpener } from './home-components/LinkOpener';
import { DashboardActions } from './home-components/DashboardActions';
import { FeatureCards } from './home-components/FeatureCards';

const BRAND_DARK = '#7A5C58';
const PINK_LIGHT = '#FAF7F2';
const PINK_MID   = '#EAE0D5';
const DARK       = '#5C4844';
const MUTED      = '#997E7A';
const WHITE      = '#ffffff';
const SAGE       = '#8CA18F';

const { width: SCREEN_W, height: SCREEN_HEIGHT } = Dimensions.get('window');

function getFlowerImg(id) {
  return getFlowerImage(id);
}

function getFlowerIds(bouquet) {
  const flowers = bouquet.selectedFlowers || [];
  return flowers.slice(0, 3).map(f => (typeof f === 'string' ? f : f.id)).filter(Boolean);
}

function ActionSheet({ visible, item, onClose, onView, onShare, onCopyLink, onEdit, onDelete, translate }) {
  const insets = useSafeAreaInsets();
  const { theme: t } = useTheme();

  if (!item) return null;
  const recipient = item.messageCard?.recipientName || item.recipientName || 'Friend';
  const ts = item.createdAt?.toMillis?.() || item.createdAt?._millis || item.createdAt;
  const dateStr = ts ? new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '';

  return (
    <SharedBottomSheet visible={visible} onClose={onClose} style={{ backgroundColor: t.cardBg, paddingBottom: insets.bottom + 8 }}>
      <View style={[sheetStyles.header, { borderBottomColor: t.border }]}>
        <View style={[sheetStyles.handle, { backgroundColor: t.border }]} />
        <Text style={[sheetStyles.recipient, { color: t.text }]} numberOfLines={1}>{translate('common.to')} {recipient}</Text>
        {dateStr ? <Text style={[sheetStyles.date, { color: t.textMuted }]}>{dateStr}</Text> : null}
      </View>
      <View style={sheetStyles.options}>
        <HapticButton style={sheetStyles.row} onPress={onView} activeOpacity={0.7}>
          <View style={[sheetStyles.iconWrap, { backgroundColor: t.isDarkMode ? '#332E2C' : '#FAF7F2' }]}><Feather name="eye" size={20} color={t.brand} /></View>
          <Text style={[sheetStyles.rowLabel, { color: t.text }]}>{translate('history.view')}</Text>
        </HapticButton>
        <HapticButton style={sheetStyles.row} onPress={onShare} activeOpacity={0.7}>
          <View style={[sheetStyles.iconWrap, { backgroundColor: t.isDarkMode ? '#332E2C' : '#FAF7F2' }]}><Feather name="share-2" size={20} color={t.brand} /></View>
          <Text style={[sheetStyles.rowLabel, { color: t.text }]}>{translate('history.share')}</Text>
        </HapticButton>
        <HapticButton style={sheetStyles.row} onPress={onCopyLink} activeOpacity={0.7}>
          <View style={[sheetStyles.iconWrap, { backgroundColor: t.isDarkMode ? '#332E2C' : '#FAF7F2' }]}><Feather name="link" size={20} color={t.brand} /></View>
          <Text style={[sheetStyles.rowLabel, { color: t.text }]}>{translate('history.copyLink')}</Text>
        </HapticButton>
        <HapticButton style={sheetStyles.row} onPress={onEdit} activeOpacity={0.7}>
          <View style={[sheetStyles.iconWrap, { backgroundColor: t.isDarkMode ? '#332E2C' : '#FAF7F2' }]}><Feather name="edit-2" size={20} color={t.brand} /></View>
          <Text style={[sheetStyles.rowLabel, { color: t.text }]}>{translate('history.edit')}</Text>
        </HapticButton>
        <View style={[sheetStyles.divider, { backgroundColor: t.border }]} />
        <HapticButton style={sheetStyles.row} onPress={onDelete} activeOpacity={0.7}>
          <View style={[sheetStyles.iconWrap, { backgroundColor: t.isDarkMode ? '#3D2220' : '#FFF0F0' }]}><Feather name="trash-2" size={20} color="#E05252" /></View>
          <Text style={[sheetStyles.rowLabel, { color: '#E05252' }]}>{translate('history.delete')}</Text>
        </HapticButton>
      </View>
    </SharedBottomSheet>
  );
}

const sheetStyles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 1200, elevation: 1200 },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: WHITE, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    zIndex: 1201, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, elevation: 1201,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: PINK_MID, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  header: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: PINK_MID },
  recipient: { fontFamily: 'Manrope-Bold', fontSize: 17, color: DARK, marginTop: 8 },
  date: { fontFamily: 'Manrope-Regular', fontSize: 13, color: MUTED, marginTop: 2 },
  options: { paddingTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 24 },
  iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  rowLabel: { fontFamily: 'Manrope-SemiBold', fontSize: 16, color: DARK },
  divider: { height: 1, backgroundColor: PINK_MID, marginHorizontal: 24, marginVertical: 4 },
  cancel: { marginHorizontal: 20, marginTop: 8, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  cancelText: { fontFamily: 'Manrope-Bold', fontSize: 16, color: BRAND_DARK },
});

// ── Cache key ─────────────────────────────────────────────────────────────────
const AnimatedLottieView = Animated.createAnimatedComponent(LottieView);

const HamburgerMenu = memo(forwardRef(({ navigation, currentUser, translate, getTextSize, isDark, t, toggleTheme, memoizedCherryBlossom, insets }, ref) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(-300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const closeMenu = () => {
    DeviceEventEmitter.emit('toggleMenu', false);
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: -300, duration: 180, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      setMenuVisible(false);
    });
  };

  const openMenu = () => {
    DeviceEventEmitter.emit('toggleMenu', true);
    setMenuVisible(true);
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  useImperativeHandle(ref, () => ({
    open: openMenu,
    close: closeMenu,
    isOpen: () => menuVisible,
  }));

  useEffect(() => {
    if (menuVisible) {
      const backAction = () => {
        closeMenu();
        return true;
      };
      const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
      return () => backHandler.remove();
    }
  }, [menuVisible]);

  const navTo = (screen, params = {}) => {
    DeviceEventEmitter.emit('toggleMenu', false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate(screen, params);
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: -300, duration: 180, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      setMenuVisible(false);
    });
  };

  const handleRateUs = async () => {
    closeMenu();
    let success = false;
    try {
      if (Platform.OS !== 'web' && await StoreReview.isAvailableAsync() && await StoreReview.hasAction()) {
        await StoreReview.requestReview();
        success = true;
      }
    } catch (e) {
      console.warn('In-app review failed to open from menu:', e);
    }
    if (!success) {
      const marketUrl = 'market://details?id=com.digibouquet.app';
      const webUrl = 'https://play.google.com/store/apps/details?id=com.digibouquet.app';
      try {
        await Linking.openURL(marketUrl);
      } catch (err) {
        try {
          await Linking.openURL(webUrl);
        } catch (webErr) {
          console.error('Failed to open store URL from menu:', webErr);
        }
      }
    }
  };

  const handleToggleTheme = () => {
    toggleTheme();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <View 
      style={[StyleSheet.absoluteFill, { zIndex: 9999, elevation: 9999 }]} 
      pointerEvents={menuVisible ? 'box-none' : 'none'}
    >
      <View style={styles.menuOverlay} pointerEvents="box-none">
        <Animated.View style={[styles.menuCloseArea, { opacity: fadeAnim, backgroundColor: 'rgba(0,0,0,0.4)' }]} pointerEvents={menuVisible ? 'auto' : 'none'}>
          <HapticButton style={{ flex: 1 }} onPress={closeMenu} activeOpacity={1} />
        </Animated.View>
        <Animated.View 
          style={[styles.menuContainer, { transform: [{ translateX: slideAnim }], backgroundColor: t.bg }]}
          pointerEvents={menuVisible ? 'auto' : 'none'}
        >
          <View style={[styles.menuHeader, { paddingTop: insets.top + 8, borderBottomColor: t.border }]} pointerEvents="box-none">
            <PremiumImage source={require('./textlogo-oneline.png')} style={styles.menuLogo} resizeMode="contain" />
            <HapticButton onPress={closeMenu}>
              <Feather name="x" size={24} color={t.text} />
            </HapticButton>
          </View>
          <View style={styles.menuItems}>
            {currentUser ? (
              <>
                <HapticButton style={styles.menuItem} onPress={() => navTo('Profile')}>
                  <Feather name="user" size={20} color={t.text} />
                  <Text style={[styles.menuItemText, { color: t.text, fontSize: getTextSize(15) }]}>{translate('menu.profile')}</Text>
                </HapticButton>
              </>
            ) : (
              <>
                <HapticButton style={styles.menuItem} onPress={() => navTo('Login')}>
                  <Feather name="log-in" size={20} color={t.text} />
                  <Text style={[styles.menuItemText, { color: t.text, fontSize: getTextSize(16) }]}>{translate('menu.signIn')}</Text>
                </HapticButton>
                <HapticButton style={styles.menuItem} onPress={() => navTo('Register')}>
                  <Feather name="user-plus" size={20} color={t.text} />
                  <Text style={[styles.menuItemText, { color: t.text, fontSize: getTextSize(16) }]}>{translate('menu.createAccount')}</Text>
                </HapticButton>
                <HapticButton style={styles.menuItem} onPress={() => navTo('Language')}>
                  <Feather name="globe" size={20} color={t.text} />
                  <Text style={[styles.menuItemText, { color: t.text, fontSize: getTextSize(16) }]}>{translate('profile.language') || 'Language'}</Text>
                </HapticButton>
              </>
            )}

            <View style={[styles.menuDivider, { backgroundColor: t.border }]} />
            {currentUser && (
              <HapticButton style={styles.menuItem} onPress={() => navTo('Feedback')}>
              <Feather name="message-square" size={20} color={t.text} />
              <Text style={[styles.menuItemText, { color: t.text, fontSize: getTextSize(15) }]}>{translate('menu.feedback')}</Text>
            </HapticButton>
            )}
            <HapticButton style={styles.menuItem} onPress={handleRateUs}>
              <Feather name="star" size={20} color={t.text} />
              <Text style={[styles.menuItemText, { color: t.text, fontSize: getTextSize(15) }]}>{translate('menu.rateUs')}</Text>
            </HapticButton>
            <HapticButton style={styles.menuItem} onPress={() => navTo('About')}>
              <Feather name="info" size={20} color={t.text} />
              <Text style={[styles.menuItemText, { color: t.text, fontSize: getTextSize(15) }]}>{translate('menu.about')}</Text>
            </HapticButton>
            <HapticButton style={styles.menuItem} onPress={() => navTo('Settings')}>
              <Feather name="settings" size={20} color={t.text} />
              <Text style={[styles.menuItemText, { color: t.text, fontSize: getTextSize(15) }]}>{translate('menu.settings')}</Text>
            </HapticButton>
            <View style={[styles.menuItem, { justifyContent: 'space-between', paddingTop: 20 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Feather name={isDark ? 'sun' : 'moon'} size={20} color={t.text} />
                <Text style={[styles.menuItemText, { color: t.text, fontSize: getTextSize(15) }]}>
                  {isDark ? translate('menu.lightMode') : translate('menu.darkMode')}
                </Text>
              </View>
              <HapticButton onPress={handleToggleTheme} activeOpacity={0.8}>
                <View style={[styles.customToggle, { backgroundColor: isDark ? t.brand : t.border }]}>
                  <View style={[styles.customToggleCircle, { 
                    transform: [{ translateX: isDark ? 20 : 0 }],
                    backgroundColor: '#fff'
                  }]} />
                </View>
              </HapticButton>
            </View>
          </View>

          <View style={{ position: 'absolute', bottom: 0, left: 0, zIndex: -1, opacity: 0.6 }}>
            {memoizedCherryBlossom}
          </View>

          <View style={styles.menuFooter}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.menuFooterText, { color: t.textMuted, fontSize: getTextSize(12) }]}>{translate('home.madeWithLove')}</Text>
              <MaterialCommunityIcons name="heart" size={14} color="#7A5C58" style={{ opacity: 0.8 }} />
            </View>
            <Text style={[styles.menuFooterVersion, { color: t.textMuted }]}>v{packageJson.version}</Text>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}));

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { theme: rawTheme, isDark, toggleTheme } = useTheme();
  const { t: translate } = useLanguage();
  const { getTextSize, getEffectiveTheme } = useAccessibility();
  const t = getEffectiveTheme(rawTheme);
  const navHeight = 64 + insets.bottom;

  const menuRef = useRef(null);
  const { currentUser } = useAuth();
  const showAlert = useCustomAlert();
  const [lottieProgress] = useState(() => new Animated.Value(isDark ? 0.5 : 0));
  const [showUpdateOverlay, setShowUpdateOverlay] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  const tabTranslateY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const isTabHidden = useRef(false);

  // Sliding tab indicator — index: 0=Home, 1=Game, 2=History, 3=Shop
  const tabIndicatorAnim = useRef(new Animated.Value(0)).current;
  const [navBarWidth, setNavBarWidth] = useState(0);

  const animateTabTo = useCallback((index) => {
    Animated.spring(tabIndicatorAnim, {
      toValue: index,
      useNativeDriver: true,
      tension: 68,
      friction: 11,
    }).start();
  }, [tabIndicatorAnim]);

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

  const memoizedCherryBlossom = React.useMemo(() => (
    <SvgXml xml={cherryBlossomHamSvg} width={250} height={250} />
  ), []);






  const { fetchCreatedBouquets } = useBouquetData();
  const [bouquets, setBouquets] = useState([]);
  const [loadingBouquets, setLoadingBouquets] = useState(true);
  const [openLink, setOpenLink] = useState('');
  const [sheetItem, setSheetItem] = useState(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [shareUrl, setShareUrl] = useState('');
  const [shareRecipientName, setShareRecipientName] = useState('');
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [hasScheduled, setHasScheduled] = useState(false);
  const [togetherHistory, setTogetherHistory] = useState([]);
  const [togetherSheetItem, setTogetherSheetItem] = useState(null);
  const [togetherSheetVisible, setTogetherSheetVisible] = useState(false);

  // Load together room history
  const loadTogetherHistory = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem('bouquet_together_history');
      if (raw) setTogetherHistory(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    const checkScheduled = async () => {
      if (!currentUser) { setHasScheduled(false); return; }
      try {
        const q = query(
          collection(db, 'bouquet-scheduled-emails'),
          where('userId', '==', currentUser.uid),
          where('status', '==', 'pending'),
          limit(1)
        );
        const snap = await getDocs(q);
        setHasScheduled(!snap.empty);
      } catch (e) {}
    };
    checkScheduled();
  }, [currentUser]);

  const fetchBouquets = useCallback(async (silent = false) => {
    if (!silent) setLoadingBouquets(true);
    try {
      const results = await fetchCreatedBouquets(20);

      // Synchronize individual bouquet cache and widgets
      for (const item of results) {
        try {
          await AsyncStorage.setItem(`bouquet_${item.id}`, JSON.stringify(item));
          await syncWidgetDataWithBouquet(item.id, item);
        } catch (syncErr) {
          console.error(`Sync error for bouquet ${item.id}:`, syncErr);
        }
      }

      const serializable = results.map(item => ({
        ...item,
        createdAt: item.createdAt?.toMillis ? { _millis: item.createdAt.toMillis() } : item.createdAt,
      }));
      await saveHomeCache(serializable);

      setBouquets(results);
    } catch (e) {
      console.error('Home bouquets fetch error:', e);
    } finally {
      setLoadingBouquets(false);
    }
  }, [fetchCreatedBouquets]);

  // Load cached bouquets immediately on mount — no spinner on revisit
  useEffect(() => {
    getHomeCache().then(cached => {
      if (Array.isArray(cached) && cached.length > 0) {
        setBouquets(cached);
        setLoadingBouquets(false);
      }
    });
  }, []);

  useEffect(() => {
    const checkOverlay = async () => {
      try {
        const val = await AsyncStorage.getItem('hasShownNewUpdateOverlay_v1_1');
        if (val !== 'true') {
          setTimeout(() => {
            setShowUpdateOverlay(true);
          }, 600);
        }
      } catch (err) {
        console.warn('Error checking update overlay status', err);
      }
    };
    checkOverlay();
  }, []);

  useEffect(() => {
    let active = true;
    const checkConnection = async () => {
      try {
        const response = await fetch('https://clients3.google.com/generate_204', {
          method: 'GET',
          headers: { 'Cache-Control': 'no-cache' },
          // @ts-ignore
          timeout: 4000
        });
        const online = response.status === 204 || response.ok;
        if (active) {
          if (online !== isOnline) {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setIsOnline(online);
          }
        }
      } catch (err) {
        if (active && isOnline) {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setIsOnline(false);
        }
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 10000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [isOnline]);

  useEffect(() => { 
    const task = InteractionManager.runAfterInteractions(() => {
      fetchBouquets(true); 
      loadTogetherHistory(); 
    });
    return () => task.cancel();
  }, [fetchBouquets, loadTogetherHistory]);

  useEffect(() => {
    const unsub = navigation.addListener('focus', () => {
      InteractionManager.runAfterInteractions(() => {
        fetchBouquets(true);
        loadTogetherHistory();
      });
    });
    return unsub;
  }, [navigation, fetchBouquets, loadTogetherHistory]);


  useEffect(() => {
    if (!currentUser) {
      const timer = setTimeout(() => setNotifications([]), 0);
      return () => clearTimeout(timer);
    }
    
    // Load from cache first
    const cacheKey = `home_notifications_${currentUser.uid}`;
    AsyncStorage.getItem(cacheKey).then(raw => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setNotifications(parsed);
        } catch {}
      }
    });

    const q = query(
      collection(db, 'notifications', currentUser.uid, 'items'),
      where('read', '==', false),
      limit(10)
    );
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setNotifications(docs);
      AsyncStorage.setItem(cacheKey, JSON.stringify(docs)).catch(() => {});
    }, () => {});
    return unsub;
  }, [currentUser]);





  const handleOpenLink = () => {
    const raw = openLink.trim();
    if (!raw) return;
    const match = raw.match(/bouquet\/([^/?#]+)/);
    const id = match ? match[1] : raw;
    if (id) {
      setOpenLink('');
      navigation.navigate('BouquetView', { id });
    }
  };

  const openMenu = () => {
    menuRef.current?.open();
  };

  const swipeHandlers = useSwipeNavigation({
    onSwipeLeft: () => {
      if (menuRef.current?.isOpen()) {
        menuRef.current?.close(); // Close menu if open
      } else {
        navigation.navigate('GameHub', { fade: true }); // Navigate to Games
      }
    },
    onSwipeRight: () => {
      if (!menuRef.current?.isOpen()) {
        openMenu(); // Use the smooth openMenu function
      }
    },
  });


  const handleSheetView = () => { closeSheet(); navigation.navigate('BouquetView', { id: sheetItem?.slug || sheetItem?.id, fade: true }); };
  const handleSheetShare = () => {
    closeSheet();
    const url = `https://egreet.in/bouquet/${sheetItem?.slug || sheetItem?.id}`;
    const recipientName = sheetItem?.messageCard?.recipientName || sheetItem?.recipientName || 'Friend';
    setShareUrl(url);
    setShareRecipientName(recipientName);
    setTimeout(() => setShareModalVisible(true), 350);
  };
  const handleSheetCopy = async () => {
    closeSheet();
    const url = `https://egreet.in/bouquet/${sheetItem?.slug || sheetItem?.id}`;
    await Clipboard.setStringAsync(url);
    Toast.show({
      type: 'success',
      text1: translate('common.copied') || 'Copied!',
      text2: translate('common.copiedDesc') || 'Link copied to clipboard.',
      visibilityTime: 2500,
    });
  };
  const handleSheetEdit = () => { closeSheet(); navigation.navigate('CreateBouquet', { editId: sheetItem?.slug || sheetItem?.id, fade: true }); };
  const handleSheetDelete = () => {
    closeSheet();
    const item = sheetItem;
    setTimeout(() => {
      showAlert(translate('history.deleteConfirm'), translate('history.deleteConfirmDesc'), [
        { text: translate('common.cancel'), style: 'cancel' },
        { text: translate('history.delete'), style: 'destructive', onPress: async () => {
          try {
            await deleteDoc(doc(db, 'bouquet-cards', item.id));
            await deleteStoredBouquet(item.id);
            fetchBouquets();
          } catch { showAlert(translate('common.error'), translate('register.errorGeneral')); }
        }},
      ]);
    }, 450);
  };

  // Action sheet handlers
  const openSheet = (item) => { setSheetItem(item); setSheetVisible(true); };
  const closeSheet = () => setSheetVisible(false);

  // Together history handlers
  const openTogetherSheet = (item) => { setTogetherSheetItem(item); setTogetherSheetVisible(true); };
  const closeTogetherSheet = () => setTogetherSheetVisible(false);

  const handleTogetherResume = () => {
    closeTogetherSheet();
    navigation.navigate('MakeBouquetTogether', { resumeCode: togetherSheetItem?.code, fade: true });
  };

  const handleTogetherCopyCode = async () => {
    closeTogetherSheet();
    await Clipboard.setStringAsync(togetherSheetItem?.code || '');
    Toast.show({ type: 'success', text1: translate('home.codeCopied') || 'Code copied!', text2: `${translate('home.roomCode') || 'Room code:'} ${togetherSheetItem?.code}`, visibilityTime: 2500 });
  };

  const handleTogetherDelete = () => {
    closeTogetherSheet();
    const item = togetherSheetItem;
    setTimeout(() => {
      showAlert(translate('home.removeRoom') || 'Remove Room?', (translate('home.removeRoomDesc') || 'Remove room #{code} from history?').replace('{code}', item?.code), [
        { text: translate('common.cancel') || 'Cancel', style: 'cancel' },
        { text: translate('home.remove') || 'Remove', style: 'destructive', onPress: async () => {
          try {
            const raw = await AsyncStorage.getItem('bouquet_together_history');
            const hist = raw ? JSON.parse(raw) : [];
            const updated = hist.filter(h => h.code !== item.code);
            await AsyncStorage.setItem('bouquet_together_history', JSON.stringify(updated));
            setTogetherHistory(updated);
          } catch {}
        }},
      ]);
    }, 450);
  };


  return (
    <View style={[styles.safe, { backgroundColor: t.bg }, Platform.OS === 'web' && styles.safeWeb]} {...swipeHandlers}>
      <StatusBar barStyle="light-content" backgroundColor={t.headerBg} translucent={false} />

      {/* ── Header ── */}
      <View style={[styles.header, { backgroundColor: t.bg, borderBottomColor: t.border }]}>
        <View style={[styles.headerInner, { marginTop: insets.top, flexDirection: 'row', alignItems: 'center', height: 60, paddingHorizontal: 16 }]}>
          <HapticButton style={styles.menuBtn} onPress={openMenu}>
            <Feather name="menu" size={22} color={t.text} />
          </HapticButton>
          
          <View style={styles.headerCenter}>
            <PremiumImage 
              source={require('./textlogo-oneline.png')} 
              style={styles.headerLogo} 
              resizeMode="contain" 
            />
          </View>

          <HapticButton 
            style={styles.bellBtn} 
            onPress={() => navigation.navigate('Notifications')}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={notifications.length > 0 ? "notifications" : "notifications-outline"} 
              size={24} 
              color={t.text} 
            />
            {notifications.length > 0 && (
              <View style={[styles.badge, { backgroundColor: t.brand }]} />
            )}
          </HapticButton>
        </View>
      </View>

      {!isOnline && (
        <View style={[styles.offlineBanner, { backgroundColor: isDark ? '#4A2A2A' : '#FDE8E8', borderBottomColor: isDark ? '#5E3333' : '#F8D7DA' }]}>
          <Feather name="wifi-off" size={14} color={isDark ? '#E57373' : '#C0392B'} style={{ marginRight: 8 }} />
          <Text style={[styles.offlineText, { color: isDark ? '#FFCDD2' : '#C0392B' }]}>
            No internet connection. Some features may be unavailable.
          </Text>
        </View>
      )}

      <Animated.ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: 110 }]}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        removeClippedSubviews={true}
      >
        {/* ════════════════════════════════════════════════════════════════════
            GOLDEN BOUQUET FEATURE
            ════════════════════════════════════════════════════════════════ */}
        <GoldenBouquetBanner navigation={navigation} />
        
        {/* ── Action Cards Row ── */}
        <ActionCardsRow navigation={navigation} currentUser={currentUser} translate={translate} t={t} showAlert={showAlert} />

        {/* ── Dashboard Actions ── */}
        <DashboardActions 
          themeColors={t} 
          translate={translate} 
          getTextSize={getTextSize} 
          navigation={navigation} 
        />

        {/* ── Features Card (Schedule only — Together hidden) ── */}
        <FeatureCards 
          themeColors={t} 
          translate={translate} 
          getTextSize={getTextSize} 
          navigation={navigation} 
          currentUser={currentUser} 
          hasScheduled={hasScheduled} 
        />

        {/* ── Open a bouquet link ── */}
        <LinkOpener 
          themeColors={t} 
          translate={translate} 
          navigation={navigation} 
        />

        {/* ── Your Bouquets ── */}
        {(loadingBouquets || bouquets.length > 0) && (
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionLabel, { color: t.text }]}>
              {translate('home.yourBouquets') === 'home.yourBouquets' ? 'Your Bouquets' : translate('home.yourBouquets')}
            </Text>
            {bouquets.length > 0 && (
              <HapticButton onPress={() => navigation.navigate('History', { fade: true })}>
                <Text style={[styles.sectionSeeAll, { color: t.brand }]}>{translate('home.seeAll') === 'home.seeAll' ? 'See All' : translate('home.seeAll')}</Text>
              </HapticButton>
            )}
          </View>
        )}

            {(loadingBouquets && bouquets.length === 0) ? (
              <View style={styles.bouquetList}>
                {[0, 1, 2].map((i) => (
                  <View key={i} style={[styles.bouquetRow, { backgroundColor: t.cardBg }]}>
                    <SkeletonBar w={64} h={52} radius={12} />
                    <View style={{ flex: 1, marginLeft: 14, justifyContent: 'center' }}>
                      <SkeletonBar w={120} h={14} radius={6} style={{ marginBottom: 8 }} />
                      <SkeletonBar w={80} h={10} radius={6} />
                    </View>
                  </View>
                ))}
              </View>
            ) : bouquets.length === 0 ? (
              <View style={styles.emptyState}>
                <SvgXml xml={noBouquetHomeSvg} width={180} height={180} />
                <Text style={[styles.emptyText, { color: t.textMuted }]}>{translate('home.noBouquets')}</Text>
              </View>
            ) : (
              <View style={styles.bouquetList}>
                {bouquets.slice(0, 5).map(item => {
                  const flowerIds = getFlowerIds(item);
                  const recipient = item.messageCard?.recipientName || item.recipientName || 'Friend';
                  return (
                    <HapticButton
                      key={item.id}
                      style={[styles.bouquetRow, { backgroundColor: t.cardBg }]}
                      onPress={() => openSheet(item)}
                      onLongPress={() => openSheet(item)}
                      delayLongPress={350}
                      activeOpacity={0.85}
                    >
                      <View style={{ position: 'relative' }}>
                        <View style={[styles.bouquetFlowerCard, { backgroundColor: t.bg, borderColor: t.border }]}>
                          {flowerIds.length === 0 ? (
                            <MaterialCommunityIcons name="flower-outline" size={22} color={t.border} />
                          ) : (
                            flowerIds.map((fid, i) => (
                              <PremiumImage
                                key={i}
                                source={getFlowerImg(fid)}
                                style={[styles.bouquetRowFlowerImg, { marginLeft: i > 0 ? -8 : 0, zIndex: 3 - i }]}
                                resizeMode="contain"
                              />
                            ))
                          )}
                        </View>
                        {item.isGoldenEdition && (
                          <View style={styles.limitedBadgeHome}>
                            <Text style={styles.limitedBadgeText}>✦ LIMITED</Text>
                          </View>
                        )}
                      </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.bouquetRowRecipient, { color: t.text }]} numberOfLines={1}>{translate('common.to')} {recipient}</Text>
                    <Text style={[styles.bouquetRowDate, { color: t.textMuted }]}>
                      {item.createdAt?.toMillis
                        ? new Date(item.createdAt.toMillis()).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                        : item.createdAt?._millis
                        ? new Date(item.createdAt._millis).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                        : ''}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={16} color={t.textMuted} />
                </HapticButton>
              );
            })}
          </View>
        )}
      </Animated.ScrollView>



      {/* ── Hamburger Menu Overlay ── */}
      <HamburgerMenu
        ref={menuRef}
        navigation={navigation}
        currentUser={currentUser}
        translate={translate}
        getTextSize={getTextSize}
        isDark={isDark}
        t={t}
        toggleTheme={toggleTheme}
        memoizedCherryBlossom={memoizedCherryBlossom}
        insets={insets}
      />

      {/* ── Action Sheet ── */}
      <ActionSheet
        visible={sheetVisible}
        item={sheetItem}
        onClose={closeSheet}
        onView={handleSheetView}
        onShare={handleSheetShare}
        onCopyLink={handleSheetCopy}
        onEdit={handleSheetEdit}
        onDelete={handleSheetDelete}
        translate={translate}
      />

      <ShareModal
        visible={shareModalVisible}
        url={shareUrl}
        recipientName={shareRecipientName}
        bouquetData={sheetItem}
        onClose={() => setShareModalVisible(false)}
      />

      {/* What's New Overlay */}
      <Modal
        visible={showUpdateOverlay}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.updateModalContainer, { backgroundColor: t.surface, borderColor: t.border }]}>
            {/* Header stars/glow */}
            <View style={styles.updateModalHeader}>
              <View style={[styles.iconWrapper, { backgroundColor: isDark ? 'rgba(196, 151, 143, 0.15)' : 'rgba(122, 92, 88, 0.1)' }]}>
                <MaterialCommunityIcons name="shimmer" size={32} color={t.brand} />
              </View>
              <Text style={[styles.updateModalTitle, { color: t.text }]}>{translate('home.whatsNewTitle') || "What's New"}</Text>
              <Text style={[styles.updateModalSubtitle, { color: t.textMuted }]}>
                {translate('home.whatsNewSubtitle') || "We've added some beautiful new ways to connect and spread joy."}
              </Text>
            </View>

            {/* Updates list */}
            <View style={styles.updateItemsList}>
              {/* Golden Bouquet */}
              <View style={styles.updateItemRow}>
                <View style={[styles.itemIconWrapper, { backgroundColor: 'rgba(212, 175, 55, 0.12)' }]}>
                  <MaterialCommunityIcons name="flower-tulip" size={24} color="#D4AF37" />
                </View>
                <View style={styles.itemTextContainer}>
                  <Text style={[styles.itemTitle, { color: t.text }]}>{translate('home.whatsNewGoldenTitle') || "Golden Bouquet"}</Text>
                  <Text style={[styles.itemDescription, { color: t.textMuted }]}>
                    {translate('home.whatsNewGoldenDesc') || "Express ultimate gratitude with our radiant, shimmering premium bouquet style designed for special moments."}
                  </Text>
                </View>
              </View>

              {/* Random Acts of Kindness */}
              <View style={styles.updateItemRow}>
                <View style={[styles.itemIconWrapper, { backgroundColor: 'rgba(226, 88, 88, 0.12)' }]}>
                  <MaterialCommunityIcons name="heart-pulse" size={24} color="#E25858" />
                </View>
                <View style={styles.itemTextContainer}>
                  <Text style={[styles.itemTitle, { color: t.text }]}>{translate('home.whatsNewRaokTitle') || "Random Acts of Kindness"}</Text>
                  <Text style={[styles.itemDescription, { color: t.textMuted }]}>
                    {translate('home.whatsNewRaokDesc') || "Send and receive anonymous digital bouquets globally, sharing warmth and positivity with those who need it."}
                  </Text>
                </View>
              </View>
            </View>

            {/* Sounds Good Button */}
            <HapticButton
              style={[styles.soundsGoodBtn, { backgroundColor: t.brand }]}
              onPress={async () => {
                try {
                  await AsyncStorage.setItem('hasShownNewUpdateOverlay_v1_1', 'true');
                } catch (e) {
                  console.warn(e);
                }
                setShowUpdateOverlay(false);
              }}
              activeOpacity={0.9}
            >
              <Text style={styles.soundsGoodBtnText}>{translate('home.whatsNewClose') || "Sounds good"}</Text>
            </HapticButton>
          </View>
        </View>
      </Modal>



      {/* Widget logic moved to WidgetOverlayScreen */}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PINK_LIGHT },
  safeWeb: { height: '100vh', overflow: 'hidden' },
  header: { borderBottomWidth: 1 },
  headerInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLogo: { width: 140, height: 34 },
  headerCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  menuBtn: { padding: 8 },
  bellBtn: { padding: 8, position: 'relative' },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: WHITE,
  },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 32 },
  greeting: {
    fontFamily: 'Manrope-Bold', fontSize: 22,
    color: DARK, lineHeight: 30, marginBottom: 16,
  },
  createCard: {
    backgroundColor: WHITE, borderRadius: 20, padding: 24,
    marginBottom: 12, minHeight: 140,
  },
  togetherCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 16, padding: 16, marginBottom: 24,
    borderWidth: 1,
  },
  togetherCardTitle: { fontFamily: 'Manrope-Bold', marginRight: 8 },
  togetherCardSub: { fontFamily: 'Manrope-Regular' },
  togetherBadge: {
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  togetherBadgeText: { fontFamily: 'Manrope-Bold', fontSize: 9, color: '#fff' },
  createCardTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 14,
  },
  iconCircle: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
  },
  arrowCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: BRAND_DARK, alignItems: 'center', justifyContent: 'center',
  },
  createCardTitle: { fontFamily: 'Manrope-SemiBold', fontSize: 20, color: DARK, marginBottom: 4 },
  createCardSub: { fontFamily: 'Manrope-Regular', fontSize: 13, color: MUTED, lineHeight: 18 },
  twoCol: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  threeCol: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  dashboardCard: {
    borderRadius: 16, marginBottom: 16, borderWidth: 1,
    overflow: 'hidden'
  },
  dashboardRow: {
    flexDirection: 'row', alignItems: 'center',
  },
  dashboardItem: {
    flex: 1, padding: 14, alignItems: 'center', justifyContent: 'center', minHeight: 88,
  },
  verticalDivider: {
    width: 1, height: '60%',
  },
  horizontalDivider: {
    height: 1, width: '100%',
  },
  smallCard: {
    flex: 1, borderRadius: 14, padding: 14,
    alignItems: 'center', justifyContent: 'center', minHeight: 88,
  },
  smallCardNumber: { fontFamily: 'Manrope-Bold', fontSize: 26, color: DARK, lineHeight: 30 },
  smallCardLabel: { fontFamily: 'Manrope-SemiBold', fontSize: 11, color: MUTED, textAlign: 'center', marginTop: 2 },
  // Open link
  openLinkCard: {
    backgroundColor: WHITE, borderRadius: 16, padding: 16,
    marginBottom: 24,
  },
  openLinkLabel: { fontFamily: 'Manrope-SemiBold', fontSize: 13, color: MUTED, marginBottom: 10 },
  openLinkRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  openLinkInput: {
    flex: 1, backgroundColor: PINK_LIGHT, borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 14,
    fontFamily: 'Manrope-Regular', fontSize: 14, color: DARK,
    borderWidth: 1, borderColor: PINK_MID,
  },
  openLinkBtn: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: BRAND_DARK, alignItems: 'center', justifyContent: 'center',
  },
  // Section
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionLabel: { fontFamily: 'Manrope-SemiBold', fontSize: 14, color: DARK },
  sectionSeeAll: { fontFamily: 'Manrope-SemiBold', fontSize: 13, color: BRAND_DARK },
  // Schedule card
  scheduleCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: 14, padding: 14, marginBottom: 12,
  },
  scheduleCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  scheduleIconCircle: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  scheduleCardTitle: { fontFamily: 'Manrope-Bold', fontSize: 14, color: DARK },
  scheduleCardSub: { fontFamily: 'Manrope-Regular', fontSize: 12, color: MUTED, marginTop: 2 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#7A5C58', fontFamily: 'serif' },
  modalSubtitle: { fontSize: 13, color: '#666', marginTop: 2 },
  modalClose: { position: 'absolute', top: 12, right: 12, zIndex: 10, padding: 4 },
  emptyState: { alignItems: 'center', paddingVertical: 36, gap: 10 },
  emptyText: {
    fontFamily: 'Manrope-Regular', fontSize: 13, color: MUTED,
    textAlign: 'center', lineHeight: 20,
  },
  // Bouquet list
  bouquetList: { gap: 10, marginBottom: 8 },
  bouquetRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: WHITE, borderRadius: 14, padding: 12,
  },
  bouquetFlowerCard: {
    width: 72, height: 56, borderRadius: 10,
    backgroundColor: PINK_LIGHT, borderWidth: 1, borderColor: PINK_MID,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginRight: 14, overflow: 'hidden', paddingHorizontal: 4,
  },
  bouquetRowFlowerImg: { width: 34, height: 34 },
  bouquetRowRecipient: { fontFamily: 'Manrope-SemiBold', fontSize: 14, color: DARK },
  bouquetRowDate: { fontFamily: 'Manrope-Regular', fontSize: 12, color: MUTED, marginTop: 2 },
  limitedBadgeHome: {
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
  // Bottom nav (Floating Card style)
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
  // Menu
  menuOverlay: { flex: 1, flexDirection: 'row' },
  menuCloseArea: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  menuContainer: {
    width: 280,
    height: '100%', position: 'absolute', left: 0, top: 0,
    shadowColor: '#000', shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.2, shadowRadius: 10, elevation: 10,
  },
  menuHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingBottom: 20,
    borderBottomWidth: 1, borderBottomColor: PINK_MID,
  },
  menuTitle: { fontFamily: 'Manrope-Bold', fontSize: 24, color: DARK },
  menuLogo: { width: 150, height: 38 },
  menuItems: { paddingVertical: 20 },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 24,
  },
  menuItemText: { fontFamily: 'Manrope-SemiBold', fontSize: 11, color: DARK, marginLeft: 14 },
  menuDivider: {
    height: 1, backgroundColor: PINK_MID,
    marginVertical: 6, marginHorizontal: 24, opacity: 0.5,
  },
  menuFooter: {
    paddingVertical: 16,
    paddingBottom: 20,
    alignItems: 'center',
  },
  menuFooterText: {
    fontFamily: 'Manrope-Regular',
    fontSize: 10,
    opacity: 0.5,
    marginBottom: 4,
  },
  menuFooterVersion: {
    fontFamily: 'Manrope-Regular',
    fontSize: 9,
    opacity: 0.4,
  },
  menuUserInfo: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 24, paddingVertical: 12,
    backgroundColor: PINK_MID, marginBottom: 4,
  },
  menuUserEmail: { fontFamily: 'Manrope-Regular', fontSize: 10, color: MUTED, flex: 1 },

  // Custom Toggle
  customToggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: 'center',
  },
  customToggleCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  updateModalContainer: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 28,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
  },
  updateModalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  updateModalTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 22,
    textAlign: 'center',
    marginBottom: 8,
  },
  updateModalSubtitle: {
    fontFamily: 'Manrope-Regular',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  updateItemsList: {
    width: '100%',
    gap: 20,
    marginBottom: 28,
  },
  updateItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  itemIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTextContainer: {
    flex: 1,
  },
  itemTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 16,
    marginBottom: 4,
  },
  itemDescription: {
    fontFamily: 'Manrope-Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  soundsGoodBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soundsGoodBtnText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 16,
    color: '#FAF7F2',
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    width: '100%',
  },
  offlineText: {
    fontFamily: 'Manrope-Medium',
    fontSize: 13,
    textAlign: 'center',
  },
});

// ─── GOLDEN BOUQUET FEATURE ───────────────────────────────────────────────────
const GOLD_DARK   = '#8B6914';
const GOLD_MID    = '#C9960C';
const GOLD_LIGHT  = '#F5C842';
const GOLD_CREAM  = '#FBF3DC';
const GOLD_BORDER = '#D4AF37';

function GoldenBouquetBanner({ navigation }) {
  const { t: translate } = useLanguage();
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim   = useRef(new Animated.Value(1)).current;
  const shineAnim   = useRef(new Animated.Value(-30)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(shineAnim, { toValue: 120, duration: 1500, useNativeDriver: true }),
        Animated.delay(2000),
        Animated.timing(shineAnim, { toValue: -30, duration: 0, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.0, 0.18],
  });

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], marginBottom: 16 }}>
      <TouchableOpacity 
        style={goldenStyles.banner}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('GoldenBouquet')}
      >
        <LinearGradient
          colors={['#2A1F00', '#1A1200', '#2A1F00']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { borderRadius: 20, backgroundColor: GOLD_LIGHT, opacity: shimmerOpacity },
          ]}
        />
        
        <View style={{ flex: 1 }}>
          <View style={goldenStyles.labelRow}>
            <View style={[goldenStyles.pill, { overflow: 'hidden' }]}>
              <Animated.View
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  width: 15,
                  backgroundColor: 'rgba(255,255,255,0.4)',
                  transform: [{ translateX: shineAnim }, { skewX: '-20deg' }],
                }}
              />
              <Text style={goldenStyles.pillText}>{translate('home.limitedEdition') || 'LIMITED EDITION'}</Text>
            </View>
          </View>
          <Text style={goldenStyles.title}>{translate('home.goldenBouquet') || 'Golden Bouquet'}</Text>
          <Text style={goldenStyles.subtitle}>{translate('home.goldenBouquetDesc') || 'Tap to unlock or enter referral code'}</Text>
        </View>

        <View style={goldenStyles.arrowWrap}>
          <MaterialCommunityIcons name="arrow-right" size={20} color={GOLD_DARK} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const goldenStyles = StyleSheet.create({
  banner: {
    borderRadius: 20,
    padding: 22,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: GOLD_BORDER,
    shadowColor: GOLD_MID,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    minHeight: 110,
  },
  labelRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  pill: {
    backgroundColor: GOLD_BORDER,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pillText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 9,
    color: '#1A1200',
    letterSpacing: 1.2,
  },
  title: {
    fontFamily: 'Manrope-Bold',
    fontSize: 22,
    color: GOLD_LIGHT,
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontFamily: 'Manrope-Regular',
    fontSize: 12,
    color: GOLD_BORDER,
    lineHeight: 17,
    opacity: 0.85,
  },
  arrowWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: GOLD_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 16,
    shadowColor: GOLD_LIGHT,
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  }
});
// ─── END GOLDEN BOUQUET FEATURE ──────────────────────────────────────────────

// ─── ACTION CARDS ROW ────────────────────────────────────────────────────────
function ActionCardsRow({ navigation, currentUser, translate, t, showAlert }) {
  const [bannedUntil, setBannedUntil] = React.useState(null);

  React.useEffect(() => {
    import('@react-native-async-storage/async-storage').then(({ default: AsyncStorage }) => {
      AsyncStorage.getItem('RAOK_banned_until').then(val => {
        if (val && parseInt(val, 10) > Date.now()) {
          setBannedUntil(parseInt(val, 10));
        }
      });
    });
  }, []);

  const handleRaokPress = () => {
    if (!currentUser) {
      showAlert(translate('home.loginRequired') || 'Login Required', translate('home.loginToSpreadKindness') || 'You must be logged in to send a Random Act of Kindness.', [
        { text: translate('home.cancel') || 'Cancel', style: 'cancel' },
        { text: translate('home.login') || 'Login', onPress: () => navigation.navigate('Login') }
      ]);
      return;
    }
    if (bannedUntil) {
      showAlert(translate('home.featureDisabled') || 'Feature Disabled', translate('home.safetyViolationDesc') || 'Feature temporarily disabled due to safety violations.');
    } else {
      navigation.navigate('CreateBouquet', { randomActMode: true, fadeUp: true });
    }
  };

  return (
    <View style={styles.twoCol}>
      <HapticButton
        style={[styles.createCard, { flex: 1, backgroundColor: t.cardBg, borderWidth: 0, marginBottom: 16, minHeight: 120, padding: 16 }]}
        onPress={() => navigation.navigate('CreateBouquet', { occasion: { label: 'New' }, fade: true })}
        activeOpacity={0.85}
      >
        <View style={styles.createCardTop}>
          <View style={[styles.iconCircle, { backgroundColor: t.bg, width: 44, height: 44, borderRadius: 22 }]}>
            <MaterialCommunityIcons name="flower-tulip-outline" size={22} color={t.brand} />
          </View>
        </View>
        <Text style={[styles.createCardTitle, { color: t.text, fontSize: 16 }]} numberOfLines={1}>{translate('home.createBouquet') || 'Create Bouquet'}</Text>
        <Text style={[styles.createCardSub, { color: t.textMuted, fontSize: 12, marginTop: 4 }]} numberOfLines={2}>
          {translate('home.createNewDesc')}
        </Text>
      </HapticButton>

      <HapticButton
        style={[styles.createCard, { flex: 1, backgroundColor: t.cardBg, borderWidth: 0, marginBottom: 16, minHeight: 120, padding: 16 }]}
        onPress={handleRaokPress}
        activeOpacity={0.85}
      >
        <View style={styles.createCardTop}>
          <View style={[styles.iconCircle, { backgroundColor: t.bg, width: 44, height: 44, borderRadius: 22 }]}>
            <MaterialCommunityIcons name="heart-outline" size={22} color={t.brand} />
          </View>
        </View>
        <Text style={[styles.createCardTitle, { color: t.text, fontSize: 16 }]} numberOfLines={1}>{translate('home.spreadKindness') || 'Spread Kindness'}</Text>
        <Text style={[styles.createCardSub, { color: t.textMuted, fontSize: 12, marginTop: 4 }]} numberOfLines={2}>
          {bannedUntil ? (translate('home.temporarilyDisabled') || 'Temporarily disabled') : (translate('home.spreadKindnessDesc') || 'Send a mystery bouquet to brighten a stranger\'s day.')}
        </Text>
      </HapticButton>
    </View>
  );
}
// ─── END ACTION CARDS ROW ────────────────────────────────────────────────────
