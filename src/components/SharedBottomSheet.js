import { HapticButton } from '../components/HapticButton';
import React, { useRef, useEffect, useState } from 'react';
import { Animated, PanResponder, StyleSheet, TouchableOpacity, Dimensions, View, Modal } from 'react-native';
import { BlurView } from 'expo-blur';

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function SharedBottomSheet({ visible, onClose, children, style = {}, overlayStyle = {} }) {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const isAnimatingOut = useRef(false);
  const [modalVisible, setModalVisible] = useState(visible);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponderCapture: (_, gs) => {
        return gs.dy > 10 && Math.abs(gs.dy) > Math.abs(gs.dx);
      },
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) slideAnim.setValue(gs.dy);
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 80 || gs.vy > 0.5) {
          isAnimatingOut.current = true;
          Animated.parallel([
            Animated.spring(slideAnim, {
              toValue: SCREEN_HEIGHT,
              velocity: gs.vy,
              useNativeDriver: true,
              tension: 65,
              friction: 11,
            }),
            Animated.timing(overlayAnim, {
              toValue: 0,
              duration: 220,
              useNativeDriver: true,
            })
          ]).start(() => {
            setModalVisible(false);
            onClose();
          });
        } else {
          Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true }).start();
      },
    })
  ).current;

  const overlayPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponderCapture: (_, gs) => gs.dy > 10 && Math.abs(gs.dy) > Math.abs(gs.dx),
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) slideAnim.setValue(gs.dy);
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 80 || gs.vy > 0.5) {
          isAnimatingOut.current = true;
          Animated.parallel([
            Animated.spring(slideAnim, {
              toValue: SCREEN_HEIGHT,
              velocity: gs.vy,
              useNativeDriver: true,
              tension: 65,
              friction: 11,
            }),
            Animated.timing(overlayAnim, {
              toValue: 0,
              duration: 220,
              useNativeDriver: true,
            })
          ]).start(() => {
            setModalVisible(false);
            onClose();
          });
        } else {
          Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      isAnimatingOut.current = false;
      slideAnim.setValue(SCREEN_HEIGHT);
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
        Animated.timing(overlayAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
      ]).start();
    } else if (modalVisible) {
      if (isAnimatingOut.current) {
        isAnimatingOut.current = false;
        return;
      }
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 220, useNativeDriver: true }),
        Animated.timing(overlayAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start(() => {
        setModalVisible(false);
      });
    }
  }, [visible, slideAnim, overlayAnim]);

  if (!modalVisible) return null;

  return (
    <Modal visible={modalVisible} transparent animationType="none" onRequestClose={onClose}>
      <View style={[StyleSheet.absoluteFillObject, { zIndex: 9999, elevation: 999 }]} pointerEvents="box-none">
        <AnimatedBlurView
          intensity={20}
          tint="dark"
          style={[styles.overlay, overlayStyle, { opacity: overlayAnim }]}
          {...overlayPanResponder.panHandlers}
          pointerEvents={visible ? 'auto' : 'none'}
        >
          <HapticButton style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        </AnimatedBlurView>
        <Animated.View
          style={[styles.sheet, style, { transform: [{ translateY: slideAnim }] }]}
          {...panResponder.panHandlers}
          pointerEvents={visible ? 'auto' : 'none'}
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
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
  },
});
