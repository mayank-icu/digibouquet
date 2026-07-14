import { HapticButton } from '../components/HapticButton';
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Alert, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { collection, query, where, orderBy, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { SvgXml } from 'react-native-svg';
import { scheduledEmailSvg } from '../svgStrings';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { useSwipeNavigation } from '../hooks/useSwipeNavigation';

const CACHE_KEY = 'cached_scheduled_emails';

export default function ScheduledEmailsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { currentUser } = useAuth();
  const { theme: t, isDark } = useTheme();
  const { t: tr } = useLanguage();
  const { getTextSize } = useAccessibility();

  const swipeHandlers = useSwipeNavigation({
    onSwipeRight: () => navigation.goBack(),
  });



  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchScheduled = useCallback(async (silent = false) => {
    if (!currentUser) return;
    if (!silent) setLoading(true);
    try {
      const q = query(
        collection(db, 'bouquet-scheduled-emails'),
        where('userId', '==', currentUser.uid),
        orderBy('scheduledAt', 'asc')
      );
      const snap = await getDocs(q);
      const results = [];
      snap.forEach((d) => results.push({ id: d.id, ...d.data() }));
      
      // Save to cache
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(results));
      setItems(results);
    } catch (e) {
      console.error('fetchScheduled error:', e);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    // Initial load from cache
    AsyncStorage.getItem(CACHE_KEY).then(cached => {
      if (cached) {
        setItems(JSON.parse(cached));
        setLoading(false);
      }
      fetchScheduled(true);
    });
  }, [fetchScheduled]);

  const handleCancel = (item) => {
    Alert.alert(
      tr('scheduledEmails.cancelTitle'),
      tr('scheduledEmails.cancelDesc').replace('{email}', item.recipientEmail || ''),
      [
        { text: tr('scheduledEmails.keep'), style: 'cancel' },
        {
          text: tr('scheduledEmails.cancelEmail'), style: 'destructive',
          onPress: async () => {
            try {
              await updateDoc(doc(db, 'bouquet-scheduled-emails', item.id), { status: 'cancelled' });
              Toast.show({ type: 'success', text1: tr('scheduledEmails.cancelledToast') });
              fetchScheduled();
            } catch {
              Toast.show({ type: 'error', text1: tr('scheduledEmails.cancelFailed') });
            }
          },
        },
      ]
    );
  };

  const statusColor = (status) => {
    if (status === 'sent') return '#27ae60';
    if (status === 'cancelled') return '#e74c3c';
    return '#7A5C58';
  };

  const statusLabel = (status) => {
    if (status === 'sent') return tr('scheduledEmails.sent');
    if (status === 'cancelled') return tr('scheduledEmails.cancelled');
    return tr('scheduledEmails.scheduled');
  };

  return (
    <View style={[styles.safe, { backgroundColor: t.bg }]} {...swipeHandlers}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={t.bg} />

      <View style={[styles.header, { paddingTop: insets.top, backgroundColor: t.bg, borderBottomColor: t.border }]}>
        <HapticButton onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={t.text} />
        </HapticButton>
        <Text style={[styles.headerTitle, { color: t.text, fontSize: getTextSize(17) }]}>{tr('scheduledEmails.title')}</Text>
        <View style={{ width: 38 }} />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={t.brand || '#7A5C58'} />
        </View>
      ) : items.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <SvgXml xml={scheduledEmailSvg} width={220} height={220} style={{ marginBottom: 16 }} />
          <Text style={[styles.emptyText, { color: t.text }]}>{tr('scheduledEmails.empty')}</Text>
          <Text style={[styles.emptySub, { color: t.textMuted }]}>
            {tr('scheduledEmails.emptyDesc')}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
          {items.map((item) => {
            const scheduledDate = item.scheduledAt ? new Date(item.scheduledAt) : null;
            const isPending = item.status === 'pending';
            const isPast = scheduledDate && scheduledDate < new Date();

            return (
              <View key={item.id} style={[styles.card, { backgroundColor: t.cardBg || '#fff' }]}>
                <View style={[styles.statusBadge, { backgroundColor: `${statusColor(item.status)}20` }]}>
                  <View style={[styles.statusDot, { backgroundColor: statusColor(item.status) }]} />
                  <Text style={[styles.statusText, { color: statusColor(item.status) }]}>{statusLabel(item.status)}</Text>
                </View>

                <Text style={[styles.recipientText, { color: t.text || '#3d2e27', fontSize: getTextSize(15) }]} numberOfLines={1}>
                  {tr('common.to')}: {item.recipientEmail}
                </Text>

                {item.recipientName ? <Text style={[styles.nameText, { color: t.textMuted || '#888' }]}>{item.recipientName}</Text> : null}

                {scheduledDate && (
                  <View style={styles.dateRow}>
                    <Feather name="calendar" size={13} color={t.textMuted || '#aaa'} />
                    <Text style={[styles.dateText, { color: t.textMuted || '#888' }]}>
                      {scheduledDate.toLocaleString(undefined, {
                        weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                      {isPending && isPast ? ` (${tr('scheduledEmails.sendingSoon')})` : ''}
                    </Text>
                  </View>
                )}

                <View style={styles.cardActions}>
                  <HapticButton style={styles.viewBtn} onPress={() => navigation.navigate('BouquetView', { id: item.bouquetId })}>
                    <Feather name="eye" size={14} color="#7A5C58" />
                    <Text style={[styles.viewBtnText, { fontSize: getTextSize(13) }]}>{tr('scheduledEmails.viewBouquet')}</Text>
                  </HapticButton>

                  {isPending && (
                    <HapticButton style={styles.cancelBtn} onPress={() => handleCancel(item)}>
                      <Feather name="x-circle" size={14} color="#e74c3c" />
                      <Text style={[styles.cancelBtnText, { fontSize: getTextSize(13) }]}>{tr('common.cancel')}</Text>
                    </HapticButton>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: 'Manrope-SemiBold', fontSize: 17, color: '#5C4844' },
  emptyText: { fontFamily: 'Manrope-SemiBold', fontSize: 16, marginBottom: 8 },
  emptySub: { fontFamily: 'Manrope-Regular', fontSize: 13, textAlign: 'center', lineHeight: 20 },
  card: {
    borderRadius: 14, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, marginBottom: 10,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontFamily: 'Manrope-SemiBold', fontSize: 12 },
  recipientText: { fontFamily: 'Manrope-Bold', fontSize: 15, marginBottom: 2 },
  nameText: { fontFamily: 'Manrope-Regular', fontSize: 13, marginBottom: 8 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  dateText: { fontFamily: 'Manrope-Regular', fontSize: 13 },
  cardActions: { flexDirection: 'row', gap: 10 },
  viewBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: '#FFF5F0', borderRadius: 8,
  },
  viewBtnText: { fontFamily: 'Manrope-SemiBold', fontSize: 13, color: '#7A5C58' },
  cancelBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: '#FFF0F0', borderRadius: 8,
  },
  cancelBtnText: { fontFamily: 'Manrope-SemiBold', fontSize: 13, color: '#e74c3c' },
});
