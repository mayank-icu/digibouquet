import { PremiumImage } from '../components/PremiumImage';
import { HapticButton } from '../components/HapticButton';
import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View, PanResponder, StyleSheet, TouchableOpacity, Text,
  ScrollView, Dimensions, Platform, TextInput, Modal} from 'react-native';
import Svg, { Path, G } from 'react-native-svg';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { getFlowerImage } from '../utils/bouquetData';
import ViewShot from 'react-native-view-shot';

const { width: W } = Dimensions.get('window');
const CANVAS_W = W - 40;
const CANVAS_H = CANVAS_W * 1.0;

const COLOURS = [
  '#E63946','#F4A261','#E9C46A','#2A9D8F','#457B9D',
  '#9B5DE5','#F15BB5','#5C4844','#2D2D2D','#FFFFFF',
];
const BRUSHES = [
  { id: 'pen',   icon: 'edit-2',   label: 'Pen',    opacity: 1.0 },
  { id: 'brush', icon: 'feather',  label: 'Brush',  opacity: 0.7 },
  { id: 'marker',icon: 'minus',    label: 'Marker', opacity: 0.4 },
  { id: 'eraser',icon: 'delete',   label: 'Eraser', opacity: 1.0 },
];
const SIZES = [3, 6, 10, 16];

function pointsToPath(points) {
  if (!points || points.length < 2) return '';
  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L${points[i].x},${points[i].y}`;
  }
  return d;
}

const DrawingCanvas = React.forwardRef(({
  strokes = [],
  onStrokeComplete,
  onUndo,
  onRedo,
  onClear,
  tracingFlower = null,
  readOnly = false,
}, ref) => {
  const { theme: t } = useTheme();
  const [colour, setColour] = useState('#E63946');
  const [brushId, setBrushId] = useState('pen');
  const [size, setSize] = useState(6);
  const [tracingMode, setTracingMode] = useState('ref'); // 'ref' | 'trace'
  const [currentStroke, setCurrentStroke] = useState(null);
  const [showCustomColor, setShowCustomColor] = useState(false);
  const [customHex, setCustomHex] = useState('#');
  const currentPoints = useRef([]);
  const isDrawing = useRef(false);

  const brush = BRUSHES.find(b => b.id === brushId);

  const colourRef = useRef(colour);
  useEffect(() => { colourRef.current = colour; }, [colour]);

  const sizeRef = useRef(size);
  useEffect(() => { sizeRef.current = size; }, [size]);

  const brushRef = useRef(brush);
  useEffect(() => { brushRef.current = brush; }, [brush]);
  const currentPathRef = useRef(null);

  const onStrokeCompleteRef = useRef(onStrokeComplete);
  useEffect(() => { onStrokeCompleteRef.current = onStrokeComplete; }, [onStrokeComplete]);

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => !readOnly,
    onMoveShouldSetPanResponder: () => !readOnly,
    onPanResponderGrant: (e) => {
      const { locationX, locationY } = e.nativeEvent;
      isDrawing.current = true;
      currentPoints.current = [{ x: locationX, y: locationY }];
      setCurrentStroke({ 
        points: currentPoints.current, 
        colour: brushRef.current?.id === 'eraser' ? '#FFFFFF' : colourRef.current, 
        size: sizeRef.current, 
        opacity: brushRef.current?.opacity ?? 1 
      });
    },
    onPanResponderMove: (e) => {
      if (!isDrawing.current) return;
      const { locationX, locationY } = e.nativeEvent;
      currentPoints.current.push({ x: locationX, y: locationY });
      
      // Update the current path natively to avoid expensive React re-renders, causing lag.
      if (currentPathRef.current) {
        currentPathRef.current.setNativeProps({
          d: pointsToPath(currentPoints.current)
        });
      } else {
        // Fallback to React state if ref isn't available
        setCurrentStroke({ 
          points: [...currentPoints.current], 
          colour: brushRef.current?.id === 'eraser' ? '#FFFFFF' : colourRef.current, 
          size: sizeRef.current, 
          opacity: brushRef.current?.opacity ?? 1 
        });
      }
    },
    onPanResponderRelease: () => {
      if (!isDrawing.current) return;
      isDrawing.current = false;
      if (currentPoints.current.length > 1) {
        onStrokeCompleteRef.current?.({
          points: [...currentPoints.current],
          colour: brushRef.current?.id === 'eraser' ? '#FFFFFF' : colourRef.current,
          size: sizeRef.current,
          brushId: brushRef.current?.id,
          opacity: brushRef.current?.opacity ?? 1,
        });
      }
      currentPoints.current = [];
      setCurrentStroke(null);
    },
  })).current;

  const tracingImg = tracingFlower ? getFlowerImage(tracingFlower) : null;

  return (
    <View style={styles.root}>
      {/* ── Canvas ── */}
      <ViewShot ref={ref} options={{ format: 'png', quality: 0.6 }} style={[styles.canvasWrap, { backgroundColor: '#fff', borderColor: t.border }]}>
        {/* Tracing image */}
        {tracingImg && (
          <PremiumImage
            source={tracingImg}
            style={tracingMode === 'ref' ? styles.tracingImgRef : styles.tracingImgTrace}
            resizeMode="contain"
            pointerEvents="none"
          />
        )}

        <Svg
          width={CANVAS_W}
          height={CANVAS_H}
          style={StyleSheet.absoluteFill}
          {...panResponder.panHandlers}
        >
          <G>
            {strokes.map((stroke, i) => (
              <Path
                key={i}
                d={pointsToPath(stroke.points)}
                stroke={stroke.colour}
                strokeWidth={stroke.size}
                strokeOpacity={stroke.opacity ?? 1}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            ))}
            {currentStroke && (
              <Path
                ref={currentPathRef}
                d={pointsToPath(currentStroke.points)}
                stroke={currentStroke.colour}
                strokeWidth={currentStroke.size}
                strokeOpacity={currentStroke.opacity ?? 1}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            )}
          </G>
        </Svg>

        {strokes.length === 0 && (
          <View style={styles.canvasHint} pointerEvents="none">
            <Text style={styles.canvasHintText}>Draw here ✏️</Text>
          </View>
        )}
      </ViewShot>

      {/* ── Toolbar row ── */}
      <View style={styles.toolbar}>
        {/* Undo */}
        <HapticButton style={[styles.toolBtn, { borderColor: t.border }]} onPress={onUndo}>
          <Feather name="corner-up-left" size={18} color={t.text} />
        </HapticButton>
        {/* Redo */}
        <HapticButton style={[styles.toolBtn, { borderColor: t.border }]} onPress={onRedo}>
          <Feather name="corner-up-right" size={18} color={t.text} />
        </HapticButton>
        {/* Clear */}
        <HapticButton style={[styles.toolBtn, { borderColor: t.border }]} onPress={onClear}>
          <MaterialCommunityIcons name="eraser" size={18} color="#E63946" />
        </HapticButton>
        {/* Mode toggle */}
        {tracingFlower && (
          <HapticButton
            style={[styles.toolBtn, { borderColor: t.border, width: 'auto', paddingHorizontal: 10 }]}
            onPress={() => setTracingMode(m => m === 'ref' ? 'trace' : 'ref')}
          >
            <Text style={{ fontFamily: 'Manrope-SemiBold', fontSize: 12, color: t.text }}>
              {tracingMode === 'ref' ? 'Reference' : 'Trace'}
            </Text>
          </HapticButton>
        )}
      </View>

      {/* ── Colour palette ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerRow} contentContainerStyle={{ gap: 8, paddingHorizontal: 4 }}>
        {COLOURS.map(c => (
          <HapticButton
            key={c}
            onPress={() => setColour(c)}
            style={[
              styles.colourDot,
              { backgroundColor: c, borderColor: c === colour ? t.brand : '#ccc', borderWidth: c === colour ? 3 : 1.5 },
              c === '#FFFFFF' && { shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 2, elevation: 2 },
            ]}
          />
        ))}
        {/* Custom colour picker button */}
        <HapticButton
          onPress={() => { setCustomHex(colour); setShowCustomColor(true); }}
          style={[
            styles.colourDot, styles.customColorBtn,
            { borderColor: !COLOURS.includes(colour) ? t.brand : '#ccc', borderWidth: !COLOURS.includes(colour) ? 3 : 1.5 },
            !COLOURS.includes(colour) && { backgroundColor: colour }
          ]}
        >
          {COLOURS.includes(colour) ? (
            <Text style={{ fontSize: 16, lineHeight: 20 }}>🎨</Text>
          ) : (
            <View style={[styles.customColorInner, { backgroundColor: colour }]} />
          )}
        </HapticButton>
      </ScrollView>

      {/* Custom color input modal */}
      <Modal visible={showCustomColor} transparent animationType="fade">
        <HapticButton
          style={styles.customColorOverlay}
          activeOpacity={1}
          onPress={() => setShowCustomColor(false)}
        >
          <View style={[styles.customColorCard, { backgroundColor: t.cardBg ?? '#fff' }]}>
            <Text style={[styles.customColorTitle, { color: t.text ?? '#333' }]}>Custom Color</Text>
            <View style={styles.customColorPreviewRow}>
              <View style={[styles.customColorPreview, { backgroundColor: /^#([0-9A-F]{3}){1,2}$/i.test(customHex) ? customHex : '#ccc' }]} />
              <TextInput
                style={[styles.customColorInput, { borderColor: t.border ?? '#ddd', color: t.text ?? '#333' }]}
                value={customHex}
                onChangeText={setCustomHex}
                placeholder="#E63946"
                placeholderTextColor="#999"
                autoCapitalize="characters"
                maxLength={7}
              />
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              {['#FF6B6B','#4ECDC4','#45B7D1','#96CEB4','#FFEAA7','#DDA0DD','#FF8C42','#6C5CE7'].map(c => (
                <HapticButton
                  key={c}
                  style={[styles.colourDot, { backgroundColor: c, borderWidth: customHex === c ? 3 : 1.5, borderColor: customHex === c ? t.brand ?? '#888' : '#ccc' }]}
                  onPress={() => setCustomHex(c)}
                />
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <HapticButton
                style={[styles.customColorBtn2, { backgroundColor: t.border ?? '#ddd' }]}
                onPress={() => setShowCustomColor(false)}
              >
                <Text style={{ fontFamily: 'Manrope-SemiBold', fontSize: 14, color: t.text ?? '#333' }}>Cancel</Text>
              </HapticButton>
              <HapticButton
                style={[styles.customColorBtn2, { backgroundColor: t.brand ?? '#888', flex: 1 }]}
                onPress={() => {
                  if (/^#([0-9A-F]{3}){1,2}$/i.test(customHex)) {
                    setColour(customHex);
                  }
                  setShowCustomColor(false);
                }}
              >
                <Text style={{ fontFamily: 'Manrope-Bold', fontSize: 14, color: '#fff' }}>Apply Color</Text>
              </HapticButton>
            </View>
          </View>
        </HapticButton>
      </Modal>

      {/* ── Brush & size ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.brushRowContainer} style={{ marginTop: 10 }}>
        <View style={styles.brushRow}>
          {BRUSHES.map(b => (
            <HapticButton
              key={b.id}
              style={[styles.brushBtn, { borderColor: b.id === brushId ? t.brand : t.border, backgroundColor: b.id === brushId ? t.brand + '18' : 'transparent' }]}
              onPress={() => setBrushId(b.id)}
            >
              <Feather name={b.icon} size={15} color={b.id === brushId ? t.brand : t.textMuted} />
              <Text style={[styles.brushLabel, { color: b.id === brushId ? t.brand : t.textMuted }]}>{b.label}</Text>
            </HapticButton>
          ))}
          <View style={styles.sizeRow}>
            {SIZES.map(s => (
              <HapticButton key={s} onPress={() => setSize(s)} style={styles.sizePad}>
                <View style={[styles.sizeDot, {
                  width: s * 2.2, height: s * 2.2, borderRadius: s * 1.1,
                  backgroundColor: brushId === 'eraser' ? '#ccc' : colour,
                  opacity: size === s ? 1 : 0.35,
                }]} />
              </HapticButton>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
});

export default DrawingCanvas;

const styles = StyleSheet.create({
  root: { width: '100%' },
  canvasWrap: {
    width: CANVAS_W, height: CANVAS_H,
    borderRadius: 16, borderWidth: 1.5,
    overflow: 'hidden', alignSelf: 'center',
    position: 'relative',
  },
  tracingImgRef: {
    position: 'absolute', top: 8, right: 8,
    width: 72, height: 72, opacity: 0.5, zIndex: 1,
  },
  tracingImgTrace: {
    position: 'absolute', top: 0, left: 0,
    width: CANVAS_W, height: CANVAS_H, opacity: 0.2, zIndex: 0,
  },
  canvasHint: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
  },
  canvasHintText: { fontFamily: 'Manrope-Regular', fontSize: 15, color: '#ccc' },
  toolbar: { flexDirection: 'row', gap: 8, paddingHorizontal: 4, marginTop: 10 },
  toolBtn: {
    width: 40, height: 40, borderRadius: 12, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  pickerRow: { marginTop: 10, flexGrow: 0 },
  tracingChip: {
    width: 44, height: 44, borderRadius: 12, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff',
  },
  colourDot: { width: 30, height: 30, borderRadius: 15 },
  brushRowContainer: { paddingHorizontal: 4, paddingBottom: 8 },
  brushRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  brushBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, borderWidth: 1.5,
  },
  brushLabel: { fontFamily: 'Manrope-SemiBold', fontSize: 11 },
  sizeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 8 },
  sizePad: { padding: 4, alignItems: 'center', justifyContent: 'center' },
  sizeDot: {},
  customColorBtn: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  customColorInner: { width: 24, height: 24, borderRadius: 12 },
  customColorOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  customColorCard: {
    width: '100%', borderRadius: 20, padding: 20,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
  },
  customColorTitle: { fontFamily: 'Manrope-Bold', fontSize: 16, marginBottom: 14 },
  customColorPreviewRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  customColorPreview: { width: 48, height: 48, borderRadius: 12, borderWidth: 1.5, borderColor: '#ccc' },
  customColorInput: {
    flex: 1, borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: 10, fontFamily: 'Manrope-SemiBold', fontSize: 16,
  },
  customColorBtn2: {
    paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, alignItems: 'center',
  },
});
