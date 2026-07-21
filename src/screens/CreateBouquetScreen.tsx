import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { Image } from 'expo-image';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  Modal,
  Alert,
  StyleSheet,
  Dimensions,
  PanResponder,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Share,
  StatusBar,
  Linking,
  InteractionManager,
  Keyboard,
  Image as RNImage,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import * as Haptics from '../utils/haptics';
import * as Clipboard from 'expo-clipboard';
import DateTimePicker from '@react-native-community/datetimepicker';
import { X, Info, Search as SearchIcon, Edit3, RotateCcw, RotateCw, Shuffle, Image as ImageIcon, Lock, Plus, Link, Music, Pause, Play, Sparkles, Layers, Settings, Check, Copy, ChevronRight, Share2, Move, ChevronUp, ChevronDown, Mail, Calendar, Clock, CheckCircle, Flag, Coins, AlertCircle, Star, Heart } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import { useNavigation, useRoute } from '@react-navigation/native';
import { doc, setDoc, getDoc, serverTimestamp, increment, updateDoc, collection, addDoc, writeBatch, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import YouTubeSearchModal, { YouTubeSong } from '../components/YouTubeSearchModal';
import { getDeviceId } from '../utils/deviceId';
import { useAuth } from '../contexts/AuthContext';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncWidgetDataWithBouquet } from '../utils/storageManager';
import { useSwipeNavigation } from '../hooks/useSwipeNavigation';
import { useSwipeToClose } from '../hooks/useSwipeToClose';
import LottieView from 'lottie-react-native';
import Toast from 'react-native-toast-message';
import ShareModal from '../components/ShareModal';
import { useCustomAlert } from '../contexts/AlertContext';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { getFlowerTranslation } from '../flower-translations';
import MessageMediaUploader from '../components/MessageMediaUploader';
import * as StoreReview from 'expo-store-review';
import { uploadImage, uploadAudio, deleteAsset, getPublicIdFromUrl } from '../utils/cloudinaryUpload';
import { NotificationModal } from '../components/NotificationModal';
import { FlashList } from '@shopify/flash-list';
import { FlowerCard, LazyFlowerImage } from './create-bouquet/components/FlowerCard';
import { DraggableFlower } from './create-bouquet/components/DraggableFlower';
import { PresetsModal } from './create-bouquet/components/PresetsModal';
import { Stage1Select } from './create-bouquet/stages/Stage1Select';
import { Stage2Arrange } from './create-bouquet/stages/Stage2Arrange';
import { Stage3Message } from './create-bouquet/stages/Stage3Message';

import { useGoldenBouquet } from './create-bouquet/hooks/useGoldenBouquet';
import { getTranslatedFlowerData } from './create-bouquet/utils/translationUtils';
import { ParticleShape } from './create-bouquet/components/ParticleShape';
import { RAOK_SUGGESTIONS } from '../utils/raokSuggestions';
import { isSlugOffensive } from '../utils/slugUtils';
import { generateRandomPosition } from './create-bouquet/utils/arrangementUtils';
import { RAOKSuccessModal } from './create-bouquet/components/modals/RAOKSuccessModal';
import { FlowerMeaningModal } from './create-bouquet/components/modals/FlowerMeaningModal';
import { SuccessModal, ReviewFallbackModal } from './create-bouquet/components/modals/SuccessModal';
import { UnsavedChangesModal } from './create-bouquet/components/modals/UnsavedChangesModal';
import { HelpModal } from './create-bouquet/components/modals/HelpModal';
import { SarahInfoModal } from './create-bouquet/components/modals/SarahInfoModal';
import { AIGenerationResultModal } from './create-bouquet/components/modals/AIGenerationResultModal';


// ─── uuid shim ────────────────────────────────────────────────────────────────
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';


import { getFlowerImage, BG_IMAGES, FLOWER_GROUPS, GREENERY_OPTIONS, FILLER_OPTIONS, PRESETS, MESSAGE_SUGGESTIONS, getTranslatedPreset, getTranslatedMessageSuggestions } from '../utils/bouquetData';
import { moderateWithSarvam, checkLocalSafety } from '../utils/raokSafety';
import { CachedImage } from '../components/CachedImage';

// LayoutAnimation is enabled by default in the New Architecture, skipping experimental flag

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');




// ─── Data ─────────────────────────────────────────────────────────────────────
// Data imported from ../utils/bouquetData

// ─── Types ────────────────────────────────────────────────────────────────────
interface PlacedFlower {
  id: string;
  uniqueId: string;
  x: number; // 0-100 percent
  y: number; // 0-100 percent
  rotation: number;
  scale: number;
  zIndex: number;
}

interface MessageCard {
  message: string;
  senderName: string;
  recipientName: string;
  recipientEmail?: string;
}

interface Song {
  name: string;
  artist: string;
  albumArt: string;
  previewUrl?: string;
  spotifyUrl?: string;
}


// ─── BouncyButton Helper Component ───────────────────────────────────────────
const BouncyButton: React.FC<{
  onPress?: () => void;
  disabled?: boolean;
  style?: any;
  children: React.ReactNode;
}> = ({ onPress, disabled, style, children }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled) return;
    Animated.spring(scaleAnim, {
      toValue: 0.94,
      useNativeDriver: true,
      tension: 150,
      friction: 8,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled) return;
    Animated.spring(scaleAnim, {
      toValue: 1.0,
      useNativeDriver: true,
      tension: 150,
      friction: 8,
    }).start();
  };

  return (
    <TouchableWithoutFeedback
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
    >
      <Animated.View style={[style, { transform: [{ scale: scaleAnim }] }]}>
        {children}
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const CreateBouquet: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute() as { params?: { editId?: string; editData?: any } };
  const insets = useSafeAreaInsets();
  const showAlert = useCustomAlert();
  const { currentUser } = useAuth();
  const { reduceMotion, getEffectiveTheme } = useAccessibility();
  const { t, locale } = useLanguage();
  // Override theme if golden mode
  const { theme: originalTheme, isDark: originalIsDark } = useTheme();
  
  const { isGoldenMode, themeColors, isDark } = useGoldenBouquet(route.params);

  const isRandomActMode = (route.params as any)?.randomActMode || false;

  const RAOK_SUGGESTIONS = [
    {
      category: 'Encouragement',
      messages: [
        "I hope this unexpected bouquet brings a bright smile to your face today. Life can sometimes be challenging and overwhelming, but please remember that you are strong, resilient, and capable of overcoming whatever hurdles come your way. Take a deep breath, keep pushing forward, and know that someone out there is rooting for your happiness and success.",
        "Just a little reminder that you are doing your best, and that is absolutely enough. It's okay to have days where you feel tired or uncertain. Give yourself the grace to rest and recharge. The world is a better place with you in it, and I hope these flowers serve as a small token of positivity in your life."
      ]
    },
    {
      category: 'Positivity',
      messages: [
        "Sending you this random act of kindness to remind you that there is still so much good in the world! I hope you have a truly wonderful day filled with little moments of joy, laughter, and peace. No matter where you are or what you're doing, keep shining your unique light.",
        "May this bouquet be a pleasant surprise that adds a splash of color to your day. Sometimes all we need is a small reminder that we are thought of and cared for, even by strangers. Embrace the beauty of today, smile at the little things, and don't forget to spread the kindness forward when you can."
      ]
    },
    {
      category: 'Comfort',
      messages: [
        "If you're going through a tough time right now, I want you to know that you are not alone. Pain and hardship are temporary, but your inner strength is permanent. I hope these flowers offer a moment of comfort and peace amidst the chaos. Keep holding on, brighter days are surely on the horizon.",
        "Here is a little digital hug for you. It's okay if you're not feeling 100% today. Allow yourself to feel your emotions without judgment. Just take things one step at a time, one day at a time. I'm sending you warm thoughts and hoping that tomorrow brings you renewed energy and hope."
      ]
    }
  ];

  const translatedMessageSuggestions = useMemo(() =>
    getTranslatedMessageSuggestions(locale) as { category: string; messages: string[] }[],
    [locale]
  );

  const isForceLeavingRef = useRef(false);

  // Get translated presets based on current locale
  const translatedPresets = useMemo(() => {
    return Object.keys(PRESETS).reduce((acc, key) => {
      acc[key] = getTranslatedPreset(key, locale);
      return acc;
    }, {} as Record<string, any>);
  }, [locale]);

  const [isReady, setIsReady] = useState(false);
  const contentOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setIsReady(true);
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
    return () => task.cancel();
  }, []);

  useEffect(() => {
    if (isRandomActMode) {
      AsyncStorage.getItem('hasShownRaokGuidelines').then(val => {
        if (val !== 'true') {
          // Show guidelines modal for RAOK
          setShowRaokGuidelinesModal(true);
        }
      });
    }
  }, [isRandomActMode]);

  // Edit mode — set when navigating from History/Home with an existing bouquet
  const editId = route.params?.editId || null;
  const [editLoading, setEditLoading] = useState(!!editId);
  // Track the original slug so we only update it if the user explicitly changed it
  const originalSlugRef = useRef<string>('');
  // ── Step state — in edit mode jump straight to step 3 (message/song/effects) ──
  const [currentStep, setCurrentStep] = useState(editId ? 3 : 1);

  // ── Flowers ──
  const [selectedFlowers, setSelectedFlowers] = useState<PlacedFlower[]>([]);
  const [background, setBackground] = useState<number | null>(0);
  // Greenery overlay: a single greenery plant shown as a full-canvas backdrop layer
  const [greeneryBg, setGreeneryBg] = useState<string | null>(null);
  const [isDraggingFlower, setIsDraggingFlower] = useState(false);
  const [createdBouquetId, setCreatedBouquetId] = useState<string | null>(null);

  // ── Message ──
  const [messageCard, setMessageCard] = useState<MessageCard>({ message: '', senderName: '', recipientName: '' });
  const [messageFormatting, setMessageFormatting] = useState({ fontStyle: 'default', bold: false, italic: false, underline: false });
  // Media attachments (logged-in only)
  const [messageImages, setMessageImages] = useState<{ uri: string; url: string | null; publicId: string | null; uploading: boolean; isPendingUpload?: boolean }[]>([]);
  const [messageAudio, setMessageAudio] = useState<{ uri: string; url: string | null; publicId: string | null; uploading: boolean; duration?: number; isPendingUpload?: boolean } | null>(null);

  const uploadedSessionMediaRef = useRef<{ publicId: string; resourceType: 'image' | 'video' }[]>([]);
  const isSubmittedRef = useRef(false);
  const uploadTimersRef = useRef<Record<string, NodeJS.Timeout>>({});
  const deleteTimersRef = useRef<Record<string, NodeJS.Timeout>>({});

  const stateRef = useRef({ messageImages: [] as typeof messageImages, messageAudio: null as typeof messageAudio });

  useEffect(() => {
    stateRef.current = { messageImages, messageAudio };
  }, [messageImages, messageAudio]);

  useEffect(() => {
    return () => {
      // Clear all active upload timers
      Object.values(uploadTimersRef.current).forEach(t => clearTimeout(t));
      
      if (!isSubmittedRef.current) {
        // Cancel all pending delete timers
        Object.values(deleteTimersRef.current).forEach(t => clearTimeout(t));
        
        // Delete all session-uploaded assets
        const toDelete = [...uploadedSessionMediaRef.current];
        toDelete.forEach(async (media) => {
          try {
            console.log('Cleanup delete on exit:', media.publicId);
            await deleteAsset(media.publicId, media.resourceType);
          } catch (e) {
            console.error('Cleanup delete error:', e);
          }
        });
      } else {
        // If submitted, execute any pending delete timers for assets that are NOT in the final bouquet
        const { messageImages: finalImages, messageAudio: finalAudio } = stateRef.current;
        Object.keys(deleteTimersRef.current).forEach(async (publicId) => {
          clearTimeout(deleteTimersRef.current[publicId]);
          const inImages = finalImages.some(img => img.publicId === publicId);
          const inAudio = finalAudio?.publicId === publicId;
          
          if (!inImages && !inAudio) {
            try {
              console.log('Executing immediate delete for removed asset on submit:', publicId);
              const resourceType = publicId.includes('audio') || publicId.includes('video') ? 'video' : 'image';
              await deleteAsset(publicId, resourceType);
            } catch (e) {
              console.error(e);
            }
          }
        });
      }
    };
  }, []);


  // ── Song ──
  const [selectedSong, setSelectedSong] = useState<YouTubeSong | null>(null);
  const [isPlayingSong, setIsPlayingSong] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);

  // ── Modals ──
  const presetsModalRef = useRef<{ open: () => void; close: () => void } | null>(null);
  const [showSpotifyModal, setShowSpotifyModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showReviewFallbackModal, setShowReviewFallbackModal] = useState(false);
  const [showRateUsConfirmModal, setShowRateUsConfirmModal] = useState(false);
  const [showRatingWidget, setShowRatingWidget] = useState(true);
  const [showSuccessLottie, setShowSuccessLottie] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [viewingMeaning, setViewingMeaning] = useState<typeof FLOWER_GROUPS[0] | null>(null);
  const [showCreationSuccess, setShowCreationSuccess] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showSarahInfo, setShowSarahInfo] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const fabBottom = useRef(new Animated.Value(insets.bottom + 16)).current;
  const [aiGenerationResult, setAiGenerationResult] = useState<{ flowers: string[]; explanation: string; message: string } | null>(null);
  const [showColorPicker, setShowColorPicker] = useState<string | null>(null);
  const [showAdditionalSettings, setShowAdditionalSettings] = useState(false);
  const [showAccessibilitySettings, setShowAccessibilitySettings] = useState(false);
  const [showEmailSettings, setShowEmailSettings] = useState(false);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [notifyOnView, setNotifyOnView] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  // ── Flower meaning modal animation ──
  const {
    slideAnim: meaningSlideAnim,
    panY: meaningPanY,
    overlayOpacity: meaningOverlay,
    panHandlers: meaningPanHandlers,
    onScroll: onMeaningScroll,
    isInteractive: meaningInteractive
  } = useSwipeToClose(
    !!viewingMeaning,
    () => { setViewingMeaning(null); setShowColorPicker(null); }
  );

  // ── Help modal swipe ──
  const {
    slideAnim: helpSlideAnim,
    panY: helpPanY,
    overlayOpacity: helpOverlay,
    panHandlers: helpPanHandlers,
    onScroll: onHelpScroll,
    isInteractive: helpInteractive
  } = useSwipeToClose(showHelp, () => setShowHelp(false));

  // ── Presets modal swipe ──
  // ── Search ──
  const [searchQuery, setSearchQuery] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [slugPlaceholderIndex, setSlugPlaceholderIndex] = useState(0);

  // ── Arrangement ──
  const [customArrangementMode, setCustomArrangementMode] = useState(false);
  const [selectedFlowerForEdit, setSelectedFlowerForEdit] = useState<PlacedFlower | null>(null);
  // ── Greenery & Filler pickers ──
  const [showGreeneryPicker, setShowGreeneryPicker] = useState(false);
  const [showFillerPicker, setShowFillerPicker] = useState(false);

  useEffect(() => {
    if (currentStep === 2) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
  }, [showGreeneryPicker, showFillerPicker]);

  // ── Accessibility settings ──
  const [additionalSettings, setAdditionalSettings] = useState({
    dyslexiaFriendly: false,
    translateEnabled: false,
    targetLanguage: 'es',
    blindFriendly: false,
    largeText: false,
    animation: 'none',
    unlockDate: null as Date | null,
  });

  // ── AI ──
  const [aiGenerating, setAiGenerating] = useState(false);

  // ── Local Moderation ──
  const moderationResult = isRandomActMode ? checkLocalSafety(messageCard.message) : null;
  const isSafe = moderationResult?.isSafe !== false;

  // ── Submission ──
  const [loading, setLoading] = useState(false);
  const [isAiVerifying, setAiVerifying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showRaokSuccessModal, setShowRaokSuccessModal] = useState(false);
  const [showRaokGuidelinesModal, setShowRaokGuidelinesModal] = useState(false);
  const isSubmittingRef = useRef(false);
  const [cardUrl, setCardUrl] = useState('');

  // ── Slug ──
  const [customSlug, setCustomSlug] = useState('');
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'blocked'>('idle');
  const [checkedSlugs, setCheckedSlugs] = useState<Set<string>>(new Set());

  
  // ── Suggestion category ──
  const [selectedSuggestionCategory, setSelectedSuggestionCategory] = useState<number | null>(null);

  // ── Delivery / Scheduling ──
  const [showEmailSection, setShowEmailSection] = useState(false);
  const [deliveryMode, setDeliveryMode] = useState<'now' | 'scheduled'>('now');
  const [scheduledDate, setScheduledDate] = useState(new Date(Date.now() + 3600000)); // Default 1 hour from now
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  
  const [showUnlockDatePicker, setShowUnlockDatePicker] = useState(false);
  const [showUnlockTimePicker, setShowUnlockTimePicker] = useState(false);

  // ── Keyboard visibility tracking ──
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setIsKeyboardVisible(true);
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [loading, isSuccess]);




  useEffect(() => {
    Animated.timing(fabBottom, {
      toValue: isKeyboardVisible ? 20 : insets.bottom + 16,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [isKeyboardVisible, insets.bottom]);

  // Swipe handlers for stage transitions
  const swipeHandlers = useSwipeNavigation({
    disabled: currentStep === 2 && customArrangementMode,
    onSwipeLeft: () => {
      if (currentStep === 1 && canProceedStep1) setCurrentStep(2);
      else if (currentStep === 2) setCurrentStep(3);
    },
    onSwipeRight: () => {
      if (currentStep === 2) setCurrentStep(1);
      else if (currentStep === 3 && !editId) setCurrentStep(2);
      else if (currentStep === 1) {
        handleBackNavigation();
      }
    }
  });

  const handleBackNavigation = () => {
    // Step 1, or edit mode (where step 3 is the starting point): show exit dialog
    if (selectedFlowers.length > 0 || messageCard.message.length > 0) {
      setShowUnsavedModal(true);
    } else {
      navigation.goBack();
    }
  };

  // Canvas dimensions — square canvas so placed-flower % positions are consistent
  const canvasWidth = SCREEN_W - 16;
  const canvasHeight = canvasWidth;

  // ─── Placeholder rotation ────────────────────────────────────────────────────
  const searchPlaceholders = [
    t('createBouquet.search1'), t('createBouquet.search2'),
    t('createBouquet.search3'), t('createBouquet.search4'),
    t('createBouquet.search5'),
  ];

  const slugPlaceholders = [
    'anna-2024', 'sophia-rose', 'emma-lily', 'olivia-joy',
    'ava-marie', 'mia-grace', 'luna-star', 'aria-belle',
    'zoe-heart', 'lily-may', 'ruby-love', 'ivy-bloom',
    'rose-garden', 'daisy-field', 'violet-sky', 'bella-moon',
    'grace-2024', 'maya-sunshine', 'ella-dreams', 'chloe-wishes'
  ];

  // ── Media upload handlers ──────────────────────────────────────────────────
  const handleAddImages = useCallback((newImages: { uri: string }[]) => {
    setMessageImages(prev => {
      const currentCount = prev.length;
      const allowedCount = 5 - currentCount;
      const imagesToAdd = newImages.slice(0, allowedCount).map(img => {
        const tempId = img.uri;
        
        // Start debounced upload after 3 seconds
        const timer = setTimeout(async () => {
          setMessageImages(current => current.map(item => item.uri === tempId ? { ...item, uploading: true, isPendingUpload: false } : item));
          
          try {

            const { url, publicId } = await uploadImage(tempId, 'bouquet-messages');
            setMessageImages(current => current.map(item => item.uri === tempId ? { ...item, url, publicId, uploading: false } : item));
            uploadedSessionMediaRef.current.push({ publicId, resourceType: 'image' });
          } catch (error) {
            console.error('Debounced image upload failed:', error);
            setMessageImages(current => current.filter(item => item.uri !== tempId));
            Toast.show({ type: 'error', text1: 'Upload failed', text2: 'Failed to upload photo.' });
          }
        }, 3000);
        
        uploadTimersRef.current[tempId] = timer;
        
        return {
          uri: img.uri,
          url: null,
          publicId: null,
          uploading: false,
          isPendingUpload: true
        };
      });
      
      return [...prev, ...imagesToAdd];
    });
  }, []);

  const handleRemoveImage = useCallback((index: number) => {
    setMessageImages(prev => {
      const updated = [...prev];
      const imageToRemove = updated[index];
      if (!imageToRemove) return prev;
      
      const uri = imageToRemove.uri;
      if (uploadTimersRef.current[uri]) {
        clearTimeout(uploadTimersRef.current[uri]);
        delete uploadTimersRef.current[uri];
      }
      
      if (imageToRemove.publicId) {
        const publicId = imageToRemove.publicId;
        console.log('Debouncing deletion of image:', publicId);
        
        const deleteTimer = setTimeout(async () => {
          try {
            console.log('Executing debounced Cloudinary delete for:', publicId);
            await deleteAsset(publicId, 'image');
            uploadedSessionMediaRef.current = uploadedSessionMediaRef.current.filter(item => item.publicId !== publicId);
          } catch (e) {
            console.error('Failed to execute debounced delete:', e);
          }
        }, 5000);
        
        deleteTimersRef.current[publicId] = deleteTimer;
      }
      
      updated.splice(index, 1);
      return updated;
    });
  }, []);

  const handleEditImage = useCallback((index: number, newImage: { uri: string }) => {
    setMessageImages(prev => {
      const updated = [...prev];
      const oldImage = updated[index];
      if (!oldImage) return prev;
      
      const oldUri = oldImage.uri;
      if (uploadTimersRef.current[oldUri]) {
        clearTimeout(uploadTimersRef.current[oldUri]);
        delete uploadTimersRef.current[oldUri];
      }
      
      if (oldImage.publicId) {
        const oldPublicId = oldImage.publicId;
        const deleteTimer = setTimeout(async () => {
          try {
            console.log('Debounced delete running for edited old image:', oldPublicId);
            await deleteAsset(oldPublicId, 'image');
            uploadedSessionMediaRef.current = uploadedSessionMediaRef.current.filter(item => item.publicId !== oldPublicId);
          } catch (e) {
            console.error('Failed to delete edited image:', e);
          }
        }, 5000);
        deleteTimersRef.current[oldPublicId] = deleteTimer;
      }
      
      const newUri = newImage.uri;
      const timer = setTimeout(async () => {
        setMessageImages(current => current.map(item => item.uri === newUri ? { ...item, uploading: true, isPendingUpload: false } : item));
        
        try {
          console.log('Uploading edited image...', newUri);
          const { url, publicId } = await uploadImage(newUri, 'bouquet-messages');
          setMessageImages(current => current.map(item => item.uri === newUri ? { ...item, url, publicId, uploading: false } : item));
          uploadedSessionMediaRef.current.push({ publicId, resourceType: 'image' });
        } catch (error) {
          console.error('Edited image upload failed:', error);
          setMessageImages(current => current.filter(item => item.uri !== newUri));
          Toast.show({ type: 'error', text1: 'Upload failed', text2: 'Failed to upload edited photo.' });
        }
      }, 3000);
      
      uploadTimersRef.current[newUri] = timer;
      
      updated[index] = {
        uri: newUri,
        url: null,
        publicId: null,
        uploading: false,
        isPendingUpload: true
      };
      return updated;
    });
  }, []);

  const handleAudioRecorded = useCallback((result: { uri: string; duration: number }) => {
    const uri = result.uri;
    
    if (messageAudio?.publicId) {
      const oldPublicId = messageAudio.publicId;
      deleteAsset(oldPublicId, 'video').catch(e => console.error(e));
      uploadedSessionMediaRef.current = uploadedSessionMediaRef.current.filter(item => item.publicId !== oldPublicId);
    }
    
    const timer = setTimeout(async () => {
      setMessageAudio(current => current && current.uri === uri ? { ...current, uploading: true, isPendingUpload: false } : current);
      try {
        console.log('Uploading audio...', uri);
        const { url, publicId } = await uploadAudio(uri, 'bouquet-audio');
        setMessageAudio(current => current && current.uri === uri ? { ...current, url, publicId, uploading: false } : current);
        uploadedSessionMediaRef.current.push({ publicId, resourceType: 'video' });
      } catch (error) {
        console.error('Audio upload failed:', error);
        setMessageAudio(null);
        Toast.show({ type: 'error', text1: 'Upload failed', text2: 'Failed to upload voice note.' });
      }
    }, 3000);
    
    uploadTimersRef.current[uri] = timer;
    
    setMessageAudio({
      uri,
      url: null,
      publicId: null,
      uploading: false,
      isPendingUpload: true,
      duration: result.duration
    });
  }, [messageAudio]);

  const handleRemoveAudio = useCallback(() => {
    if (!messageAudio) return;
    const uri = messageAudio.uri;
    
    if (uploadTimersRef.current[uri]) {
      clearTimeout(uploadTimersRef.current[uri]);
      delete uploadTimersRef.current[uri];
    }
    
    if (messageAudio.publicId) {
      const publicId = messageAudio.publicId;
      const deleteTimer = setTimeout(async () => {
        try {
          await deleteAsset(publicId, 'video');
          uploadedSessionMediaRef.current = uploadedSessionMediaRef.current.filter(item => item.publicId !== publicId);
        } catch (e) {
          console.error('Failed to delete audio:', e);
        }
      }, 5000);
      deleteTimersRef.current[publicId] = deleteTimer;
    }
    setMessageAudio(null);
  }, [messageAudio]);


  useEffect(() => {
    const id = setInterval(() => setPlaceholderIndex(p => (p + 1) % searchPlaceholders.length), 3000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setSlugPlaceholderIndex(p => (p + 1) % slugPlaceholders.length), 2500);
    return () => clearInterval(id);
  }, []);

  // ─── Audio cleanup ───────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync();
    };
  }, []);

  // ─── Hardware back button handler (Android) ──────────────────────────────────
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      if (isForceLeavingRef.current) return;

      // If we are in Step 2 or 3 (non-edit), physical back button should just go to previous step
      if (currentStep > 1 && !editId) {
        e.preventDefault();
        setCurrentStep(prev => prev - 1);
        return;
      }

      // If user has made changes in Step 1 or edit mode, prevent default and show confirmation
      if (selectedFlowers.length > 0 || messageCard.message.length > 0) {
        e.preventDefault();
        setShowUnsavedModal(true);
      }
    });

    return unsubscribe;
  }, [navigation, currentStep, editId, selectedFlowers.length, messageCard.message.length]);

  // ─── Credits Management ─────────────────────────────────────────────────────
  useEffect(() => {
    if (currentUser) {
      const userRef = doc(db, 'users', currentUser.uid);
      getDoc(userRef).then(async (snap) => {
        const currentMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"
        if (snap.exists()) {
          const data = snap.data();
          if (data.lastResetMonth !== currentMonth) {
            // New month detected! Reset credits to 10
            await updateDoc(userRef, {
              aiCredits: 10,
              emailCredits: 10,
              lastResetMonth: currentMonth
            });
            setCredits(10);
          } else {
            setCredits(data.aiCredits ?? 10);
          }
        } else {
          // Initialize for new user
          await setDoc(userRef, {
            aiCredits: 10,
            emailCredits: 10,
            lastResetMonth: currentMonth
          }, { merge: true });
          setCredits(10);
        }
      });
    }
  }, [currentUser]);

  // ─── Dynamic Loading Messages for Sarah ──────────────────────────────────────
  const rawMessages = t('createBouquet.aiLoadingMessages');
  const FUNNY_MESSAGES = Array.isArray(rawMessages) ? rawMessages : [
    "Sarah is talking to the flowers...",
    "Arranging the petals perfectly...",
    "Choosing the freshest stems...",
    "Sarah is smelling the roses (v)...",
    "Almost there, just adding water...",
    "Consulting with the floral spirits...",
    "Dusting off the pollen...",
    "Tucking away the thorns...",
  ];

  useEffect(() => {
    let interval: any;
    if (aiGenerating) {
      interval = setInterval(() => {
        setLoadingMessageIndex(prev => (prev + 1) % FUNNY_MESSAGES.length);
      }, 3500);
    } else {
      setLoadingMessageIndex(0);
    }
    return () => clearInterval(interval);
  }, [aiGenerating, FUNNY_MESSAGES.length]);

  // ─── Load existing bouquet for editing ───────────────────────────────────────
  useEffect(() => {
    if (!editId) return;
    const load = async () => {
      setEditLoading(true);
      try {
        // Resolve slug → UUID if needed
        let bouquetId = editId;
        const scopedSnap = await getDoc(doc(db, 'slugs', `bouquet__${editId}`));
        if (scopedSnap.exists()) {
          bouquetId = scopedSnap.data().cardId;
        } else {
          const legacySnap = await getDoc(doc(db, 'slugs', editId));
          if (legacySnap.exists()) {
            const d = legacySnap.data();
            if (d.cardType === 'bouquet' || d.type === 'bouquet') bouquetId = d.cardId;
          }
        }

        // Try cache first
        const cached = await AsyncStorage.getItem(`bouquet_${bouquetId}`);
        const data = cached ? JSON.parse(cached) : null;

        let bouquetData = data;
        if (!bouquetData) {
          const snap = await getDoc(doc(db, 'bouquet-cards', bouquetId));
          if (snap.exists()) bouquetData = snap.data();
        }

        if (bouquetData) {
          // Restore flowers
          if (bouquetData.selectedFlowers?.length) {
            setSelectedFlowers(bouquetData.selectedFlowers.map((f: any) =>
              typeof f === 'string'
                ? { id: f, uniqueId: uuidv4(), x: 50, y: 50, rotation: 0, scale: 1, zIndex: 1 }
                : { ...f, uniqueId: f.uniqueId || uuidv4() }
            ));
          }
          if (bouquetData.background !== undefined) setBackground(bouquetData.background);
          if (bouquetData.messageCard) setMessageCard(bouquetData.messageCard);
          else if (bouquetData.message !== undefined) {
            setMessageCard({
              message: bouquetData.message || '',
              senderName: bouquetData.senderName || '',
              recipientName: bouquetData.recipientName || '',
            });
          }
          if (bouquetData.messageFormatting) setMessageFormatting(bouquetData.messageFormatting);
          if (bouquetData.song) setSelectedSong(bouquetData.song);
          if (bouquetData.additionalSettings) setAdditionalSettings(bouquetData.additionalSettings);
          if (bouquetData.slug) {
            setCustomSlug(bouquetData.slug);
            originalSlugRef.current = bouquetData.slug;
          }

          // Restore images
          if (bouquetData.messageImageUrls && bouquetData.messageImageUrls.length > 0) {
            setMessageImages(bouquetData.messageImageUrls.map((url: string, idx: number) => {
              const publicId = bouquetData.messageImagePublicIds?.[idx] || getPublicIdFromUrl(url);
              return { uri: url, url, publicId, uploading: false };
            }));
          } else if (bouquetData.messageImageUrl) {
            const url = bouquetData.messageImageUrl;
            setMessageImages([{ uri: url, url, publicId: getPublicIdFromUrl(url), uploading: false }]);
          } else {
            setMessageImages([]);
          }

          // Restore audio
          if (bouquetData.messageAudioUrl) {
            const url = bouquetData.messageAudioUrl;
            setMessageAudio({
              uri: url,
              url,
              publicId: bouquetData.messageAudioPublicId || getPublicIdFromUrl(url),
              uploading: false,
              duration: bouquetData.messageAudioDuration || 0
            });
          } else {
            setMessageAudio(null);
          }

        }
      } catch (e) {
        console.error('Edit load error:', e);
      } finally {
        setEditLoading(false);
      }
    };
    load();
  }, [editId]);

  useEffect(() => {
    const checkReview = async () => {
      try {
        const submitted = await AsyncStorage.getItem('review_submitted');
        if (submitted === 'true') {
          setShowRatingWidget(false);
        }
      } catch (e) {}
    };
    checkReview();
  }, []);

  


const handleFlowerAdd = (flowerId: string) => {
  if (selectedFlowers.length >= 8) {
    Toast.show({
      type: 'info',
      text1: t('createBouquet.maxReached'),
      text2: t('createBouquet.maxReachedDesc'),
    });
    return;
  }
  const pos = generateRandomPosition(flowerId, selectedFlowers, background);
  LayoutAnimation.configureNext({ ...LayoutAnimation.Presets.spring, duration: 400 });
  setSelectedFlowers(prev => [...prev, { id: flowerId, uniqueId: uuidv4(), ...pos }]);
};

const handleFlowerRemoveLast = (groupColors: { id: string }[]) => {
  LayoutAnimation.configureNext({ ...LayoutAnimation.Presets.spring, duration: 400 });
  setSelectedFlowers(prev => {
    const arr = [...prev];
    for (let i = arr.length - 1; i >= 0; i--) {
      if (groupColors.some(c => c.id === arr[i].id)) { arr.splice(i, 1); break; }
    }
    return arr;
  });
};

const handleFlowerRemoveByUniqueId = (uniqueId: string) => {
  LayoutAnimation.configureNext({ ...LayoutAnimation.Presets.spring, duration: 400 });
  setSelectedFlowers(prev => prev.filter(f => f.uniqueId !== uniqueId));
  if (selectedFlowerForEdit?.uniqueId === uniqueId) setSelectedFlowerForEdit(null);
};

const shuffleArrangement = () => {
  let placed: PlacedFlower[] = [];
  const shuffled = selectedFlowers.map(f => {
    const pos = generateRandomPosition(f.id, placed, background);
    const n = { ...f, ...pos };
    placed.push(n);
    return n;
  });
  setSelectedFlowers(shuffled);
  if (!reduceMotion) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }
};

const handlePresetSelect = useCallback((key: string) => {
  const preset = getTranslatedPreset(key, locale);
  if (!preset) return;
  
  if (preset.greeneryBg) {
    setGreeneryBg(preset.greeneryBg);
    setBackground(null);
  } else if (preset.background !== undefined) {
    setBackground(preset.background);
    setGreeneryBg(null);
  } else {
    setBackground(0);
    setGreeneryBg(null);
  }

  const newFlowers = preset.flowers.map(id => ({ id, uniqueId: uuidv4(), ...generateRandomPosition(id, [], background) }));
  setSelectedFlowers(newFlowers);
  setMessageCard({ message: preset.message, senderName: '', recipientName: preset.recipient });
  presetsModalRef.current?.close();
  setCurrentStep(2);
}, [locale, generateRandomPosition, background, setSelectedFlowers, setMessageCard, setCurrentStep, setGreeneryBg, setBackground]);

// Greenery picker: BG wallpapers (1-5) switch the gradient BG;
// greenery plants set the greenery overlay layer behind all flowers
const handleAddGreenery = (item: { id: string; isBg?: boolean; bgIndex?: number }) => {
  if (item.isBg) {
    setBackground(item.bgIndex ?? 0);
    setGreeneryBg(null); // clear greenery overlay when switching to gradient BG
    return;
  }
  // Toggle: tap same plant again to remove it
  setGreeneryBg(prev => {
    const next = prev === item.id ? null : item.id;
    if (next === null) setBackground(0); // fallback
    else setBackground(null);
    return next;
  });
};

// Add filler with normal layering
const handleAddFiller = (itemId: string) => {
  if (selectedFlowers.length >= 30) return;
  const pos = generateRandomPosition(itemId, selectedFlowers, background);
  setSelectedFlowers(prev => [...prev, { id: itemId, uniqueId: uuidv4(), ...pos }]);
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
};


const renderPresetItem = useCallback(({ item: [key, preset] }) => (
  <TouchableOpacity style={[styles.presetCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]} onPress={() => handlePresetSelect(key)}>
    <Text style={[styles.presetCardText, { color: themeColors.brand }]}>{preset.name}</Text>
  </TouchableOpacity>
), [themeColors, handlePresetSelect]);

// ─── Audio ───────────────────────────────────────────────────────────────────
const toggleSongPlayback = async () => {
  if (!selectedSong?.previewUrl) return;
  if (isPlayingSong) {
    await soundRef.current?.pauseAsync();
    setIsPlayingSong(false);
  } else {
    if (!soundRef.current) {
      const { sound } = await Audio.Sound.createAsync({ uri: selectedSong.previewUrl }, { shouldPlay: true, isLooping: true });
      soundRef.current = sound;
    } else {
      await soundRef.current.playAsync();
    }
    setIsPlayingSong(true);
  }
};

// ─── AI Bouquet ──────────────────────────────────────────────────────────────
const generateAIBouquet = async (prompt: string) => {
  if (!currentUser) {
    Toast.show({
      type: 'info',
      text1: 'Login Required',
      text2: 'Please login to use Sarah\'s AI features',
    });
    return;
  }

  if (credits !== null && credits <= 0) {
    Toast.show({
      type: 'error',
      text1: 'No Credits',
      text2: 'You have run out of Sarah credits. Upgrade your account for more!',
    });
    return;
  }

  setAiGenerating(true);
  try {
    const allIds = FLOWER_GROUPS.flatMap(g => g.colors.map(c => c.id));
    const SARVAM_API_KEY = process.env.EXPO_PUBLIC_SARVAM_API_KEY; // replace with env var
    const res = await fetch('https://api.sarvam.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${SARVAM_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'sarvam-105b',
        messages: [
          {
            role: 'system',
            content: 'You are Sarah, a professional florist. You MUST respond with ONLY a valid JSON object. No other text. The JSON object must strictly match this format: {"flowers": ["id1", "id2", "id3", "id4", "id5"], "message": "your message"}'
          },
          {
            role: 'user',
            content: `Create a bouquet for: "${prompt}". Choose 5-8 flower IDs from this list: [${allIds.slice(0, 30).map(id => `"${id}"`).join(', ')}]. Return ONLY JSON with "flowers" array (containing 5-8 exact IDs from the list) and "message" string. IMPORTANT: Write the message in the 1st person perspective, speaking directly to the recipient (e.g., "I wanted to give you these flowers...").`
          }
        ],
        temperature: 0.3,
        max_tokens: 800,
      }),
    });
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content ?? '';

    // Try to extract JSON from the response
    const match = text.match(/\{.*?\}/s);
    let flowers: string[] = [];
    let message = '';

    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        flowers = Array.isArray(parsed.flowers) ? parsed.flowers.filter((id: string) => allIds.includes(id)) : [];
        message = parsed.message ?? '';
      } catch (parseErr) {
        console.error('JSON parse error:', parseErr);
      }
    }

    // Fallback: If no valid flowers, try to extract flower IDs from raw text
    if (flowers.length < 3) {
      const foundIds = allIds.filter(id => text.includes(id));
      if (foundIds.length >= 3) {
        flowers = foundIds.slice(0, 8);
      }
    }

    // Final validation
    if (flowers.length < 3) {
      throw new Error('Incomplete data - Sarah could not generate enough flowers');
    }

    // Successful generation → Deduct credit
    const userRef = doc(db, 'users', currentUser.uid);
    await updateDoc(userRef, { aiCredits: increment(-1) });
    setCredits(prev => (prev !== null ? prev - 1 : 0));

    setAiGenerationResult({
      flowers: flowers.slice(0, 8),
      explanation: 'Sarah curated these flowers specifically for your request.',
      message: message || 'Sending you these beautiful flowers with love.'
    });
  } catch (err) {
    console.error('AI Generation Error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    Toast.show({
      type: 'error',
      text1: 'Sarah is Busy',
      text2: errorMessage.includes('Incomplete data')
        ? 'She couldn\'t understand the request. Try being more specific!'
        : 'She couldn\'t design this bouquet right now. Your credits were not used.',
    });
  } finally {
    setAiGenerating(false);
  }
};

// ─── Random Act Submit ───────────────────────────────────────────────────────
const handleRandomActSubmit = async () => {
  setLoading(true);
  setAiVerifying(true);
  try {
    const sarvamResult = await moderateWithSarvam(messageCard.message);
    setAiVerifying(false);
    
    if (!sarvamResult.isSafe) {
      const strikes = parseInt((await AsyncStorage.getItem('RAOK_strikes')) || '0', 10) + 1;
      await AsyncStorage.setItem('RAOK_strikes', strikes.toString());
      
      if (strikes >= 3) {
        const banUntil = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
        await AsyncStorage.setItem('RAOK_banned_until', banUntil.toString());
        Alert.alert(
          t('raok.bannedTitle') || 'Feature Temporarily Disabled',
          t('raok.bannedMessage') || 'You have repeatedly violated our safety guidelines. This feature is disabled for 24 hours.'
        );
        navigation.navigate('MainTabs' as any, { screen: 'Home' });
        return;
      } else {
        Alert.alert(
          t('raok.warningTitle', 'Safety Warning'),
          t('raok.warningMessage', 'Your message violates our safety guidelines. Please revise it.')
        );
        setLoading(false);
        return;
      }
    }

    const deliveryDelayMs = Math.floor(Math.random() * 24 * 60 * 60 * 1000) + (1 * 60 * 60 * 1000); // 1-24 hours
    const deliveryTimestamp = Date.now() + deliveryDelayMs;
    
    const payload = {
      isRandomAct: true,
      creatorId: currentUser?.uid || 'anonymous',
      flowers: selectedFlowers,
      message: messageCard.message,
      targetTags: sarvamResult.tags,
      deliveryTimestamp,
      status: 'unmatched',
      createdAt: Date.now(),
    };

    await addDoc(collection(db, 'bouquet-cards'), payload);

    const sendsStr = await AsyncStorage.getItem('RAOK_sends');
    const sends = sendsStr ? JSON.parse(sendsStr) : [];
    sends.push(Date.now());
    await AsyncStorage.setItem('RAOK_sends', JSON.stringify(sends));

    // Success morphing transition
    setIsSuccess(true);
    setLoading(false);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSuccess(false);

    setShowRaokSuccessModal(true);
  } catch (error) {
    setAiVerifying(false);
    console.error('Submission failed', error);
    Alert.alert('Error', 'Something went wrong. Please try again.');
  } finally {
    setLoading(false);
  }
};

// ─── Submit ──────────────────────────────────────────────────────────────────
const handleSubmit = async () => {
  if (loading) return;
  const hasUploadingImages = messageImages.some(img => img.uploading || img.isPendingUpload);
  const isAudioUploading = messageAudio?.uploading || messageAudio?.isPendingUpload;

  if (hasUploadingImages || isAudioUploading) {
    Toast.show({
      type: 'info',
      text1: t('createBouquet.mediaUploading', 'Media uploading'),
      text2: t('createBouquet.mediaUploadingDesc', 'Please wait a moment for your media to finish uploading.'),
    });
    return;
  }
  setLoading(true);

  // Email validation if provided
  if (messageCard.recipientEmail && messageCard.recipientEmail.trim()) {
    const personalEmailRegex = /^[a-zA-Z0-9._%+-]+@(gmail\.com|googlemail\.com|yahoo\.com|yahoo\.co\.uk|hotmail\.com|outlook\.com|live\.com|icloud\.com|me\.com|mac\.com|aol.com|protonmail\.com|mail\.com|zoho\.com|yandex\.com)$/;
    if (!personalEmailRegex.test(messageCard.recipientEmail.trim().toLowerCase())) {
      setLoading(false);
      Toast.show({
        type: 'error',
        text1: t('createBouquet.invalidEmail'),
        text2: t('createBouquet.invalidEmailDesc'),
      });
      return;
    }
  }
  try {
    if (messageCard.recipientEmail?.trim() && currentUser) {
      try {
        const d = await getDoc(doc(db, 'user-emails', currentUser.uid));
        const currentMonth = new Date().toISOString().slice(0, 7);
        let count = 0;
        if (d.exists()) {
          const data = d.data();
          if (data.month === currentMonth) {
            count = data.count || 0;
          }
        }
        if (count >= 10) {
          setLoading(false);
          Toast.show({
            type: 'error',
            text1: t('createBouquet.emailLimitReached'),
            text2: t('createBouquet.emailLimitReachedDesc'),
          });
          return;
        }
      } catch (e) {
        console.error('Failed to check email credits:', e);
      }
    }

    const deviceId = await getDeviceId();

    let expoPushToken: string | null = null;

    const finalImageUrl = messageImages[0]?.url || null;
    const finalImageUrls = messageImages.map(img => img.url).filter(Boolean);
    const finalImagePublicIds = messageImages.map(img => img.publicId).filter(Boolean);
    const finalAudioUrl = messageAudio?.url || null;
    const finalAudioPublicId = messageAudio?.publicId || null;

    const bouquetPayload = {
      selectedFlowers,
      background,
      greeneryBg: greeneryBg ?? null,
      messageCard,
      messageFormatting,
      song: selectedSong ? JSON.parse(JSON.stringify(selectedSong)) : null,
      additionalSettings,
      messageImageUrl: finalImageUrl,
      messageImageUrls: finalImageUrls,
      messageImagePublicIds: finalImagePublicIds,
      messageAudioUrl: finalAudioUrl,
      messageAudioPublicId: finalAudioPublicId,
      type: 'bouquet',
      userId: currentUser?.uid || deviceId,
      version: 2,
      // ─── GOLDEN BOUQUET FEATURE ───────────────────────────────────────────────────
      ...(isGoldenMode ? { isGoldenEdition: true } : {}),
      // ─── END GOLDEN BOUQUET FEATURE ──────────────────────────────────────────────
    };

    if (editId) {
      // ── UPDATE existing bouquet — only message, song, effects, names ────
      let bouquetId = editId;
      const scopedSnap = await getDoc(doc(db, 'slugs', `bouquet__${editId}`));
      if (scopedSnap.exists()) {
        bouquetId = scopedSnap.data().cardId;
      } else {
        const legacySnap = await getDoc(doc(db, 'slugs', editId));
        if (legacySnap.exists()) {
          const d = legacySnap.data();
          if (d.cardType === 'bouquet' || d.type === 'bouquet') bouquetId = d.cardId;
        }
      }

      // Only the fields the user is allowed to change in edit mode
      const editableFields: Record<string, any> = {
        messageCard,
        messageFormatting,
        song: selectedSong ? JSON.parse(JSON.stringify(selectedSong)) : null,
        additionalSettings,
        messageImageUrl: finalImageUrl,
        messageImageUrls: finalImageUrls,
        messageImagePublicIds: finalImagePublicIds,
        messageAudioUrl: finalAudioUrl,
        messageAudioPublicId: finalAudioPublicId,
        updatedAt: serverTimestamp(),
      };

      // Slug: only update if user explicitly changed it from the original
      const slugChanged = customSlug.trim() !== originalSlugRef.current;
      if (slugChanged && customSlug.trim()) {
        // Check for offensive content
        if (isSlugOffensive(customSlug.trim())) {
          Toast.show({
            type: 'error',
            text1: t('createBouquet.invalidName'),
            text2: t('createBouquet.invalidNameDesc'),
          });
          setLoading(false);
          return;
        }

        // Check new slug isn't taken
        const slugKey = `bouquet__${customSlug.trim()}`;
        const slugSnap = await getDoc(doc(db, 'slugs', slugKey));
        if (slugSnap.exists() && slugSnap.data().cardId !== bouquetId) {
          Toast.show({
            type: 'error',
            text1: t('createBouquet.slugTaken'),
            text2: t('createBouquet.slugTakenDesc'),
          });
          setLoading(false);
          return;
        }
        editableFields.slug = customSlug.trim();
        // Write new slug doc
        await setDoc(doc(db, 'slugs', slugKey), {
          slug: customSlug.trim(),
          cardType: 'bouquet',
          cardId: bouquetId,
          createdAt: Date.now(),
        });
      }

      await setDoc(doc(db, 'bouquet-cards', bouquetId), editableFields, { merge: true });

      const finalSlug = slugChanged && customSlug.trim() ? customSlug.trim() : (originalSlugRef.current || bouquetId);
      const url = `https://egreet.in/bouquet/${finalSlug}`;

      // Update cache & sync widgets
      const updatedPayload = {
        ...bouquetPayload,
        ...editableFields,
        id: bouquetId,
        slug: finalSlug,
      };
      await AsyncStorage.setItem(`bouquet_${bouquetId}`, JSON.stringify(updatedPayload));
      if (finalSlug) {
        await AsyncStorage.setItem(`bouquet_${finalSlug}`, JSON.stringify(updatedPayload));
      }
      if (editId !== bouquetId) {
        await AsyncStorage.removeItem(`bouquet_${editId}`);
      }
      await syncWidgetDataWithBouquet(bouquetId, updatedPayload);

      // Update cache
      try {
        const deviceId = await getDeviceId();
        const cacheKey = `history_sent_${currentUser?.uid || deviceId}`;
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached) {
          let history = JSON.parse(cached);
          const idx = history.findIndex((b: any) => b.id === bouquetId || b.slug === editId);
          if (idx >= 0) {
            history[idx] = { ...history[idx], ...editableFields, slug: finalSlug };
            await AsyncStorage.setItem(cacheKey, JSON.stringify(history));
          }
        }
      } catch (_) { }

      isSubmittedRef.current = true;
      setCardUrl(url);
      setCreatedBouquetId(bouquetId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Success morphing transition
      setIsSuccess(true);
      setLoading(false);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsSuccess(false);

      setShowShareModal(true);
    } else {
      // ── CREATE new bouquet ───────────────────────────────────────────────
      const bouquetId = uuidv4();

      if (customSlug.trim()) {
        // Check for offensive content
        if (isSlugOffensive(customSlug.trim())) {
          Toast.show({
            type: 'error',
            text1: t('createBouquet.invalidName'),
            text2: t('createBouquet.invalidNameDesc'),
          });
          setLoading(false);
          return;
        }

        const slugKey = `bouquet__${customSlug.trim()}`;
        const slugSnap = await getDoc(doc(db, 'slugs', slugKey));
        if (slugSnap.exists()) {
          Toast.show({
            type: 'error',
            text1: t('createBouquet.slugTaken'),
            text2: t('createBouquet.slugTakenDesc'),
          });
          setLoading(false);
          return;
        }
      }

      await setDoc(doc(db, 'bouquet-cards', bouquetId), {
        ...bouquetPayload,
        createdAt: serverTimestamp(),
        ...(customSlug.trim() ? { slug: customSlug.trim() } : {}),
      });

      await AsyncStorage.setItem(`bouquet_created_${bouquetId}`, 'true');

      // Update cache & sync widgets
      const createdPayload = {
        ...bouquetPayload,
        id: bouquetId,
        createdAt: Date.now(),
        ...(customSlug.trim() ? { slug: customSlug.trim() } : {}),
      };
      await AsyncStorage.setItem(`bouquet_${bouquetId}`, JSON.stringify(createdPayload));
      if (customSlug.trim()) {
        await AsyncStorage.setItem(`bouquet_${customSlug.trim()}`, JSON.stringify(createdPayload));
      }
      await syncWidgetDataWithBouquet(bouquetId, createdPayload);

      if (customSlug.trim()) {
        await setDoc(doc(db, 'slugs', `bouquet__${customSlug.trim()}`), {
          slug: customSlug.trim(),
          cardType: 'bouquet',
          cardId: bouquetId,
          createdAt: Date.now(),
        });
      }

      const url = customSlug.trim()
        ? `https://egreet.in/bouquet/${customSlug.trim()}`
        : `https://egreet.in/bouquet/${bouquetId}`;

      // Cache for History/Home immediately
      try {
        const cacheKey = `history_sent_${currentUser?.uid || deviceId}`;
        const cached = await AsyncStorage.getItem(cacheKey);
        let history = cached ? JSON.parse(cached) : [];
        const newBouquet = {
          id: bouquetId,
          ...bouquetPayload,
          createdAt: Date.now(), // Approximate for immediate cache
          slug: customSlug.trim() || null
        };
        history = [newBouquet, ...history].slice(0, 30);
        await AsyncStorage.setItem(cacheKey, JSON.stringify(history));
      } catch (_) { }

      // Send email via SendPulse or Schedule
      if (messageCard.recipientEmail?.trim()) {
        if (deliveryMode === 'scheduled' && currentUser) {
          try {
            await setDoc(doc(db, 'bouquet-scheduled-emails', uuidv4()), {
              userId: currentUser.uid,
              bouquetId: bouquetId,
              recipientEmail: messageCard.recipientEmail.trim(),
              recipientName: messageCard.recipientName || 'Friend',
              senderName: messageCard.senderName,
              scheduledAt: scheduledDate.getTime(),
              status: 'pending',
              createdAt: serverTimestamp(),
              bouquetUrl: url,
              slug: customSlug.trim() || null
            });
            Toast.show({
              type: 'success',
              text1: t('createBouquet.emailScheduled'),
              text2: t('createBouquet.emailScheduledDesc')
                .replace('{date}', scheduledDate.toLocaleDateString())
                .replace('{time}', scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })),
            });
          } catch (err) {
            console.error('Failed to schedule email:', err);
            Toast.show({ type: 'error', text1: t('createBouquet.schedulingFailed'), text2: t('createBouquet.schedulingFailedDesc') });
          }
        } else {
          // Check email credits
          const userSnap = await getDoc(doc(db, 'users', currentUser!.uid));
          const emailCredits = userSnap.data()?.emailCredits ?? 10;
          if (emailCredits <= 0) {
            setLoading(false);
            Toast.show({
              type: 'error',
              text1: 'Email Limit Reached',
              text2: 'You have used all your email credits for this month.'
            });
            return;
          }

          // Immediate send
          try {
            // Simple base64 encoder for React Native
            const encodeBase64 = (str: string) => {
              const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
              let output = '';
              let i = 0;
              while (i < str.length) {
                let char1 = str.charCodeAt(i++) & 0xff;
                let char2 = i < str.length ? str.charCodeAt(i++) & 0xff : NaN;
                let char3 = i < str.length ? str.charCodeAt(i++) & 0xff : NaN;
                let enc1 = char1 >> 2;
                let enc2 = ((char1 & 3) << 4) | (isNaN(char2) ? 0 : char2 >> 4);
                let enc3 = ((char2 & 15) << 2) | (isNaN(char3) ? 0 : char3 >> 6);
                let enc4 = char3 & 63;
                if (isNaN(char2)) enc3 = enc4 = 64;
                else if (isNaN(char3)) enc4 = 64;
                output += chars.charAt(enc1) + chars.charAt(enc2) + chars.charAt(enc3) + chars.charAt(enc4);
              }
              return output;
            };

            const { httpsCallable } = require('firebase/functions');
            const { functions } = require('../firebase');
            const sendInstantEmail = httpsCallable(functions, 'sendInstantEmail');

            let emailSent = false;
            try {
              await sendInstantEmail({
                senderName: messageCard.senderName,
                recipientName: messageCard.recipientName || 'Friend',
                recipientEmail: messageCard.recipientEmail.trim(),
                bouquetUrl: url,
              });
              emailSent = true;
            } catch (err) {
              console.warn('Instant email failed:', err);
              Toast.show({
                type: 'info',
                text1: t('createBouquet.emailNotSent'),
                text2: t('createBouquet.emailNotSentDesc'),
                visibilityTime: 5000,
              });
            }
            
            if (emailSent && currentUser) {
              const userRef = doc(db, 'users', currentUser.uid);
              await updateDoc(userRef, {
                emailCredits: increment(-1)
              });
            }
          } catch (err) {
            console.error('Failed to send email:', err);
          }
        }
      }

      isSubmittedRef.current = true;
      setCardUrl(url);
      setCreatedBouquetId(bouquetId);

      // Success morphing transition
      setIsSuccess(true);
      setLoading(false);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsSuccess(false);
      
      const hasPrompted = await AsyncStorage.getItem('notifications_prompted');
      if (!hasPrompted) {
        setShowNotificationModal(true);
      } else {
        setShowSuccessModal(true);
        setTimeout(() => {
          setShowSuccessLottie(true);
        }, 300);
      }
    }
  } catch (e) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Toast.show({
      type: 'error',
      text1: t('createBouquet.errorGeneric'),
      text2: editId ? t('createBouquet.errorUpdate') : t('createBouquet.errorCreate'),
    });
    console.error(e);
  } finally {
    setLoading(false);
  }
};

const handleShare = async () => {
  const url = cardUrl;
  const msg = `I made you a digital bouquet! 💐 Open it here: ${url}`;
  try { await Share.share({ message: msg, url }); } catch { }
};

// ─── Derived ─────────────────────────────────────────────────────────────────
const canProceedStep1 = selectedFlowers.length >= 3;

// For step 3, check message/sender AND if custom slug is provided, it must be available
const canProceedStep3 =
  (isRandomActMode ? messageCard.message.trim().length >= 300 : messageCard.message.trim().length > 0) &&
  (isRandomActMode || messageCard.senderName.trim().length > 0) &&
  // If custom slug is provided, it must be available (not idle, checking, taken, or blocked)
  (customSlug.trim().length === 0 || slugStatus === 'available') &&
  isSafe;

const filteredGroups = useMemo(() =>
  FLOWER_GROUPS.filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase())),
  [searchQuery]
);

const handleViewMeaning = useCallback((g: typeof FLOWER_GROUPS[0]) => {
  setViewingMeaning(g);
  setShowColorPicker(g.colors[0].id);
}, []);

// ─── Font family map ─────────────────────────────────────────────────────────
const fontFamilyMap: Record<string, string> = {
  default: 'Manrope-Regular',
  minimalist: 'JosefinSans-Regular',
  elegant: 'PlayfairDisplay-Regular',
  modern: 'Poppins-Regular',
  classic: 'Merriweather-Regular',
  casual: 'Quicksand-Regular',
};

const handleSlugCheck = useCallback(async (slugToCheck: string) => {
  if (!slugToCheck.trim()) return;
  const slugVal = slugToCheck.trim();
  if (isSlugOffensive(slugVal)) {
    setSlugStatus('blocked');
    return;
  }
  if (checkedSlugs.has(slugVal) && slugStatus === 'taken') return;
  setSlugStatus('checking');
  try {
    const scopedId = `bouquet__${slugVal}`;
    const snap = await getDoc(doc(db, 'slugs', scopedId));
    if (snap.exists()) {
      setSlugStatus('taken');
      setCheckedSlugs(prev => new Set([...prev, slugVal]));
      return;
    }
    const legacySnap = await getDoc(doc(db, 'slugs', slugVal));
    if (legacySnap.exists()) {
      const data = legacySnap.data();
      if (!data.cardType || data.cardType === 'bouquet') {
        setSlugStatus('taken');
        setCheckedSlugs(prev => new Set([...prev, slugVal]));
        return;
      }
    }
    setSlugStatus('available');
  } catch (err) {
    console.error('Slug check failed:', err);
    setSlugStatus('idle');
  }
}, [checkedSlugs, db, slugStatus]);

// ═══════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.bg }]} edges={['top']} {...swipeHandlers}>

    <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={themeColors.bg} />

    {/* ── Edit loading overlay ── */}
    {editLoading && (
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(253,251,247,0.92)', zIndex: 999, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <ActivityIndicator color="#7A5C58" size="large" />
        <Text style={{ fontFamily: 'Manrope-SemiBold', fontSize: 15, color: '#7A5C58' }}>{t('createBouquet.loadingBouquet')}</Text>
      </View>
    )}

    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      enabled
    >

      {/* ── Top Nav (Always visible for instant feel) ── */}
      <View style={[styles.nav, { backgroundColor: themeColors.bg }]}>
        <TouchableOpacity style={styles.navBtn} onPress={handleBackNavigation}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 18, backgroundColor: isDark ? '#333' : '#f0f0f0' }}>
            <X size={20} color={isDark ? '#ccc' : '#666'} />
          </View>
        </TouchableOpacity>

        <View style={styles.stepIndicator}>
          {[1, 2, 3].map((s, i) => {
            const isStepAccessible = s === 1 || selectedFlowers.length >= 3;
            return (
              <React.Fragment key={s}>
                {i > 0 && <View style={[styles.stepDivider, { backgroundColor: themeColors.border }]} />}
                <TouchableOpacity
                  activeOpacity={0.7}
                  disabled={!isStepAccessible}
                  onPress={() => setCurrentStep(s)}
                  style={[
                    styles.stepCircle,
                    { backgroundColor: isDark ? themeColors.surface2 : '#f0f0f0' },
                    currentStep === s && styles.stepCircleActive,
                    !isStepAccessible && { opacity: 0.3 },
                    editId && s < 3 && { opacity: 0.3 },
                  ]}
                >
                  <Text style={[styles.stepNumber, { color: themeColors.textMuted }, currentStep === s && styles.stepNumberActive]}>{s}</Text>
                </TouchableOpacity>
              </React.Fragment>
            );
          })}
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={styles.navBtn} onPress={() => setShowHelp(true)}>
            <Info size={20} color={themeColors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {!isReady && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#7A5C58" size="small" />
        </View>
      )}

      {/* ── Step Content ── */}
      <Animated.View style={{ flex: 1, opacity: contentOpacity }}>
        <View style={{ flex: 1, paddingHorizontal: 16 }}>

          {/* ════ STEP 1: SELECT ════ */}
          {currentStep === 1 && (
            <Stage1Select
              isReady={isReady}
              aiGenerating={aiGenerating}
              filteredGroups={filteredGroups}
              isGoldenMode={isGoldenMode}
              themeColors={themeColors}
              t={t}
              selectedFlowers={selectedFlowers}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              searchPlaceholders={searchPlaceholders}
              placeholderIndex={placeholderIndex}
              generateAIBouquet={generateAIBouquet}
              showAlert={showAlert}
              setSelectedFlowers={setSelectedFlowers}
              currentUser={currentUser}
              credits={credits}
              setShowSarahInfo={setShowSarahInfo}
              FUNNY_MESSAGES={FUNNY_MESSAGES}
              loadingMessageIndex={loadingMessageIndex}
              handleFlowerAdd={handleFlowerAdd}
              handleFlowerRemoveLast={handleFlowerRemoveLast}
              handleViewMeaning={handleViewMeaning}
              locale={locale}
              styles={styles}
              isDark={isDark}
              isRandomActMode={isRandomActMode}
            />
          )}

          {/* ════ STEP 2: ARRANGE ════ */}
          {currentStep === 2 && (
            <Stage2Arrange
              insets={insets}
              isDraggingFlower={isDraggingFlower}
              setIsDraggingFlower={setIsDraggingFlower}
              showGreeneryPicker={showGreeneryPicker}
              setShowGreeneryPicker={setShowGreeneryPicker}
              showFillerPicker={showFillerPicker}
              setShowFillerPicker={setShowFillerPicker}
              themeColors={themeColors}
              styles={styles}
              t={t}
              customArrangementMode={customArrangementMode}
              setCustomArrangementMode={setCustomArrangementMode}
              canvasWidth={canvasWidth}
              background={background}
              greeneryBg={greeneryBg}
              selectedFlowers={selectedFlowers}
              setSelectedFlowers={setSelectedFlowers}
              selectedFlowerForEdit={selectedFlowerForEdit}
              setSelectedFlowerForEdit={setSelectedFlowerForEdit}
              handleFlowerRemoveByUniqueId={handleFlowerRemoveByUniqueId}
              reduceMotion={reduceMotion}
              isGoldenMode={isGoldenMode}
              GREENERY_OPTIONS={GREENERY_OPTIONS}
              handleAddGreenery={handleAddGreenery}
              FILLER_OPTIONS={FILLER_OPTIONS}
              handleAddFiller={handleAddFiller}
              shuffleArrangement={shuffleArrangement}
              setCurrentStep={setCurrentStep}
              isDark={isDark}
            />
          )}

          {/* ════ STEP 3: MESSAGE ════ */}
          {currentStep === 3 && (
            <Stage3Message
              insets={insets}
              themeColors={themeColors}
              styles={styles}
              t={t}
              scrollViewRef={scrollViewRef}
              editId={editId}
              isRandomActMode={isRandomActMode}
              messageCard={messageCard}
              setMessageCard={setMessageCard}
              customSlug={customSlug}
              setCustomSlug={setCustomSlug}
              slugStatus={slugStatus}
              setSlugStatus={setSlugStatus}
              isSafe={isSafe}
              moderationResult={moderationResult}
              messageFormatting={messageFormatting}
              setMessageFormatting={setMessageFormatting}
              fontFamilyMap={fontFamilyMap}
              slugPlaceholders={slugPlaceholders}
              slugPlaceholderIndex={slugPlaceholderIndex}
              checkedSlugs={checkedSlugs}
              setCheckedSlugs={setCheckedSlugs}
              deliveryMode={deliveryMode}
              setDeliveryMode={setDeliveryMode}
              currentUser={currentUser}
              scheduledDate={scheduledDate}
              setScheduledDate={setScheduledDate}
              showDatePicker={showDatePicker}
              setShowDatePicker={setShowDatePicker}
              showTimePicker={showTimePicker}
              setShowTimePicker={setShowTimePicker}
              showAccessibilitySettings={showAccessibilitySettings}
              setShowAccessibilitySettings={setShowAccessibilitySettings}
              additionalSettings={additionalSettings}
              setAdditionalSettings={setAdditionalSettings}
              showUnlockDatePicker={showUnlockDatePicker}
              setShowUnlockDatePicker={setShowUnlockDatePicker}
              showUnlockTimePicker={showUnlockTimePicker}
              setShowUnlockTimePicker={setShowUnlockTimePicker}
              isSlugOffensive={isSlugOffensive}
              handleSlugCheck={handleSlugCheck}
              isDark={isDark}
              isGoldenMode={isGoldenMode}
              messageImages={messageImages}
              messageAudio={messageAudio}
              handleAddImages={handleAddImages}
              handleRemoveImage={handleRemoveImage}
              handleEditImage={handleEditImage}
              handleAudioRecorded={handleAudioRecorded}
              handleRemoveAudio={handleRemoveAudio}
              navigation={navigation}
              selectedSuggestionCategory={selectedSuggestionCategory}
              setSelectedSuggestionCategory={setSelectedSuggestionCategory}
              RAOK_SUGGESTIONS={RAOK_SUGGESTIONS}
              translatedMessageSuggestions={translatedMessageSuggestions}
              selectedSong={selectedSong}
              setSelectedSong={setSelectedSong}
              setShowSpotifyModal={setShowSpotifyModal}
              setIsPlayingSong={setIsPlayingSong}
              soundRef={soundRef}
            />
          )}
        </View>
      </Animated.View>


      {/* ══════════════════════ MODALS ══════════════════════ */}
      
      {/* RAOK Success Modal */}
      <Modal hardwareAccelerated={true} visible={showRaokSuccessModal} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: themeColors.cardBg, borderRadius: 20, padding: 24, width: '100%', maxWidth: 400, alignItems: 'center' }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 32 }}>✨</Text>
            </View>
            <Text style={{ fontFamily: 'Manrope-Bold', fontSize: 22, color: themeColors.brand, textAlign: 'center', marginBottom: 8 }}>
              {t('raok.successTitle') || 'Bouquet Sent!'}
            </Text>
            <Text style={{ fontFamily: 'Manrope-Regular', fontSize: 15, color: themeColors.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: 24 }}>
              {t('raok.successMsg') || 'Your Random Act of Kindness has been submitted to our system. It is currently being analyzed by our AI for matching, and will automatically be sent to someone who needs it soon. Thank you for making the world a little brighter!'}
            </Text>
            <TouchableOpacity 
              style={{ backgroundColor: themeColors.brand, width: '100%', paddingVertical: 14, borderRadius: 12, alignItems: 'center' }}
              onPress={() => {
                isForceLeavingRef.current = true;
                setShowRaokSuccessModal(false);
                navigation.navigate('MainTabs' as any);
              }}
            >
              <Text style={{ fontFamily: 'Manrope-Bold', color: '#fff', fontSize: 16 }}>{t('createBouquet.returnToHome') || 'Return to Home'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Flower Meaning Modal — animated bottom sheet with scroll-aware swipe */}
      <Modal hardwareAccelerated={true} visible={!!viewingMeaning} transparent animationType="none" onRequestClose={() => { setViewingMeaning(null); setShowColorPicker(null); }}>
        <View style={StyleSheet.absoluteFill}>
          {/* Dim overlay */}
          <Animated.View
            pointerEvents={viewingMeaning ? 'auto' : 'none'}
            style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.55)', opacity: meaningOverlay }]}
          >
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => { setViewingMeaning(null); setShowColorPicker(null); }} />
          </Animated.View>

          {/* Sheet */}
          <Animated.View
            pointerEvents={meaningInteractive ? 'auto' : 'none'}
            style={[
              styles.modalBox,
              {
                position: 'absolute', left: 0, right: 0, bottom: 0,
                paddingBottom: insets.bottom + 16,
                backgroundColor: themeColors.cardBg,
                transform: [{ translateY: Animated.add(meaningSlideAnim, meaningPanY) }],
                maxHeight: SCREEN_H * 0.9,
              },
            ]}
            {...meaningPanHandlers}
          >
            {/* Drag handle */}
            <TouchableOpacity activeOpacity={1} style={{ alignItems: 'center', paddingVertical: 14, marginTop: -8 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: themeColors.border }} />
            </TouchableOpacity>


            {viewingMeaning && (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
                scrollEventThrottle={16}
                onScroll={onMeaningScroll}
                bounces={false}
              >
                <TouchableOpacity activeOpacity={1} style={{ flex: 1 }}>
                {viewingMeaning.colors.length === 1 && getFlowerImage(viewingMeaning.colors[0].id) && (
                  <View style={{ position: 'relative', alignItems: 'center' }}>
                    <CachedImage source={getFlowerImage(viewingMeaning.colors[0].id)} style={styles.meaningImg} resizeMode="contain" />
                    {(() => {
                      const cnt = selectedFlowers.filter(f => f.id === viewingMeaning.colors[0].id).length;
                      return cnt > 0 ? (
                        <View style={[styles.countBadge, { position: 'absolute', top: 8, right: '30%' }]}>
                          <Text style={styles.countBadgeText}>{cnt}</Text>
                        </View>
                      ) : null;
                    })()}
                  </View>
                )}
                <Text style={[styles.meaningTitle, { color: themeColors.text }]}>
                  {showColorPicker
                    ? getTranslatedFlowerData(locale, viewingMeaning, showColorPicker).name
                    : getTranslatedFlowerData(locale, viewingMeaning).name
                  }
                </Text>

                <Text style={[styles.meaningSectionLabel, { color: themeColors.textMuted }]}>{t('createBouquet.meaning')}</Text>
                <Text style={[styles.meaningText, { color: themeColors.text }]}>
                  {showColorPicker
                    ? getTranslatedFlowerData(locale, viewingMeaning, showColorPicker).meaning
                    : getTranslatedFlowerData(locale, viewingMeaning).meaning
                  }
                </Text>
                <Text style={[styles.meaningSectionLabel, { color: themeColors.textMuted }]}>{t('createBouquet.purpose')}</Text>
                <Text style={[styles.meaningText, { color: themeColors.text }]}>
                  {showColorPicker
                    ? getTranslatedFlowerData(locale, viewingMeaning, showColorPicker).purpose
                    : getTranslatedFlowerData(locale, viewingMeaning).purpose
                  }
                </Text>
                <Text style={[styles.meaningSectionLabel, { color: themeColors.textMuted }]}>{t('createBouquet.bestFor')}</Text>
                <Text style={[styles.meaningText, { color: themeColors.text }]}>
                  {showColorPicker
                    ? getTranslatedFlowerData(locale, viewingMeaning, showColorPicker).bestFor
                    : getTranslatedFlowerData(locale, viewingMeaning).bestFor
                  }
                </Text>

                {/* Color variants */}
                {viewingMeaning.colors.length > 1 && (
                  <>
                    <Text style={[styles.meaningSectionLabel, { marginTop: 16, color: themeColors.textMuted }]}>{t('createBouquet.chooseColor')}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, flexDirection: 'row', paddingVertical: 4 }}>
                      {viewingMeaning.colors.map(color => {
                        const cnt = selectedFlowers.filter(f => f.id === color.id).length;
                        const translatedColor = getTranslatedFlowerData(locale, viewingMeaning, color.id);
                        return (
                          <TouchableOpacity key={color.id} onPress={() => setShowColorPicker(color.id)} style={[styles.colorVariantBtn, { width: (SCREEN_W - 48) / 3.5, borderColor: showColorPicker === color.id ? themeColors.brand : themeColors.border }, showColorPicker === color.id && styles.colorVariantSelected]}>
                            <CachedImage source={getFlowerImage(color.id)} style={{ width: 48, height: 48 }} resizeMode="contain" />
                            {cnt > 0 && <View style={styles.miniCountBadge}><Text style={{ color: 'white', fontSize: 10 }}>{cnt}</Text></View>}
                            <Text style={[styles.colorVariantName, { color: themeColors.textMuted }]}>{translatedColor.name}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </>
                )}

                {/* Add / Remove */}
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                  <TouchableOpacity style={[styles.meaningAddBtn, selectedFlowers.length >= 8 && styles.fabDisabled]} disabled={selectedFlowers.length >= 8} onPress={() => { handleFlowerAdd(showColorPicker ?? viewingMeaning.colors[0].id); }}>
                    <Text style={styles.meaningAddBtnText}>{t('createBouquet.add')}</Text>
                  </TouchableOpacity>
                  {(() => {
                    const fid = showColorPicker ?? viewingMeaning.colors[0].id;
                    const cnt = selectedFlowers.filter(f => f.id === fid).length;
                    return cnt > 0 ? (
                      <TouchableOpacity style={styles.meaningRemoveBtn} onPress={() => handleFlowerRemoveLast(viewingMeaning.colors.filter(c => c.id === fid))}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <X size={16} color="white" />
                          <Text style={styles.meaningRemoveBtnText}>{t('createBouquet.remove')}</Text>
                        </View>
                      </TouchableOpacity>
                    ) : null;
                  })()}
                </View>

                <TouchableOpacity
                  style={[styles.modalCloseBottom, { backgroundColor: isDark ? themeColors.surface2 : '#f5f5f5', borderColor: themeColors.border, marginTop: 10 }]}
                  onPress={() => { setViewingMeaning(null); setShowColorPicker(null); }}
                >
                  <Text style={[styles.modalCloseBottomText, { color: themeColors.text }]}>{t('createBouquet.close')}</Text>
                </TouchableOpacity>
                </TouchableOpacity>
              </ScrollView>
            )}
          </Animated.View>
        </View>
      </Modal>

      {/* Presets Modal */}
      <PresetsModal
        ref={presetsModalRef}
        locale={locale}
        themeColors={themeColors}
        t={t}
        onSelectPreset={handlePresetSelect}
        background={background}
        generateRandomPosition={generateRandomPosition}
      />

      {/* ════ SHARE / SUCCESS MODAL ════ */}
      <ShareModal
        visible={showShareModal}
        url={cardUrl}
        recipientName={messageCard.recipientName}
        onClose={() => setShowShareModal(false)}
        title={t('createBouquet.shareTitle')}
        subtitle={t('createBouquet.shareSubtitle')}
        shareText={t('createBouquet.shareText')}
        onEnableNotifications={async () => {
          if (!createdBouquetId) return;
          try {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;
            if (existingStatus !== 'granted') {
              const { status } = await Notifications.requestPermissionsAsync();
              finalStatus = status;
            }
            if (finalStatus === 'granted') {
              // SDK 52+: projectId must be passed explicitly for production builds
              const projectId =
                Constants?.expoConfig?.extra?.eas?.projectId ??
                Constants?.easConfig?.projectId;
              const tokenData = await Notifications.getExpoPushTokenAsync(
                projectId ? { projectId } : undefined
              );
              await updateDoc(doc(db, 'bouquet-cards', createdBouquetId), {
                senderExpoPushToken: tokenData.data,
                notifyOnReply: true
              });
              
              if (currentUser) {
                await setDoc(doc(db, 'users', currentUser.uid), { expoPushToken: tokenData.data }, { merge: true });
                // Also update other bouquets just in case
                const bouquetSnap = await getDocs(query(collection(db, 'bouquet-cards'), where('userId', '==', currentUser.uid)));
                if (!bouquetSnap.empty) {
                  const batch = writeBatch(db);
                  bouquetSnap.forEach(d => {
                    batch.update(doc(db, 'bouquet-cards', d.id), { notifyOnReply: true, senderExpoPushToken: tokenData.data });
                  });
                  await batch.commit();
                }
              }
              
              await AsyncStorage.setItem('notifications_enabled', 'true');
              Toast.show({ type: 'success', text1: 'Notifications Enabled', text2: 'You will be notified when they reply.' });
            }
          } catch (e) {
            console.error('Error enabling notifications:', e);
          }
        }}
      />

      {/* Success Modal (Stays until closed) */}
      <Modal hardwareAccelerated={true} visible={showSuccessModal} transparent animationType="fade" onRequestClose={() => { }}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { paddingBottom: 24, alignItems: 'center', backgroundColor: themeColors.cardBg }]}>
            {/* Lottie Animation (Over the modal) */}
            {showSuccessLottie && (
              <View style={{ position: 'absolute', top: -100, left: 0, right: 0, bottom: 0, zIndex: 9999, pointerEvents: 'none', alignItems: 'center', justifyContent: 'center' }}>
                <LottieView
                  source={require('../../assets/animations/bouqet-created.json')}
                  autoPlay
                  loop={false}
                  style={{ width: SCREEN_W * 1.2, height: SCREEN_W * 1.2 }}
                  onAnimationFinish={() => {
                    setTimeout(() => setShowSuccessLottie(false), 3000);
                  }}
                />
              </View>
            )}

            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFF5F0', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Check size={32} color="#7A5C58" />
            </View>

            <Text style={[styles.modalTitle, { fontSize: 24, textAlign: 'center' }]}>{t('createBouquet.successTitle')}</Text>
            <Text style={{ fontSize: 14, color: '#666', marginTop: 8, textAlign: 'center', lineHeight: 22 }}>{t('createBouquet.successMsg')}</Text>

            {showRatingWidget && (
              <View style={{ marginTop: 20, alignItems: 'center', backgroundColor: 'rgba(122,92,88,0.05)', padding: 16, borderRadius: 16, width: '100%' }}>
                <Text style={{ fontFamily: 'Manrope-SemiBold', fontSize: 14, color: '#7A5C58', marginBottom: 10 }}>Enjoying the app?</Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity 
                      key={star} 
                      onPress={async () => {
                        setShowRatingWidget(false);
                        try {
                          await AsyncStorage.setItem('review_submitted', 'true');
                        } catch (e) {
                          console.log('Error saving review_submitted', e);
                        }
                        setShowRateUsConfirmModal(true);
                      }}
                    >
                      <Star fill="transparent" color="#FFB347" size={32} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <View style={{ width: '100%', marginTop: 24, gap: 12 }}>
              <TouchableOpacity
                style={{ backgroundColor: '#7A5C58', borderRadius: 14, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                onPress={async () => {
                  await Clipboard.setStringAsync(cardUrl);
                  Toast.show({
                    type: 'success',
                    text1: t('createBouquet.linkCopied') || 'Link Copied!',
                    text2: t('createBouquet.linkCopiedDesc') || 'Share it with your recipient',
                  });
                }}
              >
                <Copy size={20} color="white" />
                <Text style={{ color: '#fff', fontFamily: 'Manrope-Bold', fontSize: 16 }}>{t('createBouquet.copyLink') || 'Copy Link'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ backgroundColor: '#FFF5F0', borderRadius: 14, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: '#EAD5CC' }}
                onPress={() => setShowShareModal(true)}
              >
                <Share2 size={20} color="#7A5C58" />
                <Text style={{ color: '#7A5C58', fontFamily: 'Manrope-Bold', fontSize: 16 }}>{t('history.share')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ backgroundColor: '#FFF5F0', borderRadius: 14, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: '#EAD5CC' }}
                onPress={() => {
                  isForceLeavingRef.current = true;
                  setShowSuccessModal(false);
                  (navigation as any).replace('BouquetView', { id: cardUrl.split('/').pop() });
                }}
              >
                <Text style={{ color: '#7A5C58', fontFamily: 'Manrope-Bold', fontSize: 16 }}>{t('createBouquet.viewBouquet')}</Text>
                <ChevronRight size={18} color="#7A5C58" />
              </TouchableOpacity>

              <TouchableOpacity
                style={{ paddingVertical: 12, alignItems: 'center' }}
                onPress={() => { 
                  isForceLeavingRef.current = true;
                  setShowSuccessModal(false); 
                  navigation.navigate('MainTabs' as never, { screen: 'Home' } as never);
                }}
              >
                <Text style={{ fontFamily: 'Manrope-SemiBold', fontSize: 14, color: '#aaa' }}>{t('createBouquet.close')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal hardwareAccelerated={true} visible={showReviewFallbackModal} transparent animationType="fade" onRequestClose={() => setShowReviewFallbackModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { paddingBottom: 24, alignItems: 'center', backgroundColor: themeColors.cardBg }]}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFF5F0', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Star fill="#FFB347" color="#FFB347" size={32} />
            </View>
            <Text style={[styles.modalTitle, { fontSize: 24, textAlign: 'center' }]}>Thank You!</Text>
            <Text style={{ fontSize: 14, color: '#666', marginTop: 8, textAlign: 'center', lineHeight: 22 }}>
              Your bouquet link has been copied to your clipboard. Please leave a review on the Play Store to help us out!
            </Text>
            <View style={{ width: '100%', marginTop: 24, gap: 12 }}>
              <TouchableOpacity
                style={{ backgroundColor: '#7A5C58', borderRadius: 14, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                onPress={async () => {
                  setShowReviewFallbackModal(false);
                  const webUrl = 'https://play.google.com/store/apps/details?id=com.digibouquet.app';
                  try {
                    await Linking.openURL(webUrl);
                  } catch (webErr) {
                    console.error('Failed to open store URL from fallback modal:', webErr);
                  }
                }}
              >
                <Text style={{ color: '#fff', fontFamily: 'Manrope-Bold', fontSize: 16 }}>Open Play Store</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ paddingVertical: 12, alignItems: 'center' }}
                onPress={() => setShowReviewFallbackModal(false)}
              >
                <Text style={{ fontFamily: 'Manrope-SemiBold', fontSize: 14, color: '#aaa' }}>Maybe Later</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal hardwareAccelerated={true} visible={showRateUsConfirmModal} transparent animationType="fade" onRequestClose={() => setShowRateUsConfirmModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { paddingBottom: 24, alignItems: 'center', backgroundColor: themeColors.cardBg }]}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFF5F0', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Star fill="#FFB347" color="#FFB347" size={32} />
            </View>
            <Text style={[styles.modalTitle, { fontSize: 24, textAlign: 'center' }]}>Rate Digi Bouquet</Text>
            <Text style={{ fontSize: 14, color: '#666', marginTop: 8, textAlign: 'center', lineHeight: 22 }}>
              Would you mind taking a moment to rate us on the Play Store? Your feedback helps us grow!
            </Text>
            <View style={{ width: '100%', marginTop: 24, gap: 12 }}>
              <TouchableOpacity
                style={{ backgroundColor: '#7A5C58', borderRadius: 14, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                onPress={async () => {
                  setShowRateUsConfirmModal(false);
                  const webUrl = 'https://play.google.com/store/apps/details?id=com.digibouquet.app';
                  try {
                    await Linking.openURL(webUrl);
                  } catch (e) {
                    console.error('Failed to open Play Store from success modal:', e);
                  }
                }}
              >
                <Text style={{ color: '#fff', fontFamily: 'Manrope-Bold', fontSize: 16 }}>Sure</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ paddingVertical: 12, alignItems: 'center' }}
                onPress={() => setShowRateUsConfirmModal(false)}
              >
                <Text style={{ fontFamily: 'Manrope-SemiBold', fontSize: 14, color: '#aaa' }}>Not Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <NotificationModal 
        visible={showNotificationModal} 
        onClose={() => {
          setShowNotificationModal(false);
          setShowSuccessModal(true);
          setTimeout(() => setShowSuccessLottie(true), 300);
        }} 
      />

      {/* Unsaved Changes Modal */}
      <Modal hardwareAccelerated={true} visible={showUnsavedModal} transparent animationType="fade" onRequestClose={() => setShowUnsavedModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => setShowUnsavedModal(false)} />
          <View style={[styles.modalBox, { paddingBottom: insets.bottom + 24, backgroundColor: themeColors.cardBg }]}>
            <Text style={[styles.modalTitle, { textAlign: 'center', color: themeColors.text }]}>{t('createBouquet.unsavedTitle')}</Text>
            <Text style={{ color: themeColors.textMuted, marginVertical: 12, textAlign: 'center' }}>{t('createBouquet.unsavedDesc')}</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={[styles.fabSecondary, { flex: 1, backgroundColor: themeColors.surface, borderColor: themeColors.border }]} onPress={() => setShowUnsavedModal(false)}><Text style={[styles.fabSecondaryText, { color: themeColors.text }]}>{t('createBouquet.stay')}</Text></TouchableOpacity>
              <TouchableOpacity
                style={[styles.fabSecondary, { flex: 1, backgroundColor: '#e74c3c', borderColor: '#e74c3c' }]}
                onPress={() => {
                  isForceLeavingRef.current = true;
                  setShowUnsavedModal(false);
                  setSelectedFlowers([]);
                  setMessageCard({ message: '', senderName: '', recipientName: '' });
                  setTimeout(() => navigation.goBack(), 50);
                }}
              >
                <Text style={[styles.fabSecondaryText, { color: 'white' }]}>{t('createBouquet.leave')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <YouTubeSearchModal
        visible={showSpotifyModal}
        onClose={() => setShowSpotifyModal(false)}
        onSongSelect={(song) => {
          setSelectedSong(song);
          soundRef.current?.unloadAsync();
          soundRef.current = null;
          setIsPlayingSong(false);
        }}
        currentSong={selectedSong}
      />

      {/* Help Modal — minimal swipe-down sheet */}
      <Modal hardwareAccelerated={true} visible={showHelp} transparent animationType="none" onRequestClose={() => setShowHelp(false)}>
        <View style={StyleSheet.absoluteFill}>
          <Animated.View
            pointerEvents={showHelp ? 'auto' : 'none'}
            style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)', opacity: helpOverlay }]}
          >
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setShowHelp(false)} />
          </Animated.View>
          <Animated.View
            pointerEvents={helpInteractive ? 'auto' : 'none'}
            style={[
              styles.modalBox,
              {
                position: 'absolute', left: 0, right: 0, bottom: 0,
                paddingBottom: insets.bottom + 20,
                backgroundColor: themeColors.cardBg,
                transform: [{ translateY: Animated.add(helpSlideAnim, helpPanY) }],
                maxHeight: SCREEN_H * 0.78,
              },
            ]}
            {...helpPanHandlers}
          >
            {/* Drag handle only — no title, no close icon */}
            <TouchableOpacity activeOpacity={1} style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 14, marginTop: -8 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: themeColors.border }} />
            </TouchableOpacity>
            <ScrollView showsVerticalScrollIndicator={false} onScroll={onHelpScroll} scrollEventThrottle={16} contentContainerStyle={{ paddingHorizontal: 16 }}>
              <TouchableOpacity activeOpacity={1} style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontFamily: 'Manrope-Bold', color: themeColors.text, marginBottom: 12 }}>{t('createBouquet.howToCreate') || 'How to create a bouquet'}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: themeColors.surface2, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Text style={{ color: themeColors.brand, fontFamily: 'Manrope-Bold' }}>1</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontFamily: 'Manrope-SemiBold', color: themeColors.text }}>{t('createBouquet.selectFlowers') || 'Select Flowers'}</Text>
                  <Text style={{ fontSize: 13, color: themeColors.textMuted, marginTop: 2 }}>{t('createBouquet.selectFlowersDesc') || 'Choose at least 3 flowers to begin. Tap a flower card to see its meaning and color options.'}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: themeColors.surface2, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Text style={{ color: themeColors.brand, fontFamily: 'Manrope-Bold' }}>2</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontFamily: 'Manrope-SemiBold', color: themeColors.text }}>{t('createBouquet.arrangeThem') || 'Arrange Them'}</Text>
                  <Text style={{ fontSize: 13, color: themeColors.textMuted, marginTop: 2 }}>{t('createBouquet.arrangeThemDesc') || 'Drag flowers around the canvas. Use the toolbar to edit size, rotation, and layering.'}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: themeColors.surface2, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Text style={{ color: themeColors.brand, fontFamily: 'Manrope-Bold' }}>3</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontFamily: 'Manrope-SemiBold', color: themeColors.text }}>{t('createBouquet.personalizeAndSend') || 'Personalize & Send'}</Text>
                  <Text style={{ fontSize: 13, color: themeColors.textMuted, marginTop: 2 }}>{t('createBouquet.personalizeAndSendDesc') || 'Add a heartfelt message, pick a song, and generate a unique link to share with them.'}</Text>
                </View>
              </View>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* AI Result Modal */}
      <Modal hardwareAccelerated={true} visible={!!aiGenerationResult} transparent animationType="fade" onRequestClose={() => setAiGenerationResult(null)}>
        <View style={[styles.modalOverlay, { zIndex: 9999, elevation: 9999 }]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setAiGenerationResult(null)}
          />
          <View style={[styles.modalBox, { paddingTop: 20, paddingBottom: Math.max(insets.bottom + 20, 30), zIndex: 10000, elevation: 10000 }]}>
            {aiGenerationResult && (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  <Text style={styles.modalTitle}>Sarah&apos;s Selection</Text>
                  <TouchableOpacity
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: -4,
                      padding: 8,
                      backgroundColor: '#FFF5F5',
                      borderRadius: 20,
                      borderWidth: 1,
                      borderColor: '#FFE0E0'
                    }}
                    onPress={() => {
                      const tempResult = aiGenerationResult;
                      setAiGenerationResult(null);
                      setTimeout(() => {
                        showAlert(
                          "Report Result",
                          "Help us improve Sarah! Let us know if something seems off with this bouquet suggestion.",
                          [
                            {
                              text: "Flowers don't match",
                              onPress: () => {
                                Toast.show({
                                  type: 'success',
                                  text1: 'Feedback received',
                                  text2: 'Thanks for helping Sarah learn!'
                                });
                                setTimeout(() => setAiGenerationResult(tempResult), 250);
                              }
                            },
                            {
                              text: "Message inappropriate",
                              onPress: () => {
                                Toast.show({
                                  type: 'success',
                                  text1: 'Feedback received',
                                  text2: 'We\'ll review this right away'
                                });
                                setTimeout(() => setAiGenerationResult(tempResult), 250);
                              }
                            },
                            {
                              text: "Other issue",
                              onPress: () => {
                                Toast.show({
                                  type: 'success',
                                  text1: 'Feedback received',
                                  text2: 'Thank you for your input!'
                                });
                                setTimeout(() => setAiGenerationResult(tempResult), 250);
                              }
                            },
                            {
                              text: "Cancel",
                              style: "cancel",
                              onPress: () => {
                                setTimeout(() => setAiGenerationResult(tempResult), 250);
                              }
                            }
                          ]
                        );
                      }, 250);
                    }}
                    accessibilityLabel="Report this result"
                    accessibilityHint="Report if there's an issue with Sarah's suggestion"
                  >
                    <Flag size={16} color="#E57373" />
                  </TouchableOpacity>
                </View>
                <Text style={{ color: '#666', marginVertical: 8 }}>{aiGenerationResult.explanation}</Text>
                {aiGenerationResult.message ? (
                  <View style={styles.aiBouquetMessageBox}>
                    <Text style={styles.aiBouquetMessageLabel}>{t('createBouquet.suggestedMessage')}</Text>
                    <Text style={styles.aiBouquetMessageText}>&quot;{aiGenerationResult.message}&quot;</Text>
                  </View>
                ) : null}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                  {aiGenerationResult.flowers.map((fid, i) => {
                    const img = getFlowerImage(fid);
                    return img ? <Image key={i} source={img} style={{ width: 40, height: 40, marginRight: 8 }} resizeMode="contain" /> : null;
                  })}
                </ScrollView>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity style={[styles.fabSecondary, { flex: 1 }]} onPress={() => setAiGenerationResult(null)}>
                    <Text style={styles.fabSecondaryText}>{t('createBouquet.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.fabPrimary, { flex: 1 }]} onPress={() => {
                    const newFlowers = aiGenerationResult.flowers.map(id => ({ id, uniqueId: uuidv4(), ...generateRandomPosition(id, [], background) }));
                    setSelectedFlowers(newFlowers);
                    if (aiGenerationResult.message) setMessageCard(m => ({ ...m, message: aiGenerationResult.message }));
                    setAiGenerationResult(null);
                    setSearchQuery('');
                    setCurrentStep(2);
                  }}>
                    <Text style={styles.fabPrimaryText}>{t('createBouquet.useThis')}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Sarah Info Modal */}
      <Modal hardwareAccelerated={true} visible={showSarahInfo} transparent animationType="fade" onRequestClose={() => setShowSarahInfo(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.3)' }]}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => setShowSarahInfo(false)} />
          <View style={[styles.modalBox, { borderRadius: 20, padding: 24, width: '85%', alignSelf: 'center', marginBottom: 'auto', marginTop: 'auto' }]}>
            <View style={{ marginBottom: 16 }}>
              <Text style={[styles.modalTitle, { fontSize: 20, textAlign: 'left' }]}>Meet Sarah</Text>
              <Text style={{ fontSize: 12, color: '#999', marginTop: 2, fontFamily: 'Manrope-SemiBold', textTransform: 'uppercase', letterSpacing: 0.5 }}>Your AI Florist</Text>
            </View>

            <Text style={{ fontSize: 14, color: '#5C4844', lineHeight: 22, marginBottom: 20 }}>
              Sarah is your personal AI floral assistant. She uses advanced language models to design custom bouquets based on your unique sentiments and occasions.
            </Text>

            <View style={{ gap: 10, marginBottom: 24 }}>
              {[
                { text: 'Describe a feeling or occasion' },
                { text: 'Sarah selects the perfect flowers' },
                { text: 'A unique bouquet is crafted instantly' }
              ].map((step, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#7A5C58' }} />
                  <Text style={{ fontSize: 13, color: '#666' }}>{step.text}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={{ backgroundColor: '#7A5C58', borderRadius: 10, paddingVertical: 12, alignItems: 'center' }}
              onPress={() => setShowSarahInfo(false)}
            >
              <Text style={{ color: 'white', fontFamily: 'Manrope-Bold', fontSize: 14 }}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </KeyboardAvoidingView>

    {/* ── Floating Action Bar — moved outside KeyboardAvoidingView for stability ── */}
    {!(currentStep === 1 && isKeyboardVisible) && (
      <Animated.View style={[styles.fab, { bottom: fabBottom }]}>
        {currentStep === 1 && (
          <>
            {!isRandomActMode && (
              <BouncyButton style={styles.fabSecondary} onPress={() => presetsModalRef.current?.open()}>
                <Text style={styles.fabSecondaryText}>{t('createBouquet.presets')}</Text>
              </BouncyButton>
            )}
            <BouncyButton style={[styles.fabPrimary, !canProceedStep1 && styles.fabDisabled, { backgroundColor: themeColors.brand || '#7A5C58' }]} disabled={!canProceedStep1} onPress={() => setCurrentStep(2)}>
              <Text style={styles.fabPrimaryText}>{t('createBouquet.continue')}</Text>
            </BouncyButton>
          </>
        )}
        {currentStep === 2 && !selectedFlowerForEdit && (
          <>
            <BouncyButton style={styles.fabSecondary} onPress={() => setCurrentStep(1)}>
              <Text style={styles.fabSecondaryText}>{t('createBouquet.back')}</Text>
            </BouncyButton>
            <BouncyButton style={[styles.fabPrimary, { backgroundColor: themeColors.brand || '#7A5C58' }]} onPress={() => setCurrentStep(3)}>
              <Text style={styles.fabPrimaryText}>{t('createBouquet.addMessage')}</Text>
            </BouncyButton>
          </>
        )}
        {currentStep === 3 && (
          <>
            {!editId && !(loading || isSuccess) && (
              <BouncyButton style={styles.fabSecondary} onPress={() => setCurrentStep(2)}>
                <Text style={styles.fabSecondaryText}>{t('createBouquet.back')}</Text>
              </BouncyButton>
            )}
            <BouncyButton
              disabled={!canProceedStep3 || loading || isSuccess}
              style={[
                styles.fabPrimary,
                { backgroundColor: isSuccess ? '#2ecc71' : (themeColors.brand || '#7A5C58') },
                (!canProceedStep3 || (loading && !isSuccess)) && styles.fabDisabled,
                (loading || isSuccess) && { flex: 0, width: 56, height: 56, borderRadius: 28 }
              ]}
              onPress={() => {
                if (isSubmittingRef.current) return;
                isSubmittingRef.current = true;
                const submitFn = isRandomActMode ? handleRandomActSubmit : handleSubmit;
                submitFn().finally(() => { isSubmittingRef.current = false; });
              }}
            >
              {isSuccess ? (
                <Check size={24} color="white" />
              ) : loading ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ActivityIndicator color="#fff" size="small" />
                  {isAiVerifying && (
                    <Text style={[styles.fabPrimaryText, { color: '#fff' }]}>{t('createBouquet.verifyingAi', 'Checking with AI...')}</Text>
                  )}
                </View>
              ) : (messageImages.some(img => img.uploading || img.isPendingUpload) || messageAudio?.uploading) ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.fabPrimaryText}>{t('createBouquet.uploadingAssets', 'Uploading Assets...')}</Text>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.fabPrimaryText}>{editId ? t('createBouquet.saveChanges') : t('createBouquet.finishBouquet')}</Text>
                  <Check size={18} color="white" />
                </View>
              )}
            </BouncyButton>
          </>
        )}
      </Animated.View>
    )}

    {/* ── Random Act of Kindness Guidelines Modal ── */}
    <Modal
      visible={showRaokGuidelinesModal}
      transparent={true}
      animationType="fade"
      statusBarTranslucent={true}
    >
      <View style={styles.raokModalBackdrop}>
        <View style={[styles.raokModalContainer, { backgroundColor: themeColors.bg, borderColor: themeColors.border }]}>
          {/* Header */}
          <View style={styles.raokModalHeader}>
            <View style={[styles.raokIconWrapper, { backgroundColor: isDark ? 'rgba(196, 151, 143, 0.15)' : 'rgba(122, 92, 88, 0.1)' }]}>
              <Heart size={32} color={themeColors.brand || '#7A5C58'} />
            </View>
            <Text style={[styles.raokModalTitle, { color: themeColors.text }]}>{t('raok.guidelinesTitle') || 'Random Act of Kindness'}</Text>
            <Text style={[styles.raokModalSubtitle, { color: themeColors.textMuted }]}>
              {t('raok.guidelinesSubtitle') || 'Send a little warmth and surprise a stranger! Here is how it works & guidelines to follow.'}
            </Text>
          </View>

          {/* Rules/Info List */}
          <View style={styles.raokRulesList}>
            {/* Rule 1: How it works */}
            <View style={styles.raokRuleRow}>
              <View style={[styles.raokRuleNumWrapper, { backgroundColor: isDark ? '#3D3533' : '#f0f0f0' }]}>
                <Text style={[styles.raokRuleNumText, { color: themeColors.text }]}>1</Text>
              </View>
              <View style={styles.raokRuleTextContainer}>
                <Text style={[styles.raokRuleTitle, { color: themeColors.text }]}>{t('raok.rule1Title') || 'Spread Joy Anonymously'}</Text>
                <Text style={[styles.raokRuleDesc, { color: themeColors.textMuted }]}>
                  {t('raok.rule1Desc') || 'Your bouquet and message will be randomly matched by AI to someone who needs a smile today, completely anonymously.'}
                </Text>
              </View>
            </View>

            {/* Rule 2: Keep it positive */}
            <View style={styles.raokRuleRow}>
              <View style={[styles.raokRuleNumWrapper, { backgroundColor: isDark ? '#3D3533' : '#f0f0f0' }]}>
                <Text style={[styles.raokRuleNumText, { color: themeColors.text }]}>2</Text>
              </View>
              <View style={styles.raokRuleTextContainer}>
                <Text style={[styles.raokRuleTitle, { color: themeColors.text }]}>{t('raok.rule2Title') || 'Be Positive & Uplifting'}</Text>
                <Text style={[styles.raokRuleDesc, { color: themeColors.textMuted }]}>
                  {t('raok.rule2Desc') || 'Write warm, encouraging words. Leave comments that inspire hope, kindness, and support.'}
                </Text>
              </View>
            </View>

            {/* Rule 3: Keep it safe */}
            <View style={styles.raokRuleRow}>
              <View style={[styles.raokRuleNumWrapper, { backgroundColor: isDark ? '#3D3533' : '#f0f0f0' }]}>
                <Text style={[styles.raokRuleNumText, { color: themeColors.text }]}>3</Text>
              </View>
              <View style={styles.raokRuleTextContainer}>
                <Text style={[styles.raokRuleTitle, { color: themeColors.text }]}>{t('raok.rule3Title') || 'No Personal Information'}</Text>
                <Text style={[styles.raokRuleDesc, { color: themeColors.textMuted }]}>
                  {t('raok.rule3Desc') || 'For your safety and others, do not include names, phone numbers, addresses, social handles, or links.'}
                </Text>
              </View>
            </View>
          </View>

          {/* CTA Button */}
          <TouchableOpacity
            style={[styles.raokSoundsGoodBtn, { backgroundColor: themeColors.brand || '#7A5C58' }]}
            onPress={() => {
              setShowRaokGuidelinesModal(false);
              AsyncStorage.setItem('hasShownRaokGuidelines', 'true').catch(console.warn);
            }}
            activeOpacity={0.9}
          >
            <Text style={styles.raokSoundsGoodText}>{t('raok.soundsGood') || 'Sounds good'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  </SafeAreaView>
);
};

export default CreateBouquet;

// ═══════════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  navBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  navBtnText: { fontSize: 15 },
  stepIndicator: { flexDirection: 'row', alignItems: 'center' },
  stepCircle: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  stepCircleActive: { backgroundColor: '#7A5C58' },
  stepNumber: { fontSize: 14, fontWeight: '600' },
  stepNumberActive: { color: 'white' },
  stepDivider: { width: 20, height: 1, marginHorizontal: 4 },

  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },

  stepTitle: { fontSize: 26, fontWeight: '600', textAlign: 'center', color: '#7A5C58', marginBottom: 6, fontFamily: 'serif' },
  stepSubtitle: { fontSize: 14, textAlign: 'center', color: '#666', marginBottom: 20 },
  textWarning: { color: '#e67e22' },
  textSuccess: { color: '#27ae60' },

  searchRow: { flexDirection: 'row', gap: 10, marginBottom: 16, alignItems: 'center' },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: '#e0e0e0', borderRadius: 30, paddingHorizontal: 14, backgroundColor: 'white' },
  searchIcon: { fontSize: 16, marginRight: 6 },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 10, color: '#7A5C58' },
  clearBtn: { fontSize: 16, color: '#999', paddingLeft: 8 },
  clearAllBtn: { paddingHorizontal: 10, height: 48, justifyContent: 'center', backgroundColor: '#e74c3c', borderRadius: 24 },
  clearAllBtnText: { color: 'white', fontSize: 13, fontWeight: '500' },

  noResultsBox: { alignItems: 'center', padding: 30, backgroundColor: 'white', borderRadius: 12, borderWidth: 2, borderColor: '#7A5C58', marginVertical: 20 },
  noResultsTitle: { fontSize: 16, fontWeight: '600', color: '#7A5C58', marginBottom: 8 },
  noResultsSubtitle: { fontSize: 13, color: '#666', marginBottom: 20, textAlign: 'center' },
  aiBtnPrimary: { paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#7A5C58', borderRadius: 8 },
  aiBtnText: { color: 'white', fontWeight: '600', fontSize: 14 },

  flowerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  flowerCard: { width: (SCREEN_W - 44) / 2, borderRadius: 12, padding: 8, marginBottom: 16, borderWidth: 1 },
  flowerImgWrapper: { width: '100%', aspectRatio: 1, position: 'relative', alignItems: 'center', justifyContent: 'center' },
  flowerImg: { width: '88%', height: '88%' },
  countBadge: { position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: '#7A5C58', alignItems: 'center', justifyContent: 'center' },
  countBadgeText: { color: 'white', fontSize: 12, fontWeight: '700' },
  flowerLabel: { textAlign: 'center', fontSize: 13, fontWeight: '600', color: '#7A5C58', marginVertical: 8, fontFamily: 'serif' },
  flowerActionRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  addBtn: { flex: 1, backgroundColor: '#7A5C58', borderRadius: 6, paddingVertical: 8, alignItems: 'center' },
  addBtnText: { color: 'white', fontSize: 13, fontWeight: '600' },
  btnDisabled: { opacity: 0.5 },
  colorBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 2, borderColor: '#7A5C58', borderRadius: 6 },
  colorDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1 },
  colorBtnText: { fontSize: 13, fontWeight: '600', color: '#7A5C58' },
  removeBtn: { width: 34, height: 34, backgroundColor: '#e74c3c', borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  removeBtnText: { color: 'white', fontSize: 14, fontWeight: '700' },

  // Canvas
  canvas: { borderRadius: 6, overflow: 'hidden', alignSelf: 'center', marginBottom: 16 },
  placedFlower: { position: 'absolute' },
  removeFlowerBtn: { position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(255,0,0,0.8)', alignItems: 'center', justifyContent: 'center', zIndex: 10 },

  editControls: { borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1 },
  editTitle: { fontSize: 14, fontWeight: '600', marginBottom: 12 },
  editRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  editLabel: { fontSize: 12, fontWeight: '500', marginBottom: 6 },
  editBtnRow: { flexDirection: 'row', gap: 8 },
  editBtn: { flex: 1, padding: 8, borderWidth: 1, borderRadius: 6, alignItems: 'center' },
  doneEditBtn: { paddingVertical: 8, borderRadius: 6, alignItems: 'center', borderWidth: 1 },
  doneEditBtnText: { fontSize: 13, color: '#7A5C58' },

  toolsPanel: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, borderRadius: 50, paddingVertical: 12, paddingHorizontal: 24, alignSelf: 'stretch', marginHorizontal: 16, borderWidth: 1, marginTop: 16 },
  toolBtn: { alignItems: 'center', gap: 4, paddingHorizontal: 6 },
  toolBtnToggle: { backgroundColor: 'transparent', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, gap: 4 },
  toolBtnToggleActive: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  toolBtnActive: { backgroundColor: '#7A5C58', borderRadius: 8, padding: 8 },
  toolBtnIcon: { fontSize: 22 },
  toolBtnLabel: { fontSize: 11 },

  // ── Greenery / Filler Picker Drawer ──
  pickerDrawer: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    marginHorizontal: 0,
    marginBottom: 6,
    zIndex: 10,
    // NOTE: no overflow:hidden — that clips touch targets in React Native
  },
  pickerDrawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  pickerDrawerTitle: {
    fontSize: 13,
    fontFamily: 'Manrope-SemiBold',
  },
  pickerScrollContent: {
    paddingHorizontal: 10,
    paddingBottom: 10,
    gap: 8,
    flexDirection: 'row',
  },
  pickerItem: {
    alignItems: 'center',
    width: 72,
  },
  pickerItemImg: {
    width: 64,
    height: 64,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.04)',
    marginBottom: 4,
  },
  pickerItemLabel: {
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    textAlign: 'center',
    lineHeight: 13,
  },

  postcard: { borderRadius: 16, padding: 20, borderWidth: 1, marginBottom: 20 },
  fieldLabel: { fontSize: 11, fontFamily: 'Manrope-Medium', color: '#7A5C58', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  recipientInput: { fontSize: 16, fontFamily: 'Manrope-Regular', color: '#7A5C58', paddingVertical: 4 },
  divider: { height: 1, marginBottom: 4 },
  fmtChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 2, marginRight: 8 },
  fmtChipActive: { backgroundColor: '#7A5C58', borderColor: '#7A5C58' },
  fmtChipText: { fontSize: 13, fontWeight: '600', color: '#7A5C58' },
  fmtChipTextActive: { color: 'white' },
  sugTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 2, marginRight: 8 },
  sugTabActive: { backgroundColor: '#7A5C58', borderColor: '#7A5C58' },
  sugTabText: { fontSize: 13, fontWeight: '600', color: '#7A5C58' },
  sugTabTextActive: { color: 'white' },
  sugList: { borderRadius: 8, padding: 10, marginBottom: 12 },
  sugItem: { borderRadius: 6, padding: 10, marginBottom: 8 },
  sugItemText: { fontSize: 13, lineHeight: 20 },
  messageTextarea: { minHeight: 160, fontSize: 16, color: '#7A5C58', lineHeight: 26, textAlignVertical: 'top', paddingTop: 4 },
  postcardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 12 },
  signatureInput: { fontSize: 16, fontFamily: 'Manrope-Regular', color: '#7A5C58', paddingVertical: 4 },
  charCount: { fontSize: 12, color: '#ccc' },

  songSection: { marginTop: 16, marginBottom: 20 },
  addMusicBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderWidth: 1, borderColor: '#ccc', borderStyle: 'dashed', borderRadius: 12, backgroundColor: 'transparent' },
  musicIcon: { fontSize: 22 },
  addMusicText: { fontSize: 15, color: '#666' },
  selectedSong: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#eee' },
  albumArt: { width: 50, height: 50, borderRadius: 6 },
  songName: { fontWeight: '600', fontSize: 14, color: '#7A5C58' },
  songArtist: { fontSize: 13, color: '#666' },
  songTiming: { fontSize: 12, color: '#7A5C58', marginTop: 4, fontWeight: '500' },
  playBtn: { fontSize: 13, color: '#1db954', marginTop: 4 },

  animSection: { marginBottom: 20 },
  sectionLabel: { fontSize: 15, fontWeight: '600', color: '#7A5C58', marginBottom: 10 },
  animGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  animBtn: { paddingVertical: 12, paddingHorizontal: 14, backgroundColor: 'white', borderWidth: 1, borderColor: '#dee2e6', borderRadius: 12, alignItems: 'center', minWidth: (SCREEN_W - 76) / 3 },
  animBtnActive: { backgroundColor: '#7A5C58', borderColor: '#7A5C58' },
  animBtnText: { fontSize: 13, fontWeight: '500', color: '#7A5C58', textAlign: 'center' },

  settingsToggle: { padding: 14, borderRadius: 12, borderWidth: 2, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  settingsToggleText: { fontSize: 15, fontFamily: 'Manrope-Medium', color: '#7A5C58' },
  settingsBox: { borderRadius: 12, padding: 16, borderWidth: 2, marginBottom: 16 },
  settingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 24 },
  checkbox: { width: 22, height: 22, borderRadius: 4, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  checkboxChecked: { backgroundColor: '#7A5C58', borderColor: '#7A5C58' },
  settingLabel: { fontSize: 15, fontWeight: '500', color: '#7A5C58' },
  settingDesc: { fontSize: 12, marginTop: 2, lineHeight: 18 },

  slugSection: { marginBottom: 20 },
  slugInputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  slugInput: { borderWidth: 2, borderColor: '#e9ecef', borderRadius: 8, padding: 12, fontSize: 15, color: '#7A5C58', backgroundColor: 'white' },
  slugCheckBtn: { paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#7A5C58', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  slugCheckBtnText: { color: 'white', fontWeight: '600', fontSize: 13 },

  // FAB
  fab: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', gap: 10, justifyContent: 'center', alignItems: 'center' },
  fabPrimary: { flex: 1, backgroundColor: '#7A5C58', paddingVertical: 14, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  fabPrimaryText: { color: 'white', fontWeight: '600', fontSize: 15 },
  fabSecondary: { flex: 0.5, backgroundColor: 'white', paddingVertical: 14, borderRadius: 30, alignItems: 'center', borderWidth: 1, borderColor: '#e0e0e0' },
  fabSecondaryText: { color: '#666', fontWeight: '500', fontSize: 14 },
  fabDisabled: { opacity: 0.45 },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'flex-end', elevation: 999, zIndex: 999 },
  modalBox: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, width: '100%', maxHeight: SCREEN_H * 0.9, elevation: 1000, zIndex: 1000 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#7A5C58', fontFamily: 'serif' },
  modalSubtitle: { fontSize: 13, marginTop: 2 },
  modalClose: { position: 'absolute', top: 0, right: 0, zIndex: 10, padding: 4 },
  modalCloseX: { position: 'absolute', top: 12, right: 12, zIndex: 20, padding: 8 },
  modalCloseXCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },

  meaningImg: { width: 120, height: 120, alignSelf: 'center', marginBottom: 12 },
  meaningTitle: { fontSize: 20, fontWeight: '500', textAlign: 'center', color: '#7A5C58', fontFamily: 'Manrope-Medium', marginBottom: 16 },
  meaningSectionLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  meaningText: { fontSize: 15, color: '#7A5C58', lineHeight: 22, marginBottom: 12 },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorVariantBtn: { alignItems: 'center', padding: 6, borderRadius: 10, borderWidth: 2, width: 72 },
  colorVariantSelected: { borderColor: '#7A5C58' },
  colorVariantName: { fontSize: 11, marginTop: 4, textAlign: 'center' },
  miniCountBadge: { position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: 9, backgroundColor: '#7A5C58', alignItems: 'center', justifyContent: 'center' },
  meaningAddBtn: { flex: 1, backgroundColor: '#7A5C58', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  meaningAddBtnText: { color: 'white', fontWeight: '600', fontSize: 15 },
  meaningRemoveBtn: { flex: 1, backgroundColor: '#e74c3c', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  meaningRemoveBtnText: { color: 'white', fontWeight: '600', fontSize: 15 },
  modalCloseBottom: { paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 8, borderWidth: 1 },
  modalCloseBottomText: { fontSize: 14, fontWeight: '600', color: '#7A5C58' },

  presetCard: { flex: 1, padding: 16, borderRadius: 8, borderWidth: 2, alignItems: 'center' },
  presetCardText: { fontSize: 14, fontWeight: '600', color: '#7A5C58', textAlign: 'center' },

  aiMagicBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#7A5C58',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    shadowColor: '#7A5C58',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  // urlText removed as per ShareModal migration

  aiBouquetMessageBox: {
    backgroundColor: '#FFF5F0',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    marginTop: 8,
  },
  aiBouquetMessageLabel: {
    fontSize: 12,
    fontFamily: 'Manrope-Bold',
    color: '#7A5C58',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  aiBouquetMessageText: {
    fontSize: 14,
    color: '#5C4844',
    lineHeight: 20,
    fontStyle: 'italic',
  },

  // Help modal
  helpCloseBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  helpSection: { marginBottom: 20, borderRadius: 12, padding: 14, borderWidth: 1 },
  helpSectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  helpSectionEmoji: { fontSize: 20 },
  helpSectionTitle: { fontSize: 14, fontWeight: '700', color: '#5C4844', fontFamily: 'serif' },
  helpItem: { flexDirection: 'row', gap: 10, marginBottom: 8, alignItems: 'flex-start' },
  helpDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#7A5C58', marginTop: 6, flexShrink: 0 },
  helpItemText: { fontSize: 13, lineHeight: 20, flex: 1 },

  // Delivery Tabs
  deliveryTabs: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  deliveryTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8, borderWidth: 1, borderColor: '#eee', backgroundColor: '#f8f9fa' },
  deliveryTabActive: { backgroundColor: '#7A5C58', borderColor: '#7A5C58' },
  deliveryTabText: { fontSize: 13, fontWeight: '600', color: '#666' },
  deliveryTabTextActive: { color: 'white' },
  scheduleControls: { flexDirection: 'row', gap: 10 },
  schedulePickerBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#eee', backgroundColor: '#fff' },
  schedulePickerText: { fontSize: 14, color: '#7A5C58', fontWeight: '500' },
  // ─── GOLDEN BOUQUET FEATURE ───────────────────────────────────────────────────
  goldenHeaderBanner: {
    backgroundColor: '#FBF3DC',
    borderColor: '#D4AF37',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#C9960C',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  goldenHeaderTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 18,
    color: '#8B6914',
    marginBottom: 4,
  },
  goldenHeaderSub: {
    fontFamily: 'Manrope-Regular',
    fontSize: 13,
    color: '#8B6914',
    opacity: 0.85,
  },
  // ─── END GOLDEN BOUQUET FEATURE ──────────────────────────────────────────────
  // RAOK Guidelines Modal styles
  raokModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  raokModalContainer: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  raokModalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  raokIconWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  raokModalTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 6,
  },
  raokModalSubtitle: {
    fontFamily: 'Manrope-Regular',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 6,
  },
  raokRulesList: {
    width: '100%',
    gap: 16,
    marginBottom: 24,
  },
  raokRuleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  raokRuleNumWrapper: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  raokRuleNumText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 12,
  },
  raokRuleTextContainer: {
    flex: 1,
  },
  raokRuleTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 14,
    marginBottom: 2,
  },
  raokRuleDesc: {
    fontFamily: 'Manrope-Regular',
    fontSize: 12,
    lineHeight: 16,
  },
  raokSoundsGoodBtn: {
    width: '100%',
    paddingVertical: 13,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  raokSoundsGoodText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 15,
    color: '#FAF7F2',
  },
});
