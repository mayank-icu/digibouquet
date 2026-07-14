import { HapticButton } from '../components/HapticButton';
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, StatusBar, Platform, Modal, ScrollView, Animated
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  collection, query, orderBy, limit,
  onSnapshot, doc, writeBatch, getDoc, deleteDoc,
} from 'firebase/firestore';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { useSwipeNavigation } from '../hooks/useSwipeNavigation';
import { SvgXml } from 'react-native-svg';
import { noNotificationsSvg } from '../svgStrings';

const BRAND = '#7A5C58';
const CREAM = '#FAF7F2';
const DARK  = '#5C4844';
const MUTED = '#997E7A';
const MID   = '#EAE0D5';
const WHITE = '#fff';

// Icon config per notification type - minimal design
function getNotifIcon(type) {
  switch (type) {
    case 'reply':
      return { name: 'message-circle', Component: Feather };
    default:
      return { name: 'flower', Component: MaterialCommunityIcons };
  }
}

export default function NotificationsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { theme: tTheme, isDark } = useTheme();
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const { getTextSize } = useAccessibility();
  
  const swipeHandlers = useSwipeNavigation({
    onSwipeRight: () => navigation.goBack(),
  });
  
  const [notifs, setNotifs]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailsModal, setDetailsModal] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState(null);
  const [bouquetDetails, setBouquetDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    // Try cache first from AsyncStorage
    AsyncStorage.getItem(`notifs_${currentUser.uid}`)
      .then((cached) => {
        if (cached) {
          const data = JSON.parse(cached);
          if (data?.length) {
            setNotifs(data);
            setLoading(false);
          }
        }
      })
      .catch(() => {});

    const q = query(
      collection(db, 'notifications', currentUser.uid, 'items'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setNotifs(data);
      setLoading(false);
      // Cache in AsyncStorage
      AsyncStorage.setItem(`notifs_${currentUser.uid}`, JSON.stringify(data)).catch(() => {});
    }, () => setLoading(false));

    return unsub;
  }, [currentUser]);

  // Mark all unread as read when screen opens
  useEffect(() => {
    if (!currentUser || notifs.length === 0) return;
    const unread = notifs.filter((n) => !n.read);
    if (unread.length === 0) return;

    const batch = writeBatch(db);
    unread.forEach((n) => {
      batch.update(doc(db, 'notifications', currentUser.uid, 'items', n.id), { read: true });
    });
    batch.commit().catch(() => {});
  }, [notifs, currentUser]);

  const handleOpen = useCallback(async (notif) => {
    // Always open modal to show notification details
    setSelectedNotif(notif);
    setDetailsModal(true);
    setBouquetDetails(null); // Reset previous details
    
    // If there's a bouquetId, fetch the bouquet details
    const bId = notif.bouquetId || notif.data?.bouquetId;
    if (bId) {
      setLoadingDetails(true);
      try {
        const bouquetDoc = await getDoc(doc(db, 'bouquet-cards', bId));
        if (bouquetDoc.exists()) {
          setBouquetDetails({ id: bouquetDoc.id, ...bouquetDoc.data() });
        } else {
          console.log('Bouquet not found:', notif.bouquetId);
        }
      } catch (error) {
        console.error('Error fetching bouquet:', error);
      } finally {
        setLoadingDetails(false);
      }
    } else {
      setLoadingDetails(false);
    }
  }, []);

  const handleDelete = useCallback(async (id) => {
    if (!currentUser) return;
    try {
      await deleteDoc(doc(db, 'notifications', currentUser.uid, 'items', id));
    } catch (e) {
      console.error("Failed to delete notification:", e);
    }
  }, [currentUser]);

  const renderItem = ({ item }) => {
    const { name, Component } = getNotifIcon(item.type);
    
    const renderRightActions = (progress, dragX) => {
      const trans = dragX.interpolate({
        inputRange: [-80, 0],
        outputRange: [1, 0],
        extrapolate: 'clamp',
      });
      return (
        <HapticButton
          style={{
            backgroundColor: '#e74c3c',
            justifyContent: 'center',
            alignItems: 'center',
            width: 80,
            borderRadius: 16,
            marginBottom: 12,
            marginLeft: 8,
          }}
          onPress={() => handleDelete(item.id)}
        >
          <Animated.View style={{ transform: [{ scale: trans }] }}>
            <Feather name="trash-2" size={24} color="white" />
          </Animated.View>
        </HapticButton>
      );
    };

    const displayMsg = (item.message || '').replace(/^"|"$/g, '');

    return (
      <Swipeable 
        renderRightActions={renderRightActions} 
        overshootRight={false}
        onSwipeableOpen={(direction) => {
          if (direction === 'right') handleDelete(item.id);
        }}
      >
        <HapticButton
          style={[
            styles.card, 
            { backgroundColor: tTheme.bg, borderColor: tTheme.border },
            !item.read && styles.cardUnread
          ]}
          onPress={() => handleOpen(item)}
          activeOpacity={0.7}
        >
        <View style={styles.cardBody}>
          <View style={styles.cardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Component name={name} size={16} color={tTheme.brand} style={{ marginRight: 8 }} />
              <Text style={[styles.cardTitle, { color: tTheme.text, flexShrink: 1 }]} numberOfLines={1}>
                {item.title || t('notifications.defaultTitle')}
              </Text>
              {item.isRandomAct && (
                <View style={{ marginLeft: 6, backgroundColor: '#f3e5f5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                  <Text style={{ fontSize: 10, color: '#8e24aa', fontWeight: 'bold' }}>ANONYMOUS ✨</Text>
                </View>
              )}
            </View>
            <Text style={[styles.cardTime, { color: tTheme.textMuted }]}>
              {formatTime(item.createdAt, t)}
            </Text>
          </View>
          {displayMsg ? (
            <Text style={[styles.cardMsg, { color: tTheme.textMuted }]} numberOfLines={2}>
              {displayMsg}
            </Text>
          ) : null}
        </View>
        {!item.read && <View style={[styles.unreadDot, { backgroundColor: tTheme.brand }]} />}
        </HapticButton>
      </Swipeable>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: tTheme.bg }, Platform.OS === 'web' && styles.rootWeb]} {...swipeHandlers}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={tTheme.bg} />

      <View style={[styles.header, { paddingTop: insets.top, backgroundColor: tTheme.bg, borderBottomColor: tTheme.border }]}>
        <HapticButton onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={tTheme.text} />
        </HapticButton>
        <Text style={[styles.headerTitle, { color: tTheme.text, fontSize: getTextSize(17) }]}>{t('notifications.title')}</Text>
        <View style={{ width: 38 }} />
      </View>

      {!currentUser ? (
        <View style={styles.center}>
          <SvgXml xml={noNotificationsSvg} width={220} height={220} style={{ marginBottom: 16 }} />
          <Text style={[styles.emptyTitle, { color: tTheme.text }]}>{t('notifications.stayInLoop')}</Text>
          <Text style={[styles.emptySub, { color: tTheme.textMuted }]}>{t('notifications.registerDesc')}</Text>
          <HapticButton style={[styles.signInBtn, { backgroundColor: tTheme.brand }]} onPress={() => {
            // Replace current screen with Register to prevent going back to Notifications
            navigation.replace('Register');
          }} activeOpacity={0.85}>
            <Text style={styles.signInBtnText}>{t('login.signUp')}</Text>
          </HapticButton>
          <HapticButton onPress={() => {
            // Replace current screen with Login to prevent going back to Notifications
            navigation.replace('Login');
          }} style={{ marginTop: 12 }}>
            <Text style={{ fontFamily: 'Manrope-SemiBold', fontSize: 14, color: tTheme.brand }}>{t('notifications.alreadyAccount')}</Text>
          </HapticButton>
        </View>
      ) : loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={tTheme.brand} size="large" />
        </View>
      ) : notifs.length === 0 ? (
        <View style={styles.center}>
          <SvgXml xml={noNotificationsSvg} width={220} height={220} style={{ marginBottom: 16 }} />
          <Text style={[styles.emptyTitle, { color: tTheme.text }]}>{t('notifications.allQuiet')}</Text>
          <Text style={[styles.emptySub, { color: tTheme.textMuted }]}>{t('notifications.emptyDesc')}</Text>
        </View>
      ) : (
        <FlatList
          data={notifs}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Details Modal */}
      <Modal
        visible={detailsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setDetailsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <HapticButton 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={() => setDetailsModal(false)} 
          />
          <View style={[styles.modalContent, { backgroundColor: tTheme.cardBg, paddingBottom: insets.bottom + 20 }]}>
            <View style={[styles.modalHandle, { backgroundColor: tTheme.border }]} />
            
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: tTheme.text }]}>
                {selectedNotif?.type === 'reply' ? t('notifications.newReply') : 
                 t('notifications.notificationDetails')}
              </Text>
              <HapticButton onPress={() => setDetailsModal(false)}>
                <Feather name="x" size={24} color={tTheme.textMuted} />
              </HapticButton>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Notification Info - Always show */}
              <View style={[styles.infoCard, { backgroundColor: tTheme.surface2 }]}>
                <View style={styles.infoRow}>
                  <Feather name="info" size={16} color={tTheme.brand} />
                  <Text style={[styles.infoLabel, { color: tTheme.textMuted, fontSize: getTextSize(11) }]}>{t('notifications.notificationLabel')}</Text>
                </View>
                <Text style={[styles.infoValue, { color: tTheme.text }]}>
                  {selectedNotif?.title}
                </Text>
                {selectedNotif?.message && (
                  <Text style={[styles.infoMessage, { color: tTheme.textMuted }]}>
                    {selectedNotif.message.replace(/^"|"$/g, '')}
                  </Text>
                )}
                <Text style={[styles.infoTime, { color: tTheme.textMuted }]}>
                  {formatTime(selectedNotif?.createdAt, t)}
                </Text>
              </View>

              {/* Bouquet Details - Only show if loading or loaded */}
              {loadingDetails ? (
                <View style={styles.modalLoading}>
                  <ActivityIndicator color={tTheme.brand} size="large" />
                  <Text style={[styles.errorText, { color: tTheme.textMuted, marginTop: 12, fontSize: getTextSize(14) }]}>
                    {t('notifications.loadingDetails')}
                  </Text>
                </View>
              ) : bouquetDetails ? (
                <>
                  <View style={[styles.infoCard, { backgroundColor: tTheme.surface2 }]}>
                    <View style={styles.infoRow}>
                      <MaterialCommunityIcons name="flower-tulip" size={16} color={tTheme.brand} />
                      <Text style={[styles.infoLabel, { color: tTheme.textMuted, fontSize: getTextSize(11) }]}>{t('notifications.bouquetDetails')}</Text>
                    </View>
                    
                    {bouquetDetails.messageCard?.recipientName && (
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: tTheme.textMuted, fontSize: getTextSize(13) }]}>{t('common.to')}:</Text>
                        <Text style={[styles.detailValue, { color: tTheme.text }]}>
                          {bouquetDetails.messageCard.recipientName}
                        </Text>
                      </View>
                    )}
                    
                    {bouquetDetails.messageCard?.senderName && (
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: tTheme.textMuted, fontSize: getTextSize(13) }]}>{t('common.from')}:</Text>
                        <Text style={[styles.detailValue, { color: tTheme.text }]}>
                          {bouquetDetails.messageCard.senderName}
                        </Text>
                      </View>
                    )}
                    
                    {bouquetDetails.selectedFlowers && (
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: tTheme.textMuted, fontSize: getTextSize(13) }]}>{t('notifications.flowersLabel')}</Text>
                        <Text style={[styles.detailValue, { color: tTheme.text, fontSize: getTextSize(14) }]}>
                          {t('notifications.flowersCount').replace('{count}', bouquetDetails.selectedFlowers.length)}
                        </Text>
                      </View>
                    )}
                    
                    {bouquetDetails.messageCard?.message && (
                      <View style={[styles.messageBox, { backgroundColor: tTheme.bg, borderColor: tTheme.border }]}>
                        <Text style={[styles.messageLabel, { color: tTheme.textMuted, fontSize: getTextSize(12) }]}>{t('notifications.messageLabel')}</Text>
                        <Text style={[styles.messageText, { color: tTheme.text }]}>
                          {bouquetDetails.messageCard.message}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Action Button */}
                  <HapticButton
                    style={[styles.viewBouquetBtn, { backgroundColor: tTheme.brand }]}
                    onPress={() => {
                      setDetailsModal(false);
                      navigation.navigate('BouquetView', { id: bouquetDetails.id });
                    }}
                  >
                    <Feather name="eye" size={18} color={WHITE} />
                    <Text style={[styles.viewBouquetText, { fontSize: getTextSize(15) }]}>{t('notifications.viewFullBouquet')}</Text>
                  </HapticButton>
                </>
              ) : (selectedNotif?.bouquetId || selectedNotif?.data?.bouquetId) ? (
                <View style={styles.modalLoading}>
                  <Feather name="alert-circle" size={32} color={tTheme.textMuted} />
                  <Text style={[styles.errorText, { color: tTheme.textMuted, fontSize: getTextSize(14) }]}>
                    {t('notifications.loadError')}
                  </Text>
                </View>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function formatTime(ts, t) {
  if (!ts) return '';
  const ms = ts.toMillis ? ts.toMillis() : ts;
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return t('notifications.justNow');
  if (mins < 60) return t('notifications.minsAgo').replace('{count}', mins.toString());
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return t('notifications.hrsAgo').replace('{count}', hrs.toString());
  const days = Math.floor(hrs / 24);
  return t('notifications.daysAgo').replace('{count}', days.toString());
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: CREAM },
  rootWeb: { height: '100vh' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: MID,
    backgroundColor: CREAM,
  },
  backBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: 'Manrope-SemiBold', fontSize: 17, color: DARK },
  list: { padding: 16, paddingBottom: 32 },
  card: {
    flexDirection: 'row', 
    alignItems: 'center',
    backgroundColor: WHITE, 
    borderRadius: 8, 
    padding: 14,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: MID,
  },
  cardUnread: { 
    borderLeftWidth: 0, 
  },
  cardBody: { flex: 1 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardTitle: { 
    fontFamily: 'Manrope-SemiBold', 
    fontSize: 14, 
    color: DARK,
    flex: 1,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: BRAND,
    marginLeft: 8,
  },
  cardMsg: { 
    fontFamily: 'Manrope-Regular', 
    fontSize: 13, 
    color: MUTED, 
    lineHeight: 19, 
    marginBottom: 6,
  },
  cardTime: { 
    fontFamily: 'Manrope-Regular', 
    fontSize: 11, 
    color: MUTED,
    letterSpacing: 0.2,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIconWrap: {
    width: 64, 
    height: 64, 
    borderRadius: 32,
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: 16,
  },
  emptyTitle: { 
    fontFamily: 'Manrope-Bold', 
    fontSize: 18, 
    color: DARK,
    marginBottom: 8,
  },
  emptySub: { 
    fontFamily: 'Manrope-Regular', 
    fontSize: 14, 
    color: MUTED, 
    textAlign: 'center', 
    lineHeight: 22,
  },
  signInBtn: {
    backgroundColor: BRAND, 
    borderRadius: 12, 
    paddingVertical: 12, 
    paddingHorizontal: 28, 
    marginTop: 16,
  },
  signInBtnText: { fontFamily: 'Manrope-Bold', fontSize: 15, color: WHITE },
  bellIconWrap: {
    width: 64, 
    height: 64, 
    borderRadius: 32,
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: 16,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: '85%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 20,
    color: DARK,
  },
  modalBody: {
    flex: 1,
  },
  modalLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  infoCard: {
    backgroundColor: MID,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoLabel: {
    fontFamily: 'Manrope-Bold',
    fontSize: 11,
    color: MUTED,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 16,
    color: DARK,
    marginBottom: 4,
  },
  infoMessage: {
    fontFamily: 'Manrope-Regular',
    fontSize: 14,
    color: MUTED,
    lineHeight: 20,
    marginBottom: 8,
  },
  infoTime: {
    fontFamily: 'Manrope-Regular',
    fontSize: 12,
    color: MUTED,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  detailLabel: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 13,
    color: MUTED,
    width: 60,
  },
  detailValue: {
    fontFamily: 'Manrope-Regular',
    fontSize: 14,
    color: DARK,
    flex: 1,
  },
  messageBox: {
    backgroundColor: CREAM,
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: MID,
  },
  messageLabel: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 12,
    color: MUTED,
    marginBottom: 6,
  },
  messageText: {
    fontFamily: 'Manrope-Regular',
    fontSize: 14,
    color: DARK,
    lineHeight: 20,
  },
  viewBouquetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: BRAND,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 8,
    marginBottom: 20,
  },
  viewBouquetText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 15,
    color: WHITE,
  },
  errorText: {
    fontFamily: 'Manrope-Regular',
    fontSize: 14,
    color: MUTED,
    marginTop: 12,
    textAlign: 'center',
  },
});
