import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Bell, X } from 'lucide-react-native';

interface NotificationModalProps {
  visible: boolean;
  onClose: () => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({ visible, onClose }) => {
  const { t } = useTranslation();

  const handleYes = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status === 'granted') {
        await AsyncStorage.setItem('notifications_prompted', 'true');
        await AsyncStorage.setItem('notifications_enabled', 'true');
      }
    } catch (e) {
      console.warn('Failed to request notification permissions:', e);
    }
    onClose();
  };

  const handleLater = async () => {
    try {
      await AsyncStorage.setItem('notifications_prompted', 'true');
    } catch (e) {
      // ignore
    }
    onClose();
  };

  return (
    <Modal hardwareAccelerated={true} visible={visible} transparent animationType="fade" onRequestClose={handleLater}>
      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <View style={styles.container}>
          <TouchableOpacity style={styles.closeBtn} onPress={handleLater}>
            <X color="#999" size={24} />
          </TouchableOpacity>
          
          <View style={styles.iconContainer}>
            <Bell color="#C79F5A" size={40} />
          </View>

          <Text style={styles.title}>Enable Notifications</Text>
          <Text style={styles.description}>
            Get notified when someone claims your golden bouquet and interacts with your creations.
          </Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.yesButton} onPress={handleYes}>
              <Text style={styles.yesButtonText}>Yes, notify me</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.laterButton} onPress={handleLater}>
              <Text style={styles.laterButtonText}>Maybe later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  container: {
    width: '85%',
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FAF5EE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontFamily: 'PlayfairDisplay-Bold',
    fontSize: 22,
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  yesButton: {
    backgroundColor: '#C79F5A',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  yesButtonText: {
    color: '#FFF',
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
  laterButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  laterButtonText: {
    color: '#999',
    fontFamily: 'Inter-Medium',
    fontSize: 15,
  },
});
