import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, BackHandler } from 'react-native';

export const SarahInfoModal = ({
  visible,
  onClose,
  styles,
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

  if (!visible) return null;

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 9999, elevation: 999 }]} pointerEvents="box-none">
      <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.3)' }]}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={onClose} />
        <View style={[styles.modalBox, { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, width: '85%', alignSelf: 'center', marginBottom: 'auto', marginTop: 'auto' }]}>
          <View style={{ marginBottom: 16 }}>
            <Text style={[styles.modalTitle, { fontSize: 20, textAlign: 'left' }]}>Meet Sarah</Text>
            <Text style={{ fontSize: 12, color: '#999', marginTop: 2, fontFamily: 'Manrope-SemiBold', textTransform: 'uppercase', letterSpacing: 0.5 }}>Your AI Florist</Text>
          </View>

          <Text style={{ fontSize: 14, color: '#5C4844', lineHeight: 22, marginBottom: 20 }}>
            Sarah is your personal AI floral assistant. She uses advanced language models to design custom bouquets based on your unique sentiments and occasions.
          </Text>

          <View style={{ gap: 10, marginBottom: 24 }}>
            {[
              { text: 'Describe a feeling or occasion' },
              { text: 'Sarah selects the perfect flowers' },
              { text: 'Generates a thoughtful message' },
            ].map((item, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#7A5C58' }} />
                <Text style={{ fontSize: 14, color: '#7A5C58', fontFamily: 'Manrope-SemiBold' }}>{item.text}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={[styles.fabPrimary, { width: '100%' }]} onPress={onClose}>
            <Text style={styles.fabPrimaryText}>Got it</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};
