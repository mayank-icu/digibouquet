import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { HapticButton } from '../../components/HapticButton';

export const FeatureCards = memo(({ themeColors, translate, getTextSize, navigation, currentUser, hasScheduled }) => {
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
