import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CachedImage } from '../../../components/CachedImage';
import { getFlowerImage, FLOWER_GROUPS } from '../../../utils/bouquetData';
import { getFlowerTranslation } from '../../../flower-translations';
import { HapticButton } from '../../../components/HapticButton';
import Animated, { FadeIn, FadeOut, LinearTransition, ZoomIn, ZoomOut } from 'react-native-reanimated';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

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
      {group.colors.length > 1 && (
        <TouchableOpacity style={[styles.colorPillTopLeft, { backgroundColor: theme.surface2, borderColor: theme.border }]} onPress={() => onViewMeaning(group)}>
          <View style={[styles.colorDotTopLeft, { backgroundColor: group.colors[0].hex }]} />
          <Text style={[styles.colorTextTopLeft, { color: theme.text }]}>{group.colors.length}</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity onPress={() => onViewMeaning(group)} activeOpacity={0.7}>
        <View style={styles.flowerImgWrapper}>
          <LazyFlowerImage imageId={group.colors[0].id} style={styles.flowerImg} isGoldenMode={isGoldenMode} />
        </View>
      </TouchableOpacity>
      <Text style={[styles.flowerLabel, { color: theme.brand }]}>{translatedName}</Text>
      <Animated.View style={styles.flowerActionRow} layout={LinearTransition.springify()}>
        {count > 0 ? (
          <Animated.View 
            style={[styles.stepperContainer, { backgroundColor: theme.surface2, borderColor: theme.border }]}
            entering={FadeIn}
            exiting={FadeOut}
            layout={LinearTransition.springify()}
          >
            <HapticButton 
              style={styles.stepperActionBtn} 
              onPress={() => onRemove(group.colors)}
              activeOpacity={0.7}
            >
              <Text style={[styles.stepperActionText, { color: theme.text }]}>−</Text>
            </HapticButton>
            
            <View style={styles.stepperCountWrapper}>
              <Animated.Text 
                key={count} 
                entering={ZoomIn.springify()} 
                exiting={ZoomOut.springify()} 
                style={[styles.stepperCountText, { color: theme.text, position: 'absolute' }]}
              >
                {count}
              </Animated.Text>
            </View>
            
            <HapticButton 
              style={[styles.stepperActionBtn, !canAdd && styles.btnDisabled]} 
              disabled={!canAdd} 
              onPress={() => onAdd(group.colors[0].id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.stepperActionText, { color: theme.text }]}>+</Text>
            </HapticButton>
          </Animated.View>
        ) : (
          <AnimatedTouchableOpacity 
            style={[styles.stepperAddBtn, { backgroundColor: theme.brand }, !canAdd && styles.btnDisabled]} 
            disabled={!canAdd} 
            onPress={() => onAdd(group.colors[0].id)}
            activeOpacity={0.8}
            entering={FadeIn}
            exiting={FadeOut}
            layout={LinearTransition.springify()}
          >
            <Text style={styles.stepperAddBtnText}>+ Add</Text>
          </AnimatedTouchableOpacity>
        )}
      </Animated.View>
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
    alignSelf: 'stretch',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  colorPillTopLeft: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  colorDotTopLeft: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  colorTextTopLeft: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Manrope-SemiBold',
  },
  stepperContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'stretch',
    overflow: 'hidden',
  },
  stepperActionBtn: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperActionText: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Manrope-Bold',
  },
  stepperCountWrapper: {
    width: 24,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperCountText: {
    fontSize: 14,
    fontFamily: 'Manrope-Bold',
    fontWeight: 'bold',
  },
  stepperAddBtn: {
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    flex: 1,
  },
  stepperAddBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Manrope-Bold',
    fontWeight: 'bold',
  },
});
