import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Linking } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as StoreReview from 'expo-store-review';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import LottieView from 'lottie-react-native';
import { Check, Copy, Share2, ChevronRight, Star } from 'lucide-react-native';

export const SuccessModal = ({
  visible,
  themeColors,
  SCREEN_W,
  styles,
  t,
  showSuccessLottie,
  setShowSuccessLottie,
  showRatingWidget,
  setShowRatingWidget,
  cardUrl,
  setShowReviewFallbackModal,
  setShowShareModal,
  setShowSuccessModal,
  navigation,
}: any) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => { }}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalBox, { paddingBottom: 24, alignItems: 'center', backgroundColor: themeColors.cardBg }]}>
          {/* Lottie Animation (Over the modal) */}
          {showSuccessLottie && (
            <View style={{ position: 'absolute', top: -100, left: 0, right: 0, bottom: 0, zIndex: 9999, pointerEvents: 'none', alignItems: 'center', justifyContent: 'center' }}>
              <LottieView
                source={{ uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/animations/bouqet-created.json' }}
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
                        if (await StoreReview.hasAction()) {
                          await StoreReview.requestReview();
                        } else {
                          await Clipboard.setStringAsync(cardUrl);
                          setShowReviewFallbackModal(true);
                        }
                      } catch (e) {
                        await Clipboard.setStringAsync(cardUrl);
                        setShowReviewFallbackModal(true);
                      }
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
                setShowSuccessModal(false);
                (navigation as any).navigate('BouquetView', { id: cardUrl.split('/').pop() });
              }}
            >
              <Text style={{ color: '#7A5C58', fontFamily: 'Manrope-Bold', fontSize: 16 }}>{t('createBouquet.viewBouquet')}</Text>
              <ChevronRight size={18} color="#7A5C58" />
            </TouchableOpacity>

            <TouchableOpacity
              style={{ paddingVertical: 12, alignItems: 'center' }}
              onPress={() => { setShowSuccessModal(false); navigation.navigate('Home' as never); }}
            >
              <Text style={{ fontFamily: 'Manrope-SemiBold', fontSize: 14, color: '#aaa' }}>{t('createBouquet.close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export const ReviewFallbackModal = ({
  visible,
  themeColors,
  styles,
  setShowReviewFallbackModal,
}: any) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setShowReviewFallbackModal(false)}>
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
              onPress={() => {
                Linking.openURL('https://play.google.com/store/apps/details?id=com.egreet.digibouquet');
                setShowReviewFallbackModal(false);
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
  );
};
