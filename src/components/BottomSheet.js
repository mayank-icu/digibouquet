import { HapticButton } from '../components/HapticButton';
import React, { useRef, useEffect } from 'react';
import { StyleSheet, View, Dimensions, Animated, TouchableOpacity, Modal } from 'react-native';
import { BlurView } from 'expo-blur';
import { PanGestureHandler, State, ScrollView as RNGHScrollView } from 'react-native-gesture-handler';

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

const SCREEN_H = Dimensions.get('window').height;

export function BottomSheet({ visible, onClose, children, containerStyle = {}, overlayStyle = {} }) {
  const slideAnim = useRef(new Animated.Value(SCREEN_H)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const panY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      panY.setValue(0);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_H,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationY: panY } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = (event) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      const { translationY, velocityY } = event.nativeEvent;
      if (translationY > 100 || velocityY > 500) {
        // Animate out then close
        Animated.timing(panY, {
          toValue: SCREEN_H,
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          panY.setValue(0);
          onClose();
        });
      } else {
        // Snap back
        Animated.spring(panY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 10,
        }).start();
      }
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={StyleSheet.absoluteFill}>
        {/* Dim overlay */}
        <AnimatedBlurView
          intensity={20}
          tint="dark"
          pointerEvents={visible ? 'auto' : 'none'}
          style={[StyleSheet.absoluteFill, { opacity: overlayOpacity }, overlayStyle]}
        >
          <HapticButton style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        </AnimatedBlurView>

        {/* Sheet */}
        <PanGestureHandler
          onGestureEvent={onGestureEvent}
          onHandlerStateChange={onHandlerStateChange}
          activeOffsetY={[-10, 10]} // Only activate on vertical movement
        >
          <Animated.View
            style={[
              styles.sheet,
              containerStyle,
              { transform: [{ translateY: Animated.add(slideAnim, panY) }] }
            ]}
          >
            {children}
          </Animated.View>
        </PanGestureHandler>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  }
});
