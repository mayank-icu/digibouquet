import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  StatusBar,
  ScrollView,
 Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, RotateCcw, Award, Play, ChevronRight, Check, Pointer } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from '../utils/haptics';
import { useTheme } from '../contexts/ThemeContext';
import { soundManager } from '../utils/soundManager';
import { getFlowerImage } from '../utils/bouquetData';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// Available flowers for the game
const GAME_FLOWERS = [
  { id: 'rose', name: 'Rose', color: '#DC143C' },
  { id: 'sunflower', name: 'Sunflower', color: '#FFD700' },
  { id: 'tulip', name: 'Tulip', color: '#FFB6C1' },
  { id: 'daisy', name: 'Daisy', color: '#FFFFFF' },
  { id: 'lily', name: 'Lily', color: '#FFFFF0' },
  { id: 'orchid', name: 'Orchid', color: '#9370DB' },
];

// Pre-defined Levels: Each array represents baskets. Each basket has a list of flower IDs.
const LEVELS = [
  // Level 1: 3 baskets (2 with mixed flowers, 1 empty)
  {
    baskets: [
      ['rose', 'sunflower', 'rose', 'sunflower'],
      ['sunflower', 'rose', 'sunflower', 'rose'],
      [],
    ],
  },
  // Level 2: 4 baskets (3 mixed, 1 empty)
  {
    baskets: [
      ['rose', 'tulip', 'rose', 'tulip'],
      ['sunflower', 'sunflower', 'tulip', 'rose'],
      ['tulip', 'rose', 'sunflower', 'sunflower'],
      [],
    ],
  },
  // Level 3: 5 baskets (3 mixed, 2 empty)
  {
    baskets: [
      ['daisy', 'rose', 'daisy', 'rose'],
      ['orchid', 'orchid', 'daisy', 'rose'],
      ['rose', 'daisy', 'orchid', 'orchid'],
      [],
      [],
    ],
  },
  // Level 4: 5 baskets (4 mixed, 1 empty)
  {
    baskets: [
      ['rose', 'sunflower', 'tulip', 'daisy'],
      ['daisy', 'rose', 'sunflower', 'tulip'],
      ['tulip', 'daisy', 'rose', 'sunflower'],
      ['sunflower', 'tulip', 'daisy', 'rose'],
      [],
    ],
  },
  // Level 5: 6 baskets (4 mixed, 2 empty)
  {
    baskets: [
      ['rose', 'sunflower', 'tulip', 'orchid'],
      ['orchid', 'rose', 'sunflower', 'tulip'],
      ['tulip', 'orchid', 'rose', 'sunflower'],
      ['sunflower', 'tulip', 'orchid', 'rose'],
      [],
      [],
    ],
  },
  // Level 6
  {
    baskets: [
      ['daisy', 'daisy', 'lily', 'tulip'],
      ['tulip', 'lily', 'daisy', 'tulip'],
      ['lily', 'tulip', 'lily', 'daisy'],
      [],
      [],
    ],
  },
  // Level 7
  {
    baskets: [
      ['rose', 'orchid', 'sunflower', 'rose'],
      ['orchid', 'sunflower', 'rose', 'orchid'],
      ['sunflower', 'rose', 'orchid', 'sunflower'],
      [],
      [],
    ],
  },
  // Level 8
  {
    baskets: [
      ['tulip', 'daisy', 'rose', 'lily'],
      ['rose', 'lily', 'tulip', 'daisy'],
      ['daisy', 'rose', 'lily', 'tulip'],
      ['lily', 'tulip', 'daisy', 'rose'],
      [],
      [],
    ],
  },
  // Level 9: 6 baskets, 5 types of flowers
  {
    baskets: [
      ['lily', 'orchid', 'rose', 'lily'],
      ['rose', 'lily', 'orchid', 'rose'],
      ['orchid', 'rose', 'lily', 'orchid'],
      ['sunflower', 'daisy', 'sunflower', 'daisy'],
      [],
      [],
    ],
  },
  // Level 10: 6 baskets, complex
  {
    baskets: [
      ['rose', 'tulip', 'daisy', 'orchid'],
      ['orchid', 'daisy', 'tulip', 'rose'],
      ['tulip', 'orchid', 'rose', 'daisy'],
      ['daisy', 'rose', 'orchid', 'tulip'],
      [],
      [],
    ],
  },
  // Level 11: 7 baskets, hardest
  {
    baskets: [
      ['rose', 'sunflower', 'lily', 'daisy'],
      ['daisy', 'lily', 'sunflower', 'rose'],
      ['lily', 'daisy', 'rose', 'sunflower'],
      ['sunflower', 'rose', 'daisy', 'lily'],
      ['orchid', 'tulip', 'orchid', 'tulip'],
      [],
      [],
    ],
  },
];

export default function BlossomSortGameScreen() {
  const navigation = useNavigation() as any;
  const route = useRoute() as any;
  const { theme: t, isDark } = useTheme();

  const [currentLevelIdx, setCurrentLevelIdx] = useState(Number(route.params?.levelIndex ?? 0));
  const [baskets, setBaskets] = useState<string[][]>([]);
  const [selectedBasketIdx, setSelectedBasketIdx] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [gameWon, setGameWon] = useState(false);
  const [showTutorial, setShowTutorial] = useState(currentLevelIdx === 0);

  // Animation values for each basket's top flower floating up
  const floatAnims = useRef<Animated.Value[]>([]).current;

  // Initialize level
  useEffect(() => {
    initLevel(currentLevelIdx);
  }, [currentLevelIdx]);

  const initLevel = (levelIdx: number) => {
    const levelData = LEVELS[levelIdx % LEVELS.length];
    // Deep copy to prevent mutating static level definition
    const initialBaskets = levelData.baskets.map((basket) => [...basket]);
    setBaskets(initialBaskets);
    setSelectedBasketIdx(null);
    setMoves(0);
    setGameWon(false);

    // Initialize animations
    floatAnims.length = 0;
    initialBaskets.forEach(() => {
      floatAnims.push(new Animated.Value(0));
    });
  };

  const handleSelectBasket = (index: number) => {
    if (gameWon) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (selectedBasketIdx === null) {
      // First selection: Select top flower if basket is not empty
      if (baskets[index].length > 0) {
        setSelectedBasketIdx(index);
        // Note: Removed the pop-up float animation as requested
      }
    } else {
      // Second selection: Move flower
      const sourceIdx = selectedBasketIdx;
      setSelectedBasketIdx(null);

      if (sourceIdx === index) {
        // Tapped same basket; deselect
        return;
      }

      const sourceBasket = baskets[sourceIdx];
      const destBasket = baskets[index];

      if (destBasket.length >= 4) {
        // Destination is full
        soundManager.play('locked_error');
        return;
      }

      const flowerToMove = sourceBasket[sourceBasket.length - 1];

      // Rule: Can move if destination is empty or top flower matches
      const canMove =
        destBasket.length === 0 ||
        destBasket[destBasket.length - 1] === flowerToMove;

      if (canMove) {
        const newBaskets = baskets.map((b, i) => {
          if (i === sourceIdx) {
            return b.slice(0, -1);
          }
          if (i === index) {
            return [...b, flowerToMove];
          }
          return b;
        });

        setBaskets(newBaskets);
        setMoves((m) => m + 1);

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Check if the target basket is now completed
        if (isBasketCompleted(newBaskets[index])) {
          soundManager.play('match_success');
        }

        // Check win condition on updated baskets
        checkWinCondition(newBaskets);
      } else {
        soundManager.play('locked_error');
      }
    }
  };

  const checkWinCondition = (currentBaskets: string[][]) => {
    // Game is won if every basket is either empty OR has exactly 4 of the same flower
    const isWon = currentBaskets.every((basket) => {
      if (basket.length === 0) return true;
      if (basket.length !== 4) return false;
      const first = basket[0];
      return basket.every((flower) => flower === first);
    });

    if (isWon) {
      setTimeout(async () => {
        setGameWon(true);
        soundManager.play('level_complete');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        try {
          const nextLevel = currentLevelIdx + 2;
          const storedLevelStr = await AsyncStorage.getItem('unlocked_level_sort');
          const currentUnlocked = storedLevelStr ? parseInt(storedLevelStr, 10) : 1;
          if (nextLevel > currentUnlocked) {
            await AsyncStorage.setItem('unlocked_level_sort', nextLevel.toString());
          }
        } catch (err) {
          console.log('Error saving level progression:', err);
        }
      }, 300);
    }
  };

  const isBasketCompleted = (basket: string[]) => {
    if (basket.length !== 4) return false;
    return basket.every((f) => f === basket[0]);
  };

  const handleNextLevel = () => {
    soundManager.play('button_click');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <LinearGradient 
        colors={isDark ? ['#1a2a22', '#2a342d'] : ['#f0f7f2', '#e8ede4']}
        style={StyleSheet.absoluteFillObject} 
      />
      <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]} edges={['top', 'bottom']}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

        {/* Header */}
        <View style={[styles.header, { borderBottomColor: 'rgba(0,0,0,0.1)' }]}>
          <TouchableOpacity onPress={() => { soundManager.play('button_click'); navigation.goBack(); }} style={styles.backBtn} activeOpacity={0.7}>
            <ArrowLeft size={22} color="#4a3d31" />
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={[styles.headerTitle, { color: '#4a3d31' }]}>Blossom Sort</Text>
            <Text style={{ fontFamily: 'Manrope-Bold', fontSize: 12, color: '#7a6a5a' }}>
              Level {currentLevelIdx + 1}  •  Moves: {moves}
            </Text>
          </View>
          <TouchableOpacity onPress={() => { soundManager.play('button_click'); initLevel(currentLevelIdx); }} style={styles.headerRightBtn} activeOpacity={0.7}>
            <RotateCcw size={20} color="#4a3d31" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Sorting Board */}
          <View style={styles.boardGrid}>
            {baskets.map((basket, basketIdx) => {
              const isSelected = selectedBasketIdx === basketIdx;
              const isCompleted = isBasketCompleted(basket);

              return (
                <Basket
                  key={basketIdx}
                  basketIdx={basketIdx}
                  basket={basket}
                  isSelected={isSelected}
                  isCompleted={isCompleted}
                  onSelect={handleSelectBasket}
                />
              );
            })}
          </View>
        </ScrollView>
      {/* Victory Modal Overlay */}
      {gameWon && (
        <View style={styles.winOverlay}>
          <LinearGradient 
            colors={['#fffaeb', '#ffe3c0']} 
            style={[styles.winCard, { overflow: 'hidden', borderWidth: 2, borderColor: '#fbd7b5', shadowColor: '#d28020' }]}
          >
            <LottieView
              source={{ uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/animations/confetti.json' }}
              autoPlay
              loop={false}
              style={[StyleSheet.absoluteFillObject, { zIndex: -1, opacity: 0.8 }]}
            />
            
            <View style={{ backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 40, padding: 12, marginBottom: 16 }}>
              <Award size={48} color="#d28020" />
            </View>
            
            <Text style={[styles.winTitle, { color: '#d28020', fontSize: 24 }]}>Level Complete!</Text>
            <Text style={[styles.winSubtitle, { color: '#94663c', fontSize: 16 }]}>
              Beautifully sorted in {moves} moves!
            </Text>

            <TouchableOpacity
              style={[styles.nextBtn, { backgroundColor: '#7ac143' }]}
              onPress={handleNextLevel}
              activeOpacity={0.8}
            >
              <Play size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.nextBtnText}>Next Level</Text>
              <ChevronRight size={18} color="#fff" />
            </TouchableOpacity>
          </LinearGradient>
        </View>
      )}
      {/* Animated Tutorial Overlay */}
      {showTutorial && (
        <View style={styles.winOverlay}>
          <View style={[styles.winCard, { backgroundColor: t.cardBg, width: '90%' }]}>
            <Text style={[styles.winTitle, { color: t.text, marginBottom: 16 }]}>How to Play</Text>
            
            <SortTutorialAnimation t={t} />

            <Text style={{ fontFamily: 'Manrope-Medium', fontSize: 14, color: t.textMuted, textAlign: 'center', marginBottom: 24, marginTop: 16 }}>
              Tap a tube to lift its top flower, then tap another tube to drop it. You can only stack matching flowers!
            </Text>

            <TouchableOpacity
              style={[styles.nextBtn, { backgroundColor: t.brand, width: '100%' }]}
              onPress={() => {
                soundManager.play('button_click');
                setShowTutorial(false);
              }}
            >
              <Text style={styles.nextBtnText}>Got it! Play</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
    </View>
  );
}

// ----------------------------------------------------------------------------
// BASKET COMPONENT
// ----------------------------------------------------------------------------
const Basket = ({ basket, basketIdx, isSelected, isCompleted, onSelect }: any) => {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => onSelect(basketIdx)}
      style={[
        styles.basketContainer,
      ]}
    >
      {/* Completed Check Badge */}
      {isCompleted && (
        <View style={styles.completedBadge}>
          <Check size={12} color="#fff" />
        </View>
      )}

      {/* Basket Slots - Glass Tube Effect */}
      <View style={[
        styles.basketInterior, 
        isSelected && { borderColor: '#4a3d31', borderWidth: 2 },
        isCompleted && { borderColor: '#8CA18F', backgroundColor: 'rgba(140,161,143,0.3)' }
      ]}>
        {/* Glass reflections */}
        <View style={styles.glassReflection} />
        <View style={styles.glassHighlight} />

        {/* Slots background lines */}
        <View style={styles.slotGrid}>
          {[0, 1, 2, 3].map((s) => (
            <View key={s} style={[styles.slotLine, { borderColor: 'rgba(255,255,255,0.2)' }]} />
          ))}
        </View>

        {/* Render Stacked Flowers (Upright!) */}
        {basket.map((flowerId: string, flowerIdx: number) => {
          return (
            <Animated.View
              key={flowerIdx}
              style={[
                styles.flowerWrapper,
                {
                  bottom: flowerIdx * 45 + 10,
                },
              ]}
            >
              <Image
                source={getFlowerImage(flowerId)}
                style={styles.flowerImgHorizontal}
                resizeMode="contain"
              />
            </Animated.View>
          );
        })}
      </View>
    </TouchableOpacity>
  );
};


// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------
// FULL TUTORIAL ANIMATION COMPONENT
// ----------------------------------------------------------------------------
function SortTutorialAnimation({ t }: { t: any }) {
  const pointerAnim = useRef(new Animated.ValueXY({ x: 30, y: 150 })).current;
  const pointerScale = useRef(new Animated.Value(1)).current;
  
  // Flower relative translations
  // Tube 0 (x: 40), Tube 1 (x: 110), Tube 2 (x: 180)
  // Bottom slot (y: 120), Top slot (y: 80)
  
  const f0 = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current; // T0 bottom (Daisy)
  const f1 = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;  // T0 top (Rose)
  const f2 = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current; // T1 bottom (Rose)
  const f3 = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;  // T1 top (Tulip)

  useEffect(() => {
    const pointerClick = () => Animated.sequence([
      Animated.timing(pointerScale, { toValue: 0.8, duration: 150, useNativeDriver: true }),
      Animated.timing(pointerScale, { toValue: 1, duration: 150, useNativeDriver: true })
    ]);

    const movePointer = (x: number, y: number) => 
      Animated.timing(pointerAnim, { toValue: { x, y }, duration: 400, useNativeDriver: true });

    const loop = Animated.sequence([
      Animated.delay(500),
      
      // Move 1: Tulip (T1 top) to T2
      // T1 top is at left 110, top 80
      // T2 bottom is at left 180, top 120
      // Float up to y: 30 means relative dy = 30 - 80 = -50
      // Over to T2 means relative dx = 180 - 110 = 70
      // Down to T2 bottom means relative dy = 120 - 80 = 40
      movePointer(110, 150),
      pointerClick(),
      Animated.timing(f3, { toValue: { x: 0, y: -50 }, duration: 200, useNativeDriver: true }), // float up
      movePointer(180, 150),
      pointerClick(),
      Animated.sequence([
        Animated.timing(f3, { toValue: { x: 70, y: -50 }, duration: 300, useNativeDriver: true }), // over
        Animated.timing(f3, { toValue: { x: 70, y: 40 }, duration: 200, useNativeDriver: true }) // down
      ]),

      // Move 2: Rose (T0 top) to T1 (on top of Rose)
      // T0 top is at left 40, top 80
      // T1 top is at left 110, top 80
      // Float up to y: 30 means relative dy = 30 - 80 = -50
      // Over to T1 means relative dx = 110 - 40 = 70
      // Down to T1 top means relative dy = 80 - 80 = 0
      movePointer(40, 150),
      pointerClick(),
      Animated.timing(f1, { toValue: { x: 0, y: -50 }, duration: 200, useNativeDriver: true }), // float up
      movePointer(110, 150),
      pointerClick(),
      Animated.sequence([
        Animated.timing(f1, { toValue: { x: 70, y: -50 }, duration: 300, useNativeDriver: true }), // over
        Animated.timing(f1, { toValue: { x: 70, y: 0 }, duration: 200, useNativeDriver: true }) // down
      ]),

      // Reset
      Animated.delay(1500),
      Animated.parallel([
        Animated.timing(pointerAnim, { toValue: { x: 30, y: 150 }, duration: 0, useNativeDriver: true }),
        Animated.timing(f0, { toValue: { x: 0, y: 0 }, duration: 0, useNativeDriver: true }),
        Animated.timing(f1, { toValue: { x: 0, y: 0 }, duration: 0, useNativeDriver: true }),
        Animated.timing(f2, { toValue: { x: 0, y: 0 }, duration: 0, useNativeDriver: true }),
        Animated.timing(f3, { toValue: { x: 0, y: 0 }, duration: 0, useNativeDriver: true }),
      ])
    ]);
    
    Animated.loop(loop).start();
  }, []);

  return (
    <View style={{ width: 260, height: 220, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 16, alignSelf: 'center', overflow: 'hidden', paddingTop: 60, position: 'relative' }}>
      
      {/* Tubes */}
      <View style={{ position: 'absolute', left: 32, bottom: 20, width: 60, height: 140, borderWidth: 2, borderColor: t.border, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, backgroundColor: 'rgba(255,255,255,0.4)' }} />
      <View style={{ position: 'absolute', left: 102, bottom: 20, width: 60, height: 140, borderWidth: 2, borderColor: t.border, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, backgroundColor: 'rgba(255,255,255,0.4)' }} />
      <View style={{ position: 'absolute', left: 172, bottom: 20, width: 60, height: 140, borderWidth: 2, borderColor: t.border, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, backgroundColor: 'rgba(255,255,255,0.4)' }} />

      {/* Flowers */}
      <Animated.View style={{ position: 'absolute', left: 40, top: 120, transform: [{ translateX: f0.x }, { translateY: f0.y }], zIndex: 10 }}>
        <Image source={getFlowerImage('daisy')} style={{ width: 45, height: 45 }} resizeMode="contain" />
      </Animated.View>
      <Animated.View style={{ position: 'absolute', left: 40, top: 80, transform: [{ translateX: f1.x }, { translateY: f1.y }], zIndex: 11 }}>
        <Image source={getFlowerImage('rose')} style={{ width: 45, height: 45 }} resizeMode="contain" />
      </Animated.View>
      <Animated.View style={{ position: 'absolute', left: 110, top: 120, transform: [{ translateX: f2.x }, { translateY: f2.y }], zIndex: 10 }}>
        <Image source={getFlowerImage('rose')} style={{ width: 45, height: 45 }} resizeMode="contain" />
      </Animated.View>
      <Animated.View style={{ position: 'absolute', left: 110, top: 80, transform: [{ translateX: f3.x }, { translateY: f3.y }], zIndex: 11 }}>
        <Image source={getFlowerImage('tulip')} style={{ width: 45, height: 45 }} resizeMode="contain" />
      </Animated.View>

      {/* Pointer */}
      <Animated.View style={{ 
        position: 'absolute', 
        left: 0,
        top: 0,
        transform: [
          { translateX: Animated.add(pointerAnim.x, new Animated.Value(20)) },
          { translateY: pointerAnim.y },
          { scale: pointerScale }
        ],
        zIndex: 20
      }}>
        <Pointer size={36} color={t.brand} fill="#fff" />
      </Animated.View>

    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: 'Manrope-SemiBold', fontSize: 17 },
  headerRightBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  statText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 13,
  },
  boardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 32,
  },
  basketContainer: {
    width: '30%',
    alignItems: 'center',
    padding: 2,
  },
  basketInterior: {
    width: '100%',
    height: 230,
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.9)',
    backgroundColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  glassReflection: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: '25%',
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  glassHighlight: {
    position: 'absolute',
    top: 0,
    right: 4,
    bottom: 0,
    width: 3,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 2,
  },
  slotGrid: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-around',
    paddingVertical: 10,
    opacity: 0.25,
  },
  slotLine: {
    width: '80%',
    alignSelf: 'center',
    borderBottomWidth: 1,
    borderStyle: 'dashed',
  },
  flowerWrapper: {
    position: 'absolute',
    width: '100%',
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flowerImgHorizontal: {
    width: 75,
    height: 75,
    // Rotation removed so it's upright!
  },
  basketLabel: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 11,
    marginTop: 8,
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  completedBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#8CA18F',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  infoBox: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  infoTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 14,
    marginBottom: 8,
  },
  infoDesc: {
    fontFamily: 'Manrope-Regular',
    fontSize: 12,
    lineHeight: 18,
  },
  winOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  winCard: {
    width: SCREEN_W * 0.8,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  winTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 20,
    marginBottom: 8,
  },
  winSubtitle: {
    fontFamily: 'Manrope-Medium',
    fontSize: 14,
    marginBottom: 24,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 14,
    width: '100%',
  },
  nextBtnText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 15,
    color: '#fff',
  },
});
