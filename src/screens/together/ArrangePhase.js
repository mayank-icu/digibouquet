import { PremiumImage } from '../../components/PremiumImage';
import { HapticButton } from '../../components/HapticButton';
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, PanResponder,
  ScrollView, Dimensions, Animated
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { getFlowerImage } from '../../utils/bouquetData';
import { X, RotateCcw, RotateCw, ChevronUp, ChevronDown, Shuffle } from 'lucide-react-native';
import * as Haptics from '../../utils/haptics';
import { CachedImage } from '../../components/CachedImage';

const { width: W } = Dimensions.get('window');
const BOARD_W = W - 32;
const BOARD_H = BOARD_W;

const DraggableFlower = React.memo(({ flower, canvasWidth, canvasHeight, customArrangementMode, isSelected, onSelect, onMoveEnd, reduceMotion, locked }) => {
  const modeRef = useRef(customArrangementMode);
  useEffect(() => { modeRef.current = customArrangementMode; }, [customArrangementMode]);

  const baseSize = flower.isCustom ? canvasWidth * 0.35 : canvasWidth * 0.22;
  const flowerSize = baseSize * flower.scale;
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
      onStartShouldSetPanResponder: () => modeRef.current && !locked,
      onMoveShouldSetPanResponder: () => modeRef.current && !locked,
      onPanResponderGrant: () => {
        if (locked) return;
        onSelect(flower);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const currentVal = pan.__getValue();
        pan.setOffset({ x: currentVal.x, y: currentVal.y });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: () => {
        pan.flattenOffset();
        const finalVal = pan.__getValue();
        const centerX = finalVal.x + flowerSize / 2;
        const centerY = finalVal.y + flowerSize / 2;
        const newX = Math.max(12, Math.min(88, (centerX / canvasWidth) * 100));
        const newY = Math.max(12, Math.min(88, (centerY / canvasHeight) * 100));
        onMoveEnd(flower.id, newX, newY);
      },
      onPanResponderTerminate: () => {
        pan.flattenOffset();
      },
    })
  ).current;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={{
        position: 'absolute', left: pan.x, top: pan.y, width: flowerSize, height: flowerSize,
        zIndex: flower.zIndex, transform: [{ rotate: `${flower.rotation}deg` }],
        borderWidth: isSelected ? 2 : 0, borderColor: '#2d2d2d', borderStyle: 'dashed', borderRadius: flowerSize / 2,
      }}
    >
      {flower.isUri ? (
        <CachedImage source={{ uri: flower.image }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
      ) : flower.image ? (
        <PremiumImage source={flower.image} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
      ) : (
        <View style={{ flex: 1, backgroundColor: '#f0e8e4', borderRadius: flowerSize / 2 }} />
      )}
      {flower.isDrawn && !flower.isCustom && (
        <View style={s.drawnBadge}><Text style={{ fontSize: 9 }}>✏️</Text></View>
      )}
    </Animated.View>
  );
});

DraggableFlower.displayName = 'DraggableFlower';

export default function ArrangePhase({
  myFlowers = [], partnerFlowers = [],
  myDrawingUrl, partnerDrawingUrl,
  drawnFlowers = {}, partnerDrawnFlowers = {},
  arrangement, onUpdateArrangement, onDone, done, partnerDone,
  partnerActionTimestamp, partnerActionLabel,
}) {
  const { theme: t } = useTheme();
  
  const [locked, setLocked] = useState(false);
  const [lockSecondsLeft, setLockSecondsLeft] = useState(0);
  const lockTimerRef = useRef(null);
  
  const [selectedFlowerForEdit, setSelectedFlowerForEdit] = useState(null);

  useEffect(() => {
    if (!partnerActionTimestamp) return;
    if (lockTimerRef.current) clearInterval(lockTimerRef.current);
    
    setLocked(true);
    setLockSecondsLeft(3);
    
    let secs = 3;
    lockTimerRef.current = setInterval(() => {
      secs -= 1;
      setLockSecondsLeft(secs);
      if (secs <= 0) {
        clearInterval(lockTimerRef.current);
        setLocked(false);
        setLockSecondsLeft(0);
      }
    }, 1000);

    return () => {
      if (lockTimerRef.current) clearInterval(lockTimerRef.current);
    };
  }, [partnerActionTimestamp]);

  const [items, setItems] = useState(() => {
    const allFlowers = [
      ...(myFlowers || []).map(f => ({ ...f, isMyFlower: true })),
      ...(partnerFlowers || []).map(f => ({ ...f, isMyFlower: false })),
    ];
    const list = allFlowers.map((f, i) => {
      const id = f.id || f;
      const flowerDrawnUrl = f.isMyFlower 
        ? drawnFlowers[id] 
        : (partnerDrawnFlowers?.[id] || drawnFlowers[id] || null);
      return {
        id: `flower_${id}_${i}`,
        flowerId: id,
        image: flowerDrawnUrl || getFlowerImage(id),
        isUri: !!flowerDrawnUrl,
        x: 20 + (i % 4) * 20,
        y: 20 + Math.floor(i / 4) * 20,
        scale: 1, rotation: 0, zIndex: 1,
        isCustom: false, isDrawn: !!flowerDrawnUrl, isMyFlower: f.isMyFlower,
      };
    });

    if (myDrawingUrl) {
      list.push({
        id: 'my_custom_drawing', flowerId: 'my_custom', image: myDrawingUrl, isUri: true,
        x: 33, y: 50, scale: 1, rotation: 0, zIndex: 1, isCustom: true, isDrawn: true, isMyFlower: true,
      });
    }
    if (partnerDrawingUrl) {
      list.push({
        id: 'partner_custom_drawing', flowerId: 'partner_custom', image: partnerDrawingUrl, isUri: true,
        x: 66, y: 50, scale: 1, rotation: 0, zIndex: 1, isCustom: true, isDrawn: true, isMyFlower: false,
      });
    }

    return list;
  });

  useEffect(() => {
    setItems(prevItems => prevItems.map(item => {
      if (item.isCustom) return item;
      const flowerDrawnUrl = item.isMyFlower 
        ? drawnFlowers[item.flowerId] 
        : (partnerDrawnFlowers?.[item.flowerId] || drawnFlowers[item.flowerId] || null);
      
      if (flowerDrawnUrl && item.image !== flowerDrawnUrl) {
        return {
          ...item,
          image: flowerDrawnUrl,
          isUri: true,
          isDrawn: true,
        };
      }
      return item;
    }));
  }, [drawnFlowers, partnerDrawnFlowers]);

  useEffect(() => {
    if (arrangement && arrangement.length > 0) {
      setItems(prevItems => {
        const itemMap = new Map(prevItems.map(it => [it.id, it]));
        arrangement.forEach(arrItem => {
          if (itemMap.has(arrItem.id)) {
            itemMap.set(arrItem.id, { ...itemMap.get(arrItem.id), ...arrItem });
          }
        });
        return Array.from(itemMap.values());
      });
    }
  }, [arrangement]);

  const handleMoveEnd = (id, newX, newY) => {
    setItems(prev => {
      const next = prev.map(it => it.id === id ? { ...it, x: newX, y: newY } : it);
      onUpdateArrangement?.(next);
      return next;
    });
  };

  const adjustFlowerProp = (id, prop, delta) => {
    if (locked) return;
    setItems(prev => {
      const next = prev.map(f => {
        if (f.id === id) {
          let val = f[prop] + delta;
          if (prop === 'scale') val = Math.max(0.5, Math.min(2.5, val));
          if (prop === 'zIndex') val = Math.max(0, Math.min(100, val));
          return { ...f, [prop]: val };
        }
        return f;
      });
      onUpdateArrangement?.(next);
      return next;
    });
  };

  const handleShuffle = () => {
    if (locked) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setItems(prev => {
      const next = prev.map(f => ({
        ...f,
        x: 15 + Math.random() * 70,
        y: 15 + Math.random() * 70,
        rotation: Math.floor(Math.random() * 360),
        zIndex: Math.floor(Math.random() * 10),
      }));
      onUpdateArrangement?.(next);
      return next;
    });
  };

  const boardTouchResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderRelease: () => setSelectedFlowerForEdit(null),
    })
  ).current;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        
        {/* Board */}
        <View style={{ position: 'relative' }}>
          <View
            style={[s.board, { borderColor: t.border }]}
            {...boardTouchResponder.panHandlers}
          >
            {items.map(item => (
              <DraggableFlower
                key={item.id}
                flower={item}
                canvasWidth={BOARD_W}
                canvasHeight={BOARD_H}
                customArrangementMode={true}
                isSelected={selectedFlowerForEdit?.id === item.id}
                onSelect={setSelectedFlowerForEdit}
                onMoveEnd={handleMoveEnd}
                reduceMotion={false}
                locked={locked}
              />
            ))}

            {items.length === 0 && (
              <View style={s.emptyBoard}>
                <Text style={[s.emptyText, { color: t.border }]}>Your flowers will appear here</Text>
              </View>
            )}

            {/* Lock overlay */}
            {locked && (
              <View style={s.lockOverlay}>
                <View style={[s.lockBox, { backgroundColor: t.cardBg }]}>
                  <Text style={s.lockEmoji}>🔒</Text>
                  <Text style={[s.lockText, { color: t.text }]}>
                    {partnerActionLabel ? `${partnerActionLabel}` : 'Partner is arranging…'}
                  </Text>
                  <Text style={[s.lockSecs, { color: t.brand }]}>Locked for {lockSecondsLeft}s</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        <View style={s.toolsRow}>
          <HapticButton style={s.shuffleBtn} onPress={handleShuffle}>
            <Shuffle size={18} color="#7A5C58" />
            <Text style={s.shuffleBtnText}>Shuffle Arrangement</Text>
          </HapticButton>
        </View>

        {selectedFlowerForEdit && (
          <View style={s.editControls}>
            <View style={s.editRow}>
              <HapticButton style={s.editBtn} onPress={() => adjustFlowerProp(selectedFlowerForEdit.id, 'scale', -0.1)}>
                <Text style={s.editBtnText}>-</Text>
              </HapticButton>
              <Text style={s.editLabel}>Size</Text>
              <HapticButton style={s.editBtn} onPress={() => adjustFlowerProp(selectedFlowerForEdit.id, 'scale', 0.1)}>
                <Text style={s.editBtnText}>+</Text>
              </HapticButton>
            </View>

            <View style={s.editRow}>
              <HapticButton style={s.editBtn} onPress={() => adjustFlowerProp(selectedFlowerForEdit.id, 'rotation', -15)}>
                <RotateCcw size={16} color="#7A5C58" />
              </HapticButton>
              <Text style={s.editLabel}>Rotate</Text>
              <HapticButton style={s.editBtn} onPress={() => adjustFlowerProp(selectedFlowerForEdit.id, 'rotation', 15)}>
                <RotateCw size={16} color="#7A5C58" />
              </HapticButton>
            </View>

            <View style={s.editRow}>
              <HapticButton style={s.editBtn} onPress={() => adjustFlowerProp(selectedFlowerForEdit.id, 'zIndex', -1)}>
                <ChevronDown size={16} color="#7A5C58" />
              </HapticButton>
              <Text style={s.editLabel}>Layer</Text>
              <HapticButton style={s.editBtn} onPress={() => adjustFlowerProp(selectedFlowerForEdit.id, 'zIndex', 1)}>
                <ChevronUp size={16} color="#7A5C58" />
              </HapticButton>
            </View>
          </View>
        )}

        <View style={s.statusRow}>
          <View style={[s.badge, { backgroundColor: done ? '#5BAD8E22' : t.border + '44' }]}>
            <Text style={[s.badgeText, { color: done ? '#5BAD8E' : t.textMuted }]}>
              {done ? "✓ You're done" : "You're arranging…"}
            </Text>
          </View>
          <View style={[s.badge, { backgroundColor: partnerDone ? '#5BAD8E22' : t.border + '44' }]}>
            <Text style={[s.badgeText, { color: partnerDone ? '#5BAD8E' : t.textMuted }]}>
              {partnerDone ? "✓ Partner done" : "Partner arranging…"}
            </Text>
          </View>
        </View>
      </ScrollView>

      {!done && (
        <View style={[s.footer, { backgroundColor: t.bg, borderTopColor: t.border }]}>
          {partnerDone && (
            <Text style={[s.partnerHint, { color: '#5BAD8E' }]}>Partner is ready! Confirm your arrangement.</Text>
          )}
          <HapticButton style={[s.doneBtn, { backgroundColor: t.brand }]} onPress={onDone}>
            <Text style={s.doneBtnText}>Happy with this!</Text>
            <Feather name="check" size={18} color="#fff" style={{ marginLeft: 8 }} />
          </HapticButton>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 120 },
  board: {
    width: BOARD_W, height: BOARD_H, borderRadius: 6, borderWidth: 1.5,
    backgroundColor: '#FFFDF9', position: 'relative', overflow: 'hidden',
    alignSelf: 'center', marginBottom: 16,
  },
  drawnBadge: {
    position: 'absolute', top: -4, right: -4, width: 18, height: 18,
    borderRadius: 9, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, elevation: 2,
  },
  emptyBoard: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontFamily: 'Manrope-Regular', fontSize: 14 },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 100, borderRadius: 6,
  },
  lockBox: {
    borderRadius: 16, paddingHorizontal: 24, paddingVertical: 16,
    alignItems: 'center', gap: 4,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
  },
  lockEmoji: { fontSize: 28, marginBottom: 4 },
  lockText: { fontFamily: 'Manrope-SemiBold', fontSize: 14, textAlign: 'center' },
  lockSecs: { fontFamily: 'Manrope-Bold', fontSize: 13, marginTop: 2 },
  toolsRow: {
    flexDirection: 'row', justifyContent: 'center', marginBottom: 16,
  },
  shuffleBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#FFF5F0', borderRadius: 20, borderWidth: 1, borderColor: '#EAD5CC',
  },
  shuffleBtnText: {
    color: '#7A5C58', fontFamily: 'Manrope-Bold', fontSize: 14,
  },
  editControls: {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
    backgroundColor: '#FFF5F0', borderRadius: 12, padding: 12, marginBottom: 16,
    borderWidth: 1, borderColor: '#EAD5CC',
  },
  editRow: { alignItems: 'center', gap: 4 },
  editBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#EAD5CC' },
  editBtnText: { fontSize: 18, color: '#7A5C58', fontWeight: '500', marginTop: -2 },
  editLabel: { fontSize: 12, color: '#7A5C58', fontWeight: '600' },
  statusRow: { flexDirection: 'row', gap: 10 },
  badge: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  badgeText: { fontFamily: 'Manrope-SemiBold', fontSize: 12 },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20, borderTopWidth: 1,
  },
  partnerHint: { fontFamily: 'Manrope-SemiBold', fontSize: 13, marginBottom: 8, textAlign: 'center' },
  doneBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 16, paddingVertical: 15,
  },
  doneBtnText: { fontFamily: 'Manrope-Bold', fontSize: 16, color: '#fff' },
});
