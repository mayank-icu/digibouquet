import React, { useRef, useEffect } from 'react';
import { View, TouchableOpacity, Image, Animated, PanResponder } from 'react-native';
import { X } from 'lucide-react-native';
import { getFlowerImage } from '../../../utils/bouquetData';
import * as Haptics from '../../../utils/haptics';

export const DraggableFlower = React.memo(({ flower, canvasWidth, canvasHeight, customArrangementMode, isSelected, onSelect, onMoveEnd, onRemove, reduceMotion, onDragStart, onDragEnd, isGoldenMode }: any) => {
  // Use a ref so PanResponder always reads the latest mode (fixes stale closure)
  const modeRef = useRef(customArrangementMode);
  useEffect(() => { modeRef.current = customArrangementMode; }, [customArrangementMode]);

  const flowerSize = canvasWidth * 0.22 * flower.scale;
  const initialX = (flower.x / 100) * canvasWidth - flowerSize / 2;
  const initialY = (flower.y / 100) * canvasHeight - flowerSize / 2;

  const pan = useRef(new Animated.ValueXY({ x: initialX, y: initialY })).current;
  const valRef = useRef({ x: initialX, y: initialY });
  useEffect(() => {
    const listener = pan.addListener(v => { valRef.current = v; });
    return () => pan.removeListener(listener);
  }, []);

  const prevPos = useRef({ x: flower.x, y: flower.y, scale: flower.scale });
  useEffect(() => {
    const tx = (flower.x / 100) * canvasWidth - flowerSize / 2;
    const ty = (flower.y / 100) * canvasHeight - flowerSize / 2;
    if (!reduceMotion && (prevPos.current.x !== flower.x || prevPos.current.y !== flower.y || prevPos.current.scale !== flower.scale)) {
      Animated.spring(pan, {
        toValue: { x: tx, y: ty },
        useNativeDriver: false,
        friction: 10,
        tension: 50,
      }).start();
    } else {
      pan.setValue({ x: tx, y: ty });
    }
    prevPos.current = { x: flower.x, y: flower.y, scale: flower.scale };
  }, [flower.x, flower.y, flower.scale, canvasWidth, canvasHeight, flowerSize]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !!modeRef.current,
      onStartShouldSetPanResponderCapture: () => !!modeRef.current,
      onMoveShouldSetPanResponder: () => !!modeRef.current,
      onMoveShouldSetPanResponderCapture: () => !!modeRef.current,
      onPanResponderGrant: () => {
        onSelect(flower);
        onDragStart?.();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        // Read the CURRENT pixel position directly — no async, no stale values
        const currentVal = (pan as any).__getValue();
        pan.setOffset({ x: currentVal.x, y: currentVal.y });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: (_e, _gs) => {
        pan.flattenOffset();
        const finalVal = (pan as any).__getValue();
        const centerX = finalVal.x + flowerSize / 2;
        const centerY = finalVal.y + flowerSize / 2;
        // Keep center within 12-88% so the flower body stays inside the canvas
        const newX = Math.max(12, Math.min(88, (centerX / canvasWidth) * 100));
        const newY = Math.max(12, Math.min(88, (centerY / canvasHeight) * 100));
        onMoveEnd(flower.uniqueId, newX, newY);
        onDragEnd?.();
      },
      onPanResponderTerminate: () => {
        pan.flattenOffset();
        onDragEnd?.();
      },
    })
  ).current;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        {
          position: 'absolute',
          left: pan.x,
          top: pan.y,
          width: flowerSize,
          height: flowerSize,
          zIndex: isSelected ? 100 : flower.zIndex,
          transform: [{ rotate: `${flower.rotation}deg` }],
          borderWidth: isSelected ? 2 : 0,
          borderColor: '#2d2d2d',
          borderStyle: 'dashed',
          borderRadius: flowerSize / 2,
        },
      ]}
    >
      {getFlowerImage(flower.id) ? (
        <>
          <View style={isGoldenMode ? { flex: 1, shadowColor: '#D4AF37', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 8 } : { flex: 1 }}>
            <Image source={getFlowerImage(flower.id)} style={{ width: '100%', height: '100%' }} resizeMode="contain" resizeMethod="resize" />
          </View>
        </>
      ) : <View style={{ width: '100%', height: '100%', backgroundColor: '#f0e8e4', borderRadius: flowerSize / 2 }} />}
      <TouchableOpacity style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(255,0,0,0.8)', alignItems: 'center', justifyContent: 'center', zIndex: 10 }} onPress={() => onRemove(flower.uniqueId)}>
        <X size={12} color="white" />
      </TouchableOpacity>
    </Animated.View>
  );
});
DraggableFlower.displayName = 'DraggableFlower';
