import { PremiumImage } from '../components/PremiumImage';
import { HapticButton } from '../components/HapticButton';
import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Modal,
  Dimensions,
  Platform,
  Alert,
  Animated,
  AppState,
  PanResponder,
  NativeModules} from 'react-native';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WIDGET_STYLES , BouquetWidget } from '../widgets/BouquetWidget';
import SharedBottomSheet from '../components/SharedBottomSheet';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useCustomAlert } from '../contexts/AlertContext';
import { db } from '../firebase';
import { useSwipeNavigation } from '../hooks/useSwipeNavigation';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { getDeviceId } from '../utils/deviceId';
import { requestWidgetUpdate, requestWidgetUpdateById, getWidgetInfo } from 'react-native-android-widget';
import { useBouquetData } from '../hooks/useBouquetData';
import { 
  getWidgetData, 
  saveWidgetData,
  clearWidgetData,
  clearAllCaches,
} from '../utils/storageManager';

import { getFlowerImage } from '../utils/bouquetData';

const { width: SCREEN_W } = Dimensions.get('window');
const PINK_LIGHT = '#FAF7F2';
const PINK_MID = '#EAE0D5';
const BRAND_DARK = '#7A5C58';

const BG_IMAGES = [
  { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/1.webp' },
  { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/2.webp' },
  { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/3.webp' },
  { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/4.webp' },
  { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/5.webp' },
];

const WidgetPreview = React.memo(function WidgetPreview({ styleId, bouquet, t }) {
  const getFlowerImg = (id) => {
    return getFlowerImage(id);
  };

  const flowers = bouquet?.selectedFlowers || [];
  const isV2 = bouquet?.version === 2;
  const recipient = bouquet?.messageCard?.recipientName || bouquet?.recipientName || 'Someone special';
  const sender = bouquet?.messageCard?.senderName || bouquet?.senderName || '';
  const bouquetId = bouquet?.id || 'demo';
  
  const formattedDate = bouquet?.createdAt?.toMillis 
    ? new Date(bouquet.createdAt.toMillis()).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : bouquet?.createdAt?._millis
    ? new Date(bouquet.createdAt._millis).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  // Style configurations mapped from BouquetWidget.js
  const styleConfigs = {
    petal: { bg: '#FDF6F0', border: '#F2DECE', for: '#C4907A', name: '#3D1F14', sender: '#A07060', divider: '#C4907A' },
    noir: { bg: '#1A0E1F', border: '#3D1F3D', for: '#D0A0C0', name: '#F5E6F0', sender: '#F0C0E0', divider: '#7A4070' },
    grove: { bg: '#E8F4EC', border: '#C8E0D0', for: '#5E8C70', name: '#1A3D28', sender: '#4A7A5C', divider: '#5E8C70' },
    ivory: { bg: '#FAFAF7', border: '#E8E6DE', for: '#9A9080', name: '#2A2520', sender: '#7A7060', divider: '#C0B8A8' },
  };

  const conf = styleConfigs[styleId] || styleConfigs.petal;

  // Background logic respecting actual bouquet bg
  const getBg = () => {
    const activeBg = bouquet?.greeneryBg || (bouquet?.background !== undefined && bouquet?.background !== null ? `bg-${bouquet.background + 1}` : 'bg-1');
    return getFlowerImg(activeBg) || BG_IMAGES[0];
  };

  return (
    <View style={wStyles.previewContainer}>
      <Text style={wStyles.previewLabel}>{t('widget.liveWidgetPreview')}</Text>
      
      <View style={[
        wStyles.widgetFrame, 
        { 
          backgroundColor: conf.isCanvas ? 'transparent' : conf.bg,
          borderColor: conf.border,
          borderWidth: conf.isCanvas ? 0 : 1,
        }
      ]}>
        {conf.isCanvas && (
          <PremiumImage source={getBg()} style={[StyleSheet.absoluteFillObject, { borderRadius: 24 }]} resizeMode="cover" />
        )}
        <View style={[
          wStyles.widgetContent, 
          conf.isCanvas && { backgroundColor: conf.bg }
        ]}>
          {/* Data Section (Left) */}
          <View style={{ flex: 1, justifyContent: 'center', paddingRight: 10 }}>
            <Text style={[wStyles.pNameText, { color: conf.name }]} numberOfLines={2}>{recipient}</Text>
            {sender ? <Text style={[wStyles.pSenderText, { color: conf.sender }]}>{t('widgetOverlay.from').replace('{name}', sender)}</Text> : null}
            <Text style={[wStyles.pDateText, { color: conf.for }]}>{formattedDate}</Text>
          </View>

          {/* Bouquet Display (Right) */}
          <View style={{ 
            width: 110, 
            height: 110, 
            borderRadius: 16, 
            overflow: 'hidden', 
            position: 'relative'
          }}>
            {!conf.isCanvas && (
              <PremiumImage 
                source={getBg()} 
                style={[StyleSheet.absoluteFillObject, { width: '100%', height: '100%' }]} 
                resizeMode="cover" 
              />
            )}
            <View style={{ flex: 1, position: 'relative' }}>
              {isV2 ? (
                flowers.slice(0, 8).map((flower, index) => {
                  const flowerId = typeof flower === 'string' ? flower : flower.id;
                  const flowerData = typeof flower === 'object' ? flower : null;
                  if (!flowerData) return null;
                  
                  const size = 30 * (flowerData.scale || 1);
                  const left = (flowerData.x / 100) * 110 - size / 2;
                  const top = (flowerData.y / 100) * 110 - size / 2;
                  
                  return (
                    <PremiumImage 
                      key={flowerData.uniqueId || index}
                      source={getFlowerImg(flowerId)} 
                      style={{
                        position: 'absolute',
                        width: size,
                        height: size,
                        left,
                        top,
                        transform: [{ rotate: `${flowerData.rotation || 0}deg` }],
                        zIndex: flowerData.zIndex || index,
                      }}
                      resizeMode="contain"
                    />
                  );
                })
              ) : (
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 6 }}>
                  {flowers.slice(0, 5).map((flower, i) => {
                    const flowerId = typeof flower === 'string' ? flower : flower.id;
                    const size = 32 + (Math.sin(i * 1.5) * 5);
                    const offsetY = Math.sin(i * 2) * 10;
                    return (
                      <PremiumImage 
                        key={i} 
                        source={getFlowerImg(flowerId)} 
                        style={{ 
                          width: size, 
                          height: size,
                          marginLeft: i > 0 ? -12 : 0, 
                          marginBottom: offsetY,
                          zIndex: flowers.length - i 
                        }} 
                        resizeMode="contain"
                      />
                    );
                  })}
                </View>
              )}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
});

const BouquetRow = React.memo(({ 
  item, 
  theme, 
  t, 
  isSelected, 
  isInOtherWidget, 
  isCurrentWidgetBouquet, 
  ownerWidgetIdx,
  onPress,
  getFlowerImg
}) => {
  const recipient = item.messageCard?.recipientName || item.recipientName || 'Friend';
  const flowerIds = (item.selectedFlowers || []).map(f => typeof f === 'string' ? f : f.id);

  return (
    <HapticButton
      onPress={onPress}
      activeOpacity={isInOtherWidget ? 1 : 0.7}
      style={[
        styles.bouquetRow,
        { 
          backgroundColor: isSelected 
            ? (theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)')
            : theme.cardBg, 
          borderColor: theme.border,
          borderWidth: 1,
          opacity: isInOtherWidget ? 0.5 : 1,
        }
      ]}
    >
      <View style={[styles.bouquetFlowerCard, { backgroundColor: theme.bg, borderColor: theme.border }]}>
        {flowerIds.length === 0 ? (
          <MaterialCommunityIcons name="flower-outline" size={22} color={theme.border} />
        ) : (
          <View style={styles.flowerContainer}>
            {flowerIds.slice(0, 3).map((fid, idx) => (
              <PremiumImage 
                key={idx} 
                source={getFlowerImg(fid)} 
                style={[
                  styles.bouquetRowFlowerImg, 
                  { 
                    marginLeft: idx > 0 ? -8 : 0,
                    zIndex: 3 - idx
                  }
                ]} 
                resizeMode="contain"
              />
            ))}
          </View>
        )}
      </View>
      
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowRecipient, { color: theme.text }]} numberOfLines={1}>
          {t('widgetOverlay.to')} {recipient}
        </Text>
        <Text style={[styles.rowDate, { color: theme.textMuted }]}>
          {isInOtherWidget
            ? `In Widget ${ownerWidgetIdx}`
            : isCurrentWidgetBouquet && !isSelected
            ? 'Current widget'
            : item.createdAt?.toMillis 
              ? new Date(item.createdAt.toMillis()).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
              : item.createdAt?._millis
              ? new Date(item.createdAt._millis).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
              : ''}
        </Text>
      </View>
      
      {isInOtherWidget ? (
        <View style={[styles.checkCircle, { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.05)' }]}>
          <Feather name="lock" size={11} color={theme.textMuted} />
        </View>
      ) : isSelected ? (
        <View style={[styles.checkCircle, { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)' }]}>
          <Feather name="check" size={13} color={theme.text} />
        </View>
      ) : (
        <View style={styles.emptyCircle} />
      )}
    </HapticButton>
  );
});

BouquetRow.displayName = 'BouquetRow';


export default function WidgetOverlayScreen({ navigation }) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { currentUser } = useAuth();
  const insets = useSafeAreaInsets();

  const swipeHandlers = useSwipeNavigation({
    onSwipeRight: () => navigation.goBack(),
  });

  const { fetchCreatedBouquets, fetchReceivedBouquets } = useBouquetData();
  const [bouquets, setBouquets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBouquet, setSelectedBouquet] = useState(null);
  const [widgetStyle, setWidgetStyle] = useState('petal');
  const [helpVisible, setHelpVisible] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [myWidgetsVisible, setMyWidgetsVisible] = useState(false);
  const [addGuideVisible, setAddGuideVisible] = useState(false);
  const scrollX = React.useRef(new Animated.Value(0)).current;
  const showAlert = useCustomAlert();

  const [savedBouquetId, setSavedBouquetId] = useState(null);
  const [activeWidgets, setActiveWidgets] = useState([]);
  const [selectedWidgetId, setSelectedWidgetId] = useState(null);
  const [canPinWidget, setCanPinWidget] = useState(false);

  const { height: SCREEN_HEIGHT } = Dimensions.get('window');

  useEffect(() => {
    if (Platform.OS === 'android' && NativeModules.WidgetPin) {
      NativeModules.WidgetPin.isRequestPinAppWidgetSupported().then(supported => {
        setCanPinWidget(supported);
      }).catch(() => {});
    }
  }, []);

  // ── Help modal animation ───────────────────────────────────────────────────
  const helpSlideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const helpOverlayAnim = useRef(new Animated.Value(0)).current;

  const openHelp = () => {
    helpSlideAnim.stopAnimation();
    helpOverlayAnim.stopAnimation();
    helpSlideAnim.setValue(SCREEN_HEIGHT);
    setHelpVisible(true);
    Animated.parallel([
      Animated.spring(helpSlideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
      Animated.timing(helpOverlayAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  };
  const closeHelp = () => {
    Animated.parallel([
      Animated.timing(helpSlideAnim, { toValue: SCREEN_HEIGHT, duration: 180, useNativeDriver: true }),
      Animated.timing(helpOverlayAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => setHelpVisible(false));
  };
  const helpPanResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gs) => gs.dy > 2 && Math.abs(gs.dy) > Math.abs(gs.dx),
    onPanResponderMove: (_, gs) => { if (gs.dy > 0) helpSlideAnim.setValue(gs.dy); },
    onPanResponderRelease: (_, gs) => {
      if (gs.dy > 80 || gs.vy > 0.5) {
        Animated.parallel([
          Animated.timing(helpSlideAnim, { toValue: SCREEN_HEIGHT, duration: 180, useNativeDriver: true }),
          Animated.timing(helpOverlayAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
        ]).start(() => setHelpVisible(false));
      } else {
        Animated.spring(helpSlideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }).start();
      }
    },
    onPanResponderTerminate: () => { Animated.spring(helpSlideAnim, { toValue: 0, useNativeDriver: true }).start(); },
  })).current;
  const helpOverlayPanResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 2,
    onPanResponderMove: (_, gs) => { if (gs.dy > 0) helpSlideAnim.setValue(gs.dy); },
    onPanResponderRelease: (_, gs) => {
      if (gs.dy > 80 || gs.vy > 0.5) {
        Animated.parallel([
          Animated.timing(helpSlideAnim, { toValue: SCREEN_HEIGHT, duration: 180, useNativeDriver: true }),
          Animated.timing(helpOverlayAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
        ]).start(() => setHelpVisible(false));
      } else if (Math.abs(gs.dy) < 10 && Math.abs(gs.dx) < 10) {
        closeHelp();
      } else {
        Animated.spring(helpSlideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }).start();
      }
    },
    onPanResponderTerminate: () => { Animated.spring(helpSlideAnim, { toValue: 0, useNativeDriver: true }).start(); },
  })).current;

  // ── My Widgets modal animation ─────────────────────────────────────────────
  const myWidgetsSlideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const myWidgetsOverlayAnim = useRef(new Animated.Value(0)).current;

  const openMyWidgets = () => {
    myWidgetsSlideAnim.stopAnimation();
    myWidgetsOverlayAnim.stopAnimation();
    myWidgetsSlideAnim.setValue(SCREEN_HEIGHT);
    setMyWidgetsVisible(true);
    Animated.parallel([
      Animated.spring(myWidgetsSlideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
      Animated.timing(myWidgetsOverlayAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  };
  const closeMyWidgets = () => {
    Animated.parallel([
      Animated.timing(myWidgetsSlideAnim, { toValue: SCREEN_HEIGHT, duration: 180, useNativeDriver: true }),
      Animated.timing(myWidgetsOverlayAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => setMyWidgetsVisible(false));
  };
  const myWidgetsPanResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gs) => gs.dy > 2 && Math.abs(gs.dy) > Math.abs(gs.dx),
    onPanResponderMove: (_, gs) => { if (gs.dy > 0) myWidgetsSlideAnim.setValue(gs.dy); },
    onPanResponderRelease: (_, gs) => {
      if (gs.dy > 80 || gs.vy > 0.5) {
        Animated.parallel([
          Animated.timing(myWidgetsSlideAnim, { toValue: SCREEN_HEIGHT, duration: 180, useNativeDriver: true }),
          Animated.timing(myWidgetsOverlayAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
        ]).start(() => setMyWidgetsVisible(false));
      } else {
        Animated.spring(myWidgetsSlideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }).start();
      }
    },
    onPanResponderTerminate: () => { Animated.spring(myWidgetsSlideAnim, { toValue: 0, useNativeDriver: true }).start(); },
  })).current;
  const myWidgetsOverlayPanResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 2,
    onPanResponderMove: (_, gs) => { if (gs.dy > 0) myWidgetsSlideAnim.setValue(gs.dy); },
    onPanResponderRelease: (_, gs) => {
      if (gs.dy > 80 || gs.vy > 0.5) {
        Animated.parallel([
          Animated.timing(myWidgetsSlideAnim, { toValue: SCREEN_HEIGHT, duration: 180, useNativeDriver: true }),
          Animated.timing(myWidgetsOverlayAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
        ]).start(() => setMyWidgetsVisible(false));
      } else if (Math.abs(gs.dy) < 10 && Math.abs(gs.dx) < 10) {
        closeMyWidgets();
      } else {
        Animated.spring(myWidgetsSlideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }).start();
      }
    },
    onPanResponderTerminate: () => { Animated.spring(myWidgetsSlideAnim, { toValue: 0, useNativeDriver: true }).start(); },
  })).current;

  // Set of ALL bouquet IDs that are assigned to ANY active widget.
  // These are shown as locked/checked in the bouquet list so the user
  // can see at a glance what's already on the home screen.
  const alreadyUsedBouquetIds = React.useMemo(() => {
    const used = new Set();
    activeWidgets.forEach(w => {
      const bId = w.data?.bouquetId || w.data?.id;
      if (bId) used.add(bId);
    });
    return used;
  }, [activeWidgets]);

  // The bouquet ID currently assigned to the SELECTED widget
  // (shown as selected/checked but NOT locked — user can change it)
  const currentWidgetBouquetId = React.useMemo(() => {
    const w = activeWidgets.find(w => w.widgetId === selectedWidgetId);
    return w?.data?.bouquetId || w?.data?.id || null;
  }, [activeWidgets, selectedWidgetId]);

  const fetchBouquets = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      // Concurrently fetch cached/received bouquets using the unified hook
      const [created, received] = await Promise.all([
        fetchCreatedBouquets(30),
        fetchReceivedBouquets()
      ]);

      let allDocs = [...created, ...received];

      // Remove duplicates by id
      allDocs = allDocs.filter((v, i, a) => a.findIndex(x => x.id === v.id) === i);

      // Sort client-side by createdAt or openedAt descending
      allDocs.sort((a, b) => {
        const ta = a.createdAt?.toMillis?.() ?? a.createdAt ?? a.openedAt ?? 0;
        const tb = b.createdAt?.toMillis?.() ?? b.createdAt ?? b.openedAt ?? 0;
        return tb - ta;
      });

      setBouquets(allDocs);
      
      setSelectedBouquet(prevSelected => {
        if (prevSelected) return prevSelected;
        return savedBouquetId
          ? allDocs.find(b => b.id === savedBouquetId) || allDocs[0]
          : allDocs[0] || null;
      });
    } catch (e) {
      console.log('Fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [savedBouquetId, fetchCreatedBouquets, fetchReceivedBouquets]);

  const initializeWidget = useCallback(async (silent = true) => {
    try {
      if (Platform.OS === 'android') {
        const widgets = await getWidgetInfo('BouquetWidget');
        if (widgets && widgets.length > 0) {
          // Load widget data concurrently using Promise.all
          const widgetsWithData = await Promise.all(
            widgets.map(async (w) => {
              const wd = await getWidgetData(w.widgetId);
              return { ...w, data: wd };
            })
          );

          setActiveWidgets(widgetsWithData);

          // ── Smart default selection ────────────────────────────────────
          // Prefer the first widget that has NO data yet (newly placed on home screen).
          // This prevents overwriting an already-configured widget when adding a second one.
          const newWidget = widgetsWithData.find(w => !w.data);
          // Fallback: last widget in the list (most recently added by Android)
          const defaultWidget = newWidget ?? widgetsWithData[widgetsWithData.length - 1];
          setSelectedWidgetId(defaultWidget.widgetId);

          // Load the style/bouquet for the auto-selected widget
          if (defaultWidget.data) {
            if (defaultWidget.data.widgetStyle) setWidgetStyle(defaultWidget.data.widgetStyle);
            if (defaultWidget.data.id) setSavedBouquetId(defaultWidget.data.id);
          }
        } else {
          setActiveWidgets([]);
        }
      } else {
        const saved = await getWidgetData();
        if (saved) {
          if (saved.widgetStyle) setWidgetStyle(saved.widgetStyle);
          if (saved.id) setSavedBouquetId(saved.id);
        }
      }
      fetchBouquets(silent);
    } catch (e) {
      console.error('Initialize error:', e);
      fetchBouquets(false);
    }
  }, [fetchBouquets]);

  // Run on mount
  useEffect(() => {
    initializeWidget(true);
  }, []);

  const handleWidgetTabPress = async (widgetId) => {
    setSelectedWidgetId(widgetId);
    setLoading(true);
    const saved = await getWidgetData(widgetId);
    if (saved) {
      if (saved.widgetStyle) setWidgetStyle(saved.widgetStyle);
      const b = bouquets.find(b => b.id === saved.bouquetId);
      if (b) setSelectedBouquet(b);
      else setSavedBouquetId(saved.id);
    } else {
      setWidgetStyle('petal');
      setSelectedBouquet(bouquets[0] || null);
    }
    setLoading(false);
  };

  const handleClearWidget = async (widgetIdToClear) => {
    const wId = typeof widgetIdToClear === 'string' ? widgetIdToClear : selectedWidgetId;
    if (!wId) return;

    closeMyWidgets();
    setTimeout(() => {
      showAlert(
        t('widgetOverlay.clearTitle') || 'Clear Widget',
        t('widgetOverlay.clearMessage') || 'Are you sure you want to clear this widget?',
        [
          { 
            text: t('common.cancel') || 'Cancel', 
            style: 'cancel',
            onPress: () => {
              setTimeout(() => {
                openMyWidgets();
              }, 450);
            }
          },
          { 
            text: t('common.clear') || 'Clear', 
            style: 'destructive',
            onPress: async () => {
              try {
                await clearWidgetData(wId);
                if (Platform.OS === 'android') {
                  requestWidgetUpdateById({
                    widgetId: wId,
                    widgetName: 'BouquetWidget',
                    renderWidget: () => <BouquetWidget widgetStyle="petal" recipient="Someone special" sender="" flowerIds={['rose']} bouquetId="default" />,
                  });
                }
                setActiveWidgets(prev => {
                  const updated = prev.filter(w => w.widgetId !== wId);
                  if (updated.length > 0) {
                    setTimeout(() => {
                      openMyWidgets();
                    }, 450);
                  }
                  return updated;
                });
              } catch (e) {
                console.error('Error clearing widget', e);
                setTimeout(() => {
                  openMyWidgets();
                }, 450);
              }
            }
          }
        ]
      );
    }, 450);
  };

  // Refresh bouquet list AND re-detect widgets when screen comes into focus.
  // This ensures that a widget added from Android Settings shows up without
  // requiring the user to fully restart the app.
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      initializeWidget(true);
    });
    return unsubscribe;
  }, [navigation, initializeWidget]);

  // Also re-detect widgets when the app returns to the foreground.
  // This handles the case where the user: (1) taps "Add Widget" in our app,
  // (2) Android shows the system pin-widget dialog, (3) user confirms and
  // places the widget, (4) user navigates back to the app.
  // Without this listener the widget screen would only refresh on next full
  // focus event, requiring the user to close and reopen the screen.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        initializeWidget(true);
      }
    });
    return () => subscription.remove();
  }, [initializeWidget]);

  const handlePinWidget = useCallback(async () => {
    if (Platform.OS !== 'android') return;
    if (!NativeModules.WidgetPin) {
      // Native module not available — fall back to manual instructions
      setAddGuideVisible(true);
      return;
    }
    try {
      const supported = await NativeModules.WidgetPin.isRequestPinAppWidgetSupported();
      setAddGuideVisible(true); // Always show manual instructions as fallback
      if (supported) {
        // Trigger the Android system "pin widget" dialog
        await NativeModules.WidgetPin.requestPinAppWidget(
          'com.digibouquet.app.widget.BouquetWidget'
        );
      }
    } catch (e) {
      console.warn('requestPinAppWidget error:', e);
      setAddGuideVisible(true);
    }
  }, []);

  const handleConfirm = async () => {
    if (!selectedBouquet) return;

    if (!selectedWidgetId) {
      // No widget detected on home screen yet.
      // If the launcher supports one-tap pinning, trigger it directly.
      // Otherwise fall back to the manual instruction guide.
      if (Platform.OS === 'android' && canPinWidget) {
        await handlePinWidget();
      } else {
        setAddGuideVisible(true);
      }
      return;
    }

    try {
      const formattedDate = selectedBouquet.createdAt?.toMillis 
        ? new Date(selectedBouquet.createdAt.toMillis()).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
        : selectedBouquet.createdAt?._millis
        ? new Date(selectedBouquet.createdAt._millis).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
        : new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

      const widgetData = {
        id: selectedBouquet.id,
        bouquetId: selectedBouquet.id,
        recipient: selectedBouquet.messageCard?.recipientName || selectedBouquet.recipientName || 'Someone special',
        sender: selectedBouquet.messageCard?.senderName || selectedBouquet.senderName || '',
        date: formattedDate,
        flowerIds: (selectedBouquet.selectedFlowers || []).map(f => typeof f === 'string' ? f : f.id),
        flowers: selectedBouquet.selectedFlowers || [],
        background: selectedBouquet.background || 0,
        greeneryBg: selectedBouquet.greeneryBg || (selectedBouquet.background !== undefined && selectedBouquet.background !== null ? `bg-${selectedBouquet.background + 1}` : 'bg-1'),
        version: selectedBouquet.version || 1,
        widgetStyle,
        updatedAt: Date.now()
      };
      
      // Save data keyed by widgetId — each widget stores independently
      await saveWidgetData(widgetData, selectedWidgetId);

      // Update in-memory activeWidgets so the UI reflects the new assignment
      setActiveWidgets(prev => prev.map(w =>
        w.widgetId === selectedWidgetId ? { ...w, data: widgetData } : w
      ));
      
      if (Platform.OS === 'android') {
        // Always update by ID — never use the generic requestWidgetUpdate
        // which can affect all widgets on the home screen
        requestWidgetUpdateById({
          widgetId: selectedWidgetId,
          widgetName: 'BouquetWidget',
          renderWidget: () => <BouquetWidget {...widgetData} />,
        });
      }
      
      setSuccessVisible(true);
      setTimeout(() => setSuccessVisible(false), 2500);
    } catch {
      Alert.alert(t('widgetOverlay.errorTitle'), t('widgetOverlay.errorMessage'));
    }
  };


  const getFlowerImg = (id) => {
    return getFlowerImage(id);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]} {...swipeHandlers}>
      <View style={[styles.header, { paddingTop: insets.top, backgroundColor: theme.bg, borderBottomColor: theme.border }]}>
        <HapticButton onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={theme.text} />
        </HapticButton>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{t('widgetOverlay.title')}</Text>
        <HapticButton onPress={openHelp} style={styles.helpBtn} activeOpacity={0.7}>
          <Feather name="help-circle" size={22} color={theme.brand} />
        </HapticButton>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <WidgetPreview styleId={widgetStyle} bouquet={selectedBouquet} t={t} />



          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('widgetOverlay.chooseStyle')}</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={styles.tabsScroll}
            >
              <View style={[styles.tabsRow, { backgroundColor: theme.isDark ? '#333' : '#f0f0f0' }]}>
                {WIDGET_STYLES.map((s) => (
                  <HapticButton
                    key={s.id}
                    onPress={() => setWidgetStyle(s.id)}
                    style={[
                      styles.tab,
                      widgetStyle === s.id && { backgroundColor: theme.cardBg, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 }
                    ]}
                  >
                    <Text style={[
                      styles.tabText,
                      { color: widgetStyle === s.id ? theme.brand : theme.textMuted }
                    ]}>
                      {s.label}
                    </Text>
                  </HapticButton>
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('widgetOverlay.selectBouquet')}</Text>
            {loading ? (
              <Text style={{ color: theme.textMuted, textAlign: 'center', marginTop: 20 }}>{t('widgetOverlay.loading')}</Text>
            ) : bouquets.length === 0 ? (
              <View style={styles.emptyBox}>
                <MaterialCommunityIcons name="flower-outline" size={48} color={theme.border} />
                <Text style={[styles.emptyText, { color: theme.textMuted }]}>{t('widgetOverlay.noBouquets')}</Text>
              </View>
            ) : (
              bouquets.map(item => {
                const isSelected = selectedBouquet?.id === item.id;
                // Locked = used by a DIFFERENT widget than the one being configured
                const isInOtherWidget = alreadyUsedBouquetIds.has(item.id) && item.id !== currentWidgetBouquetId;
                // "Already in this widget" — current widget's assigned bouquet
                const isCurrentWidgetBouquet = item.id === currentWidgetBouquetId;
                const recipient = item.messageCard?.recipientName || item.recipientName || 'Friend';
                const flowerIds = (item.selectedFlowers || []).map(f => typeof f === 'string' ? f : f.id);

                // Find which widget already uses this bouquet (for label)
                const ownerWidget = isInOtherWidget
                  ? activeWidgets.find(w => (w.data?.bouquetId || w.data?.id) === item.id)
                  : null;
                const ownerWidgetIdx = ownerWidget
                  ? activeWidgets.findIndex(w => w.widgetId === ownerWidget.widgetId) + 1
                  : null;
                
                
                return (
                  <BouquetRow 
                    key={item.id}
                    item={item}
                    theme={theme}
                    t={t}
                    isSelected={isSelected}
                    isInOtherWidget={isInOtherWidget}
                    isCurrentWidgetBouquet={isCurrentWidgetBouquet}
                    ownerWidgetIdx={ownerWidgetIdx}
                    onPress={() => !isInOtherWidget && setSelectedBouquet(item)}
                    getFlowerImg={getFlowerImg}
                  />
                );
              })
            )}
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16, backgroundColor: theme.bg, borderTopColor: theme.border }]}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <HapticButton
            style={[styles.secondaryBtn, { backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.border }]}
            onPress={openMyWidgets}
          >
            <Feather name="layers" size={15} color={theme.text} style={{ marginRight: 6 }} />
            <Text style={[styles.secondaryBtnText, { color: theme.text }]}>{t('widgetOverlay.myWidgets')}</Text>
          </HapticButton>
          <HapticButton
            style={[styles.primaryBtn, { backgroundColor: theme.brand, opacity: selectedBouquet ? 1 : 0.45 }]}
            onPress={handleConfirm}
            disabled={!selectedBouquet}
          >
            <Feather name="plus" size={15} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.primaryBtnText}>{t('widget.addToHomeScreen')}</Text>
          </HapticButton>
        </View>
      </View>

      <SharedBottomSheet
        visible={helpVisible}
        onClose={closeHelp}
        style={{ backgroundColor: theme.bg, paddingBottom: insets.bottom + 20 }}
      >
        <View style={styles.bottomSheetHandle} />
        <Text style={[styles.helpTitle, { color: theme.text, marginBottom: 24, paddingHorizontal: 20 }]}>{t('widget.howToUseWidgets')}</Text>
        <View style={{ paddingHorizontal: 20, gap: 20 }}>
          {[
            { icon: "layout", title: t('widget.helpStep1') || 'Select a Bouquet', desc: 'Choose a bouquet to feature on your home screen.' },
            { icon: "image", title: t('widget.helpStep2') || 'Choose a Style', desc: 'Pick a beautiful color theme.' },
            { icon: "plus-square", title: t('widget.helpStep3') || 'Add to Home', desc: 'Tap "Add to Home Screen" and place the widget.' },
          ].map((item, index) => (
            <View key={index} style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.isDark ? '#333' : '#FFF5F0', alignItems: 'center', justifyContent: 'center' }}>
                <Feather name={item.icon} size={22} color={theme.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'Manrope-Bold', fontSize: 15, color: theme.text }}>{item.title}</Text>
                <Text style={{ fontFamily: 'Manrope-Regular', fontSize: 13, color: theme.textMuted }}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>
        <View style={{ paddingHorizontal: 20, marginTop: 32 }}>
          <HapticButton style={[styles.helpCloseBtn, { backgroundColor: theme.brand }]} onPress={closeHelp}>
            <Text style={styles.helpCloseText}>{t('widget.gotIt') || 'Got It'}</Text>
          </HapticButton>
        </View>
      </SharedBottomSheet>

      <SharedBottomSheet
        visible={myWidgetsVisible}
        onClose={closeMyWidgets}
        style={{ backgroundColor: theme.bg, paddingBottom: insets.bottom + 20 }}
      >
        <View style={styles.bottomSheetHandle} />
        <Text style={[styles.sectionTitle, { color: theme.text, paddingHorizontal: 20, marginBottom: 16 }]}>{t('widgetOverlay.myWidgets') || 'My Widgets'}</Text>
        {activeWidgets.length === 0 ? (
          <Text style={{ color: theme.textMuted, paddingHorizontal: 20, marginBottom: 20, fontFamily: 'Manrope-Regular' }}>No widgets created yet.</Text>
        ) : (
          <ScrollView style={{ maxHeight: 350, marginBottom: 20 }}>
            {activeWidgets.map((w, index) => {
              const bData = w.data || {};
              const bName = bData.recipient || 'Someone special';
              const bStyle = bData.widgetStyle || 'petal';
              const flowerIds = bData.flowerIds || [];
              const wStyleName = WIDGET_STYLES.find(s => s.id === bStyle)?.label || 'Petal';
              const isSelected = selectedWidgetId === w.widgetId;
              return (
                <HapticButton
                  key={w.widgetId}
                  style={[
                    styles.bouquetRow,
                    {
                      backgroundColor: isSelected
                        ? (theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)')
                        : theme.cardBg,
                      borderColor: theme.border,
                      borderWidth: 1,
                      marginHorizontal: 20,
                      marginBottom: 12
                    }
                  ]}
                  onPress={() => {
                    setSelectedWidgetId(w.widgetId);
                    closeMyWidgets();
                    const bData = w.data;
                    if (bData) {
                      if (bData.widgetStyle) setWidgetStyle(bData.widgetStyle);
                      const b = bouquets.find(bq => bq.id === bData.id);
                      if (b) setSelectedBouquet(b);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.bouquetFlowerCard, { backgroundColor: theme.bg, borderColor: theme.border }]}>
                    {flowerIds.length === 0 ? (
                      <MaterialCommunityIcons name="flower-outline" size={22} color={theme.border} />
                    ) : (
                      <View style={styles.flowerContainer}>
                        {flowerIds.slice(0, 3).map((fid, idx) => (
                          <PremiumImage
                            key={idx}
                            source={getFlowerImg(fid)}
                            style={[styles.bouquetRowFlowerImg, { marginLeft: idx > 0 ? -8 : 0, zIndex: 3 - idx }]}
                            resizeMode="contain"
                          />
                        ))}
                      </View>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowRecipient, { color: theme.text }]} numberOfLines={1}>
                      {t('widgetOverlay.to')} {bName}
                    </Text>
                    <Text style={[styles.rowDate, { color: theme.textMuted }]}>{wStyleName}</Text>
                  </View>
                  <HapticButton onPress={() => handleClearWidget(w.widgetId)} style={{ padding: 8 }}>
                    <Feather name="trash-2" size={18} color={theme.textMuted} />
                  </HapticButton>
                </HapticButton>
              );
            })}
          </ScrollView>
        )}
      </SharedBottomSheet>

      {/* ── Add-widget guide modal (shown when no widget placed yet) ─── */}
      {addGuideVisible && (
        <View style={[StyleSheet.absoluteFillObject, { zIndex: 9999, elevation: 999 }]} pointerEvents="box-none">
          <HapticButton style={styles.successOverlay} activeOpacity={1} onPress={() => setAddGuideVisible(false)}>
            <View style={[styles.successBox, { backgroundColor: theme.cardBg }]} onStartShouldSetResponder={() => true}>
              <View style={[styles.successIconCircle, { backgroundColor: theme.brand }]}>
                <Feather name="smartphone" size={30} color="#fff" />
              </View>
              <Text style={[styles.successTitle, { color: theme.text }]}>
                {t('widget.howToUseWidgets') || 'How to Add a Widget'}
              </Text>
              {canPinWidget && (
                <>
                  <Text style={[styles.successMessage, { color: theme.textMuted, textAlign: 'center', marginBottom: 12 }]}>
                    You can try pinning the widget directly!
                  </Text>
                  <HapticButton
                    style={[styles.helpCloseBtn, { backgroundColor: theme.brand, alignSelf: 'center', paddingHorizontal: 36, width: '100%', marginBottom: 12 }]}
                    onPress={() => {
                      handlePinWidget();
                    }}
                  >
                    <Text style={styles.helpCloseText}>One-Tap Add</Text>
                  </HapticButton>
                  <Text style={[styles.successMessage, { color: theme.textMuted, textAlign: 'center', marginBottom: 12, fontSize: 13, fontWeight: '600' }]}>
                    Or add it manually:
                  </Text>
                </>
              )}
              
              {[
                Platform.OS === 'android' ? '1. Go to your home screen' : 'Home screen widgets are available on Android.',
                Platform.OS === 'android' ? '2. Long-press on an empty space' : null,
                Platform.OS === 'android' ? '3. Tap "Widgets"' : null,
                Platform.OS === 'android' ? '4. Find & select "DigiBouquet"' : null,
                Platform.OS === 'android' ? '5. Place it, then come back here!' : null,
              ].filter(Boolean).map((step, i) => (
                <Text key={i} style={[styles.successMessage, { color: theme.textMuted, textAlign: 'left', alignSelf: 'stretch', marginTop: 4 }]}>
                  {step}
                </Text>
              ))}
              
              <HapticButton
                style={[styles.helpCloseBtn, { backgroundColor: theme.brand, marginTop: 24, alignSelf: 'center', paddingHorizontal: 36, width: '100%' }]}
                onPress={() => setAddGuideVisible(false)}
              >
                <Text style={styles.helpCloseText}>{t('widget.gotIt') || 'OK, Got It!'}</Text>
              </HapticButton>
            </View>
          </HapticButton>
        </View>
      )}

      {/* ── Success modal ─────────────────────────────────────────────── */}
      {successVisible && (
        <View style={[StyleSheet.absoluteFillObject, { zIndex: 9999, elevation: 999 }]} pointerEvents="box-none">
          <HapticButton style={styles.successOverlay} activeOpacity={1} onPress={() => setSuccessVisible(false)}>
            <View style={[styles.successBox, { backgroundColor: theme.cardBg }]} onStartShouldSetResponder={() => true}>
              <View style={styles.successIconCircle}>
                <Feather name="check" size={32} color="#fff" />
              </View>
              <Text style={[styles.successTitle, { color: theme.text }]}>{t('widgetOverlay.successTitle') || 'Success'}</Text>
              <Text style={[styles.successMessage, { color: theme.textMuted }]}>{t('widgetOverlay.successMessage') || 'Widget updated!'}</Text>
            </View>
          </HapticButton>
        </View>
      )}
    </View>
  );
}

const wStyles = StyleSheet.create({
  previewContainer: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
  },
  previewLabel: {
    fontFamily: 'Manrope-Bold',
    fontSize: 10,
    letterSpacing: 2,
    color: '#997E7A',
    marginBottom: 20,
    textTransform: 'uppercase',
  },
  widgetFrame: {
    width: 280,
    height: 150, 
    borderRadius: 24,
    overflow: 'hidden',
  },
  widgetContent: {
    flex: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pRecipientBlock: {
    flex: 1,
    alignItems: 'flex-start',
    paddingRight: 10,
  },
  pNameText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 18,
  },
  pSenderText: {
    fontFamily: 'Manrope-Regular',
    fontSize: 11,
    marginTop: 4,
    opacity: 0.8,
  },
  pDateText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 9,
    letterSpacing: 1,
    marginTop: 12,
    opacity: 0.6,
    textTransform: 'uppercase',
  }
});


const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: 'Manrope-SemiBold', fontSize: 17 },
  helpBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20 },
  section: { marginBottom: 24 },
  sectionTitle: { fontFamily: 'Manrope-Bold', fontSize: 16, marginBottom: 16 },
  tabsScroll: { paddingBottom: 8 },
  tabsRow: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 12,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginRight: 4,
  },
  tabText: { fontFamily: 'Manrope-Bold', fontSize: 13 },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 20,
  },
  emptyText: { fontFamily: 'Manrope-Regular', fontSize: 14, marginTop: 12 },
  bouquetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14, // Matching homepage style
    borderWidth: 1,
    marginBottom: 10,
  },
  bouquetFlowerCard: {
    width: 72, 
    height: 56, 
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 14,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flowerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  bouquetRowFlowerImg: { 
    width: 34, 
    height: 34 
  },
  rowRecipient: { 
    fontFamily: 'Manrope-SemiBold', 
    fontSize: 14 
  },
  rowDate: { 
    fontFamily: 'Manrope-Regular', 
    fontSize: 12, 
    marginTop: 2 
  },
  checkCircle: {
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center'
  },
  emptyCircle: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.12)',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  confirmBtn: {
    height: 50, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  confirmBtnText: { color: '#fff', fontFamily: 'Manrope-Bold', fontSize: 14 },
  // New button styles
  secondaryBtn: {
    flex: 1,
    height: 48, borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 12,
  },
  secondaryBtnText: { fontFamily: 'Manrope-SemiBold', fontSize: 13 },
  primaryBtn: {
    flex: 1.6,
    height: 48, borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 14,
  },
  primaryBtnText: { color: '#fff', fontFamily: 'Manrope-SemiBold', fontSize: 13 },
  cancelBtn: { height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: { fontFamily: 'Manrope-Bold', fontSize: 15 },
  helpOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: 24
  },
  helpBox: { width: '100%', borderRadius: 24, padding: 24 },
  helpHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  helpTitle: { fontFamily: 'Manrope-Bold', fontSize: 20 },
  helpSteps: { marginBottom: 24 },
  helpStep: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  stepNum: { 
    width: 24, height: 24, borderRadius: 12, 
    alignItems: 'center', justifyContent: 'center', marginRight: 12 
  },
  stepNumText: { color: '#fff', fontFamily: 'Manrope-Bold', fontSize: 12 },
  stepText: { fontFamily: 'Manrope-Regular', fontSize: 14, flex: 1 },
  helpCloseBtn: { height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  helpCloseText: { color: '#fff', fontFamily: 'Manrope-Bold', fontSize: 16 },
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  successBox: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '90%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  successIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 22,
    color: '#2A2520',
    marginBottom: 12,
    textAlign: 'center',
  },
  successMessage: {
    fontFamily: 'Manrope-Regular',
    fontSize: 14,
    color: '#7A7060',
    textAlign: 'center',
    lineHeight: 20,
  },
  bottomSheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  bottomSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#ccc',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
});
