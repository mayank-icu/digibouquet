import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { HapticButton } from '../../components/HapticButton';

export const DashboardActions = React.memo(({ themeColors, translate, getTextSize, navigation }) => {
  return (
    <View style={styles.threeCol}>
      <HapticButton style={[styles.smallCard, { backgroundColor: themeColors.cardBg }]} activeOpacity={0.85} onPress={() => navigation.navigate('Discover', { fade: true })}>
        <Feather name="compass" size={24} color={themeColors.brand} />
        <Text style={[styles.smallCardLabel, { color: themeColors.textMuted, fontSize: getTextSize(11) }]}>{translate('home.discover')}</Text>
      </HapticButton>
      <HapticButton style={[styles.smallCard, { backgroundColor: themeColors.cardBg }]} activeOpacity={0.85} onPress={() => navigation.navigate('WidgetOverlay', { fade: true })}>
        <MaterialCommunityIcons name="flower-tulip" size={24} color={themeColors.brand} />
        <Text style={[styles.smallCardLabel, { color: themeColors.textMuted, fontSize: getTextSize(11) }]}>{translate('home.widget')}</Text>
      </HapticButton>
      <HapticButton style={[styles.smallCard, { backgroundColor: themeColors.cardBg }]} activeOpacity={0.85} onPress={() => navigation.navigate('WallpaperHub', { fade: true })}>
        <Feather name="image" size={24} color={themeColors.brand} />
        <Text style={[styles.smallCardLabel, { color: themeColors.textMuted, fontSize: getTextSize(11) }]}>{translate('home.wallpaper')}</Text>
      </HapticButton>
    </View>
  );
});

DashboardActions.displayName = 'DashboardActions';

const styles = StyleSheet.create({
  threeCol: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  smallCard: {
    flex: 1,
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: 'center',
  },
  smallCardLabel: {
    fontFamily: 'Manrope-SemiBold',
    marginTop: 8,
  },
});
