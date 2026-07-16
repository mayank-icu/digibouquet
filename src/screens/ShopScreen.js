import { PremiumImage } from '../components/PremiumImage';
import { HapticButton } from '../components/HapticButton';
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, StatusBar,
  FlatList, ActivityIndicator, Linking, Animated, Keyboard,
  ScrollView, Modal, Platform, Alert, PanResponder, InteractionManager,
  KeyboardAvoidingView, Dimensions
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useCountry } from '../contexts/CountryContext';
import { useSwipeNavigation } from '../hooks/useSwipeNavigation';
import { searchBouquets, applyClientFilters, seedAllShopData } from '../utils/serperService';
import { SkeletonBar } from './HomeSkeletonScreen';
import { FLORIST_DIRECTORY } from '../data/floristDirectory';
import { CachedImage } from '../components/CachedImage';
import LottieView from 'lottie-react-native';
const AnimatedFlashList = Animated.createAnimatedComponent(FlashList);

// ─── Constants ────────────────────────────────────────────────────────────────
const BRAND  = '#7A5C58';
const CREAM  = '#FAF7F2';
const MID    = '#EAE0D5';
const DARK   = '#5C4844';
const MUTED  = '#997E7A';

const TRENDING_TYPES = [
  { label: 'Roses', query: 'red garden roses flower bouquet', img: { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/shop/red-garden-roses.webp' } },
  { label: 'White Lilies', query: 'white lilies flower bouquet', img: { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/shop/white-lilies.webp' } },
  { label: 'Sunflowers', query: 'sunflowers and daisies flower bouquet', img: { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/shop/sunflowers-and-daisies.webp' } },
  { label: 'Hydrangeas', query: 'blue hydrangeas flower bouquet', img: { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/shop/blue-hydrangeas.webp' } },
  { label: 'Orchids', query: 'magenta orchids flower bouquet', img: { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/shop/magenta-orchids.webp' } },
  { label: 'Carnations', query: 'pink carnations flower bouquet', img: { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/shop/pink-carnations.webp' } },
];

const SHOP_CATEGORIES = [
  { label: 'Birthday', query: 'birthday flower bouquet', image: { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/shop/birthday.webp' } },
  { label: 'Love', query: 'love flower bouquet', image: { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/shop/love.webp' } },
  { label: 'Anniversary', query: 'anniversary flower bouquet', image: { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/shop/anniversary.webp' } },
  { label: 'Congrats', query: 'congratulations flower bouquet', image: { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/shop/congrats.webp' } },
  { label: 'Get Well', query: 'get well soon flower bouquet', image: { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/shop/get-well.webp' } },
  { label: 'Apology', query: 'apology flower bouquet', image: { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/shop/apology.webp' } },
  { label: 'Sympathy', query: 'sympathy flower bouquet', image: { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/shop/sympathy.webp' } },
  { label: 'Just Because', query: 'just because flower bouquet', image: { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/shop/just-because.webp' } },
  { label: 'Mother\'s Day', query: 'mothers day flower bouquet', image: { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/shop/love.webp' } },
  { label: 'Valentine\'s Day', query: 'valentines day flower bouquet', image: { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/shop/love.webp' } },
  { label: 'Thank You', query: 'thank you flower bouquet', image: { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/shop/congrats.webp' } },
  { label: 'Housewarming', query: 'housewarming flower bouquet', image: { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/shop/birthday.webp' } },
  { label: 'New Baby', query: 'new baby flower bouquet', image: { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/shop/birthday.webp' } },
  { label: 'Graduation', query: 'graduation flower bouquet', image: { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/shop/congrats.webp' } },
  { label: 'Romance', query: 'romance flower bouquet', image: { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/shop/love.webp' } },
  { label: 'Internal', query: 'INTERNAL_BOUQUET_DATA', image: { uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/shop/just-because.webp' } },
];

const isVendorVerified = (name, country) => {
  if (!name || name === 'Verified Florist') return false;
  const list = FLORIST_DIRECTORY[country.toUpperCase()] || [];
  const normalizedSearch = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  return list.some(vendor => 
    vendor.name.toLowerCase().replace(/[^a-z0-9]/g, '').includes(normalizedSearch) ||
    normalizedSearch.includes(vendor.name.toLowerCase().replace(/[^a-z0-9]/g, '')) ||
    (vendor.aliases && vendor.aliases.some(alias => 
      alias.toLowerCase().replace(/[^a-z0-9]/g, '').includes(normalizedSearch) ||
      normalizedSearch.includes(alias.toLowerCase().replace(/[^a-z0-9]/g, ''))
    ))
  );
};

const parseChatIntent = (input) => {
  const text = input.toLowerCase();
  
  if (text.includes('anniversary') || text.includes('romantic') || text.includes('love') || text.includes('date') || text.includes('wife') || text.includes('husband') || text.includes('girlfriend') || text.includes('boyfriend') || text.includes('proposal') || text.includes('valentyn') || text.includes('valen')) {
    return { query: 'romantic red roses premium bouquet', occasion: 'Romantic Anniversary' };
  }
  if (text.includes('sick') || text.includes('well') || text.includes('hospital') || text.includes('cheer') || text.includes('sorry') || text.includes('sad') || text.includes('comfort')) {
    return { query: 'bright yellow sunflowers and daisies cheerful bouquet', occasion: 'Get Well & Cheer Up' };
  }
  if (text.includes('birthday') || text.includes('celebrat') || text.includes('party') || text.includes('congrat') || text.includes('graduate') || text.includes('achievement')) {
    return { query: 'colorful mixed gerberas and lilies celebratory bouquet', occasion: 'Birthday & Celebration' };
  }
  if (text.includes('thank') || text.includes('appreciat') || text.includes('gratitude') || text.includes('teacher') || text.includes('kindness')) {
    return { query: 'elegant pink carnations and tulips thank you bouquet', occasion: 'Thank You & Appreciation' };
  }
  if (text.includes('mother') || text.includes('mom') || text.includes('parent') || text.includes('grandma') || text.includes('family')) {
    return { query: 'soft pastel carnations and roses mothers day bouquet', occasion: 'Mother\'s Day & Family' };
  }
  if (text.includes('sympathy') || text.includes('funeral') || text.includes('loss') || text.includes('condolence') || text.includes('peace')) {
    return { query: 'serene white lilies and orchids sympathy bouquet', occasion: 'Sympathy & Condolence' };
  }
  if (text.includes('wedding') || text.includes('bride') || text.includes('marriage') || text.includes('groom')) {
    return { query: 'luxury white roses and calla lilies wedding bouquet', occasion: 'Wedding & Bridal' };
  }
  
  return { query: `${input} flower bouquet`, occasion: 'Special Selection' };
};

// ─── Product Card Skeleton ──────────────────────────────────────────────────────────────
function ProductCardSkeleton({ theme }) {
  return (
    <View style={{ width: '100%', height: 240, borderRadius: 16, backgroundColor: theme.cardBg, marginBottom: 16, padding: 16, justifyContent: 'space-between', overflow: 'hidden' }}>
      {/* Top Vendor Badge Skeleton */}
      <SkeletonBar w={130} h={32} radius={16} />
      
      {/* Bottom Section */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <View style={{ flex: 1, marginRight: 12 }}>
          {/* Title */}
          <SkeletonBar w="80%" h={20} radius={6} style={{ marginBottom: 8 }} />
          {/* Rating */}
          <SkeletonBar w={60} h={12} radius={4} />
        </View>
        
        {/* Price */}
        <SkeletonBar w={55} h={24} radius={6} />
      </View>
    </View>
  );
}

// ─── Beautiful Product Card ─────────────────────────────────────────────────────────────
function ProductCard({ item, theme, countryCode, onVendorPress, onCardPress, style }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [imgError, setImgError] = useState(false);

  const onPressIn = () =>
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, speed: 50 }).start();
  const onPressOut = () =>
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 50 }).start();

  const isVerified = isVendorVerified(item.source, countryCode);

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }], marginBottom: 16, width: '100%' }, style]}>
      <HapticButton
        style={[styles.card, { borderColor: theme.border }]}
        onPress={() => onCardPress(item)}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
      >
        {/* Cover Bouquet Image */}
        <View style={styles.cardImageContainer}>
          {item.imageUrl && !imgError ? (
            <CachedImage
              source={{ uri: item.imageUrl }}
              style={styles.cardImg}
              resizeMode="cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <View style={[styles.cardImgFallback, { backgroundColor: theme.border }]}>
              <MaterialCommunityIcons name="flower" size={48} color={MUTED} />
            </View>
          )}

          {/* Florist / Store Tag Top-Left */}
          <HapticButton 
            style={styles.cardVendorBadge}
            onPress={() => onVendorPress(item.source || 'Verified Florist')}
            activeOpacity={0.8}
          >
            <View style={[styles.vendorAvatar, { backgroundColor: theme.brand }]}>
              <MaterialCommunityIcons name="store" size={10} color="#fff" />
            </View>
            <Text style={styles.cardVendorText} numberOfLines={1}>
              {item.source || 'Verified Florist'}
            </Text>
            {isVerified && (
              <MaterialCommunityIcons name="check-circle" size={11} color="#52A05F" style={{ marginLeft: 3 }} />
            )}
          </HapticButton>

          {/* Bottom Card Content Overlay */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.6)']}
            style={styles.overlayBottom}
          >
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {item.title}
              </Text>
              
              {/* Rating */}
              {item.rating ? (
                <View style={styles.ratingRow}>
                  <MaterialCommunityIcons name="star" size={13} color="#F5A623" style={{ marginRight: 2 }} />
                  <Text style={styles.ratingText}>
                    {item.rating.toFixed(1)}
                    {item.ratingCount ? ` (${item.ratingCount})` : ''}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Price Badge */}
            <View style={[styles.priceOverlay, { backgroundColor: 'transparent' }]}>
              <Text style={[styles.priceOverlayText, { fontSize: 16, textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }]}>
                {item.price || (countryCode === 'IN' ? '₹599' : countryCode === 'ID' ? 'Rp 150,000' : '$55')}
              </Text>
            </View>
          </LinearGradient>
        </View>
      </HapticButton>
    </Animated.View>
  );
}

// ─── Swipeable Bottom Sheet ───────────────────────────────────────────────────
function SwipeableBottomSheet({ visible, onClose, children, maxHeight = '90%' }) {
  const translateY  = useRef(new Animated.Value(600)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const scrollY     = useRef(0);
  const dismissing  = useRef(false);
  const [shouldRender, setShouldRender] = useState(visible);
  const [isInteractive, setIsInteractive] = useState(false);

  const touchStartY = useRef(0);
  const activeGesture = useRef(false);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      dismissing.current = false;
      translateY.setValue(600);
      overlayAnim.setValue(0);
      setScrollEnabled(true);
      activeGesture.current = false;
      setIsInteractive(false);
      Animated.parallel([
        Animated.spring(translateY,  { toValue: 0, useNativeDriver: true, bounciness: 4, speed: 14 }),
        Animated.timing(overlayAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start((result) => {
        if (result.finished) {
          setIsInteractive(true);
        }
      });
    } else {
      setIsInteractive(false);
      if (shouldRender && !dismissing.current) {
        dismissing.current = true;
        Animated.parallel([
          Animated.timing(translateY,  { toValue: 800, duration: 250, useNativeDriver: true }),
          Animated.timing(overlayAnim, { toValue: 0,   duration: 220, useNativeDriver: true }),
        ]).start(() => {
          dismissing.current = false;
          setShouldRender(false);
          onClose();
        });
      }
    }
  }, [visible]);

  const dismiss = useCallback(() => {
    if (dismissing.current) return;
    dismissing.current = true;
    setIsInteractive(false);
    Animated.parallel([
      Animated.timing(translateY,  { toValue: 800, duration: 250, useNativeDriver: true }),
      Animated.timing(overlayAnim, { toValue: 0,   duration: 220, useNativeDriver: true }),
    ]).start(() => {
      dismissing.current = false;
      setShouldRender(false);
      onClose();
    });
  }, [onClose]);

  // Screen-wide PanResponder — works on backdrop AND sheet surface
  const panResponder = useMemo(() => PanResponder.create({
    // Capture downward swipes when scroll is at the top to bypass child ScrollView interception
    onMoveShouldSetPanResponderCapture: (_, gs) =>
      gs.dy > 8 && Math.abs(gs.dy) > Math.abs(gs.dx) * 1.2 && scrollY.current <= 2,
    // Capture any downward swipe on the full modal overlay
    onMoveShouldSetPanResponder: (_, gs) =>
      gs.dy > 8 && Math.abs(gs.dy) > Math.abs(gs.dx) * 1.2 && scrollY.current <= 2,
    onPanResponderMove: (_, gs) => {
      if (gs.dy > 0) {
        translateY.setValue(gs.dy);
        overlayAnim.setValue(Math.max(0, 1 - gs.dy / 400));
      }
    },
    onPanResponderRelease: (_, gs) => {
      if (gs.dy > 60 || gs.vy > 0.5) {
        dismiss();
      } else {
        setIsInteractive(false);
        Animated.parallel([
          Animated.spring(translateY,  { toValue: 0, useNativeDriver: true, bounciness: 5, speed: 14 }),
          Animated.timing(overlayAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
        ]).start((result) => {
          if (result.finished) {
            setIsInteractive(true);
          }
        });
      }
    },
  }), [dismiss]);

  const handleTouchStart = (e) => {
    touchStartY.current = e.nativeEvent.pageY;
    activeGesture.current = false;
    setScrollEnabled(true);
  };

  const handleTouchMove = (e) => {
    const dy = e.nativeEvent.pageY - touchStartY.current;
    
    // If we haven't determined the gesture type yet:
    if (!activeGesture.current && scrollY.current <= 2) {
      if (dy > 8 && Math.abs(dy) > Math.abs(e.nativeEvent.pageX - e.nativeEvent.locationX) * 1.2) {
        activeGesture.current = true;
        setScrollEnabled(false); // Lock ScrollView scrolling!
      }
    }

    if (activeGesture.current) {
      translateY.setValue(Math.max(0, dy));
      overlayAnim.setValue(Math.max(0, 1 - dy / 400));
    }
  };

  const handleTouchEnd = (e) => {
    if (activeGesture.current) {
      const dy = e.nativeEvent.pageY - touchStartY.current;
      if (dy > 60) {
        dismiss();
      } else {
        setIsInteractive(false);
        Animated.parallel([
          Animated.spring(translateY,  { toValue: 0, useNativeDriver: true, bounciness: 5, speed: 14 }),
          Animated.timing(overlayAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
        ]).start((result) => {
          if (result.finished) {
            setIsInteractive(true);
          }
        });
      }
    }
    activeGesture.current = false;
    setScrollEnabled(true);
  };

  if (!shouldRender) return null;

  return (
    <Modal visible={shouldRender} transparent animationType="none">
      {/* Attach PanResponder to the FULL modal container so swipe works anywhere on screen */}
      <View style={{ flex: 1, justifyContent: 'flex-end' }} {...panResponder.panHandlers}>
        {/* Backdrop fades with sheet — no black flash */}
        <Animated.View
          style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)', opacity: overlayAnim }}
          pointerEvents="none"
        />
        {/* Tap on backdrop to dismiss */}
        <HapticButton style={{ ...StyleSheet.absoluteFillObject }} activeOpacity={1} onPress={dismiss} />
        <Animated.View
          pointerEvents={isInteractive ? 'auto' : 'none'}
          style={[
            { backgroundColor: '#FAF7F2', borderTopLeftRadius: 24, borderTopRightRadius: 24,
              maxHeight: maxHeight, overflow: 'hidden' },
            { transform: [{ translateY }] }
          ]}
        >
          {/* Drag Handle pill — with generous top spacing */}
          <View 
            style={{ paddingTop: 16, paddingBottom: 18, alignItems: 'center', width: '100%' }}
            onTouchStart={(e) => handleTouchStart(e)}
            onTouchMove={(e) => handleTouchMove(e)}
            onTouchEnd={(e) => handleTouchEnd(e)}
            onTouchCancel={(e) => handleTouchEnd(e)}
          >
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#D1C4B5' }} />
          </View>
          {React.Children.map(children, child =>
            React.isValidElement(child)
              ? React.cloneElement(child, {
                  onScroll: (e) => { scrollY.current = e.nativeEvent.contentOffset.y; child.props.onScroll?.(e); },
                  scrollEventThrottle: 16,
                  onScrollEndDrag: (e) => { if (e.nativeEvent.contentOffset.y <= 0) dismiss(); child.props.onScrollEndDrag?.(e); },
                  onTouchStart: (e) => { handleTouchStart(e); child.props.onTouchStart?.(e); },
                  onTouchMove: (e) => { handleTouchMove(e); child.props.onTouchMove?.(e); },
                  onTouchEnd: (e) => { handleTouchEnd(e); child.props.onTouchEnd?.(e); },
                  onTouchCancel: (e) => { handleTouchEnd(e); child.props.onTouchCancel?.(e); },
                  scrollEnabled: child.props.scrollEnabled !== undefined ? (child.props.scrollEnabled && scrollEnabled) : scrollEnabled,
                })
              : child
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ShopScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { theme: t, isDark } = useTheme();
  const { t: translate } = useLanguage();
  const { countryCode: contextCountryCode, updateCountry } = useCountry();
  const countryCode = ['IN', 'PH', 'ID', 'PK', 'US'].includes(contextCountryCode) ? contextCountryCode : 'US';
  const swipeHandlers = useSwipeNavigation({
    onSwipeRight: () => navigation.navigate('History', { fade: true }),
  });

  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const [startIndex, setStartIndex] = useState(0);
  
  // Modals / Overlays
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [sliderWidth, setSliderWidth] = useState(0);
  const sliderWidthRef = useRef(0);
  const [sliderValue, setSliderValue] = useState(50);
  
  const sliderValueRef = useRef(50);
  useEffect(() => {
    sliderValueRef.current = sliderValue;
  }, [sliderValue]);

  const startValueRef = useRef(50);
  
  const panResponderSlider = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startValueRef.current = sliderValueRef.current;
      },
      onPanResponderMove: (evt, gs) => {
        if (!sliderWidthRef.current) return;
        const deltaPercent = (gs.dx / sliderWidthRef.current) * 100;
        const newVal = Math.max(0, Math.min(100, startValueRef.current + deltaPercent));
        setSliderValue(newVal);
      },
    })
  ).current;

  const [isInitialLocationPrompt, setIsInitialLocationPrompt] = useState(false);
  const [vendorInfoModal, setVendorInfoModal] = useState({ visible: false, loading: false, data: null });
  const [productDetailModal, setProductDetailModal] = useState({ visible: false, data: null });
  const [showInfoTip, setShowInfoTip] = useState(false);
  const infoTipTimeoutRef = useRef(null);
  const [cameFromAiChat, setCameFromAiChat] = useState(false);

  const [aiChatVisible, setAiChatVisible] = useState(false);

  // closeSheet helpers
  const closeVendorModal = useCallback(() => {
    setVendorInfoModal({ visible: false, loading: false, data: null });
    if (cameFromAiChat) {
      setCameFromAiChat(false);
      setAiChatVisible(true);
    }
  }, [cameFromAiChat]);

  const closeProductModal = useCallback(() => {
    if (infoTipTimeoutRef.current) {
      clearTimeout(infoTipTimeoutRef.current);
    }
    setShowInfoTip(false);
    setProductDetailModal({ visible: false, data: null });
    if (cameFromAiChat) {
      setCameFromAiChat(false);
      setAiChatVisible(true);
    }
  }, [cameFromAiChat]);

  const onCardPress = (item) => {
    if (infoTipTimeoutRef.current) {
      clearTimeout(infoTipTimeoutRef.current);
    }
    setShowInfoTip(false);
    setProductDetailModal({ visible: true, data: item });
  };

  const toggleInfoTip = () => {
    if (infoTipTimeoutRef.current) {
      clearTimeout(infoTipTimeoutRef.current);
    }
    if (showInfoTip) {
      setShowInfoTip(false);
    } else {
      setShowInfoTip(true);
      infoTipTimeoutRef.current = setTimeout(() => {
        setShowInfoTip(false);
      }, 4000); // Disappear after 4 seconds
    }
  };

  const getDisplayPrice = useCallback(() => {
    const val = Math.round(sliderValue);
    if (countryCode === 'IN') {
      const price = Math.round(val * 50);
      return `₹${price}`;
    } else if (countryCode === 'ID') {
      const price = Math.round(val * 15000);
      return `Rp ${price.toLocaleString('id-ID')}`;
    } else {
      const price = Math.round(val * 2.5);
      return `$${price}`;
    }
  }, [sliderValue, countryCode]);

  const fetchVendorInfo = useCallback((vendorName) => {
    if (!vendorName || vendorName === 'Verified Florist') return;

    setVendorInfoModal({ visible: true, loading: true, data: { name: vendorName } });

    // Lookup matching vendor in local directory
    const list = FLORIST_DIRECTORY[countryCode] || [];
    const normalizedSearch = vendorName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const matched = list.find(vendor => 
      vendor.name.toLowerCase().replace(/[^a-z0-9]/g, '').includes(normalizedSearch) ||
      normalizedSearch.includes(vendor.name.toLowerCase().replace(/[^a-z0-9]/g, ''))
    );

    if (matched) {
      setVendorInfoModal({
        visible: true,
        loading: false,
        data: {
          name: matched.name,
          rating: matched.rating,
          description: matched.description,
          feedback: matched.feedback,
          verified: matched.verified,
          instantDelivery: matched.instantDelivery,
          link: matched.link
        }
      });
    } else {
      setVendorInfoModal({
        visible: true,
        loading: false,
        data: {
          name: vendorName,
          notFound: true
        }
      });
    }
  }, [countryCode]);

  // Filter States — filterPriceMax is a number (currency unit); 0 = no limit
  const [filterMood, setFilterMood] = useState('');
  const [filterPriceMax, setFilterPriceMax] = useState(0);
  const [filterPriceLabel, setFilterPriceLabel] = useState(null); // for UI highlight
  const [charScent, setCharScent] = useState(false);
  const [charLongevity, setCharLongevity] = useState(false);
  const [charEco, setCharEco] = useState(false);
  const [charRare, setCharRare] = useState(false);

  const scrollRef = useRef(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const typingIntervalRef = useRef(null);
  const chatScrollRef = useRef(null);

  const [chatInput, setChatInput] = useState('');
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [chatMessages, setChatMessages] = useState([
    {
      id: 'greeting',
      sender: 'ai',
      text: "Hi there! I'm Sarah, your personal floral stylist. 🌸 Tell me about the occasion, who you're shopping for, or the mood you want to capture, and I'll find some beautiful bouquets for you!"
    }
  ]);

  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardVisible(true);
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
        setKeyboardHeight(0);
      }
    );
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (aiChatVisible) {
      setTimeout(() => {
        chatScrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [chatMessages, aiChatVisible]);

  const sendChatMessage = async () => {
    const trimmed = chatInput.trim();
    if (!trimmed) return;

    Keyboard.dismiss();
    const userMsgId = Date.now().toString();
    const newUserMsg = { id: userMsgId, sender: 'user', text: trimmed };
    
    setChatMessages(prev => [...prev, newUserMsg, { id: 'loading', sender: 'ai', loading: true }]);
    setChatInput('');

    try {
      const SARVAM_API_KEY = process.env.EXPO_PUBLIC_SARVAM_API_KEY;
      
      const systemPrompt = `You are Sarah, a warm, expert personal floral stylist at a premium bouquet shop. Your job is to help the user find the perfect flowers. Be warm, personal, and specific — like a real florist friend.

You MUST always respond with a JSON object:
{
  "reply": "1-2 warm, personal sentences. Mention the specific flower or color. Add a small care tip or occasion insight.",
  "searchQuery": "exact flower name + occasion, 2-4 words total. E.g. 'red roses anniversary', 'white lilies sympathy', 'pink peonies birthday'",
  "priceMax": <number or null>
}

Rules:
- searchQuery MUST include a flower name (roses, lilies, orchids, carnations, sunflowers, tulips, peonies, hydrangeas, gerberas, etc.)
- If the user mentions a price constraint (e.g. 'under 500', 'less than $30'), set priceMax to that number. Otherwise null.
- Never say "I'm an AI". Be natural, empathetic, personal.
- Return ONLY valid JSON. No markdown, no extra text.`;

      const historyText = chatMessages
        .filter(m => m.id !== 'greeting' && m.id !== 'loading')
        .slice(-6)
        .map(m => `${m.sender === 'user' ? 'User' : 'Sarah'}: ${m.text}`)
        .join('\n');

      let filterContext = [];
      if (filterPriceMax > 0) filterContext.push(`Max price: ${filterPriceMax}`);
      if (charScent) filterContext.push('Needs strong scent');
      if (charLongevity) filterContext.push('Long-lasting');
      if (charEco) filterContext.push('Eco-friendly');
      if (charRare) filterContext.push('Rare/Exotic');
      
      let contextStr = '';
      if (filterContext.length > 0) {
        contextStr = `\n\n[System note: User has active filters: ${filterContext.join(', ')}]`;
      }

      const userContent = (historyText.length > 0 
        ? `Conversation history:\n${historyText}\n\nUser: ${trimmed}` 
        : trimmed) + contextStr;

      const apiRes = await fetch('https://api.sarvam.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SARVAM_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'sarvam-105b',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent }
          ],
          temperature: 0.7,
          max_tokens: 1500
        })
      });

      if (!apiRes.ok) {
        const errText = await apiRes.text();
        throw new Error(`Sarvam API HTTP ${apiRes.status}: ${errText}`);
      }

      let reply = '';
      let queryForSearch = '';
      let rawData = null;

      if (apiRes.ok) {
        rawData = await apiRes.json();
        const text = rawData?.choices?.[0]?.message?.content ?? '';
        
        // Use a more robust regex to capture the full JSON object across newlines
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
          try {
            const parsed = JSON.parse(match[0]);
            reply = parsed.reply || '';
            let rawQuery = parsed.searchQuery || '';
            let parsedPriceMax = parsed.priceMax || null;
            
            if (parsedPriceMax) {
              setFilterPriceMax(parsedPriceMax);
              setFilterPriceLabel(null);
            }
            
            // Smart Local Matcher: Snap AI's idea to our cached categories
            if (rawQuery) {
              const queryWords = rawQuery.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
              const categories = [...TRENDING_TYPES, ...SHOP_CATEGORIES];
              let bestMatch = null;
              let maxScore = 0;
              
              for (const cat of categories) {
                const catWords = (cat.label + ' ' + cat.query).toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
                let score = 0;
                for (const w of queryWords) {
                  if (w.length > 2 && catWords.some(cw => cw.includes(w) || w.includes(cw))) {
                    score++;
                  }
                }
                if (score > maxScore) {
                  maxScore = score;
                  bestMatch = cat.query;
                }
              }
              queryForSearch = bestMatch || 'just because flower bouquet';
            }
          } catch (e) {
            console.log('JSON parse error from Sarvam:', e);
            reply = text.replace(/```json|```/g, '').trim(); // Try to use raw text if it failed
          }
        } else if (text.trim().length > 0) {
          reply = text.trim();
        }
      }

      // If we got no reply at all, throw error
      if (!reply) {
        const debugText = rawData ? JSON.stringify(rawData) : 'No data';
        throw new Error(`Sarvam API failed to return any reply. Raw Data: ${debugText}`);
      }

      // Search Google Shopping via Serper if we have a query
      let resCards = [];
      let parsedPriceMax = null; // fallback if needed, but we already updated state. We'll use the state or the parsed value directly.
      if (queryForSearch) {
        const { results: res } = await searchBouquets(queryForSearch, countryCode.toLowerCase());
        resCards = res;
        
        // try parsing again in case we need it locally
        try {
           const parsedObj = JSON.parse(rawData?.choices?.[0]?.message?.content?.match(/\{[\s\S]*\}/)?.[0] || '{}');
           parsedPriceMax = parsedObj.priceMax || null;
        } catch(e) {}

        if (parsedPriceMax) {
          resCards = applyClientFilters(resCards, { priceMax: parsedPriceMax });
        }
        resCards = resCards.slice(0, 4);
      }

      setChatMessages(prev => {
        const filtered = prev.filter(m => m.id !== 'loading');
        
        // If they asked for a search but nothing was found
        if (queryForSearch && resCards.length === 0) {
          return [...filtered, {
            id: Date.now().toString(),
            sender: 'ai',
            text: `I looked for "${queryForSearch}" bouquets nearby, but couldn't find a perfect match. Could you tell me a bit more about the style or colors you'd like?`
          }];
        }
        
        // Return standard or conversational reply
        return [...filtered, {
          id: Date.now().toString(),
          sender: 'ai',
          text: reply,
          ...(resCards.length > 0 ? { cards: resCards } : {})
        }];
      });
    } catch (err) {
      console.log('Chat search error:', err);
      setChatMessages(prev => {
        const filtered = prev.filter(m => m.id !== 'loading');
        return [...filtered, {
          id: Date.now().toString(),
          sender: 'ai',
          text: "I had a tiny bit of trouble finding flowers just now. Would you mind checking your connection and trying again?"
        }];
      });
    }
  };

  useEffect(() => {
    return () => {
      if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
    };
  }, []);

  // Scroll Animations for Floating Tab Bar & Header
  const tabTranslateY = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const isTabHidden = useRef(false);
  const headerTimeoutRef = useRef(null);

  // Sliding tab indicator — Shop is active (index 3)
  const [tabIndicatorAnim] = useState(() => new Animated.Value(3));
  const [navBarWidth, setNavBarWidth] = useState(0);
  const animateTabTo = useCallback((index) => {
    Animated.spring(tabIndicatorAnim, {
      toValue: index,
      useNativeDriver: true,
      tension: 68,
      friction: 11,
    }).start();
  }, [tabIndicatorAnim]);


  const showHeader = useCallback(() => {}, []);
  const hideHeader = useCallback(() => {}, []);

  const handleScroll = (event) => {
    const currentY = event.nativeEvent.contentOffset.y;
    const delta = currentY - lastScrollY.current;

    const isVisibleLow = currentY > 300;
    if (isVisibleLow !== showBackToTop) {
      setShowBackToTop(isVisibleLow);
    }

    if (currentY <= 10) {
      if (isTabHidden.current) {
        isTabHidden.current = false;
        setTabHidden(false);
        Animated.spring(tabTranslateY, { toValue: 0, useNativeDriver: true, bounciness: 3, speed: 12 }).start();
      }
      showHeader();
    } else if (delta > 15 && currentY > 60) {
      if (!isTabHidden.current) {
        isTabHidden.current = true;
        setTabHidden(true);
        Animated.spring(tabTranslateY, { toValue: 180, useNativeDriver: true, bounciness: 0, speed: 10 }).start();
      }
      hideHeader();
    } else if (delta < -15) {
      if (isTabHidden.current) {
        isTabHidden.current = false;
        setTabHidden(false);
        Animated.spring(tabTranslateY, { toValue: 0, useNativeDriver: true, bounciness: 3, speed: 12 }).start();
      }
    }

    // High-performance windowed rendering: dynamic startIndex calculation
    const gridStartY = 350;
    const cardHeight = 256;
    const buffer = 2;
    const calculatedStart = Math.max(0, Math.floor((currentY - gridStartY) / cardHeight) - buffer);
    if (calculatedStart !== startIndex) {
      setStartIndex(calculatedStart);
    }

    lastScrollY.current = currentY;
  };

  const slowScrollToTop = () => {
    if (!scrollRef.current) return;
    const currentY = lastScrollY.current;
    const startTime = Date.now();
    const duration = 1200; // 1.2s for slow elegant scroll up
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / duration);
      const easeProgress = 1 - Math.pow(1 - progress, 3); // Cubic ease-out deceleration
      const nextY = currentY * (1 - easeProgress);
      
      scrollRef.current?.scrollTo({ y: nextY, animated: false });
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  };

  const triggerAISuggestion = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAiChatVisible(true);
  };

  const runSearch = useCallback(async (q) => {
    const trimmed = (q !== undefined ? q : query).trim();
    if (q === undefined) setActiveCategory(null);
    Keyboard.dismiss();
    setSearched(true);
    setStartIndex(0);
    
    // Only show loading if we don't have results yet to avoid flashing when loading from cache
    if (results.length === 0) setLoading(true);
    setError(null);
    try {
      const defaultQuery = countryCode === 'IN' 
        ? 'best seller flower bouquet'
        : countryCode === 'ID'
        ? 'buket bunga best seller'
        : 'best seller flower bouquet';

      let queryStr = trimmed || defaultQuery;
      if (filterMood) {
        // If there's no custom query, just use the mood. If there is, append it.
        queryStr = trimmed ? `${trimmed} ${filterMood}` : `${filterMood} flower bouquet`;
      }

      let { results: res, fromCache: fc } = await searchBouquets(
        queryStr,
        countryCode.toLowerCase()
      );

      const hasCharFilters = charScent || charLongevity || charEco || charRare;
      const hasFilters = filterPriceMax > 0 || hasCharFilters || !!filterMood;

      if (hasFilters && res.length > 0) {
        res = applyClientFilters(res, {
          priceMax: filterPriceMax,
          country: countryCode,
          scent: charScent,
          longevity: charLongevity,
          eco: charEco,
          rare: charRare,
          mood: filterMood.trim(),
        });
      }

      setResults(res);
      setFromCache(fc);
    } catch (e) {
      setError('Could not fetch results. Check your connection and try again.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query, countryCode, filterPriceMax, charScent, charLongevity, charEco, charRare, filterMood]);

  // Load curated feed on mount or country change; silently seed cache in background
  useEffect(() => {
    import('@react-native-async-storage/async-storage').then(module => {
      module.default.getItem('shop_country_selected').then(res => {
        if (!res) {
          setIsInitialLocationPrompt(true);
          setLocationModalVisible(true);
        }
      });
    });
    runSearch('');
    // Background seed — fires silently, won't block UI
    setTimeout(() => {
      seedAllShopData().catch(() => {});
    }, 3000);
  }, [countryCode]);

  const runInternalSearch = useCallback(async (q) => {
    Keyboard.dismiss();
    setSearched(true);
    setStartIndex(0);
    setLoading(true);
    setError(null);
    try {
      const { results: res, fromCache: fc } = await searchBouquets(q, countryCode.toLowerCase(), true);
      setResults(res);
      setFromCache(fc);
    } catch (e) {
      setError('Could not fetch results.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [countryCode]);

  const handleCategoryPress = (q) => {
    setActiveCategory(q);
    runInternalSearch(q);
  };

  // Filter calculation — applies client-side to cached results, falls back to search
  const applyFilters = () => {
    setFilterModalVisible(false);

    const moodQuery = filterMood.trim();
    const baseQuery = moodQuery || (countryCode === 'IN' ? 'best seller flower bouquet'
      : countryCode === 'ID' ? 'buket bunga best seller'
      : 'best seller flower bouquet');

    const hasCharFilters = charScent || charLongevity || charEco || charRare;
    const hasFilters = filterPriceMax > 0 || hasCharFilters;

    if (hasFilters && results.length > 0) {
      // Apply filters client-side on existing results first
      const filtered = applyClientFilters(results, {
        priceMax: filterPriceMax,
        country: countryCode,
        scent: charScent,
        longevity: charLongevity,
        eco: charEco,
        rare: charRare,
        mood: moodQuery,
      });
      if (filtered.length > 0) {
        setResults(filtered);
        setSearched(true);
        return;
      }
    }

    // Fall back to a fresh search with the mood query
    if (moodQuery) {
      setQuery(moodQuery);
      runSearch(moodQuery);
    } else {
      runSearch('');
    }
  };

  const clearFilters = () => {
    setFilterMood('');
    setFilterPriceMax(0);
    setFilterPriceLabel(null);
    setCharScent(false);
    setCharLongevity(false);
    setCharEco(false);
    setCharRare(false);
  };

  // Dynamic price options — value is numeric max (0 = no limit / "above" means large cap)
  const priceOptions = countryCode === 'IN'
    ? [
        { label: 'Under ₹500',   max: 500  },
        { label: '₹500 – ₹1500', max: 1500 },
        { label: '₹1500+',       max: 9999999 },
      ]
    : countryCode === 'ID'
    ? [
        { label: 'Under Rp 150k',       max: 150000  },
        { label: 'Rp 150k – Rp 500k',   max: 500000  },
        { label: 'Rp 500k+',            max: 9999999 },
      ]
    : [
        { label: 'Under $30', max: 30  },
        { label: '$30 – $60', max: 60  },
        { label: '$60+',      max: 9999999 },
      ];

  return (
    <View style={[styles.root, { backgroundColor: t.bg }]} {...swipeHandlers}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={t.bg} />

      {/* Main Scrollable Content */}
      <AnimatedFlashList
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: 120, paddingTop: insets.top + 16 }]}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        data={loading || error ? [] : results}
        estimatedItemSize={256}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ProductCard 
            item={item} 
            theme={t} 
            countryCode={countryCode} 
            onVendorPress={fetchVendorInfo}
            onCardPress={onCardPress}
          />
        )}
        ListHeaderComponent={<>
        <View style={styles.topAnimatedHeaderRow}>
          {/* Country Selector - Top Left */}
          <HapticButton 
            style={[styles.locationBtn, { backgroundColor: t.cardBg, borderColor: t.border }]}
            onPress={() => setLocationModalVisible(true)}
            activeOpacity={0.7}
          >
            <Feather name="map-pin" size={12} color={BRAND} style={{ marginRight: 6 }} />
            <Text style={{ fontFamily: 'Manrope-Bold', fontSize: 12, color: BRAND }}>
              {(countryCode || 'IN').toUpperCase()}
            </Text>
            <Feather name="chevron-down" size={12} color={BRAND} style={{ marginLeft: 4 }} />
          </HapticButton>

          {/* Beta Tag - Top Right */}
          <HapticButton 
            style={styles.betaTag} 
            onPress={triggerAISuggestion}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="shimmer" size={14} color="#8CA18F" style={{ marginRight: 4 }} />
            <Text style={styles.betaTagText}>Ask AI</Text>
          </HapticButton>
        </View>

        {/* Search Bar (Non-sticky, scrolls with content) */}
        <View style={[styles.searchPill, { backgroundColor: t.cardBg, borderColor: t.border }]}>
          <TextInput
            style={[styles.searchInput, { color: t.text, paddingLeft: 4 }]}
            placeholder="Search flowers, moods..."
            placeholderTextColor={MUTED}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => runSearch()}
            returnKeyType="search"
            autoCorrect={false}
          />
          <HapticButton 
            style={[styles.searchPillBtn, { backgroundColor: t.brand }]}
            onPress={() => runSearch()}
            activeOpacity={0.85}
          >
            <Feather name="search" size={16} color="#FFF" />
          </HapticButton>
        </View>

        {/* Categories Horizontal ScrollView (Matching the design in the attached image but horizontal) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginVertical: 12, marginHorizontal: -20 }}
          contentContainerStyle={{ flexDirection: 'row', gap: 10, paddingHorizontal: 20 }}
        >
          {SHOP_CATEGORIES.map(cat => (
            <HapticButton
              key={cat.label}
              style={[
                styles.categoryGridBtn,
                {
                  backgroundColor: activeCategory === cat.label ? t.brand : t.cardBg,
                  borderColor: activeCategory === cat.label ? t.brand : t.border,
                }
              ]}
              onPress={() => handleCategoryPress(cat.query)}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.categoryGridLabel,
                {
                  color: activeCategory === cat.query ? '#FFFFFF' : (isDark ? '#E5D5D1' : '#5C4844'),
                }
              ]}>
                {cat.label}
              </Text>
              <PremiumImage source={cat.image} style={styles.categoryGridImg} resizeMode="contain" />
            </HapticButton>
          ))}
        </ScrollView>

        {/* Trending Types Section */}
        <View style={styles.trendingContainer}>
          <Text style={[styles.sectionTitle, { color: t.text }]}>Trending</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.trendingRow}
          >
            {TRENDING_TYPES.map(type => (
              <HapticButton
                key={type.label}
                style={styles.categoryCircleCard}
                onPress={() => handleCategoryPress(type.query)}
                activeOpacity={0.8}
              >
                <View style={styles.circleImageWrapper}>
                  <PremiumImage source={type.img} style={styles.circleImage} />
                </View>
                <Text style={[styles.categoryLabel, { color: t.text }]}>{type.label}</Text>
              </HapticButton>
            ))}
          </ScrollView>
        </View>

        {/* Curated section header with Filter button */}
        <View style={styles.curatedHeaderRow}>
          <Text style={[styles.sectionTitle, { color: t.text, marginBottom: 0 }]}>Curated For You</Text>
          <HapticButton 
            style={[styles.filterBtn, { backgroundColor: t.brand + '12' }]} 
            onPress={() => setFilterModalVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="options-outline" size={13} color={t.brand} style={{ marginRight: 5 }} />
            <Text style={[styles.filterBtnText, { color: t.brand }]}>Filter</Text>
          </HapticButton>
        </View>

        </>}
        ListEmptyComponent={
          loading ? (
            <View style={{ marginTop: 8 }}>
              <ProductCardSkeleton theme={t} />
              <ProductCardSkeleton theme={t} />
              <ProductCardSkeleton theme={t} />
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <MaterialCommunityIcons name="wifi-off" size={44} color={MUTED} />
              <Text style={[styles.stateText, { color: MUTED, marginTop: 12, textAlign: 'center', paddingHorizontal: 32 }]}>{error}</Text>
              <HapticButton style={[styles.retryBtn, { borderColor: BRAND }]} onPress={() => runSearch()} activeOpacity={0.7}>
                <Text style={[styles.retryBtnText, { color: BRAND }]}>Retry</Text>
              </HapticButton>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="flower-outline" size={44} color={MUTED} />
              <Text style={[styles.stateText, { color: MUTED, marginTop: 12 }]}>No bouquets found</Text>
              <Text style={{ fontFamily: 'Manrope-Regular', fontSize: 13, color: MUTED, marginTop: 4, textAlign: 'center', marginHorizontal: 20 }}>Try adjusting your filters, or tap &quot;Ask Sarah&quot; in the search bar for an AI suggestion.</Text>
            </View>
          )
        }
      />

      {/* Curate the Mood Filter Slide-up Modal */}
      <SwipeableBottomSheet visible={filterModalVisible} onClose={() => setFilterModalVisible(false)} maxHeight="90%">
        <ScrollView
          contentContainerStyle={styles.sheetScroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ paddingBottom: 24 }}>
            {/* Price Range Title */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={[styles.sheetSectionTitle, { color: t.text, marginBottom: 0 }]}>Max Price Range</Text>
            </View>

            {/* Elegant Custom Clickable Price Pills */}
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 28 }}>
              {priceOptions.map((opt) => {
                const isSelected = filterPriceLabel === opt.label;
                return (
                  <HapticButton
                    key={opt.label}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      if (isSelected) {
                        setFilterPriceMax(0);
                        setFilterPriceLabel(null);
                      } else {
                        setFilterPriceMax(opt.max);
                        setFilterPriceLabel(opt.label);
                      }
                    }}
                    style={{
                      flex: 1,
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingVertical: 12,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: isSelected ? t.brand : t.border,
                      backgroundColor: isSelected ? t.brand + '12' : t.cardBg,
                    }}
                    activeOpacity={0.7}
                  >
                    <Text 
                      style={{ 
                        fontFamily: isSelected ? 'Manrope-Bold' : 'Manrope-SemiBold', 
                        fontSize: 13, 
                        color: isSelected ? t.brand : t.text 
                      }}
                    >
                      {opt.label}
                    </Text>
                  </HapticButton>
                );
              })}
            </View>

            {/* Bloom Characteristics Title with inline Clear button */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={[styles.sheetSectionTitle, { color: t.text, marginBottom: 0 }]}>Bloom Characteristics</Text>
              <HapticButton 
                onPress={clearFilters} 
                style={{ paddingVertical: 4, paddingHorizontal: 12, borderRadius: 12, backgroundColor: t.brand + '15' }}
                activeOpacity={0.7}
              >
                <Text style={{ fontFamily: 'Manrope-Bold', fontSize: 11, color: t.brand }}>Clear All</Text>
              </HapticButton>
            </View>

            <View style={styles.charGrid}>
              {/* Scent Intensity */}
              <HapticButton 
                style={[styles.charCard, { backgroundColor: t.cardBg, borderColor: charScent ? t.brand : t.border }]}
                onPress={() => setCharScent(!charScent)}
              >
                <View style={styles.charCardTop}>
                  <Feather name="wind" size={16} color={t.brand} />
                  <View style={[styles.circleCheck, charScent && { backgroundColor: t.brand, borderColor: t.brand }]}>
                    {charScent && <Feather name="check" size={8} color="#FFF" />}
                  </View>
                </View>
                <Text style={[styles.charCardTitle, { color: t.text }]}>Scent Intensity</Text>
                <Text style={styles.charCardSub}>From subtle to room-filling</Text>
              </HapticButton>

              {/* Longevity */}
              <HapticButton 
                style={[styles.charCard, { backgroundColor: t.cardBg, borderColor: charLongevity ? t.brand : t.border }]}
                onPress={() => setCharLongevity(!charLongevity)}
              >
                <View style={styles.charCardTop}>
                  <Ionicons name="hourglass-outline" size={16} color={t.brand} />
                  <View style={[styles.circleCheck, charLongevity && { backgroundColor: t.brand, borderColor: t.brand }]}>
                    {charLongevity && <Feather name="check" size={8} color="#FFF" />}
                  </View>
                </View>
                <Text style={[styles.charCardTitle, { color: t.text }]}>Longevity</Text>
                <Text style={styles.charCardSub}>Extended vase life</Text>
              </HapticButton>

              {/* Eco-Friendly */}
              <HapticButton 
                style={[styles.charCard, { backgroundColor: t.cardBg, borderColor: charEco ? t.brand : t.border }]}
                onPress={() => setCharEco(!charEco)}
              >
                <View style={styles.charCardTop}>
                  <Feather name="feather" size={16} color={t.brand} />
                  <View style={[styles.circleCheck, charEco && { backgroundColor: t.brand, borderColor: t.brand }]}>
                    {charEco && <Feather name="check" size={8} color="#FFF" />}
                  </View>
                </View>
                <Text style={[styles.charCardTitle, { color: t.text }]}>Eco-Friendly</Text>
                <Text style={styles.charCardSub}>Locally sourced, sustainable</Text>
              </HapticButton>

              {/* Rare Varieties */}
              <HapticButton 
                style={[styles.charCard, { backgroundColor: t.cardBg, borderColor: charRare ? t.brand : t.border }]}
                onPress={() => setCharRare(!charRare)}
              >
                <View style={styles.charCardTop}>
                  <Feather name="cloud-rain" size={16} color={t.brand} />
                  <View style={[styles.circleCheck, charRare && { backgroundColor: t.brand, borderColor: t.brand }]}>
                    {charRare && <Feather name="check" size={8} color="#FFF" />}
                  </View>
                </View>
                <Text style={[styles.charCardTitle, { color: t.text }]}>Rare Varieties</Text>
                <Text style={styles.charCardSub}>Unique, seasonal blooms</Text>
              </HapticButton>
            </View>

            {/* Bottom Actions Row */}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
              <HapticButton 
                style={{ flex: 1, height: 48, borderRadius: 24, borderWidth: 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center', backgroundColor: t.cardBg }} 
                onPress={() => setFilterModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={{ fontFamily: 'Manrope-Bold', fontSize: 14, color: t.text }}>Close</Text>
              </HapticButton>
              <HapticButton 
                style={{ flex: 2, height: 48, borderRadius: 24, backgroundColor: t.brand, alignItems: 'center', justifyContent: 'center' }} 
                onPress={applyFilters}
                activeOpacity={0.8}
              >
                <Text style={{ fontFamily: 'Manrope-Bold', fontSize: 14, color: '#FFF' }}>Show Results</Text>
              </HapticButton>
            </View>
          </View>
        </ScrollView>
      </SwipeableBottomSheet>

      {/* ── Vendor Info Sheet ───────────────────────────────────── */}
      <SwipeableBottomSheet visible={vendorInfoModal.visible} onClose={closeVendorModal} maxHeight="65%">
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 50 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
              <Text style={{ fontFamily: 'PlayfairDisplay-Regular', fontSize: 22, color: DARK, marginRight: 8 }} numberOfLines={1}>
                {vendorInfoModal.data?.name || 'Store Details'}
              </Text>
              {vendorInfoModal.data?.verified && (
                <MaterialCommunityIcons name="check-circle" size={18} color="#52A05F" style={{ alignSelf: 'center' }} />
              )}
              {vendorInfoModal.data?.instantDelivery && (
                <View style={{ backgroundColor: '#FFEDED', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginLeft: 8 }}>
                  <Text style={{ fontFamily: 'Manrope-Bold', fontSize: 10, color: '#D93838' }}>10-MIN DELIVERY</Text>
                </View>
              )}
            </View>
          </View>

          {vendorInfoModal.data?.notFound ? (
            <View style={{ alignItems: 'center', marginVertical: 32 }}>
              <MaterialCommunityIcons name="store-alert-outline" size={48} color={MUTED} style={{ marginBottom: 12 }} />
              <Text style={{ fontFamily: 'Manrope-Bold', fontSize: 15, color: DARK, marginBottom: 4 }}>No Results Found</Text>
              <Text style={{ fontFamily: 'Manrope-Regular', fontSize: 13, color: MUTED, textAlign: 'center', marginBottom: 24 }}>
                We couldn&apos;t verify details about this store in our popular directories.
              </Text>
              <HapticButton 
                style={{ width: '100%', height: 48, borderRadius: 24, borderWidth: 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center', backgroundColor: t.cardBg }} 
                onPress={closeVendorModal}
                activeOpacity={0.7}
              >
                <Text style={{ fontFamily: 'Manrope-Bold', fontSize: 14, color: t.text }}>Close</Text>
              </HapticButton>
            </View>
          ) : vendorInfoModal.data ? (
            <>
              {/* Rating section */}
              {vendorInfoModal.data.rating && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                  <MaterialCommunityIcons name="star" size={16} color="#F5A623" style={{ marginRight: 6 }} />
                  <Text style={{ fontFamily: 'Manrope-Bold', fontSize: 15, color: DARK, marginRight: 6 }}>
                    Overall Rating:
                  </Text>
                  <Text style={{ fontFamily: 'Manrope-ExtraBold', fontSize: 15, color: BRAND }}>
                    {vendorInfoModal.data.rating}
                  </Text>
                </View>
              )}

              {/* Description */}
              <Text style={{ fontFamily: 'Manrope-Bold', fontSize: 13, color: DARK, marginBottom: 4 }}>Overview</Text>
              <Text style={{ fontFamily: 'Manrope-Regular', fontSize: 13.5, color: MUTED, lineHeight: 20, marginBottom: 16 }}>
                {vendorInfoModal.data.description}
              </Text>

              {/* User Feedback */}
              {vendorInfoModal.data.feedback && (
                <>
                  <Text style={{ fontFamily: 'Manrope-Bold', fontSize: 13, color: DARK, marginBottom: 4 }}>User Feedback Summary</Text>
                  <Text style={{ fontFamily: 'Manrope-Regular', fontSize: 13.5, color: MUTED, lineHeight: 20, marginBottom: 24 }}>
                    {vendorInfoModal.data.feedback}
                  </Text>
                </>
              )}

              {/* Bottom Actions Row */}
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                <HapticButton 
                  style={{ flex: 1, height: 48, borderRadius: 24, borderWidth: 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center', backgroundColor: t.cardBg }} 
                  onPress={closeVendorModal}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontFamily: 'Manrope-Bold', fontSize: 14, color: t.text }}>Cancel</Text>
                </HapticButton>
                {vendorInfoModal.data.link ? (
                  <HapticButton 
                    style={{ flex: 2, height: 48, borderRadius: 24, backgroundColor: BRAND, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }} 
                    onPress={() => Linking.openURL(vendorInfoModal.data.link).catch(() => {})}
                    activeOpacity={0.8}
                  >
                    <Feather name="external-link" size={15} color="#FFF" style={{ marginRight: 8 }} />
                    <Text style={{ fontFamily: 'Manrope-Bold', fontSize: 14, color: '#FFF' }}>Visit Website</Text>
                  </HapticButton>
                ) : null}
              </View>
            </>
          ) : null}
        </ScrollView>
      </SwipeableBottomSheet>

      {/* ── Product Detail Sheet ─────────────────────────────────── */}
      <SwipeableBottomSheet visible={productDetailModal.visible} onClose={closeProductModal} maxHeight="92%">
        <ScrollView style={{ paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
          {productDetailModal.data && (
            <View style={{ paddingBottom: 68 }}>
              {productDetailModal.data.imageUrl ? (
                <CachedImage source={{ uri: productDetailModal.data.imageUrl }} style={{ width: '100%', height: 300, borderRadius: 16, marginBottom: 20 }} />
              ) : (
                <View style={{ width: '100%', height: 260, borderRadius: 16, backgroundColor: MID, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                  <MaterialCommunityIcons name="flower" size={56} color={MUTED} />
                </View>
              )}

              <Text style={{ fontFamily: 'PlayfairDisplay-Bold', fontSize: 24, color: DARK, marginBottom: 8, lineHeight: 32 }}>
                {productDetailModal.data.title}
              </Text>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontFamily: 'Manrope-Bold', fontSize: 22, color: BRAND, marginRight: 6 }}>
                    {productDetailModal.data.price || (countryCode === 'IN' ? '₹599' : countryCode === 'ID' ? 'Rp 150,000' : '$55')}
                  </Text>
                  <HapticButton
                    onPress={() => Alert.alert(
                      "Listing Policy",
                      "We aggregate listings to find the best matches, but cannot guarantee exact flower quality from third-party vendors."
                    )}
                    style={{ padding: 6 }}
                    activeOpacity={0.7}
                  >
                    <Feather name="info" size={15} color={MUTED} />
                  </HapticButton>
                </View>
                {productDetailModal.data.rating && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF8E7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
                    <MaterialCommunityIcons name="star" size={14} color="#F5A623" style={{ marginRight: 4 }} />
                    <Text style={{ fontFamily: 'Manrope-SemiBold', fontSize: 14, color: DARK }}>{productDetailModal.data.rating.toFixed(1)}</Text>
                  </View>
                )}
              </View>

              <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                {/* Cancel Button */}
                <HapticButton
                  style={{
                    flex: 1,
                    borderColor: '#D1C4B5',
                    borderWidth: 1.5,
                    borderRadius: 16,
                    height: 56,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'transparent'
                  }}
                  onPress={closeProductModal}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontFamily: 'Manrope-Bold', fontSize: 16, color: DARK }}>Cancel</Text>
                </HapticButton>

                {/* Buy Now Button */}
                <HapticButton
                  style={{
                    flex: 2,
                    backgroundColor: BRAND,
                    borderRadius: 16,
                    height: 56,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onPress={() => productDetailModal.data?.link && Linking.openURL(productDetailModal.data.link).catch(() => {})}
                  activeOpacity={0.8}
                >
                  <Feather name="shopping-bag" size={18} color="#FFF" style={{ marginRight: 10 }} />
                  <Text style={{ fontFamily: 'Manrope-Bold', fontSize: 16, color: '#FFF' }}>Buy Now</Text>
                </HapticButton>
              </View>
            </View>
          )}
        </ScrollView>
      </SwipeableBottomSheet>

      {/* Location Selector Modal */}
      <Modal visible={locationModalVisible} transparent animationType="fade">
        <View style={styles.locationModalOverlay}>
          <View style={{ width: '80%', backgroundColor: t.bg, borderRadius: 20, padding: 20 }}>
            <Text style={{ fontFamily: 'Manrope-Bold', fontSize: 18, color: DARK, marginBottom: 16 }}>Delivery Location</Text>
            {['IN', 'PH', 'ID', 'PK', 'US'].map(code => (
              <HapticButton
                key={code}
                style={{ paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                onPress={() => updateCountry(code)}
              >
                <Text style={{ fontFamily: 'Manrope-SemiBold', fontSize: 16, color: t.text }}>
                  {code === 'IN' ? 'India' : code === 'PH' ? 'Philippines' : code === 'ID' ? 'Indonesia' : code === 'PK' ? 'Pakistan' : 'United States'}
                </Text>
                {(countryCode || 'IN') === code && <Feather name="check" size={18} color={BRAND} />}
              </HapticButton>
            ))}
            <View style={{ flexDirection: 'row', marginTop: 20, gap: 12 }}>
              <HapticButton 
                style={{ flex: 1, alignItems: 'center', paddingVertical: 12, backgroundColor: t.cardBg, borderRadius: 12 }}
                onPress={() => {
                  setLocationModalVisible(false);
                  if (isInitialLocationPrompt) {
                    navigation.goBack();
                  }
                }}
              >
                <Text style={{ fontFamily: 'Manrope-Bold', fontSize: 14, color: t.text }}>Cancel</Text>
              </HapticButton>
              <HapticButton 
                style={{ flex: 1, alignItems: 'center', paddingVertical: 12, backgroundColor: BRAND, borderRadius: 12 }}
                onPress={() => {
                  import('@react-native-async-storage/async-storage').then(module => {
                    module.default.setItem('shop_country_selected', 'true');
                  });
                  setIsInitialLocationPrompt(false);
                  setLocationModalVisible(false);
                }}
              >
                <Text style={{ fontFamily: 'Manrope-Bold', fontSize: 14, color: '#FFF' }}>Confirm</Text>
              </HapticButton>
            </View>
          </View>
        </View>
      </Modal>



      {/* Back to Top Button */}
      {showBackToTop && tabHidden && (
        <HapticButton
          style={{
            position: 'absolute',
            bottom: insets.bottom > 0 ? insets.bottom + 16 : 24,
            right: 20,
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: t.cardBg,
            borderWidth: 1,
            borderColor: t.border,
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onPress={slowScrollToTop}
          activeOpacity={0.8}
        >
          <Feather name="arrow-up" size={20} color={t.brand} />
        </HapticButton>
      )}

      {/* AI Chat Overlay Modal */}
      <SwipeableBottomSheet visible={aiChatVisible} onClose={() => setAiChatVisible(false)} maxHeight="90%">
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ 
            height: Dimensions.get('screen').height * 0.9 - 40, 
            backgroundColor: t.bg,
            paddingBottom: Platform.OS === 'android' ? (keyboardHeight ? keyboardHeight + 40 : 0) : 0
          }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          {/* Chat Feed */}
          <ScrollView 
            ref={chatScrollRef}
            contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            style={{ flex: 1 }}
            onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: true })}
          >
            {chatMessages.map((msg) => (
              <View 
                key={msg.id} 
                style={{
                  alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: msg.cards ? '100%' : '85%',
                  width: msg.cards ? '100%' : undefined,
                  marginBottom: 16
                }}
              >
                {msg.sender === 'user' ? (
                  <View style={{
                    backgroundColor: t.brand,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderRadius: 20,
                    borderTopRightRadius: 4
                  }}>
                    <Text style={{ fontFamily: 'Manrope-Regular', fontSize: 14, color: '#fff' }}>{msg.text}</Text>
                  </View>
                ) : (
                  <View style={{
                    backgroundColor: t.cardBg,
                    paddingHorizontal: 16,
                    paddingTop: 12,
                    paddingBottom: msg.cards ? 4 : 12,
                    borderRadius: 20,
                    borderTopLeftRadius: 4,
                    borderWidth: 1,
                    borderColor: t.border
                  }}>
                    {msg.loading ? (
                      <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 12 }}>
                        <LottieView
                          source={{ uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/animations/ai-bouquet.json' }}
                          autoPlay
                          loop
                          style={{ width: 80, height: 80 }}
                        />
                        <Text style={{ fontFamily: 'Manrope-SemiBold', fontSize: 12, color: MUTED, marginTop: 4 }}>
                          Finding the perfect flowers for you...
                        </Text>
                      </View>
                    ) : (
                      <>
                        <Text style={{ fontFamily: 'Manrope-Regular', fontSize: 14, color: t.text, lineHeight: 20 }}>
                          {msg.text}
                        </Text>
                        
                        {/* Horizontal Carousel of suggested products */}
                        {msg.cards && (
                          <ScrollView 
                            horizontal 
                            showsHorizontalScrollIndicator={false}
                            style={{ marginTop: 12, maxHeight: 260 }}
                            contentContainerStyle={{ gap: 12, paddingBottom: 4 }}
                          >
                            {msg.cards.map((item) => (
                              <ProductCard 
                                key={item.id}
                                item={item} 
                                theme={t} 
                                countryCode={countryCode} 
                                onVendorPress={(vendor) => {
                                  setCameFromAiChat(true);
                                  fetchVendorInfo(vendor);
                                }}
                                onCardPress={(product) => {
                                  setCameFromAiChat(true);
                                  onCardPress(product);
                                }}
                                style={{ width: 220, marginBottom: 0 }}
                              />
                            ))}
                          </ScrollView>
                        )}
                      </>
                    )}
                  </View>
                )}
              </View>
            ))}
          </ScrollView>

          {/* Bottom Chat Input Bar */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderTopWidth: 1,
            borderTopColor: t.border,
            backgroundColor: t.bg,
            paddingBottom: keyboardVisible ? 12 : (insets.bottom > 0 ? insets.bottom + 12 : 20)
          }}>
            <TextInput
              style={{
                flex: 1,
                backgroundColor: t.cardBg,
                borderRadius: 24,
                paddingHorizontal: 16,
                paddingVertical: 10,
                color: t.text,
                borderWidth: 1,
                borderColor: t.border,
                fontFamily: 'Manrope-Regular',
                fontSize: 14,
                maxHeight: 160
              }}
              placeholder="Tell me about the occasion or recipient..."
              placeholderTextColor={MUTED}
              value={chatInput}
              onChangeText={setChatInput}
              onSubmitEditing={sendChatMessage}
              multiline
            />
            <HapticButton 
              onPress={sendChatMessage}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: chatInput.trim() ? t.brand : t.border,
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: 8
              }}
              disabled={!chatInput.trim()}
            >
              <Feather name="send" size={18} color="#fff" />
            </HapticButton>
          </View>
        </KeyboardAvoidingView>
      </SwipeableBottomSheet>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: CREAM },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20 },
  topRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 20,
  },
  topAnimatedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 12,
    zIndex: 100,
  },
  topAnimatedHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  betaTag: {
    backgroundColor: '#F5F9F6',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D4E0D6',
  },
  betaTagText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 13,
    color: '#8CA18F',
    letterSpacing: 0.2,
  },
  screenTitle: { fontFamily: 'Manrope-Bold', fontSize: 22, letterSpacing: -0.5 },
  locationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 28,
    borderWidth: 1,
    paddingLeft: 16,
    paddingRight: 6,
    height: 52,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Manrope-Regular',
    fontSize: 14,
    padding: 0,
  },
  searchPillBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchPillBtnText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 13,
    color: '#fff',
  },
  trendingContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 17,
    marginBottom: 14,
  },
  trendingRow: {
    gap: 16,
    paddingRight: 10,
  },
  categoryCircleCard: {
    alignItems: 'center',
    width: 88,
  },
  circleImageWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    marginBottom: 8,
  },
  circleImage: {
    width: '100%',
    height: '100%',
  },
  categoryLabel: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 12,
    textAlign: 'center',
  },
  curatedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  filterBtnText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 12,
    color: '#52A05F',
  },
  resultsGrid: {
    paddingBottom: 20,
  },
  
  // Card mock style
  card: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 0,
    overflow: 'hidden',
    height: 240,
  },
  cardImageContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  cardImg: {
    width: '100%',
    height: '100%',
  },
  cardImgFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardVendorBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    maxWidth: 180,
  },
  vendorAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  cardVendorText: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 11,
    color: '#111111',
  },
  overlayBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingTop: 36,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  cardTitle: {
    fontFamily: 'PlayfairDisplay-Regular',
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 11,
    color: '#EAE0D5',
  },
  priceOverlay: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceOverlayText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 13,
    color: '#FFFFFF',
  },

  // Modal / Bottom Sheet
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    maxHeight: '85%',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
  },
  sheetTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 18,
  },
  closeBtn: {
    padding: 4,
  },
  sheetScroll: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  sparkleInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 20,
  },
  sparkleInput: {
    flex: 1,
    fontFamily: 'Manrope-Regular',
    fontSize: 14,
    padding: 0,
  },
  sheetSectionTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 15,
    marginBottom: 12,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 13,
  },
  categoriesGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginVertical: 16,
  },
  categoryGridBtn: {
    height: 46,
    borderRadius: 23,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 14,
    paddingRight: 4,
    borderWidth: 1,
    overflow: 'hidden',
  },
  categoryGridLabel: {
    fontFamily: 'PlayfairDisplay-Regular',
    fontSize: 13.5,
    marginRight: 8,
  },
  categoryGridImg: {
    width: 38,
    height: 38,
    alignSelf: 'flex-end',
    marginBottom: -2,
  },
  charGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 10,
  },
  charCard: {
    width: '48%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  charCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  circleCheck: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#CCC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  charCardTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 13,
    marginBottom: 4,
  },
  charCardSub: {
    fontFamily: 'Manrope-Regular',
    fontSize: 10,
    color: MUTED,
  },
  sheetFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
  },
  clearBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#CCC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 14,
  },
  showResultsBtn: {
    flex: 2,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  showResultsBtnText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 14,
    color: '#FFF',
  },
  dragHandle: {
    position: 'absolute',
    top: 8,
    left: '50%',
    marginLeft: -20,
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1C4B5',
  },

  // Location selector overlay
  locationModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Bottom Navigation (Floating)
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

  // General States
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateText: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 14,
  },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  retryBtnText: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 14,
  },
});
