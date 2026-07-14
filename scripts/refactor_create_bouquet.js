const fs = require('fs');
const path = './src/screens/CreateBouquetScreen.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add imports
const importsToAdd = `
import { useGoldenBouquet } from './create-bouquet/hooks/useGoldenBouquet';
import { getTranslatedFlowerData } from './create-bouquet/utils/translationUtils';
import { ParticleShape } from './create-bouquet/components/ParticleShape';
import { RAOK_SUGGESTIONS } from '../utils/raokSuggestions';
import { isSlugOffensive } from '../utils/slugUtils';
import { generateRandomPosition } from './create-bouquet/utils/arrangementUtils';
import { RAOKSuccessModal } from './create-bouquet/components/modals/RAOKSuccessModal';
import { FlowerMeaningModal } from './create-bouquet/components/modals/FlowerMeaningModal';
import { SuccessModal, ReviewFallbackModal } from './create-bouquet/components/modals/SuccessModal';
import { UnsavedChangesModal } from './create-bouquet/components/modals/UnsavedChangesModal';
import { HelpModal } from './create-bouquet/components/modals/HelpModal';
import { SarahInfoModal } from './create-bouquet/components/modals/SarahInfoModal';
import { AIGenerationResultModal } from './create-bouquet/components/modals/AIGenerationResultModal';
`;

content = content.replace(
  "import { Stage3Message } from './create-bouquet/stages/Stage3Message';",
  "import { Stage3Message } from './create-bouquet/stages/Stage3Message';\n" + importsToAdd
);

// 2. Remove getTranslatedFlowerData
content = content.replace(/\/\/ ─── Helper to get translated flower data ───+[\s\S]+?};\n/, '');

// 3. Remove Particle effects
content = content.replace(/\/\/ ─── Particle effects ───+[\s\S]+?return null;\n}\n/, '');

// 4. Replace golden bouquet
content = content.replace(
  /\/\/ ─── GOLDEN BOUQUET FEATURE ───+[\s\S]+?\/\/ ─── END GOLDEN BOUQUET FEATURE ───+/,
  "const { isGoldenMode, themeColors, isDark } = useGoldenBouquet(route.params);"
);

// 5. Remove RAOK_SUGGESTIONS
content = content.replace(/const RAOK_SUGGESTIONS = \[\s+\{[\s\S]+?\}\n  \}\n\];/m, '');

// 6. Remove offensiveWords and isSlugOffensive
content = content.replace(/\/\/ Offensive words filter[\s\S]+?};\n/m, '');

// 7. Remove arrangement helpers
content = content.replace(/\/\/ ─── flower type helpers ───+[\s\S]+?const clampedX = Math.max\(10, Math.min\(90, x\)\);[\s\S]+?return { x: clampedX, y: clampedY, rotation, scale, zIndex };\n  };\n/m, '');

// 8. Replace Modals
const modalsReplacement = `
      {/* ══════════════════════ MODALS ══════════════════════ */}
      <RAOKSuccessModal 
        visible={showRaokSuccessModal} 
        themeColors={themeColors} 
        onClose={() => {
          setShowRaokSuccessModal(false);
          navigation.navigate('Home' as any);
        }} 
      />

      <FlowerMeaningModal
        viewingMeaning={viewingMeaning}
        themeColors={themeColors}
        insets={insets}
        SCREEN_H={SCREEN_H}
        styles={styles}
        meaningOverlay={meaningOverlay}
        meaningSlideAnim={meaningSlideAnim}
        meaningPanY={meaningPanY}
        meaningPanHandlers={meaningPanHandlers}
        onMeaningScroll={onMeaningScroll}
        onClose={() => { setViewingMeaning(null); setShowColorPicker(null); }}
        selectedFlowers={selectedFlowers}
        handleFlowerAdd={handleFlowerAdd}
      />

      <PresetsModal
        visible={showPresets}
        onClose={() => setShowPresets(false)}
        t={t}
        themeColors={themeColors}
        styles={styles}
        background={background}
        isDark={isDark}
        insets={insets}
        PRESETS={PRESETS}
        getTranslatedPreset={getTranslatedPreset}
        locale={locale}
        handlePresetSelect={async (preset) => {
          try {
            setSelectedFlowers(preset.flowers.map(f => ({ ...f, uniqueId: uuidv4() })));
            setBackground(preset.background);
            setShowPresets(false);
            setCurrentStep(2);
          } catch (e) {
            console.error(e);
          }
        }}
      />

      <SuccessModal
        visible={showSuccessModal}
        themeColors={themeColors}
        SCREEN_W={SCREEN_W}
        styles={styles}
        t={t}
        showSuccessLottie={showSuccessLottie}
        setShowSuccessLottie={setShowSuccessLottie}
        showRatingWidget={showRatingWidget}
        setShowRatingWidget={setShowRatingWidget}
        cardUrl={cardUrl}
        setShowReviewFallbackModal={setShowReviewFallbackModal}
        setShowShareModal={setShowShareModal}
        setShowSuccessModal={setShowSuccessModal}
        navigation={navigation}
      />

      <ReviewFallbackModal
        visible={showReviewFallbackModal}
        themeColors={themeColors}
        styles={styles}
        setShowReviewFallbackModal={setShowReviewFallbackModal}
      />

      <NotificationModal 
        visible={showNotificationModal} 
        onClose={() => {
          setShowNotificationModal(false);
          setShowSuccessModal(true);
          setTimeout(() => setShowSuccessLottie(true), 300);
        }} 
      />

      <UnsavedChangesModal
        visible={showUnsavedModal}
        themeColors={themeColors}
        insets={insets}
        styles={styles}
        t={t}
        onStay={() => setShowUnsavedModal(false)}
        onLeave={() => {
          isForceLeavingRef.current = true;
          setShowUnsavedModal(false);
          setSelectedFlowers([]);
          setMessageCard({ message: '', senderName: '', recipientName: '' });
          setTimeout(() => navigation.goBack(), 50);
        }}
      />

      <YouTubeSearchModal
        visible={showSpotifyModal}
        onClose={() => setShowSpotifyModal(false)}
        onSongSelect={(song) => {
          setSelectedSong(song);
          soundRef.current?.unloadAsync();
          soundRef.current = null;
          setIsPlayingSong(false);
        }}
        currentSong={selectedSong}
      />

      <HelpModal
        visible={showHelp}
        themeColors={themeColors}
        insets={insets}
        SCREEN_H={SCREEN_H}
        styles={styles}
        helpOverlay={helpOverlay}
        helpSlideAnim={helpSlideAnim}
        helpPanY={helpPanY}
        helpPanHandlers={helpPanHandlers}
        onHelpScroll={onHelpScroll}
        onClose={() => setShowHelp(false)}
      />

      <AIGenerationResultModal
        aiGenerationResult={aiGenerationResult}
        setAiGenerationResult={setAiGenerationResult}
        insets={insets}
        styles={styles}
        t={t}
        showAlert={showAlert}
        setSelectedFlowers={setSelectedFlowers}
        setMessageCard={setMessageCard}
        setSearchQuery={setSearchQuery}
        setCurrentStep={setCurrentStep}
        background={background}
      />

      <SarahInfoModal
        visible={showSarahInfo}
        onClose={() => setShowSarahInfo(false)}
        styles={styles}
      />
`;

// we just find the block from {/* ══════════════════════ MODALS ══════════════════════ */} down to {showShareModal && (
content = content.replace(
  /\{\/\* ══════════════════════ MODALS ══════════════════════ \*\/\}[\s\S]+?\{\/\* Share Modal \*\/\}/,
  modalsReplacement + '\n      {/* Share Modal */}'
);

fs.writeFileSync(path, content, 'utf8');
console.log('Update successful');
