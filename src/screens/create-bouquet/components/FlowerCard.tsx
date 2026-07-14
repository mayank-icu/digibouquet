import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { X } from 'lucide-react-native';
import { CachedImage } from '../../../components/CachedImage';
import { getFlowerImage, FLOWER_GROUPS } from '../../../utils/bouquetData';
import { getFlowerTranslation } from '../../../flower-translations';

export const LazyFlowerImage = React.memo(({ imageId, style, isGoldenMode }: { imageId: string; style: any; isGoldenMode?: boolean }) => {
  return (
    <View style={[style, isGoldenMode && { shadowColor: '#D4AF37', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 10, elevation: 10 }]}>
      <CachedImage source={getFlowerImage(imageId)} style={{ width: '100%', height: '100%' }} resizeMode="contain" fadeDuration={150} />
    </View>
  );
});
LazyFlowerImage.displayName = 'LazyFlowerImage';

export const FlowerCard = React.memo(({ group, count, onAdd, onRemove, onViewMeaning, canAdd, locale, theme, isGoldenMode }: {
  group: typeof FLOWER_GROUPS[0];
  count: number;
  onAdd: (id: string) => void;
  onRemove: (colors: { id: string }[]) => void;
  onViewMeaning: (group: typeof FLOWER_GROUPS[0]) => void;
  canAdd: boolean;
  locale: string;
  theme: any;
  isGoldenMode?: boolean;
}) => {
  const translatedName = getFlowerTranslation(locale, group.colors[0].id)?.name || group.name;

  return (
    <View style={[styles.flowerCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
      <TouchableOpacity onPress={() => onViewMeaning(group)} activeOpacity={0.7}>
        <View style={styles.flowerImgWrapper}>
          <LazyFlowerImage imageId={group.colors[0].id} style={styles.flowerImg} isGoldenMode={isGoldenMode} />
          {count > 0 && <View style={styles.countBadge}><Text style={styles.countBadgeText}>{count}</Text></View>}
        </View>
      </TouchableOpacity>
      <Text style={[styles.flowerLabel, { color: theme.brand }]}>{translatedName}</Text>
      <View style={styles.flowerActionRow}>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: theme.brand }, !canAdd && styles.btnDisabled]} disabled={!canAdd} onPress={() => onAdd(group.colors[0].id)}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
        {group.colors.length > 1 && (
          <TouchableOpacity style={styles.colorBtn} onPress={() => onViewMeaning(group)}>
            <View style={[styles.colorDot, { backgroundColor: group.colors[0].hex, borderColor: theme.border }]} />
            <Text style={styles.colorBtnText}>{group.colors.length}</Text>
          </TouchableOpacity>
        )}
        {count > 0 && (
          <TouchableOpacity style={styles.removeBtn} onPress={() => onRemove(group.colors)}>
            <X size={16} color="white" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
});
FlowerCard.displayName = 'FlowerCard';

const styles = StyleSheet.create({
  flowerCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginHorizontal: 8,
    marginBottom: 16,
  },
  flowerImgWrapper: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  flowerImg: {
    width: 110,
    height: 110,
  },
  countBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#ff4444',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  countBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  flowerLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  flowerActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  colorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 4,
    borderWidth: 1,
  },
  colorBtnText: {
    fontSize: 12,
    color: '#666',
  },
  removeBtn: {
    backgroundColor: '#ff4444',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
