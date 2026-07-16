import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, Modal, Text, TouchableOpacity, Animated, PanResponder, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { useNavigation, useRoute, useIsFocused } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LottieView from 'lottie-react-native';
import Toast from 'react-native-toast-message';
import { Play, RotateCcw, X, Lock } from 'lucide-react-native';
import * as Haptics from '../utils/haptics';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { LinearGradient } from 'expo-linear-gradient';
import { soundManager } from '../utils/soundManager';

const floatingItems = [
  { y: 2200, x: 60, speed: 1.2, type: 'petal' },
  { y: 1850, x: 340, speed: 0.8, type: 'leaf' },
  { y: 1500, x: 40, speed: 1.5, type: 'petal' },
  { y: 1100, x: 350, speed: 1.0, type: 'leaf' },
  { y: 750, x: 50, speed: 1.3, type: 'petal' },
  { y: 350, x: 330, speed: 0.9, type: 'petal' },
];

const leavesData = [
  { d: "M250,2000 C270,1980 280,1990 270,2010 Z", level: 2 },
  { d: "M180,1650 C160,1670 150,1660 160,1640 Z", level: 3 },
  { d: "M250,1400 C270,1380 280,1390 270,1410 Z", level: 4 },
  { d: "M160,1120 C140,1140 130,1130 140,1110 Z", level: 5 },
  { d: "M230,820 C250,800 260,810 250,830 Z", level: 6 },
  { d: "M140,550 C120,570 110,560 120,540 Z", level: 7 },
  { d: "M250,250 C270,230 280,240 270,260 Z", level: 8 },
];

const pathSegments = [
  { type: 'line', x: 220, y: 2300, level: 1 },
  { type: 'curve', cx1: 220, cy1: 2225, cx2: 320, cy2: 2225, x: 320, y: 2150, level: 2 },
  { type: 'curve', cx1: 320, cy1: 2065, cx2: 140, cy2: 2065, x: 140, y: 1980, level: 2 },
  { type: 'curve', cx1: 140, cy1: 1900, cx2: 100, cy2: 1900, x: 100, y: 1820, level: 3 },
  { type: 'curve', cx1: 100, cy1: 1735, cx2: 280, cy2: 1735, x: 280, y: 1650, level: 3 },
  { type: 'curve', cx1: 280, cy1: 1565, cx2: 320, cy2: 1565, x: 320, y: 1480, level: 4 },
  { type: 'curve', cx1: 320, cy1: 1395, cx2: 180, cy2: 1395, x: 180, y: 1310, level: 4 },
  { type: 'curve', cx1: 180, cy1: 1230, cx2: 100, cy2: 1230, x: 100, y: 1150, level: 5 },
  { type: 'curve', cx1: 100, cy1: 1070, cx2: 260, cy2: 1070, x: 260, y: 990, level: 5 },
  { type: 'curve', cx1: 260, cy1: 910,  cx2: 320, cy2: 910,  x: 320, y: 830, level: 6 },
  { type: 'curve', cx1: 320, cy1: 750,  cx2: 180, cy2: 750,  x: 180, y: 670, level: 6 },
  { type: 'curve', cx1: 180, cy1: 590,  cx2: 100, cy2: 590,  x: 100, y: 510, level: 7 },
  { type: 'curve', cx1: 100, cy1: 430,  cx2: 260, cy2: 430,  x: 260, y: 350, level: 7 },
  { type: 'curve', cx1: 260, cy1: 270,  cx2: 320, cy2: 270,  x: 320, y: 190, level: 8 },
  { type: 'curve', cx1: 320, cy1: 115,  cx2: 180, cy2: 115,  x: 180, y: 40, level: 8 },
  { type: 'line', x: 220, y: -50, level: 9 },
];

const mapData = [
  { id: 1, levelNumber: 1, title: 'Petal Path', y: 2300, x: 220 },
  { id: 't1', type: 'treasure', y: 2150, x: 320, requiredLevel: 2 },
  { id: 2, levelNumber: 2, title: 'Bloom Trail', y: 1980, x: 140 },
  { id: 't2', type: 'treasure', y: 1820, x: 100, requiredLevel: 3 },
  { id: 3, levelNumber: 3, title: 'Thorn Way', y: 1650, x: 280 },
  { id: 't3', type: 'treasure', y: 1480, x: 320, requiredLevel: 4 },
  { id: 4, levelNumber: 4, title: 'Wild Bloom', y: 1310, x: 180 },
  { id: 't4', type: 'treasure', y: 1150, x: 100, requiredLevel: 5 },
  { id: 5, levelNumber: 5, title: 'Floral Summit', y: 990, x: 260 },
  { id: 't5', type: 'treasure', y: 830, x: 320, requiredLevel: 6 },
  { id: 6, levelNumber: 6, title: 'Dew Drop', y: 670, x: 180 },
  { id: 't6', type: 'treasure', y: 510, x: 100, requiredLevel: 7 },
  { id: 7, levelNumber: 7, title: 'Rosy Bower', y: 350, x: 260 },
  { id: 't7', type: 'treasure', y: 190, x: 320, requiredLevel: 8 },
  { id: 8, levelNumber: 8, title: 'Secret Garden', y: 40, x: 180 },
];

const buildPathD = (maxLevelLimit: number) => {
  let d = 'M 220,2450';
  for (const seg of pathSegments) {
    if (seg.level > maxLevelLimit) break;
    if (seg.type === 'line') {
      d += ` L ${seg.x},${seg.y}`;
    } else {
      d += ` C ${seg.cx1},${seg.cy1} ${seg.cx2},${seg.cy2} ${seg.x},${seg.y}`;
    }
  }
  return d;
};

// Parallax floating petal/leaf element
const FloatingPetal = React.memo(({ scrollY, item }: any) => {
  const { y, x, speed, type } = item;
  
  const translateX = scrollY.interpolate({
    inputRange: [y - 600, y + 600],
    outputRange: [-30 * speed, 30 * speed],
    extrapolate: 'clamp',
  });
  
  const rotate = scrollY.interpolate({
    inputRange: [y - 600, y + 600],
    outputRange: ['-25deg', '25deg'],
    extrapolate: 'clamp',
  });
  
  const translateY = scrollY.interpolate({
    inputRange: [y - 600, y + 600],
    outputRange: [-15 * speed, 15 * speed],
    extrapolate: 'clamp',
  });

  const isPetal = type === 'petal';

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: y,
        left: x,
        transform: [
          { translateX },
          { translateY },
          { rotate },
        ],
        pointerEvents: 'none',
        zIndex: 5,
        opacity: 0.85,
      }}
    >
      {isPetal ? (
        <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 2C6 6 4 13 8 18C11 21.5 16 21 18.5 17.5C21 14 18 6 12 2Z"
            fill="#FFA4B4"
            opacity="0.9"
          />
          <Path
            d="M12 2C8 6 7 11 9.5 15C10.5 16.5 12 17.5 13.5 16.5"
            stroke="#FF8DA1"
            strokeWidth="0.8"
          />
        </Svg>
      ) : (
        <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <Path
            d="M2 22C6 18 10 18 16 20C21 21 22 17 21 14C19 8 13 4 2 2C2 2 4 13 8 19C10 21 2 22 2 22Z"
            fill="#A2D149"
            opacity="0.8"
          />
          <Path
            d="M2 22C7 16 13 11 21 14"
            stroke="#6B9E49"
            strokeWidth="1"
          />
        </Svg>
      )}
    </Animated.View>
  );
});
FloatingPetal.displayName = 'FloatingPetal';

// Rotating pedestal for chests
const TreasurePedestal = React.memo(({ isUnlocked }: any) => {
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 8000,
        useNativeDriver: true,
      })
    ).start();
  }, [rotateAnim]);

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.pedestalContainer}>
      <Animated.View
        style={[
          styles.pedestalRing,
          {
            transform: [{ rotate: rotation }],
            borderColor: isUnlocked ? '#f4c74a' : '#c8bfae',
            opacity: isUnlocked ? 0.7 : 0.3,
          },
        ]}
      />
      <View
        style={[
          styles.pedestalCore,
          {
            backgroundColor: isUnlocked ? 'rgba(244, 199, 74, 0.15)' : 'rgba(200, 191, 174, 0.05)',
          },
        ]}
      />
    </View>
  );
});
TreasurePedestal.displayName = 'TreasurePedestal';

// Stepper node component
const LevelNode = React.memo(({ node, status, onPress, isDark }: any) => {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (status === 'current') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [status, pulseAnim]);

  const haloScale1 = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.4],
  });
  const haloOpacity1 = pulseAnim.interpolate({
    inputRange: [0, 0.8, 1],
    outputRange: [0.6, 0.2, 0],
  });

  const haloScale2 = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.65],
  });
  const haloOpacity2 = pulseAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.4, 0.1, 0],
  });

  return (
    <View style={styles.nodeWrapper}>
      {status === 'current' && (
        <>
          <Animated.View
            style={[
              styles.activeHalo,
              {
                transform: [{ scale: haloScale1 }],
                opacity: haloOpacity1,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.activeHalo,
              {
                transform: [{ scale: haloScale2 }],
                opacity: haloOpacity2,
              },
            ]}
          />
          <View style={styles.playBadge}>
            <Text style={styles.playBadgeText}>PLAY</Text>
          </View>
        </>
      )}

      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.nodeButton,
          status === 'done' && styles.buttonDone,
          status === 'current' && styles.buttonCurrent,
          status === 'locked' && styles.buttonLocked,
          pressed && status !== 'locked' && styles.buttonPressed,
        ]}
      >
        {status === 'done' && (
          <View style={styles.buttonContent}>
            <Text style={{ fontSize: 28, textShadowColor: 'rgba(0,0,0,0.15)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }}>⭐</Text>
          </View>
        )}

        {status === 'current' && (
          <View style={styles.buttonContent}>
            <Play size={26} color="#fff" fill="#fff" style={{ marginLeft: 3 }} />
          </View>
        )}

        {status === 'locked' && (
          <View style={styles.buttonContent}>
            <Lock size={18} color={isDark ? '#8a8279' : '#a8a096'} />
            <Text style={[styles.lockedLevelNum, { color: isDark ? '#8a8279' : '#a8a096' }]}>{node.levelNumber}</Text>
          </View>
        )}
      </Pressable>

      <View style={styles.titleWrapper}>
        {status === 'done' && (
          <>
            <View style={styles.starsContainer}>
              <Text style={styles.completedStarMini}>⭐</Text>
              <Text style={styles.completedStarMini}>⭐</Text>
              <Text style={styles.completedStarMini}>⭐</Text>
            </View>
            <Text style={[styles.nodeLevelText, { color: isDark ? '#bfaea0' : '#8c7d70' }]}>Level {node.levelNumber}</Text>
            <Text style={[styles.nodeTitleText, { color: isDark ? '#e6dfd7' : '#57483a' }]}>{node.title}</Text>
          </>
        )}

        {status === 'current' && (
          <>
            <Text style={[styles.nodeLevelTextActive, { color: '#7ac143' }]}>Level {node.levelNumber}</Text>
            <Text style={[styles.nodeTitleTextActive, { color: isDark ? '#fff' : '#2b1f14' }]}>{node.title}</Text>
          </>
        )}

        {status === 'locked' && (
          <>
            <Text style={[styles.nodeLevelTextLocked, { color: isDark ? '#6b5e53' : '#b8aea4' }]}>Level {node.levelNumber}</Text>
            <Text style={[styles.nodeTitleTextLocked, { color: isDark ? '#5c5046' : '#a89d93' }]}>{node.title}</Text>
          </>
        )}
      </View>
    </View>
  );
});
LevelNode.displayName = 'LevelNode';

export default function GameLevelPathScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const isFocused = useIsFocused();
  const { isDark } = useTheme();
  const { currentUser } = useAuth();

  const { gameId, title } = route.params || { gameId: 'sort', title: 'Blossom Sort' };

  const [unlockedLevel, setUnlockedLevel] = useState(1);
  const [stars, setStars] = useState(0);
  const [prevUnlocked, setPrevUnlocked] = useState(null);

  const [claimedChests, setClaimedChests] = useState([]);
  const [showChestModal, setShowChestModal] = useState(false);
  const [showLevelSelectModal, setShowLevelSelectModal] = useState(false);
  const [stagesSlideAnim] = useState(() => new Animated.Value(0));
  const stagesPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => g.dy > 5,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) stagesSlideAnim.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 80 || g.vy > 0.5) {
          Animated.timing(stagesSlideAnim, { toValue: 600, duration: 250, useNativeDriver: true }).start(() => {
            stagesSlideAnim.setValue(0);
            setShowLevelSelectModal(false);
          });
        } else {
          Animated.spring(stagesSlideAnim, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [rewardAmount, setRewardAmount] = useState({ ai: 0, email: 0 });

  const [showConfetti, setShowConfetti] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  const loadProgress = useCallback(async () => {
    try {
      const storedLevel = await AsyncStorage.getItem(`unlocked_level_${gameId}`);
      if (storedLevel) {
        const levelNum = parseInt(storedLevel, 10);
        
        // Fire confetti if we leveled up!
        if (prevUnlocked !== null && levelNum > prevUnlocked) {
          setTimeout(() => {
            setShowConfetti(true);
            soundManager.play('confetti_pop');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }, 600);
        }
        
        setPrevUnlocked(levelNum);
        setUnlockedLevel(levelNum);
        setStars((levelNum - 1) * 3);
      } else {
        setPrevUnlocked(1);
        setUnlockedLevel(1);
        setStars(0);
      }

      // Load claimed chests
      const chests = ['t1', 't2', 't3', 't4', 't5', 't6', 't7'];
      const statuses = await AsyncStorage.multiGet(chests.map(id => `chest_claimed_${id}`));
      const claimed = statuses.filter(([_, val]) => val === 'true').map(([id]) => id.replace('chest_claimed_', ''));
      setClaimedChests(claimed);
    } catch (e) {
      console.log('Error loading progress:', e);
    }
  }, [gameId, prevUnlocked]);

  useEffect(() => {
    // Load data immediately
    const loadData = async () => {
      try {
        const ul = await AsyncStorage.getItem(`unlocked_level_${gameId}`);
        if (ul) setUnlockedLevel(parseInt(ul));
        
        const keys = await AsyncStorage.getAllKeys();
        const claimed = keys.filter(k => k.startsWith('chest_claimed_')).map(k => k.replace('chest_claimed_', ''));
        setClaimedChests(claimed);
      } catch (e) {
        console.log(e);
      }
    };
    loadData();
    if (isFocused) {
      loadProgress();
    }
  }, [isFocused, gameId, loadProgress]);

  const handleLevelPress = (levelNum) => {
    if (levelNum > unlockedLevel) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const screenName = gameId === 'sort' ? 'BlossomSortGame' : 'BlossomLinkGame';
    navigation.navigate(screenName, { levelIndex: levelNum - 1 });
  };

  const levelTitles = [
    'Petal Path',
    'Bloom Trail',
    'Thorn Way',
    'Wild Bloom',
    'Floral Summit',
    'Dew Drop',
    'Rosy Bower',
    'Secret Garden'
  ];

  const currentLevelTitle = levelTitles[(unlockedLevel - 1) % levelTitles.length];

  const handleResetProgress = async () => {
    try {
      setShowResetConfirmModal(false);
      setShowLevelSelectModal(false);
      await AsyncStorage.setItem(`unlocked_level_${gameId}`, '1');
      setUnlockedLevel(1);
      setStars(0);
      setPrevUnlocked(1);
      Toast.show({ type: 'success', text1: 'Progress Reset', text2: 'Started over at Level 1!' });
    } catch (e) {
      console.log('Error resetting', e);
    }
  };

  const openChestReward = async (chestId) => {
    if (!currentUser) {
      return;
    }
    
    let maxAi = 6;
    let maxEmail = 3;

    // Increase max limit as level increases
    const levelBonus = Math.floor((unlockedLevel - 1) / 3);
    maxAi += levelBonus * 2;
    maxEmail += levelBonus;

    // Randomize rewards, inclusive of 0
    let aiReward = Math.floor(Math.random() * (maxAi + 1));
    let emailReward = Math.floor(Math.random() * (maxEmail + 1));
    
    // 25% chance to get nothing for a fun gacha feel
    if (Math.random() < 0.25) {
      aiReward = 0;
      emailReward = 0;
    }
    
    setRewardAmount({ ai: aiReward, email: emailReward });
    setShowChestModal(true);

    try {
      const currentAi = await AsyncStorage.getItem('ai_bouquet_credits');
      const currentEmail = await AsyncStorage.getItem('email_credits');
      
      const newAi = (currentAi ? parseInt(currentAi) : 0) + aiReward;
      const newEmail = (currentEmail ? parseInt(currentEmail) : 0) + emailReward;

      await AsyncStorage.multiSet([
        ['ai_bouquet_credits', newAi.toString()],
        ['email_credits', newEmail.toString()],
        [`chest_claimed_${chestId}`, 'true']
      ]);

      // Update Firestore profile
      const userRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        await setDoc(userRef, {
          aiCredits: (data.aiCredits || 0) + aiReward,
          emailCredits: (data.emailCredits || 0) + emailReward
        }, { merge: true });
      } else {
        await setDoc(userRef, {
          aiCredits: aiReward,
          emailCredits: emailReward
        }, { merge: true });
      }

      setClaimedChests(prev => [...prev, chestId]);
    } catch (e) {
      console.log('Error saving rewards', e);
    }
  };

  const scrollViewRef = useRef(null);

  useEffect(() => {
    setTimeout(() => {
      if (scrollViewRef.current) {
        const activeNode = mapData.find(n => n.levelNumber === unlockedLevel);
        if (activeNode) {
          scrollViewRef.current.scrollTo({ y: Math.max(0, activeNode.y - 300), animated: true });
        }
      }
    }, 500);
  }, [unlockedLevel]);

  return (
    <View style={styles.container}>
      <LinearGradient 
        colors={isDark ? ['#1a2a1d', '#233326'] : ['#f5fbf0', '#ede5d8']} 
        style={styles.bgImage} 
      />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Floating Controls */}
        <TouchableOpacity 
          style={[styles.floatingBackBtn, { backgroundColor: isDark ? 'rgba(35, 51, 38, 0.85)' : 'rgba(249, 244, 234, 0.85)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]} 
          onPress={() => {
            soundManager.play('button_click');
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.goBack();
          }}
          activeOpacity={0.8}
        >
          <X size={24} color={isDark ? '#e3d6cb' : '#6b5c51'} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.floatingStarCounter, { backgroundColor: isDark ? 'rgba(35, 51, 38, 0.85)' : 'rgba(249, 244, 234, 0.85)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]} 
          onPress={() => {
            soundManager.play('button_click');
            setShowLevelSelectModal(true);
          }}
          activeOpacity={0.8}
        >
          <Text style={{ fontFamily: 'Poppins-Bold', fontSize: 14, color: isDark ? '#e3d6cb' : '#6b5c51' }}>⭐ {stars}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.floatingNextStage, unlockedLevel <= 11 && styles.lockedStage]} 
          onPress={() => {
            if (unlockedLevel > 11) {
              soundManager.play('button_click');
              Toast.show({ type: 'success', text1: 'Coming Soon!', text2: 'Next stage is under development. Stay tuned!' });
            } else {
              soundManager.play('locked_error');
              Toast.show({ type: 'error', text1: 'Locked', text2: 'Finish all levels to unlock' });
            }
          }}
          activeOpacity={0.8}
        >
          {unlockedLevel > 11 ? (
            <LinearGradient
              colors={['#7ac143', '#5a9b2b']}
              style={StyleSheet.absoluteFillObject}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            />
          ) : null}
          <Text style={{ fontFamily: 'Poppins-Bold', fontSize: 14, color: unlockedLevel <= 11 ? '#a89d92' : '#fff', zIndex: 1 }}>
            Next Stage
          </Text>
        </TouchableOpacity>

        <Animated.ScrollView 
          ref={scrollViewRef}
          style={styles.webview} 
          showsVerticalScrollIndicator={false}
          bounces={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
        >
          <View style={{ width: 428, height: 2600, alignSelf: 'center' }}>
            <View style={styles.subtitleContainer}>
              <Text style={[styles.journeyTitle, { color: isDark ? '#e3d6cb' : '#6b5c51' }]}>{title} Journey</Text>
              <Text style={[styles.journeySubtitle, { color: isDark ? '#a89d92' : '#9c8e82' }]}>Level {unlockedLevel}: {currentLevelTitle}</Text>
            </View>

            {/* SVG Vines */}
            <Svg viewBox="0 0 428 2600" width="428" height="2600" style={{ position: 'absolute', top: 0, left: 0 }}>
              <Defs>
                <SvgLinearGradient id="activeVineGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                  <Stop offset="0%" stopColor="#7ac143" />
                  <Stop offset="50%" stopColor="#8bb953" />
                  <Stop offset="100%" stopColor="#a3e054" />
                </SvgLinearGradient>
              </Defs>
              
              {/* Background Path (Shadow) */}
              <Path
                d={buildPathD(9)}
                fill="none"
                stroke="rgba(0, 0, 0, 0.06)"
                strokeWidth={24}
                strokeLinecap="round"
                transform="translate(0, 4)"
              />
              
              {/* Background Path (Locked / Woody Base) */}
              <Path
                d={buildPathD(9)}
                fill="none"
                stroke={isDark ? '#3d342c' : '#d4cbbf'}
                strokeWidth={20}
                strokeLinecap="round"
              />
              
              {/* Active Foreground Path (Blooming Vine) */}
              <Path
                d={buildPathD(unlockedLevel)}
                fill="none"
                stroke="url(#activeVineGrad)"
                strokeWidth={14}
                strokeLinecap="round"
              />
              
              {/* Leaf Details along the vine */}
              {leavesData.map((leaf, index) => {
                const isUnlocked = unlockedLevel >= leaf.level;
                return (
                  <Path
                    key={index}
                    d={leaf.d}
                    fill={isUnlocked ? '#8bb953' : (isDark ? '#473d35' : '#c8bfae')}
                  />
                );
              })}
            </Svg>

            {/* Floating Parallax elements */}
            {floatingItems.map((item, index) => (
              <FloatingPetal key={`petal-${index}`} scrollY={scrollY} item={item} />
            ))}

            {/* Nodes */}
            {mapData.map((node) => {
              if (node.type === 'treasure') {
                const isClaimed = claimedChests.includes(node.id);
                const isUnlocked = node.requiredLevel ? unlockedLevel >= node.requiredLevel : true;
                return (
                  <View 
                    key={node.id}
                    style={[styles.nodeAbsolute, { top: node.y, left: node.x }]}
                  >
                    <TreasurePedestal isUnlocked={isUnlocked} />

                    <TouchableOpacity 
                      style={styles.chestTouchArea}
                      onPress={() => {
                        if (!currentUser) {
                          soundManager.play('locked_error');
                          Toast.show({ type: 'info', text1: 'Login Required', text2: 'Please login to claim treasures!' });
                          return;
                        }
                        if (node.requiredLevel && node.requiredLevel > unlockedLevel) {
                          soundManager.play('locked_error');
                          Toast.show({ type: 'info', text1: 'Chest Locked', text2: 'Complete more levels to open this chest!' });
                          return;
                        }
                        if (isClaimed) {
                          soundManager.play('locked_error');
                          Toast.show({ type: 'info', text1: 'Already Claimed', text2: 'You have already claimed this treasure.' });
                          return;
                        }
                        soundManager.play('chest_open');
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        openChestReward(node.id);
                      }}
                      activeOpacity={0.8}
                    >
                      <LottieView
                        source={require('../../assets/animations/chest.json')}
                        autoPlay={false}
                        loop={false}
                        style={{ width: 100, height: 100 }}
                        progress={isClaimed ? 1 : 0}
                      />
                    </TouchableOpacity>
                  </View>
                );
              }

              let status = 'locked';
              if (node.levelNumber < unlockedLevel) status = 'done';
              else if (node.levelNumber === unlockedLevel) status = 'current';

              return (
                <View
                  key={node.id}
                  style={[styles.nodeAbsolute, { top: node.y, left: node.x }]}
                >
                  <LevelNode
                    node={node}
                    status={status}
                    isDark={isDark}
                    onPress={() => {
                      if (status === 'done') {
                        soundManager.play('locked_error');
                        Toast.show({ type: 'info', text1: 'Level Completed', text2: "You've already completed this level." });
                      } else if (status === 'current') {
                        soundManager.play('button_click');
                        handleLevelPress(node.levelNumber);
                      } else {
                        soundManager.play('button_click');
                        handleLevelPress(node.levelNumber);
                      }
                    }}
                  />
                </View>
              );
            })}
          </View>
        </Animated.ScrollView>
      </SafeAreaView>

      {/* Fullscreen Chest Reward Modal */}
      <Modal
        visible={showChestModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowChestModal(false)}
      >
        <View style={styles.modalOverlay}>
          <LinearGradient
            colors={isDark ? ['#3c312b', '#251c16'] : ['#fffaeb', '#ffe3c0']}
            style={styles.rewardModalContent}
          >
            <LottieView
              source={{ uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/animations/confetti.json' }}
              autoPlay
              loop={false}
              style={[StyleSheet.absoluteFillObject, { zIndex: -1, opacity: 0.8 }]}
            />

            <Text style={styles.rewardTitle}>
              {(rewardAmount.ai > 0 || rewardAmount.email > 0) ? 'Treasure Found!' : 'Better luck next time!'}
            </Text>
            
            <Text style={styles.rewardDesc}>
              {(rewardAmount.ai > 0 || rewardAmount.email > 0) 
                ? 'You have discovered some special rewards to use in DigiBouquet!' 
                : 'This chest was empty. Keep playing for more chances!'}
            </Text>

            {(rewardAmount.ai > 0 || rewardAmount.email > 0) && (
              <View style={styles.rewardsRow}>
                {rewardAmount.ai > 0 && (
                  <View style={[styles.rewardBox, { backgroundColor: isDark ? '#4b3f36' : '#fff9f0', borderColor: isDark ? '#5c4e43' : '#fbd7b5' }]}>
                    <Text style={[styles.rewardValue, { color: isDark ? '#ffca80' : '#d28020' }]}>+{rewardAmount.ai}</Text>
                    <Text style={[styles.rewardLabel, { color: isDark ? '#d0bba6' : '#94663c' }]}>AI Bouquets</Text>
                  </View>
                )}
                {rewardAmount.email > 0 && (
                  <View style={[styles.rewardBox, { backgroundColor: isDark ? '#4b3f36' : '#fff9f0', borderColor: isDark ? '#5c4e43' : '#fbd7b5' }]}>
                    <Text style={[styles.rewardValue, { color: isDark ? '#ffca80' : '#d28020' }]}>+{rewardAmount.email}</Text>
                    <Text style={[styles.rewardLabel, { color: isDark ? '#d0bba6' : '#94663c' }]}>Email Credits</Text>
                  </View>
                )}
              </View>
            )}

            <TouchableOpacity 
              style={[styles.claimBtn, { backgroundColor: isDark ? '#6b8941' : '#7ac143' }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setShowChestModal(false);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.claimBtnText}>
                {(rewardAmount.ai > 0 || rewardAmount.email > 0) ? 'Claim Rewards' : 'Continue'}
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </Modal>

      {/* Level Select & Reset Modal as Bottom Sheet */}
      <Modal
        visible={showLevelSelectModal}
        transparent={true}
        animationType="none"
        onRequestClose={() => setShowLevelSelectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setShowLevelSelectModal(false)}
          />

          {/* Centered X button above the sheet */}
          <TouchableOpacity
            style={{
              position: 'absolute',
              bottom: 420,
              alignSelf: 'center',
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: isDark ? 'rgba(50, 40, 35, 0.95)' : 'rgba(255,255,255,0.9)',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOpacity: 0.15,
              shadowRadius: 6,
              elevation: 6,
              zIndex: 20,
            }}
            onPress={() => setShowLevelSelectModal(false)}
          >
            <X size={18} color={isDark ? '#e3d6cb' : '#6b5c51'} />
          </TouchableOpacity>

          <Animated.View
            {...stagesPanResponder.panHandlers}
            style={[
              styles.modalContent,
              {
                padding: 20,
                position: 'absolute',
                bottom: 0,
                width: '100%',
                borderBottomLeftRadius: 0,
                borderBottomRightRadius: 0,
                paddingBottom: 40,
                transform: [{ translateY: stagesSlideAnim }],
                backgroundColor: isDark ? '#221913' : '#fff',
                borderTopWidth: 1.5,
                borderColor: isDark ? '#3a2e26' : '#e5d5c5',
              },
            ]}
          >
            {/* Drag handle */}
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: isDark ? '#5c4e44' : '#d0c3b6', alignSelf: 'center', marginBottom: 16 }} />

            <Text style={[styles.rewardTitle, { marginTop: 0, marginBottom: 16, color: isDark ? '#ffca80' : '#4a3d31' }]}>Stages</Text>

            <View style={{ width: '100%', gap: 10, marginBottom: 24 }}>
              {/* Stage 1 — Unlocked */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  setShowLevelSelectModal(false);
                  if (scrollViewRef.current) {
                    scrollViewRef.current.scrollTo({ y: 2000, animated: true });
                  }
                }}
                style={{
                  flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#1e2b1d' : '#f0f5ec',
                  padding: 12, borderRadius: 16, borderWidth: 1.5, borderColor: isDark ? '#4b752b' : '#8bb953'
                }}
              >
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#8bb953', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Text style={{ fontFamily: 'Poppins-Bold', fontSize: 13, color: '#fff' }}>1</Text>
                </View>
                <Text style={{ fontFamily: 'Poppins-Bold', fontSize: 14, color: isDark ? '#e3d6cb' : '#4a3d31', flex: 1 }}>Blossom Garden</Text>
              </TouchableOpacity>

              {/* Stage 2 — Locked */}
              <View style={{ opacity: 0.6 }}>
                <View
                  style={{
                    flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#1b1410' : '#f5f3f0',
                    padding: 12, borderRadius: 16, borderWidth: 1.5, borderColor: isDark ? '#30251e' : '#e5d5c5'
                  }}
                >
                  <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#d0c3b6', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                    <Lock size={15} color="#fff" />
                  </View>
                  <Text style={{ fontFamily: 'Poppins-Bold', fontSize: 14, color: isDark ? '#8a7d73' : '#a89a8c', flex: 1 }}>Crystal Grove</Text>
                  <Text style={{ fontFamily: 'Manrope-Medium', fontSize: 11, color: '#c0b4a8' }}>Locked</Text>
                </View>
              </View>

              {/* Stage 3 — Unlocked or Locked */}
              {unlockedLevel > 16 ? (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    setShowLevelSelectModal(false);
                    soundManager.play('button_click');
                    Toast.show({ type: 'success', text1: 'Coming Soon!', text2: 'Next stage is under development. Stay tuned!' });
                  }}
                  style={{
                    flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f5ec',
                    padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#8bb953'
                  }}
                >
                  <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#8bb953', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                    <Text style={{ fontFamily: 'Poppins-Bold', fontSize: 13, color: '#fff' }}>3</Text>
                  </View>
                  <Text style={{ fontFamily: 'Poppins-Bold', fontSize: 14, color: '#4a3d31', flex: 1 }}>Moonlit Garden</Text>
                  <Text style={{ fontFamily: 'Manrope-Medium', fontSize: 11, color: '#8bb953' }}>Unlocked</Text>
                </TouchableOpacity>
              ) : (
                <View style={{ opacity: 0.6 }}>
                  <View
                    style={{
                      flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f3f0',
                      padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#e5d5c5'
                    }}
                  >
                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#d0c3b6', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                      <Lock size={15} color="#fff" />
                    </View>
                    <Text style={{ fontFamily: 'Poppins-Bold', fontSize: 14, color: '#a89a8c', flex: 1 }}>Moonlit Garden</Text>
                    <Text style={{ fontFamily: 'Manrope-Medium', fontSize: 11, color: '#c0b4a8' }}>Locked</Text>
                  </View>
                </View>
              )}

              {/* Stage 4 — Unlocked or Locked */}
              {unlockedLevel > 24 ? (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    setShowLevelSelectModal(false);
                    soundManager.play('button_click');
                    Toast.show({ type: 'success', text1: 'Coming Soon!', text2: 'Next stage is under development. Stay tuned!' });
                  }}
                  style={{
                    flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f5ec',
                    padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#8bb953'
                  }}
                >
                  <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#8bb953', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                    <Text style={{ fontFamily: 'Poppins-Bold', fontSize: 13, color: '#fff' }}>4</Text>
                  </View>
                  <Text style={{ fontFamily: 'Poppins-Bold', fontSize: 14, color: '#4a3d31', flex: 1 }}>Starfall Meadow</Text>
                  <Text style={{ fontFamily: 'Manrope-Medium', fontSize: 11, color: '#8bb953' }}>Unlocked</Text>
                </TouchableOpacity>
              ) : (
                <View style={{ opacity: 0.6 }}>
                  <View
                    style={{
                      flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f3f0',
                      padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#e5d5c5'
                    }}
                  >
                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#d0c3b6', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                      <Lock size={15} color="#fff" />
                    </View>
                    <Text style={{ fontFamily: 'Poppins-Bold', fontSize: 14, color: '#a89a8c', flex: 1 }}>Starfall Meadow</Text>
                    <Text style={{ fontFamily: 'Manrope-Medium', fontSize: 11, color: '#c0b4a8' }}>Locked</Text>
                  </View>
                </View>
              )}
            </View>

            <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
              <TouchableOpacity
                style={[styles.claimBtn, { backgroundColor: isDark ? '#2b211a' : '#fdfaf5', borderWidth: 1.5, borderColor: isDark ? '#3d3027' : '#e5d5c5', flex: 1 }]}
                onPress={() => setShowLevelSelectModal(false)}
              >
                <Text style={[styles.claimBtnText, { color: isDark ? '#d0bba6' : '#6b5c51' }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.claimBtn, { backgroundColor: '#E05252', flex: 1 }]}
                onPress={() => {
                  soundManager.play('button_click');
                  setShowResetConfirmModal(true);
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                  <RotateCcw size={18} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.claimBtnText}>Reset</Text>
                </View>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Reset Confirmation Custom CSS-like Dialog */}
      <Modal
        visible={showResetConfirmModal}
        transparent={true}
        animationType="fade"
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.8)' }]}>
          <View style={[
            styles.modalContent, 
            { 
              width: '75%', 
              padding: 24,
              backgroundColor: isDark ? '#221913' : '#fff',
              borderWidth: isDark ? 1.5 : 0,
              borderColor: isDark ? '#3c2f25' : 'transparent',
            }
          ]}>
            <RotateCcw size={40} color="#E05252" style={{ marginBottom: 16 }} />
            <Text style={{ fontFamily: 'Poppins-Bold', fontSize: 20, color: isDark ? '#ffca80' : '#4a3d31', textAlign: 'center', marginBottom: 8 }}>
              Are you sure?
            </Text>
            <Text style={{ fontFamily: 'Manrope-Medium', fontSize: 14, color: isDark ? '#d0bba6' : '#6b5c51', textAlign: 'center', marginBottom: 24 }}>
              This will reset your level progress back to 1. Your claimed treasures will remain unlocked.
            </Text>
            
            <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
              <TouchableOpacity 
                style={{ flex: 1, backgroundColor: isDark ? '#2b211a' : '#fdfaf5', borderWidth: 1.5, borderColor: isDark ? '#3d3027' : '#e5d5c5', paddingVertical: 12, borderRadius: 12, alignItems: 'center' }}
                onPress={() => {
                  soundManager.play('button_click');
                  setShowResetConfirmModal(false);
                }}
              >
                <Text style={{ fontFamily: 'Manrope-Bold', fontSize: 14, color: isDark ? '#d0bba6' : '#6b5c51' }}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={{ flex: 1, backgroundColor: '#E05252', paddingVertical: 12, borderRadius: 12, alignItems: 'center' }}
                onPress={() => {
                  soundManager.play('button_click');
                  handleResetProgress();
                }}
              >
                <Text style={{ fontFamily: 'Manrope-Bold', fontSize: 14, color: '#fff' }}>Reset</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {showConfetti && (
        <LottieView
          source={{ uri: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/animations/confetti.json' }}
          autoPlay
          loop={false}
          style={[StyleSheet.absoluteFillObject, { zIndex: 1000, pointerEvents: 'none' }]}
          onAnimationFinish={() => setShowConfetti(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF5EF',
  },
  bgImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.9,
  },
  safeArea: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    width: '85%',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  rewardModalContent: {
    width: '85%',
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#d28020',
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 10,
    borderWidth: 2,
    borderColor: '#fbd7b5',
    overflow: 'hidden',
  },
  rewardTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    color: '#8bb953',
    marginTop: -20,
    marginBottom: 8,
  },
  rewardDesc: {
    fontFamily: 'Manrope-Medium',
    fontSize: 14,
    color: '#6b5c51',
    textAlign: 'center',
    marginBottom: 20,
  },
  rewardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 24,
    gap: 12,
  },
  rewardBox: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  rewardValue: {
    fontFamily: 'Poppins-Bold',
    fontSize: 22,
    color: '#f4c74a',
    marginBottom: 4,
  },
  rewardLabel: {
    fontFamily: 'Manrope-Bold',
    fontSize: 12,
    color: '#9c8e82',
    textAlign: 'center',
  },
  claimBtn: {
    backgroundColor: '#8bb953',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimBtnText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 16,
    color: '#fff',
  },
  floatingBackBtn: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    zIndex: 100,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 4,
  },
  floatingStarCounter: {
    position: 'absolute',
    top: 50,
    right: 20,
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 4,
  },
  floatingNextStage: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    height: 50,
    paddingHorizontal: 32,
    backgroundColor: '#7ac143',
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    shadowColor: '#7ac143',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    overflow: 'hidden',
  },
  lockedStage: {
    backgroundColor: '#d1cfc9',
    shadowColor: 'transparent',
    elevation: 0,
  },
  subtitleContainer: {
    position: 'absolute',
    top: 2400,
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  journeyTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 28,
    marginBottom: 2,
  },
  journeySubtitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 14,
  },
  nodeAbsolute: {
    position: 'absolute',
    width: 0,
    height: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  nodeWrapper: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeHalo: {
    position: 'absolute',
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: 'rgba(122, 193, 67, 0.35)',
    zIndex: -1,
  },
  playBadge: {
    position: 'absolute',
    top: -14,
    backgroundColor: '#f4c74a',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#fff',
    zIndex: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  playBadgeText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 10,
    color: '#937119',
    letterSpacing: 0.5,
  },
  nodeButton: {
    width: 74,
    height: 74,
    borderRadius: 37,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDone: {
    backgroundColor: '#FF8DA1',
    borderBottomWidth: 6,
    borderBottomColor: '#D96277',
  },
  buttonCurrent: {
    backgroundColor: '#7ac143',
    borderBottomWidth: 6,
    borderBottomColor: '#5a9b2b',
  },
  buttonLocked: {
    backgroundColor: '#E3DBD3',
    borderBottomWidth: 6,
    borderBottomColor: '#ADA69E',
  },
  buttonPressed: {
    borderBottomWidth: 2,
    transform: [{ translateY: 4 }],
  },
  buttonContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedLevelNum: {
    fontFamily: 'Poppins-Bold',
    fontSize: 11,
    marginTop: 1,
  },
  titleWrapper: {
    position: 'absolute',
    top: 80,
    width: 160,
    alignItems: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 2,
    marginBottom: 2,
  },
  completedStarMini: {
    fontSize: 10,
  },
  nodeLevelText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nodeTitleText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 14,
    textAlign: 'center',
  },
  nodeLevelTextActive: {
    fontFamily: 'Manrope-Bold',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nodeTitleTextActive: {
    fontFamily: 'Poppins-Bold',
    fontSize: 16,
    textAlign: 'center',
  },
  nodeLevelTextLocked: {
    fontFamily: 'Manrope-Bold',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nodeTitleTextLocked: {
    fontFamily: 'Poppins-Bold',
    fontSize: 13,
    textAlign: 'center',
  },
  pedestalContainer: {
    position: 'absolute',
    width: 90,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: -1,
  },
  pedestalRing: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 2.5,
    borderStyle: 'dashed',
  },
  pedestalCore: {
    position: 'absolute',
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  chestTouchArea: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
