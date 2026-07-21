import { HapticButton } from '../../components/HapticButton';
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Dimensions } from 'react-native';
import { ExpoImageBackground as ImageBackground } from '../../components/ExpoImageBackground';
import { ScrollView } from 'react-native-gesture-handler';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { theme, globalStyles } from './styles';
import { CachedImage } from '../../components/CachedImage';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

const SAVED_DESIGNS = [
  {
    id: 1,
    title: 'The Provence Romance',
    description: 'A soft, textural blend focused on movement and muted pastel tones.',
    stems: 36,
    tier: 'Premium Tier',
    height: 320,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDy_XK0xIzD8TtXYZhGMiJT0DFdW0Jxs49Ct1kDYDJtNA052SOKVXxcVPHcD9GT8Bf7Chq4eA_10q34LlCJNNKfBmwhv0zn2xIx4gdi_nrYyYW0saVdJTdMyvJfmFN-qjHX_pwjtttqBXUf1jD1Ig4Sbk8xuKi4QepDYQiOZX2ktsTTgkhmbIJjZO5NmRavR_5K4MDkBEJXWax_ZiAkG972raFcTfsCSq-ntaj0AoDAmkn01StREgOGwefcfnxbMMC8p2BBS7b9x5my'
  },
  {
    id: 2,
    title: 'Modernist Arch',
    description: 'Structural and deliberate, using negative space as a focal point.',
    stems: 12,
    tier: 'Signature Tier',
    height: 256,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB7xaXDU0CkGAVYyqKLpclRCkDy-j_mAawEx1QwRETqJlBLfA9w2OO15oWgEKXTskF8f24JOBbgZgyL6BGbPJVwkwdwBJumObyxCmWR0gVoK-Wc6_nKfpoIxe8L73wZzRX3zXIqetLg5ODEmTP2Nt-rxalUxn6-YL5pfg27XdeU2izaxQYME2o9LbS7qScP79lTKLLakTby73FH61MVJWWKtVKmWZq7Xn3TB3t6cwK-vXt5rdPb_cj7aSBxeR10R1t_Qh3HZID4pQot'
  },
  {
    id: 3,
    title: 'Midnight Banquet Runner',
    description: 'Rich, velvety textures and deep tones for a dramatic tablescape.',
    stems: 48,
    tier: 'Luxe Tier',
    height: 384,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCEVDUS2bxskTQWcd2EIRufjV5izfghoX4J80_Y-7RSIKWSRkCGAnKBYiJ1cidH1pdZyKpjbFGmN3q1xyAMd9cJ3AY4oVGOMM1nc0ZU0zbrfieX73uls6LxgCQhNYC0mOui5FOgBlmrX3-8CPn7KvXWQ34r5x9ABcffsxlm592hGlpr1pHzw9lSYDkfgN3RlbGoQIyBE7EQ627nDiIUQaUgSR7wQsogyZQZEI6e_gVwRFhJq-dCQ7KzhpINc4ss3R1SIb8wKjcoRj9y'
  },
  {
    id: 4,
    title: 'Classic Whites',
    description: 'Timeless elegance relying purely on form and the freshest spring blooms.',
    stems: 24,
    tier: 'Standard Tier',
    height: 288,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAD_e5ICHpBJw5dt4OjnEUehjrE9wwn48xoFBK5DZ076rhKVHkScel2PEAGR8V_4L61nJV08YzzAA4wQ5t0s5nxgSzLVxT3CkedEk9hjcdPB6TC_uenoMxMkBpTVkYTOh5UF7m0NnehboFQL-Eauj70OGVx2xWObQIxOMEAsxcetMSlELyoLK0CVHiUgCh5P1ZpVbI5QyFELJW-yGjIL2umq_Uf3mrsK8Y7bIzOCUiCYZms_sC5mb2eRU-1h0c2vwH0KmmgxWhVKiMI'
  }
];

export default function SavedDesignsPage({ navigation }) {
  // Simple fake masonry - split into two columns if tablet, otherwise one
  const col1 = isTablet ? SAVED_DESIGNS.filter((_, i) => i % 2 === 0) : SAVED_DESIGNS;
  const col2 = isTablet ? SAVED_DESIGNS.filter((_, i) => i % 2 !== 0) : [];

  const renderCard = (design) => (
    <HapticButton 
      key={design.id} 
      style={styles.card}
      activeOpacity={0.9}
      onPress={() => navigation.navigate('BridalMakerDesign')}
    >
      <HapticButton style={styles.favoriteBtn}>
        <MaterialIcons name="favorite" size={20} color={theme.primary} />
      </HapticButton>
      
      <ImageBackground 
        source={{ uri: design.imageUrl }} 
        style={[styles.imageBg, { height: design.height }]}
      />
      
      <View style={styles.cardContent}>
        <View style={{ flex: 1 }}>
          <Text style={[globalStyles.textHeadlineMd, { marginBottom: 8 }]}>{design.title}</Text>
          <Text style={[globalStyles.textBodyMd, { marginBottom: 24 }]}>{design.description}</Text>
        </View>
        <View style={styles.cardFooter}>
          <MaterialIcons name="spa" size={18} color={theme.onSurfaceVariant} />
          <Text style={[globalStyles.textLabelSm, { marginLeft: 12, color: theme.onSurface }]}>
            {design.stems} Stems • {design.tier}
          </Text>
        </View>
      </View>
    </HapticButton>
  );

  return (
    <SafeAreaView style={globalStyles.safeArea}>
      <View style={styles.headerBar}>
        <HapticButton onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={theme.primary} />
        </HapticButton>
        <Text style={styles.headerTitle}>Saved Designs</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView 
        style={globalStyles.pageContainer}
        contentContainerStyle={globalStyles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={{ flex: 1, paddingRight: isTablet ? 40 : 0 }}>
            <Text style={[globalStyles.textHeadlineLg, { marginBottom: 16 }]}>Saved Designs</Text>
            <Text style={globalStyles.textBodyLg}>
              Your curated collection of bespoke floral concepts. Review recipes, refine tiers, and prepare for your consultation.
            </Text>
          </View>

          <View style={{ marginTop: isTablet ? 0 : 32 }}>
            <HapticButton style={styles.sortPill}>
              <Text style={globalStyles.textLabelSm}>SORT: NEWEST FIRST</Text>
              <MaterialIcons name="keyboard-arrow-down" size={16} color={theme.onSurfaceVariant} style={{ marginLeft: 8 }} />
            </HapticButton>
          </View>
        </View>

        <View style={styles.masonryGrid}>
          {isTablet ? (
            <>
              <View style={styles.column}>{col1.map(renderCard)}</View>
              <View style={styles.column}>{col2.map(renderCard)}</View>
            </>
          ) : (
            <View style={styles.column}>{col1.map(renderCard)}</View>
          )}
        </View>
      </ScrollView>
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
  header: {
    flexDirection: isTablet ? 'row' : 'column',
    alignItems: isTablet ? 'flex-end' : 'flex-start',
    marginBottom: 48,
    justifyContent: 'space-between',
  },
  sortPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: theme.borderRadiusFull,
    borderWidth: 1,
    borderColor: theme.outlineVariant,
  },
  masonryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  column: {
    flex: 1,
    paddingHorizontal: isTablet ? 12 : 0,
  },
  card: {
    backgroundColor: theme.surfaceLowest,
    borderRadius: theme.borderRadiusXl,
    borderWidth: 1,
    borderColor: theme.outlineVariant,
    overflow: 'hidden',
    marginBottom: theme.spacingGutter,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.02,
    shadowRadius: 30,
    elevation: 2,
  },
  imageBg: {
    width: '100%',
    backgroundColor: theme.surfaceVariant,
  },
  favoriteBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(251, 249, 246, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(210, 196, 190, 0.5)',
  },
  cardContent: {
    padding: 24,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(210, 196, 190, 0.5)',
    paddingTop: 16,
    marginTop: 16,
  }
});
