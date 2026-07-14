import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, StyleSheet } from 'react-native';
import Modal from 'react-native-modal';
import { getFlowerImage } from '../../../../utils/bouquetData';
import { Plus } from 'lucide-react-native';

export const FlowerMeaningModal = ({
  viewingMeaning,
  themeColors,
  insets,
  SCREEN_H,
  styles,
  meaningOverlay,
  meaningSlideAnim,
  meaningPanY,
  meaningPanHandlers,
  onMeaningScroll,
  onClose,
  selectedFlowers,
  handleFlowerAdd,
}: any) => {
  const [scrollOffset, setScrollOffset] = useState(0);
  const scrollViewRef = useRef(null);

  const handleOnScroll = (event: any) => {
    setScrollOffset(event.nativeEvent.contentOffset.y);
    if (onMeaningScroll) onMeaningScroll(event);
  };

  const handleScrollTo = (p: any) => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: p, animated: true });
    }
  };
  return (
    <Modal
      isVisible={!!viewingMeaning}
      onSwipeComplete={onClose}
      swipeDirection="down"
      propagateSwipe={true}
      scrollTo={handleScrollTo}
      scrollOffset={scrollOffset}
      scrollOffsetMax={100} // Trigger swipe down when near top
      onBackdropPress={onClose}
      style={{ margin: 0, justifyContent: 'flex-end' }}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      backdropOpacity={0.55}
      useNativeDriverForBackdrop
    >
      <View
        style={[
          styles.modalBox,
          {
            paddingBottom: insets.bottom + 16,
            backgroundColor: themeColors.cardBg,
            maxHeight: SCREEN_H * 0.9,
          },
        ]}
      >
        {/* Drag handle */}
        <View style={{ alignItems: 'center', paddingVertical: 14, marginTop: -8 }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: themeColors.border }} />
        </View>

        {viewingMeaning && (
          <ScrollView
            ref={scrollViewRef}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
            scrollEventThrottle={16}
            onScroll={handleOnScroll}
            bounces={false}
          >
              {viewingMeaning.colors.length === 1 && getFlowerImage(viewingMeaning.colors[0].id) && (
                <View style={{ position: 'relative', alignItems: 'center' }}>
                  <Image source={getFlowerImage(viewingMeaning.colors[0].id)} style={styles.meaningImg} resizeMode="contain" />
                  {(() => {
                    const cnt = selectedFlowers.filter((f: any) => f.id === viewingMeaning.colors[0].id).length;
                    return cnt > 0 ? (
                      <View style={[styles.countBadge, { position: 'absolute', top: 8, right: '30%' }]}>
                        <Text style={styles.countBadgeText}>{cnt}</Text>
                      </View>
                    ) : null;
                  })()}
                </View>
              )}
              
              <Text style={[styles.meaningTitle, { color: themeColors.brand }]}>{viewingMeaning.name}</Text>
              
              <View style={{ paddingHorizontal: 24, marginTop: 12 }}>
                <View style={[styles.meaningRow, { backgroundColor: themeColors.surface }]}>
                  <Text style={[styles.meaningLabel, { color: themeColors.textMuted }]}>Meaning</Text>
                  <Text style={[styles.meaningValue, { color: themeColors.text }]}>{viewingMeaning.meaning}</Text>
                </View>
                <View style={[styles.meaningRow, { backgroundColor: themeColors.surface }]}>
                  <Text style={[styles.meaningLabel, { color: themeColors.textMuted }]}>Purpose</Text>
                  <Text style={[styles.meaningValue, { color: themeColors.text }]}>{viewingMeaning.purpose}</Text>
                </View>
                {viewingMeaning.bestFor && (
                  <View style={[styles.meaningRow, { backgroundColor: themeColors.surface }]}>
                    <Text style={[styles.meaningLabel, { color: themeColors.textMuted }]}>Best For</Text>
                    <Text style={[styles.meaningValue, { color: themeColors.text }]}>{viewingMeaning.bestFor}</Text>
                  </View>
                )}
              </View>

              {viewingMeaning.colors.length > 1 ? (
                <View style={{ paddingHorizontal: 24, marginTop: 24 }}>
                  <Text style={{ fontFamily: 'Manrope-Bold', fontSize: 16, color: themeColors.brand, marginBottom: 12 }}>Select a Color</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                    {viewingMeaning.colors.map((color: any) => {
                      const count = selectedFlowers.filter((f: any) => f.id === color.id).length;
                      return (
                        <TouchableOpacity
                          key={color.id}
                          style={[
                            styles.colorVariantCard,
                            { backgroundColor: themeColors.surface, borderColor: themeColors.border, flex: 1, minWidth: '45%' },
                          ]}
                          onPress={() => handleFlowerAdd(color.id)}
                        >
                          {getFlowerImage(color.id) && (
                            <Image source={getFlowerImage(color.id)} style={{ width: 60, height: 60, marginBottom: 8 }} resizeMode="contain" />
                          )}
                          <Text style={{ fontFamily: 'Manrope-SemiBold', fontSize: 14, color: themeColors.text, textAlign: 'center' }}>{color.name}</Text>
                          <Text style={{ fontFamily: 'Manrope-Regular', fontSize: 11, color: themeColors.textMuted, textAlign: 'center', marginTop: 4 }}>{color.meaning}</Text>
                          {count > 0 && (
                            <View style={styles.countBadge}>
                              <Text style={styles.countBadgeText}>{count}</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ) : (
                <View style={{ paddingHorizontal: 24, marginTop: 24 }}>
                  <TouchableOpacity
                    style={[styles.addBtn, { backgroundColor: themeColors.brand }]}
                    onPress={() => handleFlowerAdd(viewingMeaning.colors[0].id)}
                  >
                    <Plus size={20} color="#fff" />
                    <Text style={styles.addBtnText}>Add to Bouquet</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
        )}
      </View>
    </Modal>
  );
};
