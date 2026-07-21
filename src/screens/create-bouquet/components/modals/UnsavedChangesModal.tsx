import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, BackHandler } from 'react-native';

export const UnsavedChangesModal = ({
  visible,
  themeColors,
  insets,
  styles,
  t,
  onStay,
  onLeave,
}: any) => {
  useEffect(() => {
    if (!visible) return;
    const backAction = () => {
      if (onStay) onStay();
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [visible, onStay]);

  if (!visible) return null;

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 9999, elevation: 999 }]} pointerEvents="box-none">
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} activeOpacity={1} onPress={onStay} />
        <View style={[styles.modalBox, { paddingBottom: insets.bottom + 24, backgroundColor: themeColors.cardBg }]}>
          <Text style={[styles.modalTitle, { textAlign: 'center', color: themeColors.text }]}>{t('createBouquet.unsavedTitle')}</Text>
          <Text style={{ color: themeColors.textMuted, marginVertical: 12, textAlign: 'center' }}>{t('createBouquet.unsavedDesc')}</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity style={[styles.fabSecondary, { flex: 1, backgroundColor: themeColors.surface, borderColor: themeColors.border }]} onPress={onStay}>
              <Text style={[styles.fabSecondaryText, { color: themeColors.text }]}>{t('createBouquet.stay')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.fabSecondary, { flex: 1, backgroundColor: '#e74c3c', borderColor: '#e74c3c' }]}
              onPress={onLeave}
            >
              <Text style={[styles.fabSecondaryText, { color: 'white' }]}>{t('createBouquet.leave')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};
