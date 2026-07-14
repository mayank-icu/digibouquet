import React, { useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, Platform } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Search as SearchIcon, X, Coins, Info } from 'lucide-react-native';
import LottieView from 'lottie-react-native';
import { FlowerCard } from '../components/FlowerCard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const Stage1Select = ({
  isReady,
  aiGenerating,
  filteredGroups,
  isGoldenMode,
  themeColors,
  t,
  selectedFlowers,
  searchQuery,
  setSearchQuery,
  searchPlaceholders,
  placeholderIndex,
  generateAIBouquet,
  showAlert,
  setSelectedFlowers,
  currentUser,
  credits,
  setShowSarahInfo,
  FUNNY_MESSAGES,
  loadingMessageIndex,
  handleFlowerAdd,
  handleFlowerRemoveLast,
  handleViewMeaning,
  locale,
  styles,
  isDark,
}: any) => {
  const insets = useSafeAreaInsets();

  const renderItem = useCallback(({ item: group }: any) => {
    const count = selectedFlowers.filter((f: any) => group.colors.some((c: any) => c.id === f.id)).length;
    return (
      <FlowerCard
        key={group.id}
        group={group}
        count={count}
        canAdd={selectedFlowers.length < 8}
        onAdd={handleFlowerAdd}
        onRemove={handleFlowerRemoveLast}
        onViewMeaning={handleViewMeaning}
        locale={locale}
        theme={themeColors}
        isGoldenMode={isGoldenMode}
      />
    );
  }, [selectedFlowers, handleFlowerAdd, handleFlowerRemoveLast, handleViewMeaning, locale, themeColors, isGoldenMode]);

  return (
    <FlashList
      data={(!isReady || aiGenerating) ? [] : filteredGroups}
      keyExtractor={(item: any) => item.id}
      numColumns={2}
      estimatedItemSize={180}
      contentContainerStyle={{ paddingBottom: insets.bottom + 100, paddingTop: 16 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <View style={{ marginBottom: 12 }}>
          {/* ─── GOLDEN BOUQUET FEATURE ─────────────────────────────────────────────────── */}
          {isGoldenMode && (
            <View style={{ marginBottom: 12, alignSelf: 'flex-start' }}>
              <View style={{ backgroundColor: '#D4AF37', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ fontFamily: 'Manrope-Bold', fontSize: 9, color: '#1A1200', letterSpacing: 1.2 }}>LIMITED EDITION</Text>
              </View>
            </View>
          )}
          {/* ─── END GOLDEN BOUQUET FEATURE ────────────────────────────────────────────── */}
          <Text style={[styles.stepTitle, { color: themeColors.brand }]}>
            {isGoldenMode ? 'Select Golden Blooms' : t('createBouquet.title1')}
          </Text>
          <Text style={[styles.stepSubtitle, { color: themeColors.textMuted }, selectedFlowers.length < 3 ? styles.textWarning : styles.textSuccess]}>
            {selectedFlowers.length < 3
              ? t('createBouquet.selectMin').replace('{count}', selectedFlowers.length.toString())
              : t('createBouquet.selectedCount').replace('{count}', selectedFlowers.length.toString())}
          </Text>

          {/* Search */}
          <View style={styles.searchRow}>
            <View style={[styles.searchBox, { backgroundColor: isDark ? themeColors.surface : 'white', borderColor: isDark ? themeColors.border : '#e0e0e0' }]}>
              {/* Hide search icon when user is typing */}
              {!searchQuery && (
                <SearchIcon size={16} color="#999" style={styles.searchIcon} />
              )}
              <TextInput
                style={[styles.searchInput, { color: themeColors.text, minHeight: 40, maxHeight: 80 }]}
                placeholder={searchPlaceholders[placeholderIndex]}
                placeholderTextColor={themeColors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={() => { if (searchQuery.trim().length > 10) generateAIBouquet(searchQuery); }}
                returnKeyType="search"
                multiline
                blurOnSubmit
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}><X size={16} color="#999" style={styles.clearBtn} /></TouchableOpacity>
              )}
            </View>

            {selectedFlowers.length > 0 && (
              <TouchableOpacity
                style={styles.clearAllBtn}
                onPress={() => showAlert('Clear All', 'Remove all selected flowers?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Clear', style: 'destructive', onPress: () => setSelectedFlowers([]) }
                ])}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <X size={14} color="white" />
                  <Text style={styles.clearAllBtnText}>{t('createBouquet.clear')}</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>

          {/* No results → AI */}
          {filteredGroups.length === 0 && searchQuery.trim().length > 0 && !aiGenerating && (
            <View style={styles.noResultsBox}>
              <View style={{ position: 'absolute', top: 12, left: 12, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Coins size={14} color="#7A5C58" />
                <Coins size={14} color={themeColors.brand} />
                <Text style={{ fontSize: 11, color: themeColors.brand, fontFamily: 'Manrope-Bold' }}>
                  {currentUser ? `${credits ?? 0} Credits` : 'Login for Credits'}
                </Text>
              </View>
              <TouchableOpacity
                style={{ position: 'absolute', top: 12, right: 12, padding: 4 }}
                onPress={() => setShowSarahInfo(true)}
              >
                <Info size={18} color={themeColors.brand} />
              </TouchableOpacity>
              <Text style={[styles.noResultsTitle, { marginTop: 10, color: themeColors.text }]}>Sarah can create a bouquet for &quot;{searchQuery}&quot;</Text>
              <Text style={[styles.noResultsSubtitle, { color: themeColors.textMuted }]}>Sarah uses her floral expertise to design something special.</Text>
              <TouchableOpacity
                style={[styles.aiBtnPrimary, !currentUser && { backgroundColor: '#ccc' }, { backgroundColor: themeColors.brand }]}
                onPress={() => generateAIBouquet(searchQuery)}
              >
                <Text style={styles.aiBtnText}>Generate Bouquet</Text>
              </TouchableOpacity>
              {!currentUser && <Text style={{ fontSize: 10, color: '#999', marginTop: 8 }}>Login required for AI features</Text>}
            </View>
          )}

          {/* AI Generating Animation */}
          {aiGenerating && (
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 40 }}>
              <LottieView
                source={{ uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/animations/ai-bouquet.json' }}
                autoPlay
                loop
                style={{ width: 160, height: 160 }}
              />
              <Text style={{
                marginTop: 12,
                color: '#7A5C58',
                fontFamily: 'Manrope-SemiBold',
                fontSize: 14,
                opacity: 0.8,
                textAlign: 'center'
              }}>
                {FUNNY_MESSAGES[loadingMessageIndex]}
              </Text>
            </View>
          )}
        </View>
      }
      renderItem={renderItem}
    />
  );
};
