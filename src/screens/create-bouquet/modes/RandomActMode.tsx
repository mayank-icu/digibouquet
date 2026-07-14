import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stage1Select } from '../stages/Stage1Select';
import { Stage2Arrange } from '../stages/Stage2Arrange';
import { Stage3Message } from '../stages/Stage3Message';
import { moderateWithSarvam } from '../../../utils/raokSafety';
import { useTheme } from '../../../contexts/ThemeContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useAuth } from '../../../contexts/AuthContext';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../../firebase';

export const RandomActMode = ({ navigation }) => {
  const { theme: themeColors } = useTheme();
  const { t } = useLanguage();
  const { currentUser } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedFlowers, setSelectedFlowers] = useState([]);
  const [messageCard, setMessageCard] = useState({ message: '', senderName: '', recipientName: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [canSend, setCanSend] = useState(true);

  // Constants
  const MAX_FLOWERS = 12;

  // On Mount Checks
  useEffect(() => {
    const checkStatus = async () => {
      // 1. Strike Reset
      const bannedUntil = await AsyncStorage.getItem('RAOK_banned_until');
      if (bannedUntil && Date.now() > parseInt(bannedUntil, 10)) {
        await AsyncStorage.setItem('RAOK_strikes', '0');
        await AsyncStorage.removeItem('RAOK_banned_until');
      }

      // 2. 2 Sends Per Day Limit
      const sendsStr = await AsyncStorage.getItem('RAOK_sends');
      let sends = sendsStr ? JSON.parse(sendsStr) : [];
      // Filter out sends older than 24h
      sends = sends.filter(ts => Date.now() - ts < 24 * 60 * 60 * 1000);
      await AsyncStorage.setItem('RAOK_sends', JSON.stringify(sends));

      if (sends.length >= 2) {
        setCanSend(false);
        Alert.alert('Daily Limit Reached', 'You have reached the maximum of 2 Random Acts of Kindness for today. Please come back tomorrow!');
        navigation.goBack();
      }
    };
    checkStatus();
  }, [navigation]);

  // Handler for Stage 1
  const handleFlowerPress = (flowerId) => {
    const isSelected = selectedFlowers.some(f => f.id === flowerId);
    if (isSelected) {
      setSelectedFlowers(prev => prev.filter(f => f.id !== flowerId));
    } else {
      if (selectedFlowers.length < MAX_FLOWERS) {
        setSelectedFlowers(prev => [...prev, { id: flowerId, uniqueId: Math.random().toString() }]);
      }
    }
  };

  // Submission handler for Stage 3
  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // 1. Final Sarvam AI Check
      const sarvamResult = await moderateWithSarvam(messageCard.message);
      
      if (!sarvamResult.isSafe) {
        // Handle Strike System
        const strikes = parseInt((await AsyncStorage.getItem('RAOK_strikes')) || '0', 10) + 1;
        await AsyncStorage.setItem('RAOK_strikes', strikes.toString());
        
        if (strikes >= 3) {
          const banUntil = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
          await AsyncStorage.setItem('RAOK_banned_until', banUntil.toString());
          Alert.alert(
            t('raok.bannedTitle', 'Feature Temporarily Disabled'),
            t('raok.bannedMessage', 'You have repeatedly violated our safety guidelines. This feature is disabled for 24 hours.')
          );
          navigation.navigate('MainTabs', { screen: 'Home' });
          return;
        } else {
          Alert.alert(
            t('raok.warningTitle', 'Safety Warning'),
            t('raok.warningMessage', 'Your message violates our safety guidelines. Please revise it.')
          );
          setIsSubmitting(false);
          return;
        }
      }

      // 2. Submit to backend
      const deliveryDelayMs = Math.floor(Math.random() * 24 * 60 * 60 * 1000) + (1 * 60 * 60 * 1000); // 1-24 hours
      const deliveryTimestamp = Date.now() + deliveryDelayMs;
      
      const payload = {
        isRandomAct: true,
        flowers: selectedFlowers,
        message: messageCard.message,
        targetTags: sarvamResult.tags,
        deliveryTimestamp,
        status: 'unmatched',
        createdAt: Date.now(),
        creatorId: currentUser?.uid || 'anonymous',
      };

      console.log('Submitting Random Act Bouquet:', payload);
      await addDoc(collection(db, 'bouquet-cards'), payload);

      // Record successful send to enforce 2/day limit
      const sendsStr = await AsyncStorage.getItem('RAOK_sends');
      const sends = sendsStr ? JSON.parse(sendsStr) : [];
      sends.push(Date.now());
      await AsyncStorage.setItem('RAOK_sends', JSON.stringify(sends));

      Alert.alert(
        t('raok.successTitle', 'Bouquet Sent!'),
        t('raok.successMessage', 'Your Random Act of Kindness has been sent into the world and will be delivered soon.')
      );
      navigation.navigate('MainTabs', { screen: 'Home' });

    } catch (error) {
      console.error('Submission failed', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.bg || '#FAF7F2' }]}>
      {currentStep === 1 && (
        <Stage1Select
          themeColors={themeColors}
          t={t}
          selectedFlowers={selectedFlowers}
          maxFlowers={MAX_FLOWERS}
          onFlowerPress={handleFlowerPress}
          isKeyboardVisible={false}
          isRandomActMode={true} // Forces Presets to hide
          onShowPresets={() => {}}
        />
      )}

      {currentStep === 2 && (
        <Stage2Arrange
          themeColors={themeColors}
          t={t}
          selectedFlowers={selectedFlowers}
          customArrangementMode={true}
          onBack={() => setCurrentStep(1)}
          onNext={() => setCurrentStep(3)}
        />
      )}

      {currentStep === 3 && (
        <Stage3Message
          themeColors={themeColors}
          t={t}
          messageCard={messageCard}
          setMessageCard={setMessageCard}
          isRandomActMode={true} // Hides From, To, Audio, Image
          onBack={() => setCurrentStep(2)}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Basic Step Navigation for testing */}
      <View style={styles.debugNav}>
         {currentStep === 1 && selectedFlowers.length >= 3 && (
            <TouchableOpacity style={styles.navBtn} onPress={() => setCurrentStep(2)}>
               <Text>Next (Debug)</Text>
            </TouchableOpacity>
         )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  debugNav: { padding: 16, alignItems: 'center' },
  navBtn: { padding: 10, backgroundColor: '#ddd', borderRadius: 8 }
});
