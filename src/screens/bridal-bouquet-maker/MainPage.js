import { HapticButton } from '../../components/HapticButton';
import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, SafeAreaView, Dimensions } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { theme, globalStyles } from './styles';
import { CachedImage } from '../../components/CachedImage';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

const TRENDING_RECIPES = [
  {
    id: 1,
    title: 'The Juliet',
    price: 'Est. $240',
    description: '7 Peonies, 12 Garden Roses, Jasmine Vine',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA2c9f2qRGeW4xxdXb4BRTa-R-_6U9PvSaDfiAbYuF1OnuQdpKYeyw-UEecp4BTHFHuVGSE2DG-cjWg2wQOcHK2PNbCp9IKl1_U4yuhrbzoDCVq0PeKyZbZ_G8XiOIVGnFr507Wix4U9fwTjjatJedU5gZCY5QH41hZaKLu5Z3G2NdhLsgX5eZRwG24Mz2NPHn2OGQkZOihoP9O0M6GpqyMEAtJ2EWb1mXby4D5QVeKhjIeIfKqXoParuMp1xcdXDtylbR1M23njW6w'
  },
  {
    id: 2,
    title: 'Noir Cascade',
    price: 'Est. $310',
    description: '5 Anemones, 9 Dahlias, Olive Branch',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCUs2_J3IHCH2YCskbn7_p0oPBfi12ND0lZiBopaNWGy-gQQFS69E7Qd3tV_c-NIAwpnBKCzICM89qWaXDrrsWVfnd2KB3nLRnG7eFWMKa5NBytobND6rDHIVwc8CHT9qvX3x5gJLKGyWJTpLfoAtTY1JePiZs8ATuIaYDYUtoRPaZwE9AJcRnXmHQ_bwabldoriyduHTy1_TtGwljwFcSii_8c88zQVHvCgL8KRHtV9FWcmG8jBSgG_nVoEEHo0xVLjp2boAhf-PjC'
  },
  {
    id: 3,
    title: 'Pure Sculpt',
    price: 'Est. $180',
    description: '15 Tulips, 3 Orchids, Bleached Fern',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAmXqBJeT4_NsqER7tLdl7RA8m5w6xnDYFtG06a8NC7B4kh-BT4jEz7sStjGP4mjGIi11mDxyezje2WwpKr0wf6SU23PtrIC-RNYH48dJHdWHdAsq4F63wyOsatZBdFwuT4381W9tuwSZvD_w_411SqPxyqEgabDEIkLQ89P_tIU90mEsbLZIUGAvVXDHWaMfNJV-6a_29-KJh2cFgoEghhnr7YLq_sdXE8BKfcaNKvZLSGzBaiFSKL4BNa6kjlhEUHQ-RvF5CdOWxL'
  }
];

const TAGS = [
  'Sustainable', 'Fragrant', 'Native', 'Drought-Tolerant',
  'Rare Blooms', 'Local Farm', 'Pet-Friendly', 'Statement Greenery'
];

export default function MainPage({ navigation }) {
  return (
    <SafeAreaView style={globalStyles.safeArea}>
      <View style={styles.header}>
        <HapticButton onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={theme.primary} />
        </HapticButton>
        <Text style={styles.headerTitle}>Bridal Planner</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView 
        style={globalStyles.pageContainer}
        contentContainerStyle={globalStyles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Trending Section */}
        <View style={styles.section}>
          <View style={[globalStyles.flexRowBetween, { marginBottom: 24, alignItems: 'flex-end' }]}>
            <Text style={[globalStyles.textHeadlineLg, { fontSize: isTablet ? 56 : 32 }]}>Trending Recipes</Text>
            <HapticButton 
              style={styles.viewAllBtn}
              onPress={() => navigation.navigate('BridalMakerSaved')}
            >
              <Text style={[globalStyles.textLabelMd, { color: theme.onSurfaceVariant, fontSize: 12 }]}>VIEW ALL</Text>
            </HapticButton>
          </View>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            snapToInterval={isTablet ? 300 + 16 : 220 + 16}
            decelerationRate="fast"
            contentContainerStyle={{ paddingRight: theme.marginMobile }}
            style={{ marginHorizontal: -theme.marginMobile, paddingHorizontal: theme.marginMobile }}
          >
            {TRENDING_RECIPES.map((recipe) => (
              <HapticButton 
                key={recipe.id} 
                style={styles.recipeCard}
                activeOpacity={0.9}
                onPress={() => navigation.navigate('BridalMakerDesign')}
              >
                <View style={styles.imageContainer}>
                  <CachedImage source={{ uri: recipe.imageUrl }} style={styles.recipeImage} />
                  <HapticButton style={styles.favoriteBtn}>
                    <MaterialIcons name="favorite-border" size={18} color={theme.primary} />
                  </HapticButton>
                </View>
                <View style={styles.recipeInfo}>
                  <View style={globalStyles.flexRowBetween}>
                    <Text style={[globalStyles.textHeadlineMd, { fontSize: 20 }]}>{recipe.title}</Text>
                    <Text style={[globalStyles.textBodyMd, { fontSize: 14 }]}>{recipe.price}</Text>
                  </View>
                  <Text style={[globalStyles.textBodyMd, { color: theme.outline, marginTop: 4, fontSize: 13 }]} numberOfLines={2}>
                    {recipe.description}
                  </Text>
                </View>
              </HapticButton>
            ))}
          </ScrollView>
        </View>

        {/* Tags Section */}
        <View style={[styles.section, { marginTop: 32 }]}>
          <Text style={[globalStyles.textHeadlineLg, { marginBottom: 24, fontSize: isTablet ? 56 : 32 }]}>Explore by Botanical Tag</Text>
          <View style={styles.tagsContainer}>
            {TAGS.map((tag) => (
              <HapticButton key={tag} style={styles.tagPill}>
                <Text style={[globalStyles.textLabelMd, { color: theme.onSecondaryContainer, textTransform: 'none', fontSize: 13 }]}>
                  {tag}
                </Text>
              </HapticButton>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
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
  section: {
    marginBottom: 32,
  },
  viewAllBtn: {
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
    paddingBottom: 4,
  },
  recipeCard: {
    width: isTablet ? 300 : 220,
    marginRight: 16,
  },
  imageContainer: {
    width: '100%',
    height: isTablet ? 340 : 260,
    borderRadius: theme.borderRadiusXl,
    backgroundColor: theme.surfaceLow,
    overflow: 'hidden',
    position: 'relative',
    borderColor: 'rgba(210, 196, 190, 0.2)',
    borderWidth: 1,
  },
  recipeImage: {
    width: '100%',
    height: '100%',
  },
  favoriteBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(251, 249, 246, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recipeInfo: {
    paddingHorizontal: 4,
    paddingTop: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tagPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: theme.borderRadiusFull,
    backgroundColor: theme.secondaryContainer,
    marginBottom: 8,
    marginRight: 8,
  }
});
