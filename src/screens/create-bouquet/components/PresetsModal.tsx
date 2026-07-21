import React, { useMemo, useState, memo, useRef, forwardRef, useImperativeHandle, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Animated, BackHandler } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { getTranslatedPreset, PRESETS } from '../../../utils/bouquetData';
import { Search as SearchIcon } from 'lucide-react-native';
import { v4 as uuidv4 } from 'uuid';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSwipeToClose } from '../../../hooks/useSwipeToClose';

export const PresetsModal = React.memo(React.forwardRef(({ 
  locale, 
  themeColors, 
  t, 
  onSelectPreset,
  background,
  generateRandomPosition
}, ref) => {
  const [visible, setVisible] = useState(false);
  const onClose = useCallback(() => setVisible(false), []);

  useImperativeHandle(ref, () => ({
    open: () => { setVisible(true); setPresetSearchQuery(''); },
    close: onClose
  }));
  const insets = useSafeAreaInsets();
  const [presetSearchQuery, setPresetSearchQuery] = useState('');
  const flashListRef = useRef(null);

  const {
    slideAnim,
    panY,
    overlayOpacity,
    panHandlers,
    onScroll,
    isInteractive
  } = useSwipeToClose(visible, onClose);

  useEffect(() => {
    if (!visible) return;
    const backAction = () => {
      onClose();
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [visible, onClose]);

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

  if (!visible && slideAnim._value === 0) return null;

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 9999, elevation: 999 }]} pointerEvents="box-none">
      {/* Dim overlay */}
      <Animated.View
        pointerEvents={visible ? 'auto' : 'none'}
        style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)', opacity: overlayOpacity }]}
      >
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        pointerEvents={isInteractive ? 'auto' : 'none'}
        style={[
          styles.presetsContainer,
          {
            position: 'absolute', left: 0, right: 0, bottom: 0,
            backgroundColor: themeColors.cardBg,
            paddingBottom: insets.bottom + 16,
            transform: [{ translateY: Animated.add(slideAnim, panY) }],
          },
        ]}
        {...panHandlers}
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
            onScroll={onScroll}
            scrollEventThrottle={16}
            bounces={false}
            showsVerticalScrollIndicator={false}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 20, paddingHorizontal: 4 }}
          />
        </View>
      </Animated.View>
    </View>
  );
}));

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
