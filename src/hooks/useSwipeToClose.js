import { useRef, useEffect, useState } from 'react';
import { Animated, PanResponder, Dimensions } from 'react-native';

const SCREEN_H = Dimensions.get('window').height;

/**
 * useSwipeToClose
 *
 * Provides a smooth, scroll-aware swipe-down-to-close for bottom sheet modals.
 *
 * @param {boolean} visible  - Whether the modal is currently open
 * @param {Function} onClose - Callback to close the modal
 * @param {Object} opts
 *   @param {number} opts.threshold     - dy threshold to trigger close (default 80)
 *   @param {number} opts.velocityThreshold - vy threshold to trigger close (default 0.5)
 *   @param {number} opts.openDuration  - slide-in duration ms (default 300)
 *   @param {number} opts.closeDuration - slide-out duration ms (default 220)
 *
 * Returns { slideAnim, panY, panHandlers, overlayOpacity, isInteractive, onScroll }
 * Wire slideAnim + panY into your Animated.View transform like:
 *   transform: [{ translateY: Animated.add(slideAnim, panY) }]
 */
export function useSwipeToClose(visible, onClose, opts = {}) {
  const {
    threshold = 80,
    velocityThreshold = 0.5,
    openDuration = 300,
    closeDuration = 220,
  } = opts;

  const slideAnim = useRef(new Animated.Value(SCREEN_H)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const panY = useRef(new Animated.Value(0)).current;
  // Track scroll position to distinguish scroll vs swipe-to-close
  const scrollY = useRef(0);
  const isDraggingDown = useRef(false);
  const isAnimatingOut = useRef(false);
  // isInteractiveRef lets PanResponder closures always read the current value
  const isInteractiveRef = useRef(true);
  const [isInteractive, _setIsInteractive] = useState(true);

  const setIsInteractive = (val) => {
    isInteractiveRef.current = val;
    _setIsInteractive(val);
  };

  useEffect(() => {
    if (visible) {
      isAnimatingOut.current = false;
      panY.setValue(0);
      slideAnim.setValue(SCREEN_H);
      // Buttons are always tappable - don't block them during animation
      setIsInteractive(true);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: openDuration,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      if (isAnimatingOut.current) {
        isAnimatingOut.current = false;
        return;
      }
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_H,
          duration: closeDuration,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: closeDuration,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,

      onMoveShouldSetPanResponder: (evt, gs) => {
        if (!isInteractiveRef.current) return false;
        const { dx, dy } = gs;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        // Only swipe-to-close from the header zone (top 56px of the sheet)
        const touchY = evt.nativeEvent.locationY;
        const inHeader = touchY < 56;
        // Must move vertically and scroll must be at top
        return inHeader && dy > 5 && absDy > absDx * 2 && scrollY.current <= 15;
      },

      onMoveShouldSetPanResponderCapture: (evt, gs) => {
        if (!isInteractiveRef.current) return false;
        const { dx, dy } = gs;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        const touchY = evt.nativeEvent.locationY;
        const inHeader = touchY < 56;
        // Only capture from header zone to avoid stealing scroll events
        return inHeader && dy > 2 && absDy > absDx && scrollY.current <= 5;
      },

      onPanResponderGrant: () => {
        isDraggingDown.current = true;
      },

      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) slideAnim.setValue(gs.dy);
      },

      onPanResponderRelease: (_, gs) => {
        isDraggingDown.current = false;
        const { dy, vy } = gs;

        if (dy >= threshold || vy >= velocityThreshold) {
          isAnimatingOut.current = true;
          Animated.parallel([
            Animated.timing(slideAnim, {
              toValue: SCREEN_H,
              duration: closeDuration,
              useNativeDriver: true,
            }),
            Animated.timing(overlayOpacity, {
              toValue: 0,
              duration: closeDuration,
              useNativeDriver: true,
            })
          ]).start(() => {
            onClose();
          });
        } else {
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            tension: 80,
            friction: 10,
          }).start();
        }
      },

      onPanResponderTerminate: () => {
        isDraggingDown.current = false;
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true }).start();
      },
      onPanResponderTerminationRequest: () => true,
    })
  ).current;

  // Call this from your ScrollView's onScroll to track position
  const onScroll = (event) => {
    scrollY.current = event.nativeEvent.contentOffset.y;
  };

  return {
    slideAnim,
    panY,
    overlayOpacity,
    panHandlers: panResponder.panHandlers,
    onScroll,
    isInteractive,
  };
}
