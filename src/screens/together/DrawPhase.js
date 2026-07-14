import { HapticButton } from '../../components/HapticButton';
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import DrawingCanvas from '../DrawingCanvas';

const DrawPhase = React.forwardRef(({
  activeDrawFlower, setActiveDrawFlower,
  myStrokes, onStrokeComplete, onUndo, onRedo, onClear,
  myFlowers, done, partnerDone, onSaveFlower, onDone, drawnFlowers = {},
}, ref) => {
  const { theme: t } = useTheme();
  const [showHeader, setShowHeader] = useState(true);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>


        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabsRow}>
          {myFlowers.map((f, i) => {
            const id = f.id || f;
            const isActive = activeDrawFlower === id;
            const isSaved = !!drawnFlowers[id];
            return (
              <HapticButton
                key={`${id}-${i}`}
                style={[s.tabBtn, { 
                  backgroundColor: isActive ? t.brand : 'transparent',
                  borderColor: isActive ? t.brand : t.border 
                }]}
                onPress={async () => {
                  if (isActive) return;
                  if (myStrokes && myStrokes.length > 0) {
                    await onSaveFlower();
                  }
                  setActiveDrawFlower(id);
                }}
              >
                <Text style={[s.tabText, { color: isActive ? '#fff' : t.textMuted }]}>
                  Flower {i + 1} {isSaved ? '✅' : ''}
                </Text>
              </HapticButton>
            );
          })}
        </ScrollView>

        <DrawingCanvas
          ref={ref}
          strokes={myStrokes}
          onStrokeComplete={onStrokeComplete}
          onUndo={onUndo}
          onRedo={onRedo}
          onClear={onClear}
          tracingFlower={activeDrawFlower}
          myFlowers={myFlowers}
          readOnly={done}
        />
      </ScrollView>

      {!done && (
        <View style={[s.footer, { backgroundColor: t.bg, borderTopColor: t.border, paddingBottom: 30 }]}>
          {partnerDone && (
            <Text style={[s.partnerHint, { color: '#5BAD8E' }]}>Partner finished! Take your time.</Text>
          )}
          
          <View style={s.footerBtns}>
            <HapticButton
              style={[s.doneBtn, { backgroundColor: t.brand }]}
              onPress={async () => {
                if (myStrokes && myStrokes.length > 0) {
                  await onSaveFlower();
                }
                onDone();
              }}
            >
              <Text style={s.doneBtnText}>Finish All</Text>
              <Feather name="check" size={16} color="#fff" style={{ marginLeft: 6 }} />
            </HapticButton>
          </View>
        </View>
      )}
    </View>
  );
});

DrawPhase.displayName = 'DrawPhase';

export default DrawPhase;

const s = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 160 },
  headerWrap: { marginBottom: 12 },
  headerToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  title: { fontFamily: 'Manrope-Bold', fontSize: 20 },
  sub: { fontFamily: 'Manrope-Regular', fontSize: 13, lineHeight: 20, marginBottom: 12 },
  tip: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    borderWidth: 1, borderRadius: 12, padding: 10,
  },
  tipText: { fontFamily: 'Manrope-Regular', fontSize: 12, flex: 1, lineHeight: 17 },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1,
  },
  partnerHint: { fontFamily: 'Manrope-SemiBold', fontSize: 13, marginBottom: 8, textAlign: 'center' },
  footerBtns: { flexDirection: 'row', gap: 10 },
  saveBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 16, paddingVertical: 14,
  },
  saveBtnText: { fontFamily: 'Manrope-Bold', fontSize: 14, color: '#fff' },
  doneBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 16, paddingVertical: 14,
  },
  doneBtnText: { fontFamily: 'Manrope-Bold', fontSize: 14, color: '#fff' },
  tabsRow: { flexDirection: 'row', marginBottom: 14, flexGrow: 0 },
  tabBtn: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5, marginRight: 8,
  },
  tabText: { fontFamily: 'Manrope-SemiBold', fontSize: 13 },
});
