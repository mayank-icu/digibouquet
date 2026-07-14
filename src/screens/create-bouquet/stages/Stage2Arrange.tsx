import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, StyleSheet } from 'react-native';
import { X, Shuffle, Move, Lock, ChevronDown, ChevronUp, Image as ImageIcon, Layers, RotateCcw, RotateCw, Plus } from 'lucide-react-native';
import { getFlowerImage, BG_IMAGES } from '../../../utils/bouquetData';
import { DraggableFlower } from '../components/DraggableFlower';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image as ExpoImage } from 'expo-image';

export const Stage2Arrange = ({
  insets,
  isDraggingFlower,
  setIsDraggingFlower,
  showGreeneryPicker,
  setShowGreeneryPicker,
  showFillerPicker,
  setShowFillerPicker,
  themeColors,
  styles,
  t,
  customArrangementMode,
  setCustomArrangementMode,
  canvasWidth,
  background,
  greeneryBg,
  selectedFlowers,
  setSelectedFlowers,
  selectedFlowerForEdit,
  setSelectedFlowerForEdit,
  handleFlowerRemoveByUniqueId,
  reduceMotion,
  isGoldenMode,
  GREENERY_OPTIONS,
  handleAddGreenery,
  FILLER_OPTIONS,
  handleAddFiller,
  shuffleArrangement,
  setCurrentStep,
  isDark
}: any) => {
  const handleMoveEnd = useCallback((uid: string, nx: number, ny: number) => {
    setSelectedFlowers((prev: any[]) => prev.map(f => f.uniqueId === uid ? { ...f, x: nx, y: ny } : f));
  }, [setSelectedFlowers]);

  const handleDragStart = useCallback(() => setIsDraggingFlower(true), [setIsDraggingFlower]);
  const handleDragEnd = useCallback(() => setIsDraggingFlower(false), [setIsDraggingFlower]);

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingTop: 16, paddingBottom: insets.bottom + 160 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      scrollEnabled={!isDraggingFlower}
    >
      {!(showGreeneryPicker || showFillerPicker) && (
        <>
          <Text style={styles.stepTitle}>{t('createBouquet.title2')}</Text>
          <Text style={styles.stepSubtitle}>{customArrangementMode ? t('createBouquet.subtitle2') : t('createBouquet.subtitle2Alt')}</Text>
        </>
      )}

      {/* Canvas — square so BG and flower positions align */}
      <View style={[styles.canvas, { width: canvasWidth, height: canvasWidth, marginHorizontal: -8 }]}>
        {/* Gradient wallpaper BG */}
        <ExpoImage source={BG_IMAGES[background]} style={[StyleSheet.absoluteFillObject, { width: canvasWidth, height: canvasWidth }]} contentFit="cover" transition={0} cachePolicy="memory-disk" />
        {/* Greenery plant overlay — sits above BG, below all flowers */}
        {greeneryBg && getFlowerImage(greeneryBg) && (
          <ExpoImage
            source={getFlowerImage(greeneryBg)}
            style={[
              StyleSheet.absoluteFillObject,
              { width: canvasWidth, height: canvasWidth, opacity: 0.85 },
              greeneryBg === 'baby-blue-eucalyptus' && { transform: [{ translateY: -25 }, { scale: 1.1 }] }
            ]}
            contentFit="cover"
            transition={0}
            cachePolicy="memory-disk"
          />
        )}
        {[...selectedFlowers].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0)).map((flower: any) => (
          <DraggableFlower
            key={flower.uniqueId}
            flower={flower}
            canvasWidth={canvasWidth}
            canvasHeight={canvasWidth}
            customArrangementMode={customArrangementMode}
            isSelected={customArrangementMode && selectedFlowerForEdit?.uniqueId === flower.uniqueId}
            onSelect={setSelectedFlowerForEdit}
            onMoveEnd={handleMoveEnd}
            onRemove={handleFlowerRemoveByUniqueId}
            reduceMotion={reduceMotion}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            isGoldenMode={isGoldenMode}
          />
        ))}
      </View>

      {/* Edit controls for selected flower */}
      {customArrangementMode && selectedFlowerForEdit && (
        <View style={styles.editControls}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <Text style={[styles.editTitle, { marginBottom: 0 }]}>{t('createBouquet.editSelected')}</Text>
          </View>
          <View style={styles.editRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.editLabel}>{t('createBouquet.size')}: {Math.round(selectedFlowerForEdit.scale * 100)}%</Text>
              <View style={styles.editBtnRow}>
                <TouchableOpacity style={styles.editBtn} onPress={() => {
                  const ns = Math.max(0.5, selectedFlowerForEdit.scale - 0.1);
                  setSelectedFlowers((p: any[]) => p.map(f => f.uniqueId === selectedFlowerForEdit.uniqueId ? { ...f, scale: ns } : f));
                  setSelectedFlowerForEdit({ ...selectedFlowerForEdit, scale: ns });
                }}><Text style={{ fontSize: 18, color: '#333' }}>−</Text></TouchableOpacity>
                <TouchableOpacity style={styles.editBtn} onPress={() => {
                  const ns = Math.min(2, selectedFlowerForEdit.scale + 0.1);
                  setSelectedFlowers((p: any[]) => p.map(f => f.uniqueId === selectedFlowerForEdit.uniqueId ? { ...f, scale: ns } : f));
                  setSelectedFlowerForEdit({ ...selectedFlowerForEdit, scale: ns });
                }}><Text style={{ fontSize: 18, color: '#333' }}>+</Text></TouchableOpacity>
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.editLabel}>{t('createBouquet.rotate')}: {Math.round(selectedFlowerForEdit.rotation)}°</Text>
              <View style={styles.editBtnRow}>
                <TouchableOpacity style={styles.editBtn} onPress={() => {
                  const nr = selectedFlowerForEdit.rotation - 15;
                  setSelectedFlowers((p: any[]) => p.map(f => f.uniqueId === selectedFlowerForEdit.uniqueId ? { ...f, rotation: nr } : f));
                  setSelectedFlowerForEdit({ ...selectedFlowerForEdit, rotation: nr });
                }}><RotateCcw size={16} color="#333" /></TouchableOpacity>
                <TouchableOpacity style={styles.editBtn} onPress={() => {
                  const nr = selectedFlowerForEdit.rotation + 15;
                  setSelectedFlowers((p: any[]) => p.map(f => f.uniqueId === selectedFlowerForEdit.uniqueId ? { ...f, rotation: nr } : f));
                  setSelectedFlowerForEdit({ ...selectedFlowerForEdit, rotation: nr });
                }}><RotateCw size={16} color="#333" /></TouchableOpacity>
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.editLabel}>{t('createBouquet.layer')}</Text>
              <View style={styles.editBtnRow}>
                <TouchableOpacity style={styles.editBtn} onPress={() => {
                  setSelectedFlowers((p: any[]) => p.map(f => f.uniqueId === selectedFlowerForEdit.uniqueId ? { ...f, zIndex: (f.zIndex || 0) - 1 } : f));
                }}><ChevronDown size={16} color="#333" /></TouchableOpacity>
                <TouchableOpacity style={styles.editBtn} onPress={() => {
                  setSelectedFlowers((p: any[]) => p.map(f => f.uniqueId === selectedFlowerForEdit.uniqueId ? { ...f, zIndex: (f.zIndex || 0) + 1 } : f));
                }}><ChevronUp size={16} color="#333" /></TouchableOpacity>
              </View>
            </View>
          </View>
          <TouchableOpacity style={styles.doneEditBtn} onPress={() => {
            setSelectedFlowerForEdit(null);
            setCustomArrangementMode(false);
          }}>
            <Text style={styles.doneEditBtnText}>{t('createBouquet.doneEditing')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Overlay to close pickers when clicking outside */}
      {(showGreeneryPicker || showFillerPicker) && (
        <TouchableOpacity
          style={[StyleSheet.absoluteFillObject, { zIndex: 5, bottom: 80 }]}
          activeOpacity={1}
          onPress={() => { setShowGreeneryPicker(false); setShowFillerPicker(false); }}
        />
      )}

      {/* Greenery Picker Drawer */}
      {showGreeneryPicker && (
        <View style={styles.pickerDrawer}>
          <TouchableOpacity
            style={{ alignSelf: 'center', backgroundColor: themeColors.cardBg, padding: 6, borderRadius: 20, marginBottom: 8, marginTop: -18, zIndex: 11, borderWidth: 1, borderColor: themeColors.border }}
            onPress={() => setShowGreeneryPicker(false)}
          >
            <X size={16} color={themeColors.text} />
          </TouchableOpacity>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pickerScrollContent}>
            {GREENERY_OPTIONS.map((item: any) => (
              <TouchableOpacity
                key={item.id}
                style={styles.pickerItem}
                onPress={() => handleAddGreenery(item)}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.pickerItemImg,
                  item.isBg && background === item.bgIndex && { borderWidth: 2, borderColor: '#4CAF50' },
                  !item.isBg && greeneryBg === item.id && { borderWidth: 2, borderColor: '#4CAF50' },
                ]}>
                  {item.isBg
                    ? <ExpoImage source={BG_IMAGES[item.bgIndex ?? 0]} style={{ width: '100%', height: '100%' }} contentFit="cover" cachePolicy="memory-disk" />
                    : getFlowerImage(item.id)
                      ? <ExpoImage source={getFlowerImage(item.id)} style={{ width: '100%', height: '100%' }} contentFit="contain" cachePolicy="memory-disk" />
                      : <View style={{ width: '100%', height: '100%', backgroundColor: '#d4edda', borderRadius: 8 }} />}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Filler Picker Drawer */}
      {showFillerPicker && (
        <View style={styles.pickerDrawer}>
          <TouchableOpacity
            style={{ alignSelf: 'center', backgroundColor: themeColors.cardBg, padding: 6, borderRadius: 20, marginBottom: 8, marginTop: -18, zIndex: 11, borderWidth: 1, borderColor: themeColors.border }}
            onPress={() => setShowFillerPicker(false)}
          >
            <X size={16} color={themeColors.text} />
          </TouchableOpacity>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pickerScrollContent}>
            {FILLER_OPTIONS.map((item: any) => (
              <TouchableOpacity
                key={item.id}
                style={styles.pickerItem}
                onPress={() => handleAddFiller(item.id)}
                activeOpacity={0.7}
              >
                <View style={styles.pickerItemImg}>
                  {getFlowerImage(item.id)
                    ? <ExpoImage source={getFlowerImage(item.id)} style={{ width: '100%', height: '100%' }} contentFit="contain" cachePolicy="memory-disk" />
                    : <View style={{ width: '100%', height: '100%', backgroundColor: '#fce4ec', borderRadius: 8 }} />}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Tools */}
      <View style={[styles.toolsPanel, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border, zIndex: 10 }]}>
        <TouchableOpacity style={[styles.toolBtn, { height: 48, justifyContent: 'center' }]} onPress={shuffleArrangement}>
          <Shuffle size={20} color={themeColors.textMuted} />
          <Text style={[styles.toolBtnLabel, { color: themeColors.textMuted }]}>{t('createBouquet.shuffle')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toolBtn, { height: 48, justifyContent: 'center' }, showGreeneryPicker && { backgroundColor: isDark ? themeColors.surface2 : '#e8f5e9', borderRadius: 8 }]}
          onPress={() => {
            if (showFillerPicker) {
              setShowFillerPicker(false);
              setShowGreeneryPicker(true);
            } else {
              setShowGreeneryPicker((p: boolean) => !p);
            }
          }}
        >
          <ImageIcon size={20} color={showGreeneryPicker ? '#4CAF50' : themeColors.textMuted} />
          <Text style={[styles.toolBtnLabel, { color: showGreeneryPicker ? '#4CAF50' : themeColors.textMuted, fontWeight: showGreeneryPicker ? '700' : '400' }]}>{t('createBouquet.bg')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toolBtn, { height: 48, justifyContent: 'center' }, customArrangementMode && { backgroundColor: isDark ? themeColors.surface2 : '#f0f0f0', borderRadius: 8 }]}
          onPress={() => { setCustomArrangementMode((m: boolean) => !m); if (customArrangementMode) setSelectedFlowerForEdit(null); }}
        >
          {customArrangementMode
            ? <><Lock size={20} color={themeColors.brand} /><Text style={[styles.toolBtnLabel, { color: themeColors.brand, fontWeight: '700' }]}>{t('createBouquet.move')}</Text></>
            : <><Move size={20} color={themeColors.textMuted} /><Text style={[styles.toolBtnLabel, { color: themeColors.textMuted }]}>{t('createBouquet.move')}</Text></>}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toolBtn, { height: 48, justifyContent: 'center' }, showFillerPicker && { backgroundColor: isDark ? themeColors.surface2 : '#fce4ec', borderRadius: 8 }]}
          onPress={() => {
            if (showGreeneryPicker) {
              setShowGreeneryPicker(false);
              setShowFillerPicker(true);
            } else {
              setShowFillerPicker((p: boolean) => !p);
            }
          }}
        >
          <Layers size={20} color={showFillerPicker ? '#9C27B0' : themeColors.textMuted} />
          <Text style={[styles.toolBtnLabel, { color: showFillerPicker ? '#9C27B0' : themeColors.textMuted, fontWeight: showFillerPicker ? '700' : '400' }]}>Fillers</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.toolBtn, { height: 48, justifyContent: 'center' }]} onPress={() => setCurrentStep(1)}>
          <Plus size={20} color={themeColors.textMuted} />
          <Text style={[styles.toolBtnLabel, { color: themeColors.textMuted }]}>{t('createBouquet.more')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};
