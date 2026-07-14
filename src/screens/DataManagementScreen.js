import { HapticButton } from '../components/HapticButton';
import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  StatusBar, ActivityIndicator, Modal, Animated, Dimensions, PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { useLanguage } from '../contexts/LanguageContext';
import { useSwipeNavigation } from '../hooks/useSwipeNavigation';
import { useAccessibility } from '../contexts/AccessibilityContext';
import Toast from 'react-native-toast-message';
import { 
  clearAllCaches, 
  clearWidgetData, 
  getReceivedBouquets,
  removeFromReceivedBouquets 
} from '../utils/storageManager';

const BRAND = '#7A5C58';
const CREAM = '#FAF7F2';
const DARK = '#5C4844';
const MUTED = '#997E7A';
const MID = '#EAE0D5';
const WHITE = '#fff';
const RED = '#E05252';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Custom Confirmation Modal Component
function ConfirmModal({ visible, title, message, onConfirm, onCancel, confirmText, confirmColor = RED, theme, t }) {
  const [slideAnim] = useState(() => new Animated.Value(SCREEN_HEIGHT));
  const [overlayAnim] = useState(() => new Animated.Value(0));
  const insets = useSafeAreaInsets();

  // Swipe-down to close for handle/header
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 2 && Math.abs(gs.dy) > Math.abs(gs.dx),
      onPanResponderMove: (_, gs) => { if (gs.dy > 0) slideAnim.setValue(gs.dy); },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 80 || gs.vy > 0.5) {
          Animated.parallel([
            Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 180, useNativeDriver: true }),
            Animated.timing(overlayAnim, { toValue: 0, duration: 180, useNativeDriver: true })
          ]).start(() => {
            onCancel();
          });
        } else {
          Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true }).start();
      },
    })
  ).current;

  // Swipe-down and tap to close for overlay background
  const overlayPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 2,
      onPanResponderMove: (_, gs) => { if (gs.dy > 0) slideAnim.setValue(gs.dy); },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 80 || gs.vy > 0.5) {
          Animated.parallel([
            Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 180, useNativeDriver: true }),
            Animated.timing(overlayAnim, { toValue: 0, duration: 180, useNativeDriver: true })
          ]).start(() => {
            onCancel();
          });
        } else if (Math.abs(gs.dy) < 10 && Math.abs(gs.dx) < 10) {
          // Tap: Slide down smoothly
          Animated.parallel([
            Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 220, useNativeDriver: true }),
            Animated.timing(overlayAnim, { toValue: 0, duration: 220, useNativeDriver: true })
          ]).start(() => {
            onCancel();
          });
        } else {
          Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true }).start();
      }
    })
  ).current;

  React.useEffect(() => {
    if (visible) {
      // Cancel any in-flight close animation, then open fresh
      slideAnim.stopAnimation();
      overlayAnim.stopAnimation();
      slideAnim.setValue(SCREEN_HEIGHT);
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
        Animated.timing(overlayAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      // Don't animate here — swipe/cancel already handled the close animation.
      // Just reset values so next open starts clean.
      slideAnim.setValue(SCREEN_HEIGHT);
      overlayAnim.setValue(0);
    }
  }, [visible, slideAnim, overlayAnim]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onCancel}>
      <View style={StyleSheet.absoluteFill}>
        <Animated.View 
          pointerEvents="auto" 
          style={[modalStyles.overlay, { opacity: overlayAnim, backgroundColor: 'rgba(0,0,0,0.45)' }]}
          {...overlayPanResponder.panHandlers}
        />
        <Animated.View 
          style={[
            modalStyles.modal, 
            { 
              backgroundColor: theme.cardBg, 
              transform: [{ translateY: slideAnim }], 
              paddingBottom: Math.max(insets.bottom, 24) + 24
            }
          ]} 
        >
          <View 
            style={[modalStyles.handle, { backgroundColor: theme.border }]} 
            {...panResponder.panHandlers}
          />
          
          <View style={modalStyles.content} {...panResponder.panHandlers}>
            <Text style={[modalStyles.title, { color: theme.text }]}>{title}</Text>
            <Text style={[modalStyles.message, { color: theme.textMuted }]}>{message}</Text>
          </View>

          <View style={[modalStyles.buttons, { flexDirection: 'row', gap: 12 }]}>
            <HapticButton 
              style={[modalStyles.button, { flex: 1, backgroundColor: confirmColor }]} 
              onPress={onConfirm}
              activeOpacity={0.8}
            >
              <Text style={modalStyles.confirmButtonText}>{confirmText}</Text>
            </HapticButton>
            <HapticButton 
              style={[modalStyles.button, modalStyles.cancelButton, { flex: 1, backgroundColor: theme.isDarkMode ? '#332E2C' : '#FAF7F2' }]} 
              onPress={onCancel}
              activeOpacity={0.8}
            >
              <Text style={[modalStyles.cancelButtonText, { color: theme.brand }]}>{t('common.cancel') || 'Cancel'}</Text>
            </HapticButton>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

export default function DataManagementScreen() {
  const { theme: rawTheme, isDark } = useTheme();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { getTextSize, getEffectiveTheme } = useAccessibility();
  const tTheme = getEffectiveTheme(rawTheme);

  const [clearing, setClearing] = useState(false);

  // Modal states
  const [confirmModal, setConfirmModal] = useState({
    visible: false,
    title: '',
    message: '',
    confirmText: '',
    confirmColor: RED,
    onConfirm: () => {},
  });

  const swipeHandlers = useSwipeNavigation({
    onSwipeRight: () => navigation.goBack(),
  });

  const showConfirmModal = (config) => {
    setConfirmModal({
      visible: true,
      ...config,
    });
  };

  const hideConfirmModal = () => {
    setConfirmModal(prev => ({ ...prev, visible: false }));
  };

  const handleClearCache = () => {
    showConfirmModal({
      title: t('settings.clearCache') || 'Clear Cache',
      message: t('settings.clearCacheDesc') || 'This will clear cached bouquet data. Your saved bouquets will not be deleted.',
      confirmText: t('settings.clear') || 'Clear',
      confirmColor: tTheme.brand,
      onConfirm: async () => {
        hideConfirmModal();
        setClearing(true);
        try {
          await clearAllCaches();
          Toast.show({
            type: 'success',
            text1: t('common.success'),
            text2: t('settings.cacheCleared') || 'Cache cleared successfully',
            visibilityTime: 2000,
          });
        } catch {
          Toast.show({
            type: 'error',
            text1: t('common.error'),
            text2: t('settings.cacheClearError') || 'Failed to clear cache',
          });
        } finally {
          setClearing(false);
        }
      },
    });
  };

  const handleClearWidgetData = () => {
    showConfirmModal({
      title: t('settings.clearWidget') || 'Clear Widget Data',
      message: t('settings.clearWidgetDesc') || 'This will reset your widget to default. You can reconfigure it anytime.',
      confirmText: t('settings.clear') || 'Clear',
      confirmColor: tTheme.brand,
      onConfirm: async () => {
        hideConfirmModal();
        setClearing(true);
        try {
          await clearWidgetData();
          Toast.show({
            type: 'success',
            text1: t('common.success'),
            text2: t('settings.widgetCleared') || 'Widget data cleared',
            visibilityTime: 2000,
          });
        } catch {
          Toast.show({
            type: 'error',
            text1: t('common.error'),
            text2: t('settings.widgetClearError') || 'Failed to clear widget data',
          });
        } finally {
          setClearing(false);
        }
      },
    });
  };

  const handleClearReceivedBouquets = () => {
    showConfirmModal({
      title: t('settings.clearReceived') || 'Clear Received Bouquets',
      message: t('settings.clearReceivedDesc') || 'This will remove all received bouquets from your history. This cannot be undone.',
      confirmText: t('settings.clear') || 'Clear',
      confirmColor: tTheme.brand,
      onConfirm: async () => {
        hideConfirmModal();
        setClearing(true);
        try {
          const received = await getReceivedBouquets();
          for (const item of received) {
            await removeFromReceivedBouquets(item.id);
          }
          Toast.show({
            type: 'success',
            text1: t('common.success'),
            text2: t('settings.receivedCleared') || 'Received bouquets cleared',
            visibilityTime: 2000,
          });
        } catch {
          Toast.show({
            type: 'error',
            text1: t('common.error'),
            text2: t('settings.receivedClearError') || 'Failed to clear received bouquets',
          });
        } finally {
          setClearing(false);
        }
      },
    });
  };

  const handleClearAllData = () => {
    showConfirmModal({
      title: t('settings.clearAll') || 'Clear All Local Data',
      message: t('settings.clearAllDesc') || 'This will clear all cached data, widget settings, and received bouquets. Your account and created bouquets will not be affected.',
      confirmText: t('settings.clearAll') || 'Clear All',
      confirmColor: RED,
      onConfirm: async () => {
        hideConfirmModal();
        setClearing(true);
        try {
          await clearAllCaches();
          await clearWidgetData();
          const received = await getReceivedBouquets();
          for (const item of received) {
            await removeFromReceivedBouquets(item.id);
          }
          Toast.show({
            type: 'success',
            text1: t('common.success'),
            text2: t('settings.allDataCleared') || 'All local data cleared',
            visibilityTime: 2000,
          });
        } catch {
          Toast.show({
            type: 'error',
            text1: t('common.error'),
            text2: t('settings.allDataClearError') || 'Failed to clear data',
          });
        } finally {
          setClearing(false);
        }
      },
    });
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top, backgroundColor: tTheme.bg }]} {...swipeHandlers}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={tTheme.bg} />

      <View style={[styles.header, { backgroundColor: tTheme.bg, borderBottomColor: tTheme.border }]}>
        <HapticButton onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={tTheme.text} />
        </HapticButton>
        <Text style={[styles.headerTitle, { color: tTheme.text, fontSize: getTextSize(18) }]}>
          {t('settings.dataManagement') || 'Data Management'}
        </Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView 
        style={styles.scroll} 
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.desc, { color: tTheme.textMuted, fontSize: getTextSize(14) }]}>
          {t('settings.dataManagementDesc') || 'Manage and free up local storage occupied by cached files, widgets, and received bouquets.'}
        </Text>

        <View style={[styles.section, { backgroundColor: tTheme.cardBg }]}>
          {/* Clear Cache */}
          <HapticButton 
            style={styles.actionRow} 
            onPress={handleClearCache}
            disabled={clearing}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIcon, { backgroundColor: tTheme.isDarkMode ? '#332E2C' : '#FAF7F2' }]}>
              <Feather name="refresh-cw" size={18} color={tTheme.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.actionText, { color: tTheme.text, fontSize: getTextSize(15) }]}>
                {t('settings.clearCache') || 'Clear Cache'}
              </Text>
              <Text style={[styles.actionSubtext, { color: tTheme.textMuted, fontSize: getTextSize(12) }]}>
                {t('settings.clearCacheSubtext') || 'Free up space by clearing cached data'}
              </Text>
            </View>
            {clearing ? (
              <ActivityIndicator size="small" color={tTheme.brand} />
            ) : (
              <Feather name="chevron-right" size={18} color={tTheme.textMuted} />
            )}
          </HapticButton>

          {/* Clear Widget Data */}
          <HapticButton 
            style={styles.actionRow} 
            onPress={handleClearWidgetData}
            disabled={clearing}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIcon, { backgroundColor: tTheme.isDarkMode ? '#332E2C' : '#FAF7F2' }]}>
              <MaterialCommunityIcons name="flower-tulip" size={18} color={tTheme.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.actionText, { color: tTheme.text, fontSize: getTextSize(15) }]}>
                {t('settings.clearWidget') || 'Clear Widget Data'}
              </Text>
              <Text style={[styles.actionSubtext, { color: tTheme.textMuted, fontSize: getTextSize(12) }]}>
                {t('settings.clearWidgetSubtext') || 'Reset widget to default settings'}
              </Text>
            </View>
            {clearing ? (
              <ActivityIndicator size="small" color={tTheme.brand} />
            ) : (
              <Feather name="chevron-right" size={18} color={tTheme.textMuted} />
            )}
          </HapticButton>

          {/* Clear Received Bouquets */}
          <HapticButton 
            style={styles.actionRow} 
            onPress={handleClearReceivedBouquets}
            disabled={clearing}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIcon, { backgroundColor: tTheme.isDarkMode ? '#332E2C' : '#FAF7F2' }]}>
              <Feather name="inbox" size={18} color={tTheme.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.actionText, { color: tTheme.text, fontSize: getTextSize(15) }]}>
                {t('settings.clearReceived') || 'Clear Received Bouquets'}
              </Text>
              <Text style={[styles.actionSubtext, { color: tTheme.textMuted, fontSize: getTextSize(12) }]}>
                {t('settings.clearReceivedSubtext') || 'Remove all received bouquets from history'}
              </Text>
            </View>
            {clearing ? (
              <ActivityIndicator size="small" color={tTheme.brand} />
            ) : (
              <Feather name="chevron-right" size={18} color={tTheme.textMuted} />
            )}
          </HapticButton>

          <View style={[styles.cardDivider, { backgroundColor: tTheme.border }]} />

          {/* Clear All Local Data */}
          <HapticButton 
            style={styles.actionRow} 
            onPress={handleClearAllData}
            disabled={clearing}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIcon, { backgroundColor: tTheme.isDarkMode ? '#3D2220' : '#FFF0F0' }]}>
              <Feather name="trash-2" size={18} color={RED} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.actionText, { color: RED, fontSize: getTextSize(15) }]}>
                {t('settings.clearAll') || 'Clear All Local Data'}
              </Text>
              <Text style={[styles.actionSubtext, { color: tTheme.textMuted, fontSize: getTextSize(12) }]}>
                {t('settings.clearAllSubtext') || 'Clear cache, widget, and received bouquets'}
              </Text>
            </View>
            {clearing ? (
              <ActivityIndicator size="small" color={RED} />
            ) : (
              <Feather name="chevron-right" size={18} color={tTheme.textMuted} />
            )}
          </HapticButton>
        </View>

        {/* Info Box moved inside the page */}
        <View style={[styles.infoBox, { backgroundColor: tTheme.surface2 || '#F0F0F0' }]}>
          <Feather name="info" size={16} color={tTheme.brand} />
          <Text style={[styles.infoBoxText, { color: tTheme.textMuted, fontSize: getTextSize(13) }]}>
            {t('settings.infoText') || 'Clearing data will not delete your account or created bouquets. Your data is safely stored in the cloud.'}
          </Text>
        </View>
      </ScrollView>

      {/* Confirmation Modal */}
      <ConfirmModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        confirmColor={confirmModal.confirmColor}
        onConfirm={confirmModal.onConfirm}
        onCancel={hideConfirmModal}
        theme={tTheme}
        t={t}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  backBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontFamily: 'Manrope-Bold' },
  scroll: { flex: 1 },
  content: { padding: 24 },
  desc: { fontSize: 14, marginBottom: 24, lineHeight: 20, fontFamily: 'Manrope-Regular' },
  section: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  cardDivider: {
    height: 1,
    marginVertical: 16,
    marginHorizontal: -4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionText: {
    fontFamily: 'Manrope-SemiBold',
  },
  actionSubtext: {
    fontFamily: 'Manrope-Regular',
    marginTop: 2,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  infoBoxText: {
    flex: 1,
    fontFamily: 'Manrope-Regular',
    lineHeight: 20,
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 999,
  },
  modal: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 20,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  content: {
    marginBottom: 24,
  },
  title: {
    fontFamily: 'Manrope-Bold',
    fontSize: 20,
    marginBottom: 12,
  },
  message: {
    fontFamily: 'Manrope-Regular',
    fontSize: 15,
    lineHeight: 22,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButton: {},
  confirmButtonText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 16,
    color: WHITE,
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
  },
  cancelButtonText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 16,
  },
});
