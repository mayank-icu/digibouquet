import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, BackHandler } from 'react-native';

export const RAOKSuccessModal = ({
  visible,
  themeColors,
  onClose,
}: {
  visible: boolean;
  themeColors: any;
  onClose: () => void;
}) => {
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
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <View style={{ backgroundColor: themeColors.cardBg, borderRadius: 20, padding: 24, width: '100%', maxWidth: 400, alignItems: 'center' }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 32 }}>✨</Text>
          </View>
          <Text style={{ fontFamily: 'Manrope-Bold', fontSize: 22, color: themeColors.brand, textAlign: 'center', marginBottom: 8 }}>
            Bouquet Sent!
          </Text>
          <Text style={{ fontFamily: 'Manrope-Regular', fontSize: 15, color: themeColors.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: 24 }}>
            Your Random Act of Kindness has been submitted to our system. It is currently being analyzed by our AI for matching, and will automatically be sent to someone who needs it soon. Thank you for making the world a little brighter!
          </Text>
          <TouchableOpacity 
            style={{ backgroundColor: themeColors.brand, width: '100%', paddingVertical: 14, borderRadius: 12, alignItems: 'center' }}
            onPress={onClose}
          >
            <Text style={{ fontFamily: 'Manrope-Bold', color: '#fff', fontSize: 16 }}>Return to Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};
