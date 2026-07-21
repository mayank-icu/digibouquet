import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Image } from 'expo-image';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  StatusBar,
  ScrollView,
  PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, RotateCcw, Award, Play, ChevronRight, Pointer, Hand } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from '../utils/haptics';
import { useTheme } from '../contexts/ThemeContext';
import { soundManager } from '../utils/soundManager';
import { getFlowerImage } from '../utils/bouquetData';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const FLOWERS = ['rose', 'sunflower', 'tulip', 'daisy', 'orchid'];

const TARGET_SCORES = [300, 600, 1000, 1400, 1900, 2500, 3200, 4200];

export default function BlossomLinkGameScreen() {
  const navigation = useNavigation() as any;
  const route = useRoute() as any;
  const { theme: t, isDark } = useTheme();

  const [currentLevel, setCurrentLevel] = useState(Number(route.params?.levelIndex ?? 0) + 1);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(25);
  const [grid, setGrid] = useState<string[][]>([]);
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>(null);
  const [gameWon, setGameWon] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const scoreRef = useRef(0);
  const timeoutsRef = useRef<any[]>([]);

  const safeSetTimeout = (fn: () => void, delay: number) => {
    const id = setTimeout(() => {
      timeoutsRef.current = timeoutsRef.current.filter((tid) => tid !== id);
      fn();
    }, delay);
    timeoutsRef.current.push(id);
    return id;
  };

  const clearAllTimeouts = () => {
    timeoutsRef.current.forEach((id) => clearTimeout(id));
    timeoutsRef.current = [];
  };

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  useEffect(() => {
    return () => {
      clearAllTimeouts();
    };
  }, []);

const currentGridSize = currentLevel <= 2 ? 4 : (currentLevel <= 4 ? 5 : (currentLevel <= 6 ? 6 : 7));

  const [showTutorial, setShowTutorial] = useState(currentLevel === 1);

  const checkMatches = (currentGrid: string[][]) => {
    const matchedIndices = new Set<string>();

    // Horizontal check
    for (let r = 0; r < currentGridSize; r++) {
      for (let c = 0; c < currentGridSize - 2; c++) {
        const val = currentGrid[r][c];
        if (val && val === currentGrid[r][c + 1] && val === currentGrid[r][c + 2]) {
          matchedIndices.add(`${r},${c}`);
          matchedIndices.add(`${r},${c + 1}`);
          matchedIndices.add(`${r},${c + 2}`);
        }
      }
    }

    // Vertical check
    for (let c = 0; c < currentGridSize; c++) {
      for (let r = 0; r < currentGridSize - 2; r++) {
        const val = currentGrid[r][c];
        if (val && val === currentGrid[r + 1][c] && val === currentGrid[r + 2][c]) {
          matchedIndices.add(`${r},${c}`);
          matchedIndices.add(`${r + 1},${c}`);
          matchedIndices.add(`${r + 2},${c}`);
        }
      }
    }

    return { matchedIndices, hasMatches: matchedIndices.size > 0 };
  };

  // Initialize board on mount
  useEffect(() => {
    initBoard();
  }, [currentLevel]);

  const hasPossibleMoves = (currentGrid: string[][]) => {
    for (let r = 0; r < currentGridSize; r++) {
      for (let c = 0; c < currentGridSize; c++) {
        if (c < currentGridSize - 1) {
          const tempGrid = currentGrid.map(row => [...row]);
          const temp = tempGrid[r][c];
          tempGrid[r][c] = tempGrid[r][c + 1];
          tempGrid[r][c + 1] = temp;
          if (checkMatches(tempGrid).hasMatches) return true;
        }
        if (r < currentGridSize - 1) {
          const tempGrid = currentGrid.map(row => [...row]);
          const temp = tempGrid[r][c];
          tempGrid[r][c] = tempGrid[r + 1][c];
          tempGrid[r + 1][c] = temp;
          if (checkMatches(tempGrid).hasMatches) return true;
        }
      }
    }
    return false;
  };

  const generatePlayableGrid = () => {
    let newGrid: string[][] = [];
    let isPlayable = false;
    let attempts = 0;
    while (!isPlayable && attempts < 20) {
      newGrid = [];
      for (let r = 0; r < currentGridSize; r++) {
        newGrid[r] = [];
        for (let c = 0; c < currentGridSize; c++) {
          let possibleFlowers = [...FLOWERS];
          if (c >= 2 && newGrid[r][c - 1] === newGrid[r][c - 2]) {
            possibleFlowers = possibleFlowers.filter((f) => f !== newGrid[r][c - 1]);
          }
          if (r >= 2 && newGrid[r - 1][c] === newGrid[r - 2][c]) {
            possibleFlowers = possibleFlowers.filter((f) => f !== newGrid[r - 1][c]);
          }
          newGrid[r].push(possibleFlowers[Math.floor(Math.random() * possibleFlowers.length)]);
        }
      }
      isPlayable = hasPossibleMoves(newGrid);
      attempts++;
    }
    return newGrid;
  };

  const initBoard = () => {
    clearAllTimeouts();
    const initialGrid = generatePlayableGrid();
    setGrid(initialGrid);
    scoreRef.current = 0;
    setScore(0);
    setMoves(Math.min(25 + (currentLevel - 1) * 2, 40));
    setGameWon(false);
    setGameOver(false);
    setSelectedCell(null);
    setIsProcessing(false);
  };


  const handleCellPress = async (r: number, c: number) => {
    if (gameOver || gameWon || isProcessing) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (!selectedCell) {
      setSelectedCell({ r, c });
    } else {
      const rDiff = Math.abs(r - selectedCell.r);
      const cDiff = Math.abs(c - selectedCell.c);
      const isAdjacent = (rDiff === 1 && cDiff === 0) || (rDiff === 0 && cDiff === 1);

      if (isAdjacent) {
        setIsProcessing(true);
        const sourceCell = selectedCell;
        setSelectedCell(null);

        const nextGrid = grid.map((row) => [...row]);
        const temp = nextGrid[sourceCell.r][sourceCell.c];
        nextGrid[sourceCell.r][sourceCell.c] = nextGrid[r][c];
        nextGrid[r][c] = temp;

        setGrid(nextGrid);
        safeSetTimeout(() => {
          processGridMatches(nextGrid, true, sourceCell, { r, c });
        }, 200);
      } else {
        setSelectedCell({ r, c });
      }
    }
  };

  const handleSwipe = (rIdx: number, cIdx: number, dir: 'RIGHT' | 'LEFT' | 'UP' | 'DOWN') => {
    if (gameOver || gameWon || isProcessing) return;

    let targetR = rIdx;
    let targetC = cIdx;

    if (dir === 'RIGHT') targetC += 1;
    if (dir === 'LEFT') targetC -= 1;
    if (dir === 'DOWN') targetR += 1;
    if (dir === 'UP') targetR -= 1;

    if (targetR >= 0 && targetR < currentGridSize && targetC >= 0 && targetC < currentGridSize) {
      setIsProcessing(true);
      setSelectedCell(null);
      
      const nextGrid = grid.map((row) => [...row]);
      const temp = nextGrid[rIdx][cIdx];
      nextGrid[rIdx][cIdx] = nextGrid[targetR][targetC];
      nextGrid[targetR][targetC] = temp;
      
      setGrid(nextGrid);
      
      safeSetTimeout(() => {
        processGridMatches(nextGrid, true, { r: rIdx, c: cIdx }, { r: targetR, c: targetC });
      }, 200);
    }
  };

  const processGridMatches = async (
    currentGrid: string[][],
    isPlayerMove = false,
    swapSrc?: { r: number; c: number },
    swapDst?: { r: number; c: number }
  ) => {
    const { matchedIndices, hasMatches } = checkMatches(currentGrid);

    if (hasMatches) {
      soundManager.play('match_success');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // 1. Calculate points
      const pointsEarned = matchedIndices.size * 30;
      const newScore = scoreRef.current + pointsEarned;
      scoreRef.current = newScore;
      setScore(newScore);

      // Check win condition
      const targetScore = TARGET_SCORES[(currentLevel - 1) % TARGET_SCORES.length];
      if (newScore >= targetScore) {
        setGameWon(true);
        soundManager.play('level_complete');
        try {
          const nextLevel = currentLevel + 1;
          const storedLevelStr = await AsyncStorage.getItem('unlocked_level_match3');
          const currentUnlocked = storedLevelStr ? parseInt(storedLevelStr, 10) : 1;
          if (nextLevel > currentUnlocked) {
            await AsyncStorage.setItem('unlocked_level_match3', nextLevel.toString());
          }
        } catch (err) {
          console.log('Error saving level progression:', err);
        }
      }

      // 2. Clear matches
      let afterClearGrid = currentGrid.map((row, r) =>
        row.map((val, c) => (matchedIndices.has(`${r},${c}`) ? '' : val))
      );
      setGrid(afterClearGrid);

      // Decrement moves if it's the user's initial swap
      if (isPlayerMove) {
        setMoves((m) => {
          const nextMoves = m - 1;
          if (nextMoves <= 0 && newScore < targetScore) {
            setGameOver(true);
            soundManager.play('locked_error');
          }
          return nextMoves;
        });
      }

      // 3. Fall down and refill recursively
      safeSetTimeout(() => {
        const afterCascadeGrid = applyGravityAndRefill(afterClearGrid);
        setGrid(afterCascadeGrid);
        // Recursive check for combo matches
        safeSetTimeout(() => {
          processGridMatches(afterCascadeGrid, false);
        }, 250);
      }, 250);
    } else {
      // If user swapped but got no match, swap back
      if (isPlayerMove && swapSrc && swapDst) {
        soundManager.play('locked_error');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const resetGrid = currentGrid.map((row) => [...row]);
        const temp = resetGrid[swapSrc.r][swapSrc.c];
        resetGrid[swapSrc.r][swapSrc.c] = resetGrid[swapDst.r][swapDst.c];
        resetGrid[swapDst.r][swapDst.c] = temp;
        setGrid(resetGrid);
        // Delay releasing lock until swap-back transition completes to avoid desync
        safeSetTimeout(() => {
          setIsProcessing(false);
        }, 200);
      } else {
        if (!hasPossibleMoves(currentGrid)) {
          // No possible moves, reshuffle board
          const newGrid = generatePlayableGrid();
          setGrid(newGrid);
        }
        setIsProcessing(false);
      }
    }
  };


  const applyGravityAndRefill = (currentGrid: string[][]) => {
    const nextGrid = currentGrid.map((row) => [...row]);

    for (let c = 0; c < currentGridSize; c++) {
      // Gather non-empty cells in the column
      const colCells: string[] = [];
      for (let r = currentGridSize - 1; r >= 0; r--) {
        if (nextGrid[r][c] !== '') {
          colCells.push(nextGrid[r][c]);
        }
      }

      // Re-fill column from bottom up
      let idx = 0;
      for (let r = currentGridSize - 1; r >= 0; r--) {
        if (idx < colCells.length) {
          nextGrid[r][c] = colCells[idx];
          idx++;
        } else {
          // Empty slots at top, generate random flower
          nextGrid[r][c] = FLOWERS[Math.floor(Math.random() * FLOWERS.length)];
        }
      }
    }

    return nextGrid;
  };

  const handleNextLevel = () => {
    soundManager.play('button_click');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.goBack();
  };

  const targetScore = TARGET_SCORES[(currentLevel - 1) % TARGET_SCORES.length];
  const progressPercent = Math.min((score / targetScore) * 100, 100);

  return (
    <View style={styles.container}>
      <LinearGradient 
        colors={isDark ? ['#2a222a', '#322d36'] : ['#fdf3fb', '#f8e7f1']}
        style={StyleSheet.absoluteFillObject} 
      />
      <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={t.bg} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: t.border }]}>
        <TouchableOpacity onPress={() => { soundManager.play('button_click'); navigation.goBack(); }} style={styles.backBtn} activeOpacity={0.7}>
          <ArrowLeft size={22} color={t.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: t.text }]}>Blossom Match</Text>
        <TouchableOpacity onPress={() => { soundManager.play('button_click'); initBoard(); }} style={styles.headerRightBtn} activeOpacity={0.7}>
          <RotateCcw size={20} color={t.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} scrollEnabled={false}>
        {/* Game Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: t.cardBg, borderColor: t.border }]}>
            <Award size={16} color={t.brand} style={{ marginRight: 6 }} />
            <Text style={[styles.statText, { color: t.text }]}>Level {currentLevel}</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: t.cardBg, borderColor: t.border }]}>
            <Text style={[styles.statText, { color: t.text }]}>Score: {score} / {targetScore}</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: t.cardBg, borderColor: t.border }]}>
            <Text style={[styles.statText, { color: t.text, fontWeight: 'bold' }]}>Moves: {moves}</Text>
          </View>
        </View>

        {/* Target Progress Bar */}
        <View style={[styles.progressBarBg, { backgroundColor: t.border }]}>
          <View
            style={[
              styles.progressBarFill,
              { backgroundColor: t.brand, width: `${progressPercent}%` },
            ]}
          />
        </View>

        {/* Puzzle Board Grid */}
        <View style={[styles.board, { backgroundColor: t.cardBg, borderColor: t.border }]}>
          {grid.map((row, rIdx) => (
            <View key={rIdx} style={styles.row}>
              {row.map((flowerId, cIdx) => {
                const isSelected = selectedCell?.r === rIdx && selectedCell?.c === cIdx;
                const isCellEmpty = flowerId === '';
                const cellSize = (SCREEN_W - 32 - 16 - (currentGridSize * 4)) / currentGridSize;

                return (
                  <SwipeableTile
                    key={cIdx}
                    rIdx={rIdx}
                    cIdx={cIdx}
                    flowerId={flowerId}
                    isSelected={isSelected}
                    cellSize={cellSize}
                    t={t}
                    onPress={handleCellPress}
                    onSwipe={handleSwipe}
                  />
                );
              })}
            </View>
          ))}
        </View>

      </ScrollView>

      {/* Win Modal Overlay */}
      {gameWon && (
        <View style={styles.overlay}>
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
            
            <Text style={[styles.winTitle, { color: '#d28020', fontSize: 24 }]}>Level Clear!</Text>
            <Text style={[styles.winSubtitle, { color: '#94663c', fontSize: 16 }]}>
              Linked {score} flowers beautifully!
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

      {/* Game Over Modal Overlay */}
      {gameOver && !gameWon && (
        <View style={styles.overlay}>
          <View style={[styles.winCard, { backgroundColor: t.cardBg }]}>
            <RotateCcw size={48} color="#E05252" style={{ marginBottom: 16 }} />
            <Text style={[styles.winTitle, { color: '#E05252' }]}>Out of Moves!</Text>
            <Text style={[styles.winSubtitle, { color: t.textMuted }]}>
              Target: {targetScore} | Score: {score}
            </Text>
            <TouchableOpacity
              style={[styles.nextBtn, { backgroundColor: t.brand }]}
              onPress={() => {
                soundManager.play('button_click');
                initBoard();
              }}
            >
              <RotateCcw size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.nextBtnText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Animated Tutorial Overlay */}
      {showTutorial && (
        <View style={[styles.overlay, { zIndex: 999 }]}>
          <View style={[styles.winCard, { backgroundColor: t.cardBg, width: '90%' }]}>
            <Text style={[styles.winTitle, { color: t.text, marginBottom: 16 }]}>How to Play</Text>
            
            <LinkTutorialAnimation t={t} />

            <Text style={[styles.infoDesc, { color: t.textMuted, textAlign: 'center', marginBottom: 24, marginTop: 16 }]}>
              Tap a flower, then tap where you want to place it! You can also SWIPE a flower in any direction to swap it. Link 3 or more to score!
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
// FULL TUTORIAL ANIMATION COMPONENT
// ----------------------------------------------------------------------------
function LinkTutorialAnimation({ t }: { t: any }) {
  const pointerAnim = useRef(new Animated.ValueXY({ x: 45, y: 135 })).current;
  const pointerScale = useRef(new Animated.Value(1)).current;
  
  const swapVal = useRef(new Animated.Value(0)).current;
  const matchScale = useRef(new Animated.Value(1)).current;
  const fallVal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.sequence([
      // Wait a moment
      Animated.delay(500),
      // Pointer presses down on (1,1) sunflower
      Animated.timing(pointerScale, { toValue: 0.8, duration: 150, useNativeDriver: true }),
      
      // Swap tiles visually while the pointer is dragging!
      Animated.parallel([
        // Pointer drags down to (2,1) rose
        Animated.timing(pointerAnim, { toValue: { x: 45, y: 195 }, duration: 400, useNativeDriver: true }),
        Animated.timing(swapVal, { toValue: 1, duration: 400, useNativeDriver: true })
      ]),
      
      // Pointer releases
      Animated.timing(pointerScale, { toValue: 1, duration: 150, useNativeDriver: true }),
      
      // Pointer moves away
      Animated.timing(pointerAnim, { toValue: { x: 140, y: 195 }, duration: 400, useNativeDriver: true }),
      
      // Match found! Streak & Shrink
      Animated.timing(matchScale, { toValue: 0, duration: 300, useNativeDriver: true }),
      
      // Fall down
      Animated.spring(fallVal, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true }),
      
      // Reset for loop
      Animated.delay(1200),
      Animated.parallel([
        Animated.timing(pointerAnim, { toValue: { x: 45, y: 135 }, duration: 0, useNativeDriver: true }),
        Animated.timing(swapVal, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.timing(matchScale, { toValue: 1, duration: 0, useNativeDriver: true }),
        Animated.timing(fallVal, { toValue: 0, duration: 0, useNativeDriver: true })
      ])
    ]);
    
    Animated.loop(loop).start();
  }, []);

  const CELL_SIZE = 50;
  const GAP = 8;
  const SIZE = CELL_SIZE + GAP;

  // Grid logical state:
  // Row 0: tulip (0), daisy (1), orchid (2)
  // Row 1: rose (3), sunflower (4), rose (5)
  // Row 2: sunflower (6), rose (7), daisy (8)
  
  // We want to swap (1,1) (idx 4) with (2,1) (idx 7).
  // This makes Row 1: rose, rose, rose.
  
  return (
    <View style={{ width: SIZE * 3, height: SIZE * 3, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 16, alignSelf: 'center', overflow: 'hidden' }}>
      
      {/* New Row that falls from above */}
      <Animated.View style={{ position: 'absolute', width: CELL_SIZE, height: CELL_SIZE, left: 0, top: -SIZE, transform: [{ translateY: fallVal.interpolate({ inputRange: [0, 1], outputRange: [0, SIZE] }) }] }}>
        <View style={[styles.cell, { width: CELL_SIZE, height: CELL_SIZE }]}><Image source={getFlowerImage('sunflower')} style={styles.flowerImg} resizeMode="contain" /></View>
      </Animated.View>
      <Animated.View style={{ position: 'absolute', width: CELL_SIZE, height: CELL_SIZE, left: SIZE, top: -SIZE, transform: [{ translateY: fallVal.interpolate({ inputRange: [0, 1], outputRange: [0, SIZE] }) }] }}>
        <View style={[styles.cell, { width: CELL_SIZE, height: CELL_SIZE }]}><Image source={getFlowerImage('tulip')} style={styles.flowerImg} resizeMode="contain" /></View>
      </Animated.View>
      <Animated.View style={{ position: 'absolute', width: CELL_SIZE, height: CELL_SIZE, left: SIZE*2, top: -SIZE, transform: [{ translateY: fallVal.interpolate({ inputRange: [0, 1], outputRange: [0, SIZE] }) }] }}>
        <View style={[styles.cell, { width: CELL_SIZE, height: CELL_SIZE }]}><Image source={getFlowerImage('daisy')} style={styles.flowerImg} resizeMode="contain" /></View>
      </Animated.View>

      {/* Row 0: tulip, daisy, orchid */}
      <Animated.View style={{ position: 'absolute', width: CELL_SIZE, height: CELL_SIZE, left: 0, top: 0, transform: [{ translateY: fallVal.interpolate({ inputRange: [0, 1], outputRange: [0, SIZE] }) }] }}>
        <View style={[styles.cell, { width: CELL_SIZE, height: CELL_SIZE }]}><Image source={getFlowerImage('tulip')} style={styles.flowerImg} resizeMode="contain" /></View>
      </Animated.View>
      {/* Tile 1: daisy */}
      <Animated.View style={{ position: 'absolute', width: CELL_SIZE, height: CELL_SIZE, left: SIZE, top: 0, transform: [{ translateY: fallVal.interpolate({ inputRange: [0, 1], outputRange: [0, SIZE] }) }] }}>
        <View style={[styles.cell, { width: CELL_SIZE, height: CELL_SIZE }]}><Image source={getFlowerImage('daisy')} style={styles.flowerImg} resizeMode="contain" /></View>
      </Animated.View>
      {/* Tile 2: orchid */}
      <Animated.View style={{ position: 'absolute', width: CELL_SIZE, height: CELL_SIZE, left: SIZE*2, top: 0, transform: [{ translateY: fallVal.interpolate({ inputRange: [0, 1], outputRange: [0, SIZE] }) }] }}>
        <View style={[styles.cell, { width: CELL_SIZE, height: CELL_SIZE }]}><Image source={getFlowerImage('orchid')} style={styles.flowerImg} resizeMode="contain" /></View>
      </Animated.View>

      {/* MATCH ROW (Row 1) */}
      {/* Tile 3: rose */}
      <Animated.View style={{ position: 'absolute', width: CELL_SIZE, height: CELL_SIZE, left: 0, top: SIZE, transform: [{ scale: matchScale }] }}>
        <View style={[styles.cell, { width: CELL_SIZE, height: CELL_SIZE }]}><Image source={getFlowerImage('rose')} style={styles.flowerImg} resizeMode="contain" /></View>
      </Animated.View>
      
      {/* Tile 4: sunflower (Swaps down with Tile 7) */}
      <Animated.View style={{ position: 'absolute', width: CELL_SIZE, height: CELL_SIZE, left: SIZE, top: SIZE, transform: [{ translateY: swapVal.interpolate({ inputRange: [0, 1], outputRange: [0, SIZE] }) }] }}>
        <View style={[styles.cell, { width: CELL_SIZE, height: CELL_SIZE }]}><Image source={getFlowerImage('sunflower')} style={styles.flowerImg} resizeMode="contain" /></View>
      </Animated.View>

      {/* Tile 5: rose */}
      <Animated.View style={{ position: 'absolute', width: CELL_SIZE, height: CELL_SIZE, left: SIZE*2, top: SIZE, transform: [{ scale: matchScale }] }}>
        <View style={[styles.cell, { width: CELL_SIZE, height: CELL_SIZE }]}><Image source={getFlowerImage('rose')} style={styles.flowerImg} resizeMode="contain" /></View>
      </Animated.View>


      {/* Row 2 */}
      {/* Tile 6: sunflower */}
      <Animated.View style={{ position: 'absolute', width: CELL_SIZE, height: CELL_SIZE, left: 0, top: SIZE*2 }}>
        <View style={[styles.cell, { width: CELL_SIZE, height: CELL_SIZE }]}><Image source={getFlowerImage('sunflower')} style={styles.flowerImg} resizeMode="contain" /></View>
      </Animated.View>

      {/* Tile 7: rose (Swaps up to Row 1, then matches!) */}
      <Animated.View style={{ position: 'absolute', width: CELL_SIZE, height: CELL_SIZE, left: SIZE, top: SIZE*2, transform: [
          { translateY: swapVal.interpolate({ inputRange: [0, 1], outputRange: [0, -SIZE] }) },
          { scale: matchScale }
        ] }}>
        <View style={[styles.cell, { width: CELL_SIZE, height: CELL_SIZE }]}><Image source={getFlowerImage('rose')} style={styles.flowerImg} resizeMode="contain" /></View>
      </Animated.View>

      {/* Tile 8: daisy */}
      <Animated.View style={{ position: 'absolute', width: CELL_SIZE, height: CELL_SIZE, left: SIZE*2, top: SIZE*2 }}>
        <View style={[styles.cell, { width: CELL_SIZE, height: CELL_SIZE }]}><Image source={getFlowerImage('daisy')} style={styles.flowerImg} resizeMode="contain" /></View>
      </Animated.View>
      
      <Animated.View style={{ position: 'absolute', top: SIZE + 10, left: 15, opacity: matchScale, transform: [{ scale: swapVal.interpolate({ inputRange: [0, 0.9, 1], outputRange: [0, 0, 1] }) }]}}>
        <Text style={{ fontFamily: 'Poppins-Bold', fontSize: 24, color: '#E5AC15', textShadowColor: '#fff', textShadowRadius: 4, textShadowOffset: {width: 0, height: 0} }}>STREAK!</Text>
      </Animated.View>

      <Animated.View style={{ 
        position: 'absolute', 
        left: 0, 
        top: 0,
        transform: [
          { translateX: pointerAnim.x },
          { translateY: pointerAnim.y },
          { scale: pointerScale }
        ]
      }}>
        <Pointer size={36} color={t.brand} fill="#fff" />
      </Animated.View>
    </View>
  );
}

// ----------------------------------------------------------------------------
// SWIPEABLE TILE WRAPPER
// ----------------------------------------------------------------------------
const SwipeableTile = ({ flowerId, isSelected, cellSize, t, rIdx, cIdx, onPress, onSwipe }: any) => {
  const onSwipeRef = useRef(onSwipe);
  const onPressRef = useRef(onPress);

  // Update refs on every render to ensure PanResponder always uses latest closures
  onSwipeRef.current = onSwipe;
  onPressRef.current = onPress;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (evt, gesture) => Math.abs(gesture.dx) > 10 || Math.abs(gesture.dy) > 10,
      onMoveShouldSetPanResponderCapture: () => false,
      onPanResponderTerminationRequest: () => false,
      onPanResponderRelease: (evt, gesture) => {
        const { dx, dy } = gesture;
        if (Math.abs(dx) < 15 && Math.abs(dy) < 15) {
          onPressRef.current(rIdx, cIdx);
          return;
        }
        if (Math.abs(dx) > Math.abs(dy)) {
          if (dx > 15) onSwipeRef.current(rIdx, cIdx, 'RIGHT');
          else if (dx < -15) onSwipeRef.current(rIdx, cIdx, 'LEFT');
        } else {
          if (dy > 15) onSwipeRef.current(rIdx, cIdx, 'DOWN');
          else if (dy < -15) onSwipeRef.current(rIdx, cIdx, 'UP');
        }
      },
      onPanResponderTerminate: (evt, gesture) => {
        const { dx, dy } = gesture;
        if (Math.abs(dx) < 15 && Math.abs(dy) < 15) {
          onPressRef.current(rIdx, cIdx);
          return;
        }
        if (Math.abs(dx) > Math.abs(dy)) {
          if (dx > 15) onSwipeRef.current(rIdx, cIdx, 'RIGHT');
          else if (dx < -15) onSwipeRef.current(rIdx, cIdx, 'LEFT');
        } else {
          if (dy > 15) onSwipeRef.current(rIdx, cIdx, 'DOWN');
          else if (dy < -15) onSwipeRef.current(rIdx, cIdx, 'UP');
        }
      }
    })
  ).current;

  return (
    <Animated.View {...panResponder.panHandlers} style={[
      styles.cell,
      { borderColor: t.border, width: cellSize, height: cellSize },
      isSelected && { borderColor: t.brand, backgroundColor: t.brand + '20', borderWidth: 2 },
    ]}>
      {flowerId !== '' && (
        <Image
          source={getFlowerImage(flowerId)}
          style={styles.flowerImg}
          resizeMode="contain"
        />
      )}
    </Animated.View>
  );
};

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
    marginBottom: 16,
  },
  statBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  statText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 12,
  },
  progressBarBg: {
    height: 8,
    width: '100%',
    borderRadius: 4,
    marginBottom: 24,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  board: {
    width: SCREEN_W - 32,
    height: SCREEN_W - 32,
    borderRadius: 30,
    borderWidth: 3,
    padding: 14,
    justifyContent: 'space-around',
    marginBottom: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderColor: 'rgba(255,255,255,0.6)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  cell: {
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderColor: 'rgba(255,255,255,0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
  },
  flowerImg: {
    width: '85%',
    height: '85%',
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
  overlay: {
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
