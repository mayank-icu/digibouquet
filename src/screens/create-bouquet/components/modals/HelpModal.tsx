import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Animated, StyleSheet, BackHandler } from 'react-native';

export const HelpModal = ({
  visible,
  themeColors,
  insets,
  SCREEN_H,
  styles,
  helpOverlay,
  helpSlideAnim,
  helpPanY,
  helpPanHandlers,
  onHelpScroll,
  onClose,
}: any) => {
  useEffect(() => {
    if (!visible) return;
    const backAction = () => {
      onClose();
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [visible, onClose]);

  if (!visible && helpSlideAnim._value === SCREEN_H) return null;

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 9999, elevation: 999 }]} pointerEvents="box-none">
      <View style={StyleSheet.absoluteFill}>
        <Animated.View
          pointerEvents={visible ? 'auto' : 'none'}
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)', opacity: helpOverlay }]}
        >
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        </Animated.View>
        <Animated.View
          style={[
            styles.modalBox,
            {
              position: 'absolute', left: 0, right: 0, bottom: 0,
              paddingBottom: insets.bottom + 20,
              backgroundColor: themeColors.cardBg,
              transform: [{ translateY: Animated.add(helpSlideAnim, helpPanY) }],
              maxHeight: SCREEN_H * 0.78,
            },
          ]}
          {...helpPanHandlers}
        >
          {/* Drag handle only — no title, no close icon */}
          <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 14, marginTop: -8 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: themeColors.border }} />
          </View>
          <ScrollView showsVerticalScrollIndicator={false} onScroll={onHelpScroll} scrollEventThrottle={16} contentContainerStyle={{ paddingHorizontal: 16 }}>
            <Text style={{ fontSize: 16, fontFamily: 'Manrope-Bold', color: themeColors.text, marginBottom: 12 }}>How to create a bouquet</Text>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 }}>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: themeColors.surface2, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <Text style={{ color: themeColors.brand, fontFamily: 'Manrope-Bold' }}>1</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontFamily: 'Manrope-SemiBold', color: themeColors.text }}>Select Flowers</Text>
                <Text style={{ fontSize: 13, color: themeColors.textMuted, marginTop: 2 }}>Choose at least 3 flowers to begin. Tap a flower card to see its meaning and color options.</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 }}>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: themeColors.surface2, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <Text style={{ color: themeColors.brand, fontFamily: 'Manrope-Bold' }}>2</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontFamily: 'Manrope-SemiBold', color: themeColors.text }}>Arrange Them</Text>
                <Text style={{ fontSize: 13, color: themeColors.textMuted, marginTop: 2 }}>Drag flowers around the canvas. Use the toolbar to edit size, rotation, and layering.</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 }}>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: themeColors.surface2, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <Text style={{ color: themeColors.brand, fontFamily: 'Manrope-Bold' }}>3</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontFamily: 'Manrope-SemiBold', color: themeColors.text }}>Personalize & Send</Text>
                <Text style={{ fontSize: 13, color: themeColors.textMuted, marginTop: 2 }}>Add a heartfelt message, pick a song, and generate a unique link to share with them.</Text>
              </View>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </View>
  );
};
