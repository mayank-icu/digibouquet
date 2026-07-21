import React, { memo } from 'react';
import { View, Text, StyleSheet, Share } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { HapticButton } from '../../components/HapticButton';

export const FeatureCards = React.memo(({ themeColors, translate, getTextSize, navigation, currentUser, hasScheduled }) => {
  const handleShare = async () => {
    try {
      if (currentUser) {
        const userUniqueCode = `GLD-${currentUser.uid.substring(0, 5).toUpperCase()}`;
        const playStoreLink = `https://play.google.com/store/apps/details?id=com.digibouquet.app&referrer=utm_content%3D${userUniqueCode}`;
        await Share.share({
          message: `Unlock the Golden Bouquet with my invitation! Download the app and enter my code ${userUniqueCode} or use this link to automatically claim your credit: ${playStoreLink}`
        });
      } else {
        await Share.share({
          message: `Unlock the Golden Bouquet! Download the app to get started: https://play.google.com/store/apps/details?id=com.digibouquet.app`
        });
      }
    } catch (error) {
      console.log('Share error:', error);
    }
  };

  return (
    <View style={{ backgroundColor: themeColors.cardBg, borderRadius: 16, overflow: 'hidden', marginBottom: 24 }}>
      {currentUser && hasScheduled && (
        <>
          <View style={{ height: 1, backgroundColor: themeColors.bg, marginHorizontal: 16 }} />
          <HapticButton
            style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}
            onPress={() => navigation.navigate('ScheduledEmails', { fade: true })}
            activeOpacity={0.85}
          >
            <View style={[styles.iconCircle, { backgroundColor: themeColors.bg, marginRight: 14, width: 44, height: 44, borderRadius: 12 }]}>
              <Feather name="calendar" size={20} color={themeColors.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'Manrope-SemiBold', color: themeColors.text, fontSize: getTextSize(14) }}>{translate('home.scheduledEmails')}</Text>
              <Text style={{ fontFamily: 'Manrope-Regular', color: themeColors.textMuted, fontSize: getTextSize(12) }}>{translate('home.scheduledEmailsDesc')}</Text>
            </View>
            <Feather name="chevron-right" size={16} color={themeColors.textMuted} />
          </HapticButton>
        </>
      )}

      <View style={{ height: 1, backgroundColor: themeColors.bg, marginHorizontal: 16 }} />
      <HapticButton
        style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}
        onPress={() => navigation.navigate('CreativeStudio', { fade: true })}
        activeOpacity={0.85}
      >
        <View style={[styles.iconCircle, { backgroundColor: themeColors.bg, marginRight: 14, width: 44, height: 44, borderRadius: 12 }]}>
          <Feather name="grid" size={20} color={themeColors.brand} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: 'Manrope-SemiBold', color: themeColors.text, fontSize: getTextSize(14) }}>{translate('home.creativeStudio') || 'Creative Studio'}</Text>
          <Text style={{ fontFamily: 'Manrope-Regular', color: themeColors.textMuted, fontSize: getTextSize(12) }}>{translate('home.creativeStudioDesc') || 'Flower Keyboard, Birth Wallpaper & Recipes.'}</Text>
        </View>
        <Feather name="chevron-right" size={16} color={themeColors.textMuted} />
      </HapticButton>

      {/* Share / Invite Card */}
      <View style={{ height: 1, backgroundColor: themeColors.bg, marginHorizontal: 16 }} />
      <HapticButton
        style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}
        onPress={handleShare}
        activeOpacity={0.85}
      >
        <View style={[styles.iconCircle, { backgroundColor: themeColors.bg, marginRight: 14, width: 44, height: 44, borderRadius: 12 }]}>
          <Feather name="share-2" size={20} color={themeColors.brand} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: 'Manrope-SemiBold', color: themeColors.text, fontSize: getTextSize(14) }}>{translate('home.inviteFriends') || 'Invite Friends'}</Text>
          <Text style={{ fontFamily: 'Manrope-Regular', color: themeColors.textMuted, fontSize: getTextSize(12) }}>
            {translate('home.inviteFriendsDesc') || 'Share the app with your friends!'}
          </Text>
        </View>
        <Feather name="share" size={16} color={themeColors.textMuted} />
      </HapticButton>
    </View>
  );
});

FeatureCards.displayName = 'FeatureCards';

const styles = StyleSheet.create({
  iconCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
