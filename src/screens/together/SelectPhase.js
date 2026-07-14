import { PremiumImage } from '../../components/PremiumImage';
import { HapticButton } from '../../components/HapticButton';
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  FlatList} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { FLOWER_GROUPS } from '../../utils/flowerAssets';

const MAX = 4;

export default function SelectPhase({ myFlowers, onSelect, onDeselect, onConfirm, confirmed, partnerConfirmed }) {
  const { theme: t } = useTheme();
  const [selectedColorIds, setSelectedColorIds] = useState({});

  const getCount = (id) => myFlowers.filter(f => (f.id || f) === id).length;

  return (
    <View style={{ flex: 1 }}>
      <View style={s.header}>
        <View style={s.slotRow}>

          {Array.from({ length: MAX }).map((_, i) => {
            const flower = myFlowers[i];
            const flowerImg = flower && flower.image ? flower.image : null;
            return (
              <View key={i} style={[s.slot, { borderColor: flower ? t.brand : t.border }]}>
                {flowerImg
                  ? <PremiumImage source={flowerImg} style={s.slotImg} resizeMode="contain" />
                  : <Feather name="plus" size={18} color={t.border} />
                }
              </View>
            );
          })}
          <Text style={[s.slotCount, { color: t.brand }]}>{myFlowers.length}/{MAX}</Text>
        </View>
      </View>

      <FlatList
        data={FLOWER_GROUPS}
        keyExtractor={g => g.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
        contentContainerStyle={{ paddingBottom: 120, paddingTop: 10, gap: 16 }}
        renderItem={({ item: group }) => {
          const activeColorId = selectedColorIds[group.id] || group.colors[0].id;
          const activeColorObj = group.colors.find(c => c.id === activeColorId) || group.colors[0];
          
          const count = getCount(activeColorObj.id);
          const fullOverall = myFlowers.length >= MAX;
          const fullLocal = count >= 2;
          const canAdd = !fullOverall && !fullLocal;

          return (
            <View style={[s.flowerCard, { backgroundColor: t.cardBg, borderColor: t.border }]}>
              <View style={s.flowerImgWrapper}>
                {activeColorObj.image && <PremiumImage source={activeColorObj.image} style={s.flowerImg} resizeMode="contain" />}
                {count > 0 && <View style={s.countBadge}><Text style={s.countBadgeText}>{count}</Text></View>}
              </View>
              <Text style={[s.flowerLabel, { color: t.brand }]} numberOfLines={1}>{group.name}</Text>
              
              <View style={s.flowerActionRow}>
                <HapticButton
                  style={[s.addBtn, !canAdd && s.btnDisabled]}
                  disabled={!canAdd}
                  onPress={() => onSelect({ id: activeColorObj.id, name: activeColorObj.name, image: activeColorObj.image, hex: activeColorObj.hex })}
                >
                  <Text style={s.addBtnText}>+ Add</Text>
                </HapticButton>
                {group.colors.length > 1 && (
                  <View style={s.colorBtn}>
                    <View style={[s.colorDot, { backgroundColor: activeColorObj.hex, borderColor: t.border }]} />
                    <Text style={s.colorBtnText}>{group.colors.length}</Text>
                  </View>
                )}
                {count > 0 && (
                  <HapticButton
                    style={s.removeBtn}
                    onPress={() => onDeselect({ id: activeColorObj.id })}
                  >
                    <Feather name="x" size={16} color="#fff" />
                  </HapticButton>
                )}
              </View>
              
              {group.colors.length > 1 && (
                <View style={s.cardColorRow}>
                  {group.colors.map(c => (
                    <HapticButton
                      key={c.id}
                      style={[
                        s.cardColorDot,
                        { backgroundColor: c.hex },
                        activeColorId === c.id && { borderWidth: 2, borderColor: t.brand, transform: [{ scale: 1.2 }] }
                      ]}
                      onPress={() => setSelectedColorIds(prev => ({ ...prev, [group.id]: c.id }))}
                    />
                  ))}
                </View>
              )}
            </View>
          );
        }}
      />

      <View style={[s.footer, { backgroundColor: t.bg, borderTopColor: t.border }]}>
        {partnerConfirmed && !confirmed && (
          <Text style={[s.partnerHint, { color: '#5BAD8E' }]}>✓ Partner is ready! Confirm your flowers.</Text>
        )}
        <HapticButton
          style={[s.confirmBtn, { backgroundColor: myFlowers.length === 0 ? t.border : t.brand }]}
          onPress={onConfirm}
          disabled={myFlowers.length === 0 || confirmed}
        >
          <Text style={s.confirmText}>
            {confirmed ? '✓ Waiting for partner…' : `Confirm ${myFlowers.length} Flower${myFlowers.length !== 1 ? 's' : ''}`}
          </Text>
        </HapticButton>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  title: { fontFamily: 'Manrope-Bold', fontSize: 20, marginBottom: 4 },
  sub: { fontFamily: 'Manrope-Regular', fontSize: 13, lineHeight: 18, marginBottom: 12 },
  slotRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  slot: {
    width: 52, height: 52, borderRadius: 14, borderWidth: 2,
    borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff',
  },
  slotImg: { width: 40, height: 40 },
  slotCount: { fontFamily: 'Manrope-Bold', fontSize: 15, marginLeft: 4 },
  flowerCard: { flex: 1, borderRadius: 12, padding: 8, borderWidth: 1, alignItems: 'center' },
  flowerImgWrapper: { width: '100%', aspectRatio: 1, position: 'relative', alignItems: 'center', justifyContent: 'center' },
  flowerImg: { width: '88%', height: '88%' },
  countBadge: { position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: '#7A5C58', alignItems: 'center', justifyContent: 'center' },
  countBadgeText: { color: 'white', fontSize: 12, fontWeight: '700' },
  flowerLabel: { textAlign: 'center', fontSize: 13, fontWeight: '600', marginVertical: 8, fontFamily: 'serif' },
  flowerActionRow: { flexDirection: 'row', gap: 6, alignItems: 'center', width: '100%' },
  addBtn: { flex: 1, backgroundColor: '#7A5C58', borderRadius: 6, paddingVertical: 8, alignItems: 'center' },
  addBtnText: { color: 'white', fontSize: 13, fontWeight: '600' },
  btnDisabled: { opacity: 0.5 },
  colorBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 2, borderColor: '#7A5C58', borderRadius: 6 },
  colorDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1 },
  colorBtnText: { fontSize: 13, fontWeight: '600', color: '#7A5C58' },
  removeBtn: { width: 34, height: 34, backgroundColor: '#e74c3c', borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  cardColorRow: { flexDirection: 'row', gap: 6, marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' },
  cardColorDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1, borderColor: '#ddd' },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 30,
    borderTopWidth: 1,
  },
  partnerHint: { fontFamily: 'Manrope-SemiBold', fontSize: 13, marginBottom: 8, textAlign: 'center' },
  confirmBtn: { borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  confirmText: { fontFamily: 'Manrope-Bold', fontSize: 16, color: '#fff' },
});
