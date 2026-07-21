import { HapticButton } from '../components/HapticButton';
import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  StatusBar, ActivityIndicator, Modal, Animated, Dimensions, PanResponder,
  TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import LottieView from 'lottie-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useSwipeNavigation } from '../hooks/useSwipeNavigation';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { useAuth } from '../contexts/AuthContext';

import { collection, query, where, getDocs, doc, writeBatch, updateDoc, setDoc } from 'firebase/firestore';
import { deleteUser, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { db } from '../firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from '../utils/haptics';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { scheduleHolidayNotifications } from '../utils/notifications';

const BRAND = '#7A5C58';
const CREAM = '#FAF7F2';
const DARK = '#5C4844';
const MUTED = '#997E7A';
const MID = '#EAE0D5';
const WHITE = '#fff';
const RED = '#E05252';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Custom Confirmation Modal Component
export default function SettingsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { theme: tTheme, isDark } = useTheme();
  const { t } = useLanguage();
  const { getTextSize } = useAccessibility();
  const { currentUser } = useAuth();
  const hasPasswordProvider = currentUser?.providerData?.some(p => p.providerId === 'password');
  
  // Settings toggles
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [touchSoundEnabled, setTouchSoundEnabled] = useState(true);
  
  // Delete account states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePw, setDeletePw]               = useState('');
  const [deleteLoading, setDeleteLoading]     = useState(false);
  const [deleteError, setDeleteError]         = useState('');
  const [showSuccess, setShowSuccess]         = useState(false);

  const [deleteSlideAnim] = useState(() => new Animated.Value(SCREEN_HEIGHT));
  const [deleteOverlayAnim] = useState(() => new Animated.Value(0));
  const deletePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 2 && Math.abs(gs.dy) > Math.abs(gs.dx),
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) deleteSlideAnim.setValue(gs.dy);
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 80 || gs.vy > 0.5) {
          Animated.parallel([
            Animated.spring(deleteSlideAnim, {
              toValue: SCREEN_HEIGHT,
              velocity: gs.vy,
              useNativeDriver: true,
              tension: 65,
              friction: 11,
            }),
            Animated.timing(deleteOverlayAnim, {
              toValue: 0,
              duration: 220,
              useNativeDriver: true,
            })
          ]).start(() => {
            setShowDeleteModal(false);
            setDeleteError('');
          });
        } else {
          Animated.spring(deleteSlideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(deleteSlideAnim, { toValue: 0, useNativeDriver: true }).start();
      },
    })
  ).current;

  // Swipe-down and tap to close for overlay background
  const deleteOverlayPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 2,
      onPanResponderMove: (_, gs) => { if (gs.dy > 0) deleteSlideAnim.setValue(gs.dy); },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 80 || gs.vy > 0.5) {
          Animated.parallel([
            Animated.timing(deleteSlideAnim, { toValue: SCREEN_HEIGHT, duration: 180, useNativeDriver: true }),
            Animated.timing(deleteOverlayAnim, { toValue: 0, duration: 180, useNativeDriver: true })
          ]).start(() => {
            setShowDeleteModal(false);
            setDeleteError('');
          });
        } else if (Math.abs(gs.dy) < 10 && Math.abs(gs.dx) < 10) {
          closeDeleteModal();
        } else {
          Animated.spring(deleteSlideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }).start();
        }
      },
      onPanResponderTerminate: () => { Animated.spring(deleteSlideAnim, { toValue: 0, useNativeDriver: true }).start(); }
    })
  ).current;

  React.useEffect(() => {
    if (showDeleteModal) {
      // Cancel any in-flight animation, then open fresh
      deleteSlideAnim.stopAnimation();
      deleteOverlayAnim.stopAnimation();
      deleteSlideAnim.setValue(SCREEN_HEIGHT);
      Animated.parallel([
        Animated.spring(deleteSlideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
        Animated.timing(deleteOverlayAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      // Don't animate here — swipe/closeDeleteModal already animated it out.
      // Just reset values so next open starts clean.
      deleteSlideAnim.setValue(SCREEN_HEIGHT);
      deleteOverlayAnim.setValue(0);
    }
  }, [showDeleteModal]);

  const closeDeleteModal = () => {
    Animated.parallel([
      Animated.timing(deleteSlideAnim, { toValue: SCREEN_HEIGHT, duration: 180, useNativeDriver: true }),
      Animated.timing(deleteOverlayAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      setShowDeleteModal(false);
      setDeleteError('');
    });
  };

  // Swipe-down from content area (inputs) — no start capture so TextInput still works
  const deleteContentPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 40 && Math.abs(gs.dy) > Math.abs(gs.dx) * 1.5 && gs.vy > 0.2,
      onMoveShouldSetPanResponderCapture: (_, gs) => gs.dy > 60 && gs.vy > 0.4,
      onPanResponderMove: (_, gs) => { if (gs.dy > 0) deleteSlideAnim.setValue(gs.dy); },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 80 || gs.vy > 0.5) {
          Animated.parallel([
            Animated.timing(deleteSlideAnim, { toValue: SCREEN_HEIGHT, duration: 180, useNativeDriver: true }),
            Animated.timing(deleteOverlayAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
          ]).start(() => { setShowDeleteModal(false); setDeleteError(''); });
        } else {
          Animated.spring(deleteSlideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }).start();
        }
      },
      onPanResponderTerminate: () => { Animated.spring(deleteSlideAnim, { toValue: 0, useNativeDriver: true }).start(); },
    })
  ).current;


  const swipeHandlers = useSwipeNavigation({
    onSwipeRight: () => navigation.goBack(),
  });

  const handleDeleteAccount = async () => {
    setDeleteError('');
    if (hasPasswordProvider && !deletePw) { setDeleteError(t('profile.enterPwConfirm')); return; }
    setDeleteLoading(true);
    try {
      if (hasPasswordProvider) {
        const cred = EmailAuthProvider.credential(currentUser.email, deletePw);
        await reauthenticateWithCredential(currentUser, cred);
      }

      const uid = currentUser.uid;
      const batch = writeBatch(db);

      // Find all bouquets by this user and remove their slugs (make inaccessible, keep data)
      const bouquetSnap = await getDocs(query(collection(db, 'bouquet-cards'), where('userId', '==', uid)));
      bouquetSnap.forEach(d => {
        const data = d.data();
        if (data.slug) {
          batch.delete(doc(db, 'slugs', `bouquet__${data.slug}`));
        }
        batch.update(doc(db, 'bouquet-cards', d.id), { deleted: true, slug: null });
      });

      await batch.commit();

      // Clear all local storage
      const keys = await AsyncStorage.getAllKeys();
      const keysToRemove = keys.filter(k => 
        k.startsWith('bouquet_created_') ||
        k.startsWith('bouquet_received_') ||
        k.startsWith('bouquet_') ||
        k === 'received_bouquets' ||
        k === 'home_bouquets_cache' ||
        k === 'history_bouquets_cache' ||
        k === 'widget_bouquet_data' ||
        k === 'widget_selected_bouquet' ||
        k === 'widget_style'
      );
      
      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
      }

      // Delete Firebase user
      await deleteUser(currentUser);

      // Show success animation then navigate
      setShowSuccess(true);
      setTimeout(() => {
        navigation.replace('Welcome');
      }, 2200);
    } catch (e) {
      if (e.code === 'auth/wrong-password') {
        setDeleteError(t('profile.incorrectPwDelete'));
      } else {
        setDeleteError(t('profile.deleteError'));
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  // Load settings on mount
  React.useEffect(() => {
    AsyncStorage.multiGet(['notifications_enabled', 'touch_sound_enabled']).then(values => {
      const notif = values[0][1];
      const sound = values[1][1];
      setNotificationsEnabled(notif !== 'false');
      setTouchSoundEnabled(sound !== 'false');
    });
  }, []);

  // Toggle handlers
  const toggleNotifications = async () => {
    const newValue = !notificationsEnabled;
    let expoPushToken = null;
    if (newValue) {
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted') {
          Toast.show({
            type: 'error',
            text1: t('common.error') || 'Permission denied',
            text2: 'Please enable notifications in your device settings.',
          });
          return;
        }
        // SDK 52+: projectId must be passed explicitly for production builds
        const projectId =
          Constants?.expoConfig?.extra?.eas?.projectId ??
          Constants?.easConfig?.projectId;
        const tokenData = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined
        );
        expoPushToken = tokenData.data;
      } catch (e) {
        console.warn('Failed to request notification permission', e);
      }
    }
    setNotificationsEnabled(newValue);
    await AsyncStorage.setItem('notifications_enabled', String(newValue));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (currentUser) {
      try {
        // Save / clear token in user's own doc so RAOK Cloud Function can find it
        await setDoc(
          doc(db, 'users', currentUser.uid),
          { expoPushToken: expoPushToken ?? null },
          { merge: true }
        );

        // Also update all existing bouquet-cards for reply notifications
        const bouquetSnap = await getDocs(query(collection(db, 'bouquet-cards'), where('userId', '==', currentUser.uid)));
        if (!bouquetSnap.empty) {
          const batch = writeBatch(db);
          bouquetSnap.forEach(d => {
            batch.update(doc(db, 'bouquet-cards', d.id), { 
              notifyOnReply: newValue,
              ...(expoPushToken ? { senderExpoPushToken: expoPushToken } : {})
            });
          });
          await batch.commit();
        }
      } catch (e) {
        console.error('Error syncing notification settings:', e);
      }
    }

    // Reschedule holiday notifications now that the user has opted in
    if (newValue) {
      // Clear the cached schedule key so notifications are re-scheduled immediately
      await AsyncStorage.removeItem('holiday_notifications_scheduled_key');
      scheduleHolidayNotifications();
    }

    Toast.show({
      type: 'success',
      text1: newValue ? t('common.enabled') : t('common.disabled'),
      text2: t('profile.notificationsEnabled') || 'Notifications',
      visibilityTime: 2000,
    });
  };

  const toggleTouchSound = async () => {
    const newValue = !touchSoundEnabled;
    setTouchSoundEnabled(newValue);
    Haptics.setGlobalTouchSound(newValue);
    await AsyncStorage.setItem('touch_sound_enabled', String(newValue));
    Haptics.impactAsync(); // will only trigger if newValue is true
    Toast.show({
      type: 'success',
      text1: newValue ? t('common.enabled') : t('common.disabled'),
      text2: t('profile.hapticFeedback') || 'Haptic Feedback',
      visibilityTime: 2000,
    });
  };



  return (
    <View style={[styles.root, { backgroundColor: tTheme.bg }]} {...swipeHandlers}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={tTheme.bg} />

      <View style={[styles.header, { paddingTop: insets.top, backgroundColor: tTheme.bg, borderBottomColor: tTheme.border }]}>
        <HapticButton style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={tTheme.text} />
        </HapticButton>
        <Text style={[styles.headerTitle, { color: tTheme.text, fontSize: getTextSize(17) }]}>{t('settings.title') || 'Settings'}</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* App Settings Section */}
        <View style={[styles.section, { backgroundColor: tTheme.cardBg }]}>
          <Text style={[styles.sectionLabel, { color: tTheme.textMuted }]}>
            {t('profile.preferences') || 'PREFERENCES'}
          </Text>

          {/* Notifications Toggle */}
          <HapticButton style={styles.actionRow} onPress={toggleNotifications} activeOpacity={0.7}>
            <View style={[styles.actionIcon, { backgroundColor: '#FFF5F0' }]}>
              <Feather name="bell" size={18} color={tTheme.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.actionText, { color: tTheme.text }]}>
                {t('profile.notificationsEnabled') || 'Notifications'}
              </Text>
              <Text style={[styles.actionSubtext, { color: tTheme.textMuted }]}>
                {t('profile.notificationsDesc') || 'Receive notifications for bouquet replies'}
              </Text>
            </View>
            <View style={[styles.toggle, notificationsEnabled && styles.toggleActive]}>
              <View style={[styles.toggleThumb, notificationsEnabled && styles.toggleThumbActive]} />
            </View>
          </HapticButton>

          {/* Haptic Feedback Toggle */}
          <HapticButton style={styles.actionRow} onPress={toggleTouchSound} activeOpacity={0.7}>
            <View style={[styles.actionIcon, { backgroundColor: '#F0FFF4' }]}>
              <Feather name="smartphone" size={18} color={tTheme.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.actionText, { color: tTheme.text }]}>
                {t('profile.hapticFeedback') || 'Haptic Feedback'}
              </Text>
              <Text style={[styles.actionSubtext, { color: tTheme.textMuted }]}>
                {t('profile.hapticFeedbackDesc') || 'Vibrate when tapping buttons'}
              </Text>
            </View>
            <View style={[styles.toggle, touchSoundEnabled && styles.toggleActive]}>
              <View style={[styles.toggleThumb, touchSoundEnabled && styles.toggleThumbActive]} />
            </View>
          </HapticButton>

          {/* Accessibility link */}
          <HapticButton 
            style={styles.actionRow} 
            onPress={() => navigation.navigate('Accessibility')}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#F3E5F5' }]}>
              <Feather name="type" size={18} color="#9C27B0" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.actionText, { color: tTheme.text }]}>
                {t('menu.accessibility') || 'Accessibility'}
              </Text>
              <Text style={[styles.actionSubtext, { color: tTheme.textMuted }]}>
                {t('accessibilityScreen.desc') || 'Customize app experience'}
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={tTheme.textMuted} />
          </HapticButton>

          {/* Data Management link */}
          <HapticButton 
            style={styles.actionRow} 
            onPress={() => navigation.navigate('DataManagement')}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#EAF4FE' }]}>
              <Feather name="database" size={18} color="#1d7bd4" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.actionText, { color: tTheme.text }]}>
                {t('settings.dataManagement') || 'Data Management'}
              </Text>
              <Text style={[styles.actionSubtext, { color: tTheme.textMuted }]}>
                {t('settings.clearDataDesc') || 'Manage cache, widget, and history data'}
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={tTheme.textMuted} />
          </HapticButton>

          <View style={[styles.cardDivider, { backgroundColor: tTheme.border, marginVertical: 8 }]} />

          {/* Terms & Conditions */}
          <HapticButton 
            style={styles.actionRow} 
            onPress={() => navigation.navigate('Terms')}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#E0F7FA' }]}>
              <Feather name="file-text" size={18} color="#00ACC1" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.actionText, { color: tTheme.text }]}>
                {t('menu.terms') || 'Terms & Conditions'}
              </Text>
              <Text style={[styles.actionSubtext, { color: tTheme.textMuted }]}>
                {t('settings.termsSubtext') || 'Read our terms of service agreement'}
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={tTheme.textMuted} />
          </HapticButton>

          {/* Privacy Policy */}
          <HapticButton 
            style={styles.actionRow} 
            onPress={() => navigation.navigate('Privacy')}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#E8F5E9' }]}>
              <Feather name="shield" size={18} color="#43A047" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.actionText, { color: tTheme.text }]}>
                {t('menu.privacy') || 'Privacy Policy'}
              </Text>
              <Text style={[styles.actionSubtext, { color: tTheme.textMuted }]}>
                {t('settings.privacySubtext') || 'Learn how we protect your data privacy'}
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={tTheme.textMuted} />
          </HapticButton>

          {/* Credits */}
          <HapticButton 
            style={styles.actionRow} 
            onPress={() => navigation.navigate('Credits')}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#FFF3E0' }]}>
              <Feather name="star" size={18} color="#FF9800" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.actionText, { color: tTheme.text }]}>
                {t('menu.credits') || 'Credits'}
              </Text>
              <Text style={[styles.actionSubtext, { color: tTheme.textMuted }]}>
                {t('settings.creditsSubtext') || 'Tools, resources, and special thanks'}
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={tTheme.textMuted} />
          </HapticButton>
        </View>

        {/* Danger Zone (only shown to logged-in users) */}
        {currentUser && (
          <View style={[styles.section, { backgroundColor: tTheme.cardBg, marginTop: 12 }]}>
            <Text style={[styles.sectionLabel, { color: RED }]}>
              {t('profile.dangerZone') || 'DANGER ZONE'}
            </Text>
            <Text style={[styles.dangerDesc, { color: tTheme.textMuted }]}>
              {t('profile.deleteDesc') || 'Deleting your account will make all your bouquets inaccessible but will preserve recipient data. This action cannot be undone.'}
            </Text>
            <HapticButton 
              style={styles.deleteBtn} 
              onPress={() => setShowDeleteModal(true)}
              activeOpacity={0.7}
            >
              <Feather name="trash-2" size={16} color={RED} />
              <Text style={styles.deleteBtnText}>
                {t('profile.deleteAccount') || 'Delete Account'}
              </Text>
            </HapticButton>
          </View>
        )}

      </ScrollView>

      {/* Delete account modal */}
      <Modal hardwareAccelerated={true} visible={showDeleteModal} transparent animationType="none" onRequestClose={closeDeleteModal}>
        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={StyleSheet.absoluteFill}>
            <Animated.View 
              pointerEvents="auto" 
              style={[styles.sheetOverlay, { opacity: deleteOverlayAnim }]}
              {...deleteOverlayPanResponder.panHandlers}
            />
            <View style={styles.sheetContainer}>
              <Animated.View
                style={{ flex: 1 }}
                {...deleteOverlayPanResponder.panHandlers}
              />
             <Animated.View 
              style={[
                styles.bottomSheet, 
                { 
                  backgroundColor: tTheme.cardBg, 
                  paddingBottom: Math.max(insets.bottom, 16) + 16,
                  transform: [{ translateY: deleteSlideAnim }]
                }
              ]}
              {...deleteContentPanResponder.panHandlers}
            >
              <View style={[styles.sheetHandle, { backgroundColor: tTheme.border }]} 
                {...deletePanResponder.panHandlers} 
              />
              <View 
                style={styles.sheetHeader}
                {...deletePanResponder.panHandlers}
              >
                <Text style={[styles.sheetTitle, { color: RED }]}>{t('profile.deleteModalTitle')}</Text>
              </View>
              <Text style={[styles.sheetDesc, { color: tTheme.textMuted, textAlign: 'left', marginBottom: 16 }]}>
                {hasPasswordProvider ? t('profile.deleteModalDesc') : t('profile.deleteDesc')}
              </Text>
              {deleteError ? <Text style={styles.formError}>{deleteError}</Text> : null}
              {hasPasswordProvider && (
                <TextInput
                  style={[styles.modalInput, { backgroundColor: tTheme.inputBg, borderColor: tTheme.border, color: tTheme.text }]}
                  placeholder={t('login.password')}
                  placeholderTextColor={tTheme.textMuted}
                  value={deletePw}
                  onChangeText={setDeletePw}
                  secureTextEntry
                />
              )}
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                <HapticButton
                  style={[styles.sheetBtn, { flex: 1, backgroundColor: tTheme.surface2 || MID }]}
                  onPress={closeDeleteModal}
                >
                  <Text style={[styles.sheetBtnText, { color: tTheme.text || DARK }]}>{t('common.cancel')}</Text>
                </HapticButton>
                <HapticButton
                  style={[styles.sheetBtn, { flex: 1, backgroundColor: RED }, (hasPasswordProvider && !deletePw || deleteLoading) && { opacity: 0.5 }]}
                  onPress={handleDeleteAccount}
                  disabled={(hasPasswordProvider && !deletePw) || deleteLoading}
                >
                  {deleteLoading
                    ? <ActivityIndicator color={WHITE} />
                    : <Text style={styles.sheetBtnText}>{t('profile.yesDelete')}</Text>}
                </HapticButton>
              </View>
            </Animated.View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
      
      {/* Success Animation Modal */}
      <Modal hardwareAccelerated={true} visible={showSuccess} transparent animationType="fade">
        <View style={styles.successOverlay}>
          <LottieView
            source={showSuccess ? { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/animations/Done.json' } : null}
            autoPlay
            loop={false}
            style={{ width: 200, height: 200 }}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: CREAM },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: MID,
    backgroundColor: CREAM,
  },
  backBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: 'Manrope-SemiBold', fontSize: 17, color: DARK },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 28 },

  section: {
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  sectionLabel: {
    fontFamily: 'Manrope-Bold',
    fontSize: 10,
    color: MUTED,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  cardDivider: {
    height: 1,
    backgroundColor: MID,
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
    fontSize: 15,
    color: DARK,
  },
  actionSubtext: {
    fontFamily: 'Manrope-Regular',
    fontSize: 12,
    color: MUTED,
    marginTop: 2,
  },

  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  infoBoxText: {
    flex: 1,
    fontFamily: 'Manrope-Regular',
    fontSize: 13,
    color: MUTED,
    lineHeight: 20,
  },

  // Toggle Styles
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EAE0D5',
    padding: 2,
  },
  toggleActive: {
    backgroundColor: BRAND,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: WHITE,
  },
  toggleThumbActive: {
    transform: [{ translateX: 20 }],
  },

  // Danger zone
  dangerZone: {
    backgroundColor: '#FFF5F5', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#FADADD', marginTop: 4, marginBottom: 8,
  },
  dangerLabel: { fontFamily: 'Manrope-Bold', fontSize: 10, color: RED, letterSpacing: 1.5, marginBottom: 8 },
  dangerDesc: { fontFamily: 'Manrope-Regular', fontSize: 13, color: MUTED, lineHeight: 20, marginBottom: 12 },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 12, borderRadius: 10,
    borderWidth: 1, borderColor: RED,
  },
  deleteBtnText: { fontFamily: 'Manrope-SemiBold', fontSize: 14, color: RED },

  // Sheet
  sheetOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheetContainer: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'transparent' },
  bottomSheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 24, paddingTop: 12,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, elevation: 20,
  },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sheetTitle: { fontFamily: 'Manrope-Bold', fontSize: 18 },
  sheetDesc: { fontFamily: 'Manrope-Regular', fontSize: 14, lineHeight: 22, marginBottom: 12 },
  sheetBtn: { borderRadius: 14, paddingVertical: 15, alignItems: 'center', justifyContent: 'center' },
  sheetBtnText: { fontFamily: 'Manrope-Bold', fontSize: 15, color: WHITE },
  modalInput: {
    backgroundColor: CREAM, borderRadius: 12, paddingVertical: 14,
    paddingHorizontal: 16, fontSize: 15, fontFamily: 'Manrope-Regular',
    color: DARK, marginBottom: 12, borderWidth: 1, borderColor: MID,
  },
  formError: {
    fontFamily: 'Manrope-Regular', fontSize: 13, color: RED,
    backgroundColor: '#fdecea', borderRadius: 8, padding: 10, marginBottom: 12,
  },
  successOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: WHITE,
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
    backgroundColor: MID,
    alignSelf: 'center',
    marginBottom: 20,
  },
  content: {
    marginBottom: 24,
  },
  title: {
    fontFamily: 'Manrope-Bold',
    fontSize: 20,
    color: DARK,
    marginBottom: 12,
  },
  message: {
    fontFamily: 'Manrope-Regular',
    fontSize: 15,
    color: MUTED,
    lineHeight: 22,
  },
  buttons: {
    gap: 12,
  },
  button: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButton: {
    backgroundColor: RED,
  },
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
    color: DARK,
  },
});
