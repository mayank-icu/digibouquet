import { HapticButton } from '../components/HapticButton';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, StatusBar, Alert, ActivityIndicator, Platform,
  Modal, KeyboardAvoidingView, FlatList, Image, Dimensions,
  Keyboard, Animated, PanResponder
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import {
  collection, query, where, getDocs,
  doc, writeBatch,
} from 'firebase/firestore';
import { updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential, deleteUser, linkWithCredential, unlink } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useCountry } from '../contexts/CountryContext';
import { useSwipeNavigation } from '../hooks/useSwipeNavigation';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { useBouquetData } from '../hooks/useBouquetData';
import { getAllCountries } from '../utils/countryUtils';
import { LANGUAGES } from '../constants/languages';
import { CachedImage } from '../components/CachedImage';

const BRAND = '#7A5C58';
const CREAM = '#FAF7F2';
const DARK  = '#5C4844';
const MUTED = '#997E7A';
const MID   = '#EAE0D5';
const WHITE = '#fff';
const RED   = '#E05252';
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { theme: tTheme, isDark } = useTheme();
  const { currentUser, signOut } = useAuth();
  const { t, locale } = useLanguage();
  const { countryCode, updateCountry } = useCountry();
  const { getTextSize } = useAccessibility();
  const { fetchCreatedBouquets } = useBouquetData();

  const swipeHandlers = useSwipeNavigation({
    onSwipeRight: () => navigation.goBack(),
  });

  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [saving, setSaving]           = useState(false);
  const [saveMsg, setSaveMsg]         = useState('');

  // Change password
  const [showPwModal, setShowPwModal]     = useState(false);
  const [currentPw, setCurrentPw]         = useState('');
  const [newPw, setNewPw]                 = useState('');
  const [pwError, setPwError]             = useState('');
  const [pwLoading, setPwLoading]         = useState(false);


  
  // Google management
  const [showGoogleModal, setShowGoogleModal]     = useState(false);
  const [showCreatePwModal, setShowCreatePwModal] = useState(false);
  const [createPw, setCreatePw]                   = useState('');
  const [createPwLoading, setCreatePwLoading]     = useState(false);
  const [createPwError, setCreatePwError]         = useState('');

  // Sign out confirm
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Country selector
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // ── Shared sheet helpers ──────────────────────────────────────────────────
  function makeSheetPanResponder(slideAnim, overlayAnim, onDismiss) {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 2 && Math.abs(gs.dy) > Math.abs(gs.dx),
      onPanResponderMove: (_, gs) => { if (gs.dy > 0) slideAnim.setValue(gs.dy); },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 80 || gs.vy > 0.5) {
          Animated.parallel([
            Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 180, useNativeDriver: true }),
            Animated.timing(overlayAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
          ]).start(onDismiss);
        } else {
          Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }).start();
        }
      },
      onPanResponderTerminate: () => { Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true }).start(); },
    });
  }
  function makeOverlayPanResponder(slideAnim, overlayAnim, onDismiss) {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 2,
      onPanResponderMove: (_, gs) => { if (gs.dy > 0) slideAnim.setValue(gs.dy); },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 80 || gs.vy > 0.5) {
          Animated.parallel([
            Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 180, useNativeDriver: true }),
            Animated.timing(overlayAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
          ]).start(onDismiss);
        } else if (Math.abs(gs.dy) < 10 && Math.abs(gs.dx) < 10) {
          Animated.parallel([
            Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 220, useNativeDriver: true }),
            Animated.timing(overlayAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
          ]).start(onDismiss);
        } else {
          Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }).start();
        }
      },
      onPanResponderTerminate: () => { Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true }).start(); },
    });
  }
  function openSheet(slideAnim, overlayAnim) {
    // Stop any in-flight close animation before opening
    slideAnim.stopAnimation();
    overlayAnim.stopAnimation();
    slideAnim.setValue(SCREEN_HEIGHT);
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
      Animated.timing(overlayAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  }
  function closeSheet(slideAnim, overlayAnim, onDone) {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 180, useNativeDriver: true }),
      Animated.timing(overlayAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(onDone);
  }
  function makeContentPanResponder(slideAnim, overlayAnim, onDismiss) {
    // Does NOT use onStartShouldSetPanResponder so TextInputs still receive focus.
    // Only intercepts moves that are clearly a deliberate downward swipe.
    return PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 40 && Math.abs(gs.dy) > Math.abs(gs.dx) * 1.5 && gs.vy > 0.2,
      onMoveShouldSetPanResponderCapture: (_, gs) => gs.dy > 60 && gs.vy > 0.4,
      onPanResponderMove: (_, gs) => { if (gs.dy > 0) slideAnim.setValue(gs.dy); },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 80 || gs.vy > 0.5) {
          Animated.parallel([
            Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 180, useNativeDriver: true }),
            Animated.timing(overlayAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
          ]).start(onDismiss);
        } else {
          Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }).start();
        }
      },
      onPanResponderTerminate: () => { Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true }).start(); },
    });
  }
  const [pwSlideAnim] = useState(() => new Animated.Value(SCREEN_HEIGHT));
  const [pwOverlayAnim] = useState(() => new Animated.Value(0));
  const closePwModal = () => closeSheet(pwSlideAnim, pwOverlayAnim, () => { setShowPwModal(false); setPwError(''); });
  const pwPanResponder = useRef(makeSheetPanResponder(pwSlideAnim, pwOverlayAnim, () => { setShowPwModal(false); setPwError(''); })).current;
  const pwOverlayPanResponder = useRef(makeOverlayPanResponder(pwSlideAnim, pwOverlayAnim, () => { setShowPwModal(false); setPwError(''); })).current;
  const pwContentPanResponder = useRef(makeContentPanResponder(pwSlideAnim, pwOverlayAnim, () => { setShowPwModal(false); setPwError(''); })).current;
  // useEffect only drives open animation; close is handled by closeSheet/pan responder
  useEffect(() => { if (showPwModal) openSheet(pwSlideAnim, pwOverlayAnim); else { pwSlideAnim.setValue(SCREEN_HEIGHT); pwOverlayAnim.setValue(0); } }, [showPwModal]);

  // 2. Google Management Modal
  const [googleSlideAnim] = useState(() => new Animated.Value(SCREEN_HEIGHT));
  const [googleOverlayAnim] = useState(() => new Animated.Value(0));
  const closeGoogleModal = () => closeSheet(googleSlideAnim, googleOverlayAnim, () => setShowGoogleModal(false));
  const googlePanResponder = useRef(makeSheetPanResponder(googleSlideAnim, googleOverlayAnim, () => setShowGoogleModal(false))).current;
  const googleOverlayPanResponder = useRef(makeOverlayPanResponder(googleSlideAnim, googleOverlayAnim, () => setShowGoogleModal(false))).current;
  const googleContentPanResponder = useRef(makeContentPanResponder(googleSlideAnim, googleOverlayAnim, () => setShowGoogleModal(false))).current;
  useEffect(() => { if (showGoogleModal) openSheet(googleSlideAnim, googleOverlayAnim); else { googleSlideAnim.setValue(SCREEN_HEIGHT); googleOverlayAnim.setValue(0); } }, [showGoogleModal]);

  // 3. Create Password Modal
  const [createPwSlideAnim] = useState(() => new Animated.Value(SCREEN_HEIGHT));
  const [createPwOverlayAnim] = useState(() => new Animated.Value(0));
  const closeCreatePwModal = () => closeSheet(createPwSlideAnim, createPwOverlayAnim, () => { setShowCreatePwModal(false); setCreatePwError(''); });
  const createPwPanResponder = useRef(makeSheetPanResponder(createPwSlideAnim, createPwOverlayAnim, () => { setShowCreatePwModal(false); setCreatePwError(''); })).current;
  const createPwOverlayPanResponder = useRef(makeOverlayPanResponder(createPwSlideAnim, createPwOverlayAnim, () => { setShowCreatePwModal(false); setCreatePwError(''); })).current;
  const createPwContentPanResponder = useRef(makeContentPanResponder(createPwSlideAnim, createPwOverlayAnim, () => { setShowCreatePwModal(false); setCreatePwError(''); })).current;
  useEffect(() => { if (showCreatePwModal) openSheet(createPwSlideAnim, createPwOverlayAnim); else { createPwSlideAnim.setValue(SCREEN_HEIGHT); createPwOverlayAnim.setValue(0); } }, [showCreatePwModal]);

  // 4. Sign Out Modal
  const [signOutSlideAnim] = useState(() => new Animated.Value(SCREEN_HEIGHT));
  const [signOutOverlayAnim] = useState(() => new Animated.Value(0));
  const closeSignOutModal = () => closeSheet(signOutSlideAnim, signOutOverlayAnim, () => setShowSignOutModal(false));
  const signOutPanResponder = useRef(makeSheetPanResponder(signOutSlideAnim, signOutOverlayAnim, () => setShowSignOutModal(false))).current;
  const signOutOverlayPanResponder = useRef(makeOverlayPanResponder(signOutSlideAnim, signOutOverlayAnim, () => setShowSignOutModal(false))).current;
  useEffect(() => { if (showSignOutModal) openSheet(signOutSlideAnim, signOutOverlayAnim); else { signOutSlideAnim.setValue(SCREEN_HEIGHT); signOutOverlayAnim.setValue(0); } }, [showSignOutModal]);

  // 5. Country Picker Modal
  const [countrySlideAnim] = useState(() => new Animated.Value(SCREEN_HEIGHT));
  const [countryOverlayAnim] = useState(() => new Animated.Value(0));
  const closeCountryModal = () => closeSheet(countrySlideAnim, countryOverlayAnim, () => { setShowCountryModal(false); setCountrySearch(''); });
  const countryPanResponder = useRef(makeSheetPanResponder(countrySlideAnim, countryOverlayAnim, () => { setShowCountryModal(false); setCountrySearch(''); })).current;
  const countryOverlayPanResponder = useRef(makeOverlayPanResponder(countrySlideAnim, countryOverlayAnim, () => { setShowCountryModal(false); setCountrySearch(''); })).current;
  const countryContentPanResponder = useRef(makeContentPanResponder(countrySlideAnim, countryOverlayAnim, () => { setShowCountryModal(false); setCountrySearch(''); })).current;
  useEffect(() => { if (showCountryModal) openSheet(countrySlideAnim, countryOverlayAnim); else { countrySlideAnim.setValue(SCREEN_HEIGHT); countryOverlayAnim.setValue(0); } }, [showCountryModal]);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKeyboardHeight(e.endCoordinates.height)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const allCountries = getAllCountries();
  const filteredCountries = countrySearch
    ? allCountries.filter(c => c.name.toLowerCase().includes(countrySearch.toLowerCase()) || c.code.includes(countrySearch.toUpperCase()))
    : allCountries;

  // Bouquet count
  const [bouquetCount, setBouquetCount] = useState(null);
  const [emailsLeft, setEmailsLeft] = useState(null);
  const [aiCredits, setAiCredits] = useState(0);

  // Settings toggles


  const loadCount = useCallback(async () => {
    if (!currentUser) return;
    try {
      const cachedCount = await AsyncStorage.getItem(`profile_bouquet_count_${currentUser.uid}`);
      if (cachedCount !== null) {
        setBouquetCount(parseInt(cachedCount, 10));
      }
      
      const created = await fetchCreatedBouquets();
      setBouquetCount(created.length);
      await AsyncStorage.setItem(`profile_bouquet_count_${currentUser.uid}`, created.length.toString());
    } catch {
      setBouquetCount(0);
    }
  }, [currentUser, fetchCreatedBouquets]);

  const loadCreditsData = useCallback(async () => {
    try {
      const { doc: fsDoc, getDoc: fsGetDoc } = await import('firebase/firestore');
      
      const userSnap = await fsGetDoc(fsDoc(db, 'users', currentUser.uid));
      let bonusAi = 0;
      let bonusEmails = 0;
      if (userSnap.exists()) {
        const data = userSnap.data();
        bonusAi = data.aiCredits || 0;
        bonusEmails = data.emailCredits || 0;
      }
      
      // Fallback to AsyncStorage if missing in Firestore
      if (bonusAi === 0 && bonusEmails === 0) {
        const aiC = await AsyncStorage.getItem('ai_bouquet_credits');
        const emailC = await AsyncStorage.getItem('email_credits');
        bonusAi = aiC ? parseInt(aiC) : 0;
        bonusEmails = emailC ? parseInt(emailC) : 0;
      }
      setAiCredits(bonusAi);

      const d = await fsGetDoc(fsDoc(db, 'user-emails', currentUser.uid));
      if (d.exists()) {
        const data = d.data();
        const currentMonth = new Date().toISOString().slice(0, 7);
        setEmailsLeft((data.month === currentMonth ? Math.max(0, 10 - (data.count || 0)) : 10) + bonusEmails);
      } else {
        setEmailsLeft(10 + bonusEmails);
      }
    } catch (e) {
      console.error('Error loading credits', e);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) { navigation.replace('Login'); return; }
    loadCount();
    loadCreditsData();
  }, [currentUser, loadCount, loadCreditsData, navigation]);

  // Refresh count when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadCount();
      if (currentUser) loadCreditsData();
    });
    return unsubscribe;
  }, [navigation, loadCount, loadCreditsData, currentUser]);



  const hasPasswordProvider = currentUser?.providerData?.some(p => p.providerId === 'password');

  const handleSaveName = async () => {
    if (!displayName.trim()) return;
    setSaving(true);
    setSaveMsg('');
    try {
      await updateProfile(currentUser, { displayName: displayName.trim() });
      setSaveMsg(t('profile.saved'));
      setTimeout(() => setSaveMsg(''), 3000);
    } catch {
      setSaveMsg(t('profile.failedUpdate'));
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setPwError('');
    if (!currentPw || !newPw) { setPwError(t('profile.fillBoth')); return; }
    if (newPw.length < 6) { setPwError(t('profile.errorPasswordShort')); return; }
    setPwLoading(true);
    try {
      const cred = EmailAuthProvider.credential(currentUser.email, currentPw);
      await reauthenticateWithCredential(currentUser, cred);
      await updatePassword(currentUser, newPw);
      setShowPwModal(false);
      setCurrentPw('');
      setNewPw('');
      Toast.show({
        type: 'success',
        text1: t('common.success'),
        text2: t('profile.successPassword'),
        visibilityTime: 3000,
      });
    } catch (e) {
      setPwError(e.code === 'auth/wrong-password' ? t('profile.incorrectPw') : t('profile.failedChange'));
    } finally {
      setPwLoading(false);
    }
  };


  const handleDisconnectEmail = async () => {
    setSaving(true);
    try {
      await unlink(currentUser, 'password');
      Toast.show({
        type: 'success',
        text1: t('common.success'),
        text2: 'Email login disconnected',
      });
    } catch (e) {
      Toast.show({
        type: 'error',
        text1: t('common.error'),
        text2: 'Failed to disconnect email login',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCreatePassword = async () => {
    if (createPw.length < 6) {
      setCreatePwError(t('profile.errorPasswordShort'));
      return;
    }
    setCreatePwLoading(true);
    setCreatePwError('');
    try {
      const credential = EmailAuthProvider.credential(currentUser.email, createPw);
      await linkWithCredential(currentUser, credential);
      setShowCreatePwModal(false);
      setCreatePw('');
      Toast.show({
        type: 'success',
        text1: t('common.success'),
        text2: t('profile.passwordCreated'),
      });
    } catch (e) {
      setCreatePwError(e.code === 'auth/credential-already-in-use' ? 'This email is already linked to another account.' : e.message);
    } finally {
      setCreatePwLoading(false);
    }
  };



  if (!currentUser) return null;

  const initials = (currentUser.displayName || currentUser.email || '?')
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <View style={[styles.root, { paddingTop: insets.top, backgroundColor: tTheme.bg }]} {...swipeHandlers}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={tTheme.bg} />

      <View style={[styles.header, { backgroundColor: tTheme.bg, borderBottomColor: tTheme.border }]}>
        <HapticButton style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={tTheme.text} />
        </HapticButton>
        <Text style={[styles.headerTitle, { color: tTheme.text }]}>{t('profile.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatar, { backgroundColor: tTheme.brand }]}>
            <Text style={styles.avatarText}>{initials}</Text>
            <View style={styles.proBadge}>
              <Text style={styles.proBadgeText}>{t('common.pro')}</Text>
            </View>
          </View>
          <Text style={[styles.avatarName, { color: tTheme.text }]} numberOfLines={1}>
            {currentUser.displayName || currentUser.email?.split('@')[0] || t('common.user')}
          </Text>
          <Text style={[styles.avatarEmail, { color: tTheme.textMuted }]}>{currentUser.email}</Text>
          <View style={styles.pillRow}>
            {bouquetCount !== null && (
              <View style={[styles.statPill, { backgroundColor: tTheme.surface2 }]}>
                <MaterialCommunityIcons name="flower-tulip-outline" size={13} color={tTheme.brand} />
                <Text style={[styles.statPillText, { color: tTheme.brand, fontSize: getTextSize(12) }]}>
                  {bouquetCount} {bouquetCount === 1 ? t('profile.bouquetsCount').replace('{count}', '').trim() : t('profile.bouquetsCountPlural').replace('{count}', '').trim()}
                </Text>
              </View>
            )}
            {emailsLeft !== null && (
              <View style={[styles.statPill, { backgroundColor: tTheme.surface2 }]}>
                <Feather name="mail" size={13} color={tTheme.brand} />
                <Text style={[styles.statPillText, { color: tTheme.brand, fontSize: getTextSize(12) }]}>
                  {t('profile.emailsLeft').replace('{count}', emailsLeft)}
                </Text>
              </View>
            )}

          </View>
        </View>

        {/* Merged card: Edit name + Security + Activity */}
        <View style={[styles.section, { backgroundColor: tTheme.cardBg }]}>
          {/* Display name */}
          <Text style={[styles.sectionLabel, { color: tTheme.textMuted }]}>{t('profile.displayName')}</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, { flex: 1, backgroundColor: tTheme.inputBg, borderColor: tTheme.border, color: tTheme.text }]}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder={t('profile.displayName')}
              placeholderTextColor={tTheme.textMuted}
              autoCapitalize="words"
              maxLength={40}
            />
            <HapticButton
              style={[styles.saveBtn, { backgroundColor: tTheme.brand }, !displayName.trim() && { opacity: 0.4 }]}
              onPress={handleSaveName}
              disabled={!displayName.trim() || saving}
            >
              {saving
                ? <ActivityIndicator color={WHITE} size="small" />
                : <Feather name="check" size={18} color={WHITE} />}
            </HapticButton>
          </View>
          {saveMsg ? <Text style={[styles.saveMsg, { color: saveMsg.includes('!') ? '#27ae60' : RED }]}>{saveMsg}</Text> : null}

          {/* Security */}
          {(hasPasswordProvider || currentUser?.providerData?.some(p => p.providerId === 'google.com')) && (
            <>
              <Text style={[styles.sectionLabel, { color: tTheme.textMuted, marginTop: 24 }]}>{t('profile.security')}</Text>
              
              {hasPasswordProvider && (
                <HapticButton style={styles.actionRow} onPress={() => setShowPwModal(true)}>
                  <View style={[styles.actionIcon, { backgroundColor: '#EAF4FE' }]}>
                    <Feather name="lock" size={18} color="#1d7bd4" />
                  </View>
                  <Text style={[styles.actionText, { color: tTheme.text }]}>{t('profile.changePassword')}</Text>
                  <Feather name="chevron-right" size={18} color={tTheme.textMuted} />
                </HapticButton>
              )}

              {currentUser?.providerData?.some(p => p.providerId === 'google.com') && (
                <>
                  {/* removed hr */}
                  <HapticButton style={styles.actionRow} onPress={() => setShowGoogleModal(true)}>
                    <View style={[styles.actionIcon, { backgroundColor: '#FEEAEB' }]}>
                      <MaterialCommunityIcons name="google" size={18} color="#DB4437" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.actionText, { color: tTheme.text }]}>{t('profile.manageGoogle')}</Text>
                      {!hasPasswordProvider && (
                        <Text style={[styles.actionSubtext, { color: tTheme.brand }]}>{t('profile.addPasswordLogin')}</Text>
                      )}
                    </View>
                    <Feather name="chevron-right" size={18} color={tTheme.textMuted} />
                  </HapticButton>
                </>
              )}
              {/* removed bottom hr */}
            </>
          )}

          <Text style={[styles.sectionLabel, { color: tTheme.textMuted, marginTop: 24 }]}>{t('profile.preferences') || 'Preferences'}</Text>
          
          {/* Language */}
          <HapticButton style={styles.actionRow} onPress={() => navigation.navigate('Language')}>
            <View style={[styles.actionIcon, { backgroundColor: '#E8F5FE' }]}>
              <Feather name="globe" size={18} color={tTheme.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.actionText, { color: tTheme.text }]}>{t('profile.language') || 'Language'}</Text>
              <Text style={[styles.actionSubtext, { color: tTheme.textMuted }]}>
                {LANGUAGES.find(l => l.code === locale)?.nativeName || 'English'}
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={tTheme.textMuted} />
          </HapticButton>



          {/* Country selector */}
          <HapticButton style={styles.actionRow} onPress={() => setShowCountryModal(true)}>
            <View style={[styles.actionIcon, { backgroundColor: '#FFF5F0' }]}>
              <MaterialCommunityIcons name="earth" size={18} color={tTheme.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.actionText, { color: tTheme.text }]}>{t('profile.country') || 'Country'}</Text>
              <Text style={[styles.actionSubtext, { color: tTheme.textMuted }]}>
                {allCountries.find(c => c.code === countryCode)?.name}
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={tTheme.textMuted} />
          </HapticButton>
        </View>

        {/* Sign out */}
        <HapticButton style={[styles.signOutBtn, { backgroundColor: tTheme.cardBg, borderColor: tTheme.border }]} onPress={() => setShowSignOutModal(true)}>
          <Feather name="log-out" size={18} color={tTheme.brand} />
          <Text style={[styles.signOutText, { color: tTheme.brand }]}>{t('profile.signOut')}</Text>
        </HapticButton>


      </ScrollView>

      <Modal hardwareAccelerated={true} visible={showCountryModal} transparent animationType="none" onRequestClose={closeCountryModal}>
        <View style={{ flex: 1 }}>
          <Animated.View 
            pointerEvents="auto" 
            style={[styles.sheetOverlay, { opacity: countryOverlayAnim }]}
            {...countryOverlayPanResponder.panHandlers}
          />
          <View style={[styles.sheetContainer, { paddingBottom: keyboardHeight }]}>
            <Animated.View
              style={{ flex: 1 }}
              {...countryOverlayPanResponder.panHandlers}
            />
            {/* Centered X button above country sheet */}
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <HapticButton
                onPress={closeCountryModal}
                style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 }}
              >
                <Feather name="x" size={18} color="#333" />
              </HapticButton>
            </View>
            <Animated.View style={[
              styles.bottomSheet, 
              { 
                backgroundColor: tTheme.cardBg, 
                paddingHorizontal: 0,
                paddingBottom: keyboardHeight > 0 ? 20 : insets.bottom + 40, 
                maxHeight: keyboardHeight > 0 ? SCREEN_HEIGHT - keyboardHeight - insets.top - 40 : SCREEN_HEIGHT * 0.8,
                transform: [{ translateY: countrySlideAnim }]
              }
            ]}
              {...countryContentPanResponder.panHandlers}
            >
              <View 
                style={[styles.sheetHandle, { backgroundColor: tTheme.border }]} 
                {...countryPanResponder.panHandlers} 
              />
              
              {/* Search input */}
              <View style={[styles.searchBox, { backgroundColor: tTheme.bg, borderColor: tTheme.border, marginBottom: 12 }]}>
                <Feather name="search" size={16} color={tTheme.textMuted} />
                <TextInput
                  style={[styles.searchInput, { color: tTheme.text }]}
                  placeholder={t('common.search') || 'Search...'}
                  placeholderTextColor={tTheme.textMuted}
                  value={countrySearch}
                  onChangeText={setCountrySearch}
                />
              </View>

              {/* Country list */}
              <FlatList
                data={filteredCountries}
                keyExtractor={item => item.code}
                ListHeaderComponent={
                  countryCode && !countrySearch ? (
                    <View style={[styles.selectedCountryBanner, { backgroundColor: isDark ? 'rgba(122, 92, 88, 0.3)' : 'rgba(122, 92, 88, 0.1)', marginBottom: 12 }]}>
                      <Text style={styles.selectedCountryFlag}>
                        {allCountries.find(c => c.code === countryCode)?.flag || '🌍'}
                      </Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.selectedCountryLabel, { color: tTheme.textMuted }]}>
                          {t('profile.currentCountry') || 'Current Country'}
                        </Text>
                        <Text style={[styles.selectedCountryName, { color: tTheme.text }]}>
                          {allCountries.find(c => c.code === countryCode)?.name}
                        </Text>
                      </View>
                    </View>
                  ) : null
                }
                renderItem={({ item }) => (
                  <HapticButton
                    style={[styles.countryItem, { backgroundColor: countryCode === item.code ? (isDark ? 'rgba(122, 92, 88, 0.3)' : 'rgba(122, 92, 88, 0.1)') : 'transparent' }]}
                    onPress={async () => {
                      await updateCountry(item.code);
                      closeCountryModal();
                    }}
                  >
                    <Text style={styles.countryFlag}>{item.flag}</Text>
                    <Text style={[styles.countryName, { color: tTheme.text, fontWeight: countryCode === item.code ? '700' : '400', flex: 1, marginLeft: 12 }]}>
                      {item.name}
                    </Text>
                    {countryCode === item.code && <Feather name="check" size={18} color={tTheme.brand} />}
                  </HapticButton>
                )}
                scrollEnabled
                nestedScrollEnabled
                contentContainerStyle={{ paddingBottom: 20 }}
              />
            </Animated.View>
          </View>
        </View>
      </Modal>

      {/* Sign out confirmation modal */}
      <Modal hardwareAccelerated={true} visible={showSignOutModal} transparent animationType="none" onRequestClose={closeSignOutModal}>
        <View style={StyleSheet.absoluteFill}>
          <Animated.View 
            pointerEvents="auto" 
            style={[styles.sheetOverlay, { opacity: signOutOverlayAnim }]}
            {...signOutOverlayPanResponder.panHandlers}
          />
          <View style={styles.sheetContainer}>
            <Animated.View
              style={{ flex: 1 }}
              {...signOutOverlayPanResponder.panHandlers}
            />
            <Animated.View 
              style={[
                styles.bottomSheet, 
                { 
                  backgroundColor: tTheme.cardBg, 
                  paddingBottom: Math.max(insets.bottom, 16) + 16,
                  transform: [{ translateY: signOutSlideAnim }]
                }
              ]}
            >
              <View 
                style={[styles.sheetHandle, { backgroundColor: tTheme.border }]} 
                {...signOutPanResponder.panHandlers} 
              />
              <View 
                style={styles.sheetHeader}
                {...signOutPanResponder.panHandlers}
              >
                <Text style={[styles.sheetTitle, { color: tTheme.text }]}>{t('profile.signOut')}</Text>
              </View>
              <Text style={[styles.sheetDesc, { color: tTheme.textMuted, fontSize: getTextSize(14) }]}>
                {t('profile.signOutConfirm')}
              </Text>
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
                <HapticButton
                  style={[styles.sheetBtn, { flex: 1, backgroundColor: tTheme.surface2 || MID }]}
                  onPress={closeSignOutModal}
                >
                  <Text style={[styles.sheetBtnText, { color: tTheme.text || DARK, fontSize: getTextSize(15) }]}>{t('common.cancel')}</Text>
                </HapticButton>
                <HapticButton
                  style={[styles.sheetBtn, { flex: 1, backgroundColor: BRAND }]}
                  onPress={async () => { 
                    closeSignOutModal(); 
                    setShowSuccess(true);
                    setTimeout(async () => {
                      await signOut(); 
                      navigation.replace('Welcome'); 
                    }, 2200);
                  }}
                >
                  <Text style={[styles.sheetBtnText, { fontSize: getTextSize(15) }]}>{t('profile.signOut')}</Text>
                </HapticButton>
              </View>
            </Animated.View>
          </View>
        </View>
      </Modal>

      {/* Change password modal */}
      <Modal hardwareAccelerated={true} visible={showPwModal} transparent animationType="none" onRequestClose={closePwModal}>
        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={StyleSheet.absoluteFill}>
            <Animated.View 
              pointerEvents="auto" 
              style={[styles.sheetOverlay, { opacity: pwOverlayAnim }]}
              {...pwOverlayPanResponder.panHandlers}
            />
            <View style={styles.sheetContainer}>
              <Animated.View
                style={{ flex: 1 }}
                {...pwOverlayPanResponder.panHandlers}
              />
              <Animated.View 
                style={[
                  styles.bottomSheet, 
                  { 
                    backgroundColor: tTheme.cardBg, 
                    paddingBottom: Math.max(insets.bottom, 16) + 16,
                    transform: [{ translateY: pwSlideAnim }]
                  }
                ]}
                {...pwContentPanResponder.panHandlers}
              >
                <View 
                  style={[styles.sheetHandle, { backgroundColor: tTheme.border }]} 
                  {...pwPanResponder.panHandlers}
                />
                <View style={{ position: 'relative' }}>
                  <View 
                    style={styles.sheetHeader}
                    {...pwPanResponder.panHandlers}
                  >
                    <Text style={[styles.sheetTitle, { color: tTheme.text }]}>{t('profile.changePassword')}</Text>
                  </View>
                  <HapticButton 
                    onPress={closePwModal}
                    style={{ position: 'absolute', right: 0, top: -4, padding: 8, zIndex: 10 }}
                  >
                    <Feather name="x" size={20} color={tTheme.textMuted} />
                  </HapticButton>
                </View>
                {pwError ? <Text style={styles.formError}>{pwError}</Text> : null}
                <TextInput
                  style={[styles.modalInput, { backgroundColor: tTheme.inputBg, borderColor: tTheme.border, color: tTheme.text }]}
                  placeholder={t('profile.currentPassword')}
                  placeholderTextColor={tTheme.textMuted}
                  value={currentPw}
                  onChangeText={setCurrentPw}
                  secureTextEntry
                />
                <TextInput
                  style={[styles.modalInput, { backgroundColor: tTheme.inputBg, borderColor: tTheme.border, color: tTheme.text }]}
                  placeholder={t('profile.newPassword')}
                  placeholderTextColor={tTheme.textMuted}
                  value={newPw}
                  onChangeText={setNewPw}
                  secureTextEntry
                />
                <HapticButton
                  style={[styles.sheetBtn, { backgroundColor: tTheme.brand, marginTop: 8 }, (!currentPw || !newPw || pwLoading) && { opacity: 0.5 }]}
                  onPress={handleChangePassword}
                  disabled={!currentPw || !newPw || pwLoading}
                >
                  {pwLoading ? <ActivityIndicator color={WHITE} /> : <Text style={styles.sheetBtnText}>{t('profile.updatePassword')}</Text>}
                </HapticButton>
              </Animated.View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Google management modal */}
      <Modal hardwareAccelerated={true} visible={showGoogleModal} transparent animationType="none" onRequestClose={closeGoogleModal}>
        <View style={StyleSheet.absoluteFill}>
          <Animated.View 
            pointerEvents="auto" 
            style={[styles.sheetOverlay, { opacity: googleOverlayAnim }]}
            {...googleOverlayPanResponder.panHandlers}
          />
          <View style={styles.sheetContainer}>
            <Animated.View
              style={{ flex: 1 }}
              {...googleOverlayPanResponder.panHandlers}
            />
            {/* Centered X button above Google sheet */}
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <HapticButton
                onPress={closeGoogleModal}
                style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 }}
              >
                <Feather name="x" size={18} color="#333" />
              </HapticButton>
            </View>
            <Animated.View 
              style={[
                styles.bottomSheet, 
                { 
                  backgroundColor: tTheme.cardBg, 
                  paddingBottom: Math.max(insets.bottom, 16) + 16,
                  transform: [{ translateY: googleSlideAnim }]
                }
              ]}
              {...googleContentPanResponder.panHandlers}
            >
              <View 
                style={[styles.sheetHandle, { backgroundColor: tTheme.border }]} 
                {...googlePanResponder.panHandlers}
              />
              <View 
                style={styles.sheetHeader}
                {...googlePanResponder.panHandlers}
              >
                <Text style={[styles.sheetTitle, { color: tTheme.text }]}>{t('profile.manageGoogle')}</Text>
              </View>
              
              <View style={styles.actionRow}>
                <View style={[styles.actionIcon, { backgroundColor: '#f5f5f5' }]}>
                  <CachedImage source={{ uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/google-icon.png' }} style={{ width: 18, height: 18 }} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.actionText, { color: tTheme.text, fontSize: getTextSize(15) }]}>{currentUser.email}</Text>
                </View>
                <Feather name="check-circle" size={18} color="#4285F4" />
              </View>

              <View style={[styles.cardDivider, { backgroundColor: tTheme.border, marginVertical: 12 }]} />

              {!hasPasswordProvider ? (
                <HapticButton 
                  style={[styles.sheetBtn, { backgroundColor: tTheme.brand }]} 
                  onPress={() => { 
                    closeSheet(googleSlideAnim, googleOverlayAnim, () => {
                      setShowGoogleModal(false);
                      setShowCreatePwModal(true);
                    });
                  }}
                >
                  <Text style={styles.sheetBtnText}>{t('profile.createPasswordTitle')}</Text>
                </HapticButton>
              ) : (
                <View style={{ gap: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}>
                    <Feather name="info" size={16} color={tTheme.textMuted} />
                    <Text style={{ fontFamily: 'Manrope-Regular', fontSize: getTextSize(14), color: tTheme.textMuted }}>
                      {t('profile.emailLoginEnabled')}
                    </Text>
                  </View>
                  <HapticButton 
                    style={[styles.sheetBtn, { backgroundColor: tTheme.surface2 || '#F5F5F5' }]} 
                    onPress={handleDisconnectEmail}
                  >
                    <Text style={[styles.sheetBtnText, { color: RED }]}>{t('profile.disconnectEmail') || 'Disconnect Email Login'}</Text>
                  </HapticButton>
                </View>
              )}
            </Animated.View>
          </View>
        </View>
      </Modal>

      {/* Create password modal */}
      <Modal hardwareAccelerated={true} visible={showCreatePwModal} transparent animationType="none" onRequestClose={closeCreatePwModal}>
        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={StyleSheet.absoluteFill}>
            <Animated.View 
              pointerEvents="auto" 
              style={[styles.sheetOverlay, { opacity: createPwOverlayAnim }]}
              {...createPwOverlayPanResponder.panHandlers}
            />
            <View style={styles.sheetContainer}>
              <Animated.View
                style={{ flex: 1 }}
                {...createPwOverlayPanResponder.panHandlers}
              />
              <Animated.View 
                style={[
                  styles.bottomSheet, 
                  { 
                    backgroundColor: tTheme.cardBg, 
                    paddingBottom: Math.max(insets.bottom, 16) + 16,
                    transform: [{ translateY: createPwSlideAnim }]
                  }
                ]}
                {...createPwContentPanResponder.panHandlers}
              >
                <View 
                  style={[styles.sheetHandle, { backgroundColor: tTheme.border }]} 
                  {...createPwPanResponder.panHandlers}
                />
                <View style={{ position: 'relative' }}>
                  <View 
                    style={styles.sheetHeader}
                    {...createPwPanResponder.panHandlers}
                  >
                    <Text style={[styles.sheetTitle, { color: tTheme.text }]}>{t('profile.createPasswordTitle')}</Text>
                  </View>
                  <HapticButton 
                    onPress={closeCreatePwModal}
                    style={{ position: 'absolute', right: 0, top: -4, padding: 8, zIndex: 10 }}
                  >
                    <Feather name="x" size={20} color={tTheme.textMuted} />
                  </HapticButton>
                </View>
                <Text style={[styles.sheetDesc, { color: tTheme.textMuted, textAlign: 'left', marginBottom: 16 }]}>
                  {t('profile.createPasswordDesc')}
                </Text>
                {createPwError ? <Text style={styles.formError}>{createPwError}</Text> : null}
                <TextInput
                  style={[styles.modalInput, { backgroundColor: tTheme.inputBg, borderColor: tTheme.border, color: tTheme.text }]}
                  placeholder={t('profile.newPassword')}
                  placeholderTextColor={tTheme.textMuted}
                  value={createPw}
                  onChangeText={setCreatePw}
                  secureTextEntry
                />
                <HapticButton
                  style={[styles.sheetBtn, { backgroundColor: tTheme.brand, marginTop: 8 }, (!createPw || createPwLoading) && { opacity: 0.5 }]}
                  onPress={handleCreatePassword}
                  disabled={!createPw || createPwLoading}
                >
                  {createPwLoading ? <ActivityIndicator color={WHITE} /> : <Text style={styles.sheetBtnText}>{t('profile.createPasswordTitle')}</Text>}
                </HapticButton>
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: MID, backgroundColor: CREAM,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: 'Manrope-Bold', fontSize: 18, color: DARK },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 28 },

  // Avatar
  avatarSection: { alignItems: 'center', marginBottom: 28 },
  avatar: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: BRAND, alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
    shadowColor: BRAND, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8,
  },
  avatarText: { fontFamily: 'Manrope-Bold', fontSize: 32, color: WHITE },
  proBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#FFD700',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 2,
    borderColor: WHITE,
  },
  proBadgeText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 10,
    color: '#8B6914',
    letterSpacing: 0.5,
  },
  avatarName: { fontFamily: 'Manrope-Bold', fontSize: 18, color: DARK, marginBottom: 4 },
  avatarEmail: { fontFamily: 'Manrope-Regular', fontSize: 13, color: MUTED, marginBottom: 12 },
  pillRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  statPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFF5F0', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
  },
  statPillText: { fontFamily: 'Manrope-SemiBold', fontSize: 12, color: BRAND },

  // Section
  section: {
    backgroundColor: WHITE, borderRadius: 16, padding: 16, marginBottom: 12,
  },
  sectionLabel: {
    fontFamily: 'Manrope-Bold', fontSize: 10, color: MUTED,
    letterSpacing: 1.5, marginBottom: 12,
  },
  cardDivider: {
    height: 1, backgroundColor: MID, marginVertical: 16, marginHorizontal: -4,
  },

  // Input row
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: {
    backgroundColor: CREAM, borderRadius: 10, paddingVertical: 12,
    paddingHorizontal: 14, fontSize: 15, fontFamily: 'Manrope-Regular',
    color: DARK, borderWidth: 1, borderColor: MID,
  },
  saveBtn: {
    width: 44, height: 44, borderRadius: 10,
    backgroundColor: BRAND, alignItems: 'center', justifyContent: 'center',
  },
  saveMsg: { fontFamily: 'Manrope-Regular', fontSize: 13, marginTop: 8 },

  // Action rows
  actionRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12,
  },
  actionIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  actionText: { flex: 1, fontFamily: 'Manrope-SemiBold', fontSize: 15, color: DARK },

  // Sign out
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 14, marginBottom: 12,
    backgroundColor: WHITE, borderRadius: 14,
    borderWidth: 1, borderColor: MID,
  },
  signOutText: { fontFamily: 'Manrope-SemiBold', fontSize: 15, color: BRAND },



  // Sheet
  sheetOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheetContainer: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'transparent' },
  bottomSheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 24, paddingTop: 12,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, elevation: 20,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
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
  actionSubtext: {
    fontFamily: 'Manrope-Regular', fontSize: 12, color: MUTED, marginTop: 2,
  },
  selectedCountryBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: MID, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8,
    marginHorizontal: 24, marginBottom: 12,
  },
  selectedCountryFlag: {
    fontSize: 28,
  },
  selectedCountryLabel: {
    fontFamily: 'Manrope-Regular', fontSize: 11, color: MUTED, marginBottom: 2,
  },
  selectedCountryName: {
    fontFamily: 'Manrope-Bold', fontSize: 14, color: DARK,
  },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: CREAM, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 6,
    marginHorizontal: 24, marginBottom: 12, borderWidth: 1, borderColor: MID,
  },
  searchInput: {
    flex: 1, fontSize: 15, fontFamily: 'Manrope-Regular', color: DARK,
  },
  countryItem: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 8,
    borderBottomWidth: 0,
  },
  countryFlag: {
    fontSize: 20, marginRight: 10,
  },
  countryCode: {
    fontFamily: 'Manrope-Bold', fontSize: 12, color: MUTED, marginRight: 12, minWidth: 40,
  },
  countryName: {
    flex: 1, fontFamily: 'Manrope-Regular', fontSize: 15, color: DARK,
  },
  successOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ddd',
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: BRAND,
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleThumbActive: {
    transform: [{ translateX: 20 }],
  },
});
