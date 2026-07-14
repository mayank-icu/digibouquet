import React, { useRef } from 'react';
import { TouchableOpacity, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function HapticButton({ onPress, children, activeOpacity = 0.8, style, ...props }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = (e) => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      friction: 6,
      tension: 100,
    }).start();
    if (props.onPressIn) props.onPressIn(e);
  };

  const handlePressOut = (e) => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 6,
      tension: 100,
    }).start();
    if (props.onPressOut) props.onPressOut(e);
  };

  const handlePress = (e) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onPress) {
      onPress(e);
    }
  };

  return (
    <AnimatedTouchable 
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress} 
      activeOpacity={activeOpacity} 
      touchSoundDisabled={true}
      style={[style, { transform: [{ scale: scaleAnim }] }]}
      {...props}
    >
      {children}
    </AnimatedTouchable>
  );
}
