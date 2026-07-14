import { HapticButton } from '../components/HapticButton';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar,
  Platform, UIManager, Animated, Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { useSwipeNavigation } from '../hooks/useSwipeNavigation';
import { useCountry } from '../contexts/CountryContext';
import { DISCOVER_POSTS as POSTS } from '../data/discoverEvents';
import { discoverTranslations } from '../DiscoverTranslations';

function CollapsibleContainer({ children, expanded }) {
  const animatedValue = useRef(new Animated.Value(expanded ? 1 : 0)).current;
  const [mounted, setMounted] = useState(expanded);

  useEffect(() => {
    if (expanded) {
      setMounted(true);
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }).start();
    } else {
      Animated.timing(animatedValue, {
        toValue: 0,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }).start(() => {
        setMounted(false);
      });
    }
  }, [expanded]);

  if (!mounted && !expanded) return null;

  const maxHeight = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 420],
  });

  const opacity = animatedValue.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 0, 1],
  });

  const translateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-10, 0],
  });

  return (
    <Animated.View style={{ maxHeight, opacity, overflow: 'hidden' }}>
      <Animated.View style={{ transform: [{ translateY }] }}>
        {children}
      </Animated.View>
    </Animated.View>
  );
}

const PINK_LIGHT = '#FAF7F2';
const PINK_MID   = '#EAE0D5';
const DARK       = '#5C4844';
const MUTED      = '#997E7A';

// Helper function to check if event should be shown
const isEventVisible = (eventDate) => {
  if (!eventDate || eventDate === 'Tips' || eventDate === 'New') return true;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const parts = eventDate.split('-');
  if (parts.length !== 3) return false;
  
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  
  const eventDateObj = new Date(year, month, day);
  eventDateObj.setHours(0, 0, 0, 0);
  
  // Show if the event is today or in the future
  return !isNaN(eventDateObj.getTime()) && eventDateObj.getTime() >= today.getTime();
};

export default function DiscoverScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { theme: tTheme, isDark } = useTheme();
  const { locale, t } = useLanguage();
  const { getEffectiveTheme, getTextSize } = useAccessibility();
  const { countryCode: contextCountryCode } = useCountry();
  const countryCode = ['IN', 'PH', 'ID', 'PK', 'US'].includes(contextCountryCode) ? contextCountryCode : 'US';
  const theme = getEffectiveTheme(tTheme);
  const [expandedCards, setExpandedCards] = useState({});
  const [activeTab, setActiveTab] = useState('days'); // 'days' | 'tips'

  const tabDays = locale === 'es' ? 'Días' : locale === 'fr' ? 'Jours' : locale === 'hi' ? 'दिन' : locale === 'ar' ? 'أيام' : locale === 'zh' ? '节日' : 'Days';
  const tabTips = locale === 'es' ? 'Consejos' : locale === 'fr' ? 'Conseils' : locale === 'hi' ? 'युक्तियाँ' : locale === 'ar' ? 'نصائح' : locale === 'zh' ? '提示' : 'Tips';

  // Get translations for current language, fallback to English
  const translations = discoverTranslations[locale] || discoverTranslations.en;

  // Filter events based on active tab and country
  const visiblePosts = useMemo(() => {
    return POSTS.filter(post => {
      if (post.countries && post.countries.length > 0) {
        if (!post.countries.includes(countryCode)) {
          return false;
        }
      }
      
      const isTip = post.date === 'Tips' || post.date === 'New';
      if (activeTab === 'days') {
        return !isTip && isEventVisible(post.date);
      } else {
        return isTip;
      }
    });
  }, [activeTab, countryCode]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setExpandedCards({});
  };

  const swipeHandlers = useSwipeNavigation({
    onSwipeRight: () => navigation.goBack(),
  });

  const toggleCard = (id) => {
    setExpandedCards(prev => {
      // If clicking the same card, toggle it
      if (prev[id]) {
        return { [id]: false };
      }
      // Otherwise, close all others and open this one
      return { [id]: true };
    });
  };

  const handleCreateBouquet = (post) => {
    if (post.specialNavigation === 'mothers-day') {
      navigation.navigate('CreateBouquet', { 
        presetSearch: 'mother',
        showPresetTab: true 
      });
    } else if (post.specialNavigation === 'fathers-day') {
      navigation.navigate('CreateBouquet', { 
        presetSearch: 'father',
        showPresetTab: true 
      });
    } else {
      navigation.navigate('CreateBouquet');
    }
  };

  return (
    <View style={[styles.safe, { backgroundColor: theme.bg }]} {...swipeHandlers}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.bg} />

      {/* Header — matches FeedbackScreen style */}
      <View style={[styles.header, { paddingTop: insets.top, backgroundColor: theme.bg, borderBottomColor: theme.border }]}>
        <HapticButton onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={theme.text} />
        </HapticButton>
        <Text style={[styles.headerTitle, { color: theme.text, fontSize: getTextSize(17) }]}>{translations.title}</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* Tabs Selector */}
      <View style={[styles.tabBar, { borderBottomColor: theme.border }]}>
        <HapticButton 
          style={styles.tabItem}
          onPress={() => handleTabChange('days')}
          activeOpacity={0.8}
        >
          <Text style={[
            styles.tabText, 
            { fontSize: getTextSize(14) },
            activeTab === 'days' ? { color: theme.brand, fontFamily: 'Manrope-Bold' } : { color: theme.textMuted }
          ]}>
            {tabDays}
          </Text>
          {activeTab === 'days' && <View style={[styles.tabIndicator, { backgroundColor: theme.brand }]} />}
        </HapticButton>
        <HapticButton 
          style={styles.tabItem}
          onPress={() => handleTabChange('tips')}
          activeOpacity={0.8}
        >
          <Text style={[
            styles.tabText, 
            { fontSize: getTextSize(14) },
            activeTab === 'tips' ? { color: theme.brand, fontFamily: 'Manrope-Bold' } : { color: theme.textMuted }
          ]}>
            {tabTips}
          </Text>
          {activeTab === 'tips' && <View style={[styles.tabIndicator, { backgroundColor: theme.brand }]} />}
        </HapticButton>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {visiblePosts.map((post, index) => {
          const isExpanded = expandedCards[post.id];
          const eventTranslation = translations.events[post.id] || {};
          return (
            <View key={post.id} style={[
              styles.card, 
              { backgroundColor: theme.cardBg },
              index === 0 && styles.firstCard
            ]}>
              <HapticButton 
                onPress={() => toggleCard(post.id)}
                style={styles.cardTouchable}
                activeOpacity={0.7}
              >
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardDate, { color: theme.textMuted, fontSize: getTextSize(11) }]}>{post.displayDate}</Text>
                  <View style={styles.headerRight}>
                    <Feather name={post.icon} size={18} color={theme.textMuted} />
                    <Feather 
                      name={isExpanded ? 'chevron-up' : 'chevron-down'} 
                      size={16} 
                      color={theme.textMuted} 
                      style={styles.chevron}
                    />
                  </View>
                </View>
                <Text style={[styles.cardTitle, { color: theme.text, fontSize: getTextSize(15) }]}>{eventTranslation.title || post.id}</Text>
                <Text style={[styles.cardBody, { color: theme.textMuted, fontSize: getTextSize(13) }]}>{eventTranslation.body || ''}</Text>
              </HapticButton>
              
              <CollapsibleContainer expanded={isExpanded}>
                <View style={styles.expandedContent}>
                  {eventTranslation.detailedBody && (
                    typeof eventTranslation.detailedBody === 'string' ? (
                      <Text style={[styles.detailedBody, { color: theme.textMuted, fontSize: getTextSize(13) }]}>
                        {eventTranslation.detailedBody}
                      </Text>
                    ) : (
                      <View>
                        {eventTranslation.detailedBody.intro && (
                          <Text style={[styles.detailedBody, { color: theme.textMuted, fontSize: getTextSize(13), marginBottom: 8 }]}>
                            {eventTranslation.detailedBody.intro}
                          </Text>
                        )}
                        {eventTranslation.detailedBody.bullets && (
                          <View style={styles.bulletList}>
                            {eventTranslation.detailedBody.bullets.map((bullet, idx) => (
                              <View key={idx} style={styles.bulletItem}>
                                <Text style={[styles.bullet, { color: theme.textMuted }]}>•</Text>
                                <Text style={[styles.bulletText, { color: theme.textMuted, fontSize: getTextSize(13) }]}>
                                  {bullet}
                                </Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    )
                  )}
                  <HapticButton 
                    style={[styles.createButton, { backgroundColor: theme.brand }]}
                    onPress={() => handleCreateBouquet(post)}
                    activeOpacity={0.8}
                  >
                    <Feather name="plus" size={16} color="white" />
                    <Text style={[styles.createButtonText, { fontSize: getTextSize(14) }]}>{t('createBouquet.createBouquet')}</Text>
                  </HapticButton>
                </View>
              </CollapsibleContainer>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PINK_LIGHT },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: PINK_LIGHT,
    borderBottomWidth: 1, borderBottomColor: PINK_MID,
  },
  backBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: 'Manrope-SemiBold', fontSize: 17, color: DARK },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 8 },
  card: {
    borderRadius: 12, marginBottom: 8,
    borderWidth: 1, borderColor: PINK_MID,
    overflow: 'hidden',
  },
  firstCard: {
    marginTop: 12,
  },
  cardTouchable: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chevron: {
    marginLeft: 8,
  },
  cardDate: { fontFamily: 'Manrope-Medium', fontSize: 11, color: MUTED },
  cardTitle: { 
    fontFamily: 'Manrope-SemiBold', 
    fontSize: 15, 
    color: DARK, 
    marginBottom: 4, 
    lineHeight: 20 
  },
  cardBody: { 
    fontFamily: 'Manrope-Regular', 
    fontSize: 13, 
    color: MUTED, 
    lineHeight: 18 
  },
  expandedContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: PINK_MID,
    backgroundColor: 'rgba(234, 224, 213, 0.3)',
  },
  detailedBody: {
    fontFamily: 'Manrope-Regular',
    fontSize: 13,
    color: MUTED,
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 16,
  },
  bulletList: {
    marginTop: 4,
    marginBottom: 16,
  },
  bulletItem: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingRight: 8,
  },
  bullet: {
    fontSize: 16,
    marginRight: 8,
    marginTop: -2,
  },
  bulletText: {
    flex: 1,
    fontFamily: 'Manrope-Regular',
    fontSize: 13,
    color: MUTED,
    lineHeight: 20,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignSelf: 'center',
  },
  createButtonText: {
    color: 'white',
    fontFamily: 'Manrope-SemiBold',
    fontSize: 14,
    marginLeft: 6,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: PINK_MID,
    backgroundColor: 'transparent',
    paddingHorizontal: 20,
  },
  tabItem: {
    paddingVertical: 14,
    marginRight: 24,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 14,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 2,
    borderRadius: 1,
  },
});
