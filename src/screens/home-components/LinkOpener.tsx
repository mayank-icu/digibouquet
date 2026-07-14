import React, { memo, useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { HapticButton } from '../../components/HapticButton';

export const LinkOpener = memo(({ themeColors, translate, navigation }) => {
  const [openLink, setOpenLink] = useState('');

  const handleOpenLink = () => {
    const raw = openLink.trim();
    if (!raw) return;
    const match = raw.match(/bouquet\/([^/?#]+)/);
    const id = match ? match[1] : raw;
    if (id) {
      setOpenLink('');
      navigation.navigate('BouquetView', { id });
    }
  };

  return (
    <View style={{ marginBottom: 24 }}>
      <Text style={[styles.sectionLabel, { color: themeColors.text, marginBottom: 12 }]}>
        {translate('home.gotLink') === 'home.gotLink' ? 'Received a bouquet?' : translate('home.gotLink')}
      </Text>
      <View style={styles.openLinkRow}>
        <TextInput
          style={[styles.openLinkInput, { backgroundColor: themeColors.cardBg, color: themeColors.text, borderWidth: 0 }]}
          placeholder={translate('home.linkPlaceholder') || 'Paste bouquet link...'}
          placeholderTextColor={themeColors.textMuted}
          value={openLink}
          onChangeText={setOpenLink}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="go"
          onSubmitEditing={handleOpenLink}
        />
        <HapticButton
          style={[styles.openLinkBtn, { backgroundColor: themeColors.brand }, !openLink.trim() && { opacity: 0.4 }]}
          onPress={handleOpenLink}
          disabled={!openLink.trim()}
        >
          <Feather name="arrow-right" size={18} color="#fff" />
        </HapticButton>
      </View>
    </View>
  );
});

LinkOpener.displayName = 'LinkOpener';

const styles = StyleSheet.create({
  sectionLabel: {
    fontFamily: 'Manrope-Bold',
    fontSize: 18,
    marginLeft: 4,
  },
  openLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  openLinkInput: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontFamily: 'Manrope-Medium',
    fontSize: 15,
  },
  openLinkBtn: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
});
