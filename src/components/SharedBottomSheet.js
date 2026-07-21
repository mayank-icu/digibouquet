import { HapticButton } from '../components/HapticButton';
import React, { useState, useEffect } from 'react';
import { Animated, StyleSheet, View, Modal , BackHandler } from 'react-native';
import { useSwipeToClose } from '../hooks/useSwipeToClose';

/**
 * SharedBottomSheet
 *
 * A swipe-to-close bottom sheet using the header-zone-only PanResponder.
 * Exposes `onScroll` so inner ScrollViews can report their scroll offset,
 * preventing the swipe gesture from triggering while the user scrolls content.
 *
 * Usage:
 *   <SharedBottomSheet visible={...} onClose={...}>
 *     {({ onScroll }) => (
 *       <ScrollView onScroll={onScroll} scrollEventThrottle={16}>
 *         ...
 *       </ScrollView>
 *     )}
 *   </SharedBottomSheet>
 *
 * OR pass plain children (no scroll tracking):
 *   <SharedBottomSheet visible={...} onClose={...}>
 *     <Text>Hello</Text>
 *   </SharedBottomSheet>
 */
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
    onScroll,
  } = useSwipeToClose(visible, onClose);

  useEffect(() => {
    if (!mounted) return;
    const backAction = () => {
      onClose();
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [mounted, onClose]);

  if (!mounted) return null;

  // Support render-prop pattern so children can get onScroll
  const renderedChildren = typeof children === 'function'
    ? children({ onScroll })
    : children;

  return (
    <Modal hardwareAccelerated={true} visible={mounted} transparent={true} animationType="none" onRequestClose={onClose}>
      <View style={[StyleSheet.absoluteFillObject]} pointerEvents="box-none">
        <Animated.View
          style={[styles.overlay, overlayStyle, { backgroundColor: 'rgba(0,0,0,0.5)', opacity: overlayOpacity }]}
          pointerEvents={mounted ? 'auto' : 'none'}
        >
          <HapticButton style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        </Animated.View>
        <Animated.View
          style={[styles.sheet, style, { transform: [{ translateY: Animated.add(slideAnim, panY) }] }]}
          {...panHandlers}
        >
          {renderedChildren}
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
