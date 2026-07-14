import React, { useMemo, useState, memo, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import Modal from 'react-native-modal';
import { FlashList } from '@shopify/flash-list';
import { getTranslatedPreset, PRESETS } from '../../../utils/bouquetData';
import { Search as SearchIcon } from 'lucide-react-native';
import { v4 as uuidv4 } from 'uuid';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const PresetsModal = memo(({ 
  visible, 
  onClose, 
  locale, 
  themeColors, 
  t, 
  onSelectPreset,
  background,
  generateRandomPosition
}) => {
  const insets = useSafeAreaInsets();
  const [presetSearchQuery, setPresetSearchQuery] = useState('');
  const [scrollOffset, setScrollOffset] = useState(0);
  const flashListRef = useRef(null);

  const handleOnScroll = (event) => {
    setScrollOffset(event.nativeEvent.contentOffset.y);
  };

  const handleScrollTo = (p) => {
    if (flashListRef.current) {
      flashListRef.current.scrollToOffset({ offset: p, animated: true });
    }
  };

  const translatedPresets = useMemo(() => {
    return Object.keys(PRESETS).reduce((acc, key) => {
      acc[key] = getTranslatedPreset(key, locale);
      return acc;
    }, {});
  }, [locale]);

  const handlePresetSelect = React.useCallback((key) => {
    // Call parent handler
    onSelectPreset(key);
  }, [onSelectPreset]);

  const filteredData = useMemo(() => {
    return Object.entries(translatedPresets).filter(([, p]) => 
      p.name.toLowerCase().includes(presetSearchQuery.toLowerCase())
    );
  }, [translatedPresets, presetSearchQuery]);

  const renderItem = React.useCallback(({ item: [key, preset] }) => (
    <TouchableOpacity 
      style={[styles.presetCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]} 
      onPress={() => handlePresetSelect(key)}
    >
      <Text style={[styles.presetCardText, { color: themeColors.brand }]}>{preset.name}</Text>
    </TouchableOpacity>
  ), [handlePresetSelect, themeColors]);

  if (!visible) return null;

  return (
    <Modal
      isVisible={visible}
      onSwipeComplete={onClose}
      swipeDirection="down"
      propagateSwipe={true}
      scrollTo={handleScrollTo}
      scrollOffset={scrollOffset}
      scrollOffsetMax={100} // Trigger swipe down when near top
      onBackdropPress={onClose}
      style={{ margin: 0, justifyContent: 'flex-end' }}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      backdropOpacity={0.5}
      useNativeDriverForBackdrop
    >
      <View
        style={[
          styles.presetsContainer,
          {
            backgroundColor: themeColors.cardBg,
            paddingBottom: insets.bottom + 16,
          },
        ]}
      >
        {/* Drag handle */}
        <TouchableOpacity activeOpacity={1} style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 6, marginTop: -8 }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: themeColors.border }} />
        </TouchableOpacity>

        <View style={[styles.searchBar, { backgroundColor: themeColors.inputBg, borderColor: themeColors.border }]}>
            <SearchIcon size={15} color={themeColors.textMuted} style={{ marginRight: 8 }} />
            <TextInput 
              style={{ flex: 1, fontSize: 14, paddingVertical: 14, color: themeColors.text }} 
              placeholder={t('createBouquet.searchPresets', 'Search presets...')} 
              placeholderTextColor={themeColors.textMuted} 
              value={presetSearchQuery} 
              onChangeText={setPresetSearchQuery} 
            />
          </View>
          
        <View style={{ flex: 1, minHeight: 200 }}>
          <FlashList
            ref={flashListRef}
            data={filteredData}
            keyExtractor={([key]) => key}
            numColumns={2}
            estimatedItemSize={60}
            keyboardShouldPersistTaps="handled"
            onScroll={handleOnScroll}
            scrollEventThrottle={16}
            bounces={false}
            showsVerticalScrollIndicator={false}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 20, paddingHorizontal: 4 }}
          />
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  presetsContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '85%',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    borderRadius: 30,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  presetCard: {
    flex: 1,
    padding: 12,
    margin: 6,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
  },
  presetCardText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
