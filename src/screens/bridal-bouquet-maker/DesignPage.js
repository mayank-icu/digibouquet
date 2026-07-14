import { HapticButton } from '../../components/HapticButton';
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, SafeAreaView, Dimensions } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { theme, globalStyles } from './styles';
import { CachedImage } from '../../components/CachedImage';

const { width } = Dimensions.get('window');
const isTablet = width >= 1024;

const ELEMENTS = [
  {
    id: 1,
    name: 'White Peony',
    type: 'Focal',
    typeBg: '#F3E3E2',
    icon: 'local-florist',
    price: '$12 / stem',
    initialCount: 3,
    disabled: false
  },
  {
    id: 2,
    name: 'White Rose',
    type: 'Focal',
    typeBg: '#F3E3E2',
    icon: 'local-florist',
    price: '$8 / stem',
    initialCount: 5,
    disabled: false
  },
  {
    id: 3,
    name: 'Sage Eucalyptus',
    type: 'Greenery',
    typeBg: '#9CAF97',
    icon: 'eco',
    price: '$5 / bunch',
    initialCount: 2,
    disabled: false,
    typeBgOpacity: 0.2
  },
  {
    id: 4,
    name: "Baby's Breath",
    type: 'Filler',
    typeBg: '#F3E3E2',
    icon: 'psychology',
    price: '$4 / bunch',
    initialCount: 0,
    disabled: true
  }
];

export default function DesignPage({ navigation }) {
  const [counts, setCounts] = useState(
    ELEMENTS.reduce((acc, el) => ({ ...acc, [el.id]: el.initialCount }), {})
  );
  
  const [activePalette, setActivePalette] = useState('Classic Ivory');
  const [activeShape, setActiveShape] = useState('Symmetrical');

  const updateCount = (id, delta) => {
    setCounts(prev => {
      const newCount = Math.max(0, prev[id] + delta);
      return { ...prev, [id]: newCount };
    });
  };

  const selectedCount = Object.values(counts).filter(c => c > 0).length;

  return (
    <SafeAreaView style={globalStyles.safeArea}>
      <View style={styles.headerBar}>
        <HapticButton onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={theme.primary} />
        </HapticButton>
        <Text style={styles.headerTitle}>Bouquet Customizer</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView 
        style={globalStyles.pageContainer}
        contentContainerStyle={[globalStyles.contentContainer, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={isTablet ? styles.tabletGrid : null}>
          {/* Live Preview Area */}
          <View style={[styles.previewContainer, isTablet && { flex: 5 }]}>
            <View style={styles.previewArea}>
              <CachedImage 
                source={{ uri: "https://lh3.googleusercontent.com/aida-public/AB6AXuDDWjiUg0oaetXrOu0dl5dRLt2aKvbYNZLxmWhPvZwcRO8yLjE4U2c9V0mbMwMpsSI-X0N6ZLTFNbWe7CP4lcFA7AsBOkN-UvH44NAklBNZMaL3o-hulvhPyG_4m74HNSEOk7KyMU-TPkBmbRYXTUE1pbVFrDmX8VE4rBvrsiOoOtiTM52GM6ELvgF8l_qG50nG-Gsu2RfU1RGi5HQlBmU9RCYwoeGw0guvctfn52S7WhfF29eXs6Tyi7ttc76qQd0X5qyWw9BMLLbJ" }} 
                style={styles.previewImage} 
              />
              <View style={styles.previewFrame} />
              <View style={styles.statusBadge}>
                <Text style={[globalStyles.textLabelSm, { color: theme.primary }]}>PREVIEW MODE</Text>
              </View>
            </View>
          </View>

          {/* Customizer Controls */}
          <View style={[styles.controlsContainer, isTablet && { flex: 7, paddingLeft: 48 }]}>
            <View style={{ marginBottom: 48 }}>
              <Text style={[globalStyles.textHeadlineMd, { marginBottom: 16 }]}>Design Your Blueprint</Text>
              <Text style={globalStyles.textBodyLg}>
                Curate your perfect arrangement by selecting botanical elements, color palettes, and structural forms.
              </Text>
            </View>

            {/* Palette Selector */}
            <View style={styles.section}>
              <View style={styles.sectionTitleWrapper}>
                <Text style={[globalStyles.textLabelMd, { color: theme.onSurfaceVariant }]}>Color Palette</Text>
              </View>
              <View style={styles.paletteSelector}>
                {[
                  { name: 'Classic Ivory', color1: '#FAF8F5', color2: '#F5EFEB' },
                  { name: 'Blush Romance', color1: '#F3E3E2', color2: '#E5C9C8' },
                  { name: 'Terracotta', color1: '#E2A78F', color2: '#C97B5D' }
                ].map(palette => (
                  <HapticButton 
                    key={palette.name}
                    style={[styles.paletteBtn, activePalette === palette.name && styles.paletteBtnActive]}
                    onPress={() => setActivePalette(palette.name)}
                  >
                    <View style={[styles.paletteSwatchWrapper, activePalette === palette.name && styles.paletteSwatchWrapperActive]}>
                      <View style={[styles.paletteSwatch, { backgroundColor: palette.color2 }]} />
                    </View>
                    <Text style={[globalStyles.textLabelSm, { color: activePalette === palette.name ? theme.primary : theme.onSurfaceVariant }]}>
                      {palette.name}
                    </Text>
                  </HapticButton>
                ))}
              </View>
            </View>

            {/* Shape Selector */}
            <View style={styles.section}>
              <View style={styles.sectionTitleWrapper}>
                <Text style={[globalStyles.textLabelMd, { color: theme.onSurfaceVariant }]}>Structural Form</Text>
              </View>
              <View style={styles.shapeSelector}>
                {['Symmetrical', 'Asymmetric Meadow', 'Cascade'].map(shape => (
                  <HapticButton 
                    key={shape}
                    style={[styles.shapeBtn, activeShape === shape && styles.shapeBtnActive]}
                    onPress={() => setActiveShape(shape)}
                  >
                    <Text style={[globalStyles.textLabelMd, { color: activeShape === shape ? theme.primary : theme.onSurfaceVariant, textTransform: 'none' }]}>
                      {shape}
                    </Text>
                  </HapticButton>
                ))}
              </View>
            </View>

            {/* Flower Selector */}
            <View style={styles.section}>
              <View style={[styles.sectionTitleWrapper, globalStyles.flexRowBetween]}>
                <Text style={[globalStyles.textLabelMd, { color: theme.onSurfaceVariant }]}>Botanical Elements</Text>
                <Text style={[globalStyles.textLabelSm, { color: theme.onSurfaceVariant, textTransform: 'none' }]}>{selectedCount} Selected</Text>
              </View>
              
              <View style={styles.elementGrid}>
                {ELEMENTS.map(el => (
                  <View key={el.id} style={[styles.elementCard, el.disabled && styles.elementCardDisabled]}>
                    <View style={styles.elementHeader}>
                      <View>
                        <Text style={[globalStyles.textHeadlineMd, { marginBottom: 4 }]}>{el.name}</Text>
                        <View style={[styles.typeBadge, { backgroundColor: el.typeBg }]}>
                          <Text style={[globalStyles.textLabelSm, { color: theme.primary }]}>{el.type}</Text>
                        </View>
                      </View>
                      <MaterialIcons name={el.icon} size={24} color={theme.onSurfaceVariant} />
                    </View>
                    
                    <View style={globalStyles.flexRowBetween}>
                      <Text style={globalStyles.textBodyMd}>{el.price}</Text>
                      <View style={styles.stepper}>
                        <HapticButton 
                          style={styles.stepperBtn}
                          onPress={() => updateCount(el.id, -1)}
                          disabled={el.disabled || counts[el.id] === 0}
                        >
                          <MaterialIcons name="remove" size={16} color={theme.onSurfaceVariant} />
                        </HapticButton>
                        <Text style={[globalStyles.textLabelMd, { width: 16, textAlign: 'center' }]}>{counts[el.id]}</Text>
                        <HapticButton 
                          style={styles.stepperBtn}
                          onPress={() => updateCount(el.id, 1)}
                          disabled={el.disabled}
                        >
                          <MaterialIcons name="add" size={16} color={theme.onSurfaceVariant} />
                        </HapticButton>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Floating Save Button */}
      <View style={styles.saveBtnContainer}>
        <HapticButton 
          style={styles.saveBtn}
          onPress={() => navigation.navigate('BridalMakerSaved')}
          activeOpacity={0.9}
        >
          <Text style={[globalStyles.textLabelMd, { color: theme.onPrimary, marginRight: 8 }]}>SAVE BLUEPRINT</Text>
          <Feather name="arrow-right" size={16} color={theme.onPrimary} />
        </HapticButton>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.outlineVariant,
  },
  backBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: theme.fontBodySemiBold,
    fontSize: 17,
    color: theme.primary,
  },
  tabletGrid: {
    flexDirection: 'row',
  },
  previewContainer: {
    marginBottom: 48,
  },
  previewArea: {
    width: '100%',
    aspectRatio: 0.8,
    borderRadius: theme.borderRadiusXl,
    backgroundColor: '#F5EFEB',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.02,
    shadowRadius: 30,
    elevation: 2,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    opacity: 0.9,
  },
  previewFrame: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    bottom: 16,
    borderWidth: 1,
    borderColor: '#E5DDD3',
    borderRadius: 20,
    pointerEvents: 'none',
  },
  statusBadge: {
    position: 'absolute',
    top: 32,
    right: 32,
    backgroundColor: 'rgba(245, 239, 235, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: theme.borderRadiusFull,
    borderWidth: 1,
    borderColor: '#E5DDD3',
  },
  controlsContainer: {
    flexDirection: 'column',
  },
  section: {
    marginBottom: 48,
  },
  sectionTitleWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5DDD3',
    paddingBottom: 8,
    marginBottom: 24,
  },
  paletteSelector: {
    flexDirection: 'row',
    gap: 24,
  },
  paletteBtn: {
    alignItems: 'center',
    opacity: 0.6,
  },
  paletteBtnActive: {
    opacity: 1,
  },
  paletteSwatchWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    padding: 4,
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: 12,
  },
  paletteSwatchWrapperActive: {
    borderColor: theme.primary,
  },
  paletteSwatch: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
  },
  shapeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  shapeBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: theme.borderRadiusFull,
    borderWidth: 1,
    borderColor: '#E5DDD3',
    backgroundColor: 'transparent',
  },
  shapeBtnActive: {
    borderColor: theme.primary,
    backgroundColor: '#F5EFEB',
  },
  elementGrid: {
    gap: 24,
  },
  elementCard: {
    backgroundColor: '#F5EFEB',
    borderRadius: theme.borderRadiusXl,
    padding: 24,
    minHeight: 160,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  elementCardDisabled: {
    opacity: 0.7,
  },
  elementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 32,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: theme.borderRadiusFull,
    marginTop: 8,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderRadius: theme.borderRadiusFull,
    padding: 4,
    borderWidth: 1,
    borderColor: '#E5DDD3',
    gap: 16,
  },
  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnContainer: {
    position: 'absolute',
    bottom: 32,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.tertiaryContainer,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: theme.borderRadiusFull,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  }
});
