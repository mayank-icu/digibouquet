import { PanResponder } from 'react-native';
import { useAccessibility } from '../contexts/AccessibilityContext';

// Require a deliberate swipe ? optimized for smooth, instant response
const SWIPE_DISTANCE = 50;   // px ? minimum horizontal travel (reduced for instant feel)
const SWIPE_VELOCITY = 0.25; // px/ms ? lower threshold for quicker response
const H_RATIO = 2.0;         // horizontal must be 2? the vertical movement

export function useSwipeNavigation({ onSwipeLeft, onSwipeRight, disabled } = {}) {
  const { swipeNavigation } = useAccessibility();

  const panResponder = PanResponder.create({
    // Never steal from children on start
    onStartShouldSetPanResponder: () => false,
    onStartShouldSetPanResponderCapture: () => false,

    // Claim only when clearly horizontal and swipe nav is enabled
    onMoveShouldSetPanResponder: (_, gs) => {
      if (disabled) return false;
      if (!swipeNavigation) return false;
      const { dx, dy } = gs;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      // Must have moved at least 10px horizontally and be 2x more horizontal than vertical
      return absDx > 10 && absDx > absDy * H_RATIO;
    },
    onMoveShouldSetPanResponderCapture: (_, gs) => {
      if (disabled) return false;
      if (!swipeNavigation) return false;
      const { dx, dy } = gs;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      return absDx > 10 && absDx > absDy * H_RATIO;
    },

    onPanResponderRelease: (_, gs) => {
      if (!swipeNavigation) return;
      const { dx, vx } = gs;
      const absDx = Math.abs(dx);
      const absVx = Math.abs(vx);

      // Both distance AND velocity must meet the threshold ? prevents accidental triggers
      if (absDx >= SWIPE_DISTANCE && absVx >= SWIPE_VELOCITY) {
        if (dx < 0) {
          onSwipeLeft?.();
        } else {
          onSwipeRight?.();
        }
      }
    },
    onPanResponderTerminate: () => {},
    onPanResponderTerminationRequest: () => true,
  });

  return panResponder.panHandlers;
}
