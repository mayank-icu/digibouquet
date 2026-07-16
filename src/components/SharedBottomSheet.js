import { HapticButton } from '../components/HapticButton';
import React, { useState, useEffect } from 'react';
import { Animated, StyleSheet, View, Modal } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSwipeToClose } from '../hooks/useSwipeToClose';

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

export default function SharedBottomSheet({ visible, onClose, children, style = {}, overlayStyle = {} }) {
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
    } else {
      const timeout = setTimeout(() => {
        setMounted(false);
      }, 220); // wait for closeDuration
      return () => clearTimeout(timeout);
    }
  }, [visible]);

  const {
    slideAnim,
    panY,
    overlayOpacity,
    panHandlers,
    isInteractive
  } = useSwipeToClose(visible, onClose);

  if (!mounted) return null;

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose}>
      <View style={[StyleSheet.absoluteFillObject, { zIndex: 9999, elevation: 999 }]} pointerEvents="box-none">
        <AnimatedBlurView
          intensity={overlayOpacity.interpolate({ inputRange: [0, 1], outputRange: [0, 20] })}
          tint="dark"
          style={[styles.overlay, overlayStyle, { opacity: overlayOpacity }]}
          pointerEvents={mounted ? 'auto' : 'none'}
        >
          <HapticButton style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        </AnimatedBlurView>
        <Animated.View
          style={[styles.sheet, style, { transform: [{ translateY: Animated.add(slideAnim, panY) }] }]}
          {...panHandlers}
          pointerEvents={isInteractive ? 'auto' : 'none'}
        >
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#fff',
  },
});
