import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, StatusBar, Modal, Text, TouchableOpacity, ActivityIndicator, InteractionManager, Animated, PanResponder , ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import ErrorBoundary from '../components/ErrorBoundary';
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

const chestJsonStr = JSON.stringify(require('../../assets/animations/chest.json'));

export default function GameLevelPathScreen() {
  const navigation = useNavigation() as any;
  const route = useRoute() as any;
  const isFocused = useIsFocused();
  const { theme: t, isDark } = useTheme();
  const { currentUser } = useAuth();

  const { gameId, title } = route.params || { gameId: 'sort', title: 'Blossom Sort' };

  const [unlockedLevel, setUnlockedLevel] = useState(1);
  const [stars, setStars] = useState(0);
  const [prevUnlocked, setPrevUnlocked] = useState<number | null>(null);

  const [claimedChests, setClaimedChests] = useState<string[]>([]);
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
  const [activeChestId, setActiveChestId] = useState<string | null>(null);

  const webviewRef = useRef<WebView>(null);

  const [webviewLoaded, setWebviewLoaded] = useState(false);

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
  }, [isFocused, gameId]);

  const loadProgress = async () => {
    try {
      const storedLevel = await AsyncStorage.getItem(`unlocked_level_${gameId}`);
      if (storedLevel) {
        const levelNum = parseInt(storedLevel, 10);
        
        // Fire confetti if we leveled up!
        if (prevUnlocked !== null && levelNum > prevUnlocked) {
          setTimeout(() => {
            webviewRef.current?.injectJavaScript('if(window.fireConfetti) window.fireConfetti(); true;');
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
      const chests = ['t1', 't2', 't3', 't4', 't5'];
      const statuses = await AsyncStorage.multiGet(chests.map(id => `chest_claimed_${id}`));
      const claimed = statuses.filter(([_, val]) => val === 'true').map(([id]) => id.replace('chest_claimed_', ''));
      setClaimedChests(claimed);
    } catch (e) {
      console.log('Error loading progress:', e);
    }
  };

  const handleLevelPress = (levelNum: number) => {
    if (levelNum > unlockedLevel) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const screenName = gameId === 'sort' ? 'BlossomSortGame' : 'BlossomLinkGame';
    navigation.navigate(screenName, { levelIndex: levelNum - 1 });
  };

  const onMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'levelPress') {
        soundManager.play('button_click');
        handleLevelPress(data.levelNum);
      } else if (data.type === 'goBack') {
        soundManager.play('button_click');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.goBack();
      } else if (data.type === 'chestPress') {
        soundManager.play('chest_open');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        openChestReward(data.id);
      } else if (data.type === 'chestLocked') {
        soundManager.play('locked_error');
        Toast.show({ type: 'info', text1: 'Chest Locked', text2: 'Complete more levels to open this chest!' });
      } else if (data.type === 'nextStagePress') {
        if (unlockedLevel > 11) {
          soundManager.play('button_click');
          Toast.show({ type: 'success', text1: 'Coming Soon!', text2: 'Next stage is under development. Stay tuned!' });
        } else {
          soundManager.play('locked_error');
          Toast.show({ type: 'error', text1: 'Locked', text2: 'Finish all levels to unlock' });
        }
      } else if (data.type === 'notLoggedIn') {
        soundManager.play('locked_error');
        Toast.show({ type: 'info', text1: 'Login Required', text2: 'Please login to claim treasures!' });
      } else if (data.type === 'alreadyClaimed') {
        soundManager.play('locked_error');
        Toast.show({ type: 'info', text1: 'Already Claimed', text2: 'You have already claimed this treasure.' });
      } else if (data.type === 'starPress') {
        soundManager.play('button_click');
        setShowLevelSelectModal(true);
      } else if (data.type === 'confettiSound') {
        soundManager.play('confetti_pop');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else if (data.type === 'alreadyCompleted') {
        soundManager.play('locked_error');
        Toast.show({ type: 'info', text1: 'Level Completed', text2: "You've already completed this level." });
      }
    } catch (err) {
      console.log('WebView message error:', err);
    }
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
      webviewRef.current?.reload();
    } catch (e) {
      console.log('Error resetting', e);
    }
  };

  const openChestReward = async (chestId: string) => {
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
    setActiveChestId(chestId);
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

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
      <style>
        :root {
          --text-main: ${isDark ? '#e3d6cb' : '#6b5c51'};
          --text-light: ${isDark ? '#a89d92' : '#9c8e82'};
          --green-path: #8bb953;
          --green-path-dark: #63853b;
          --green-active: #7ac143;
          --green-active-glow: rgba(122, 193, 67, 0.4);
          --wood-main: #af8160;
          --wood-dark: #815638;
          --wood-light: #c89d7c;
          --gold: #f4c74a;
          --chest-bg: #d2a479;
          --flower-pink: #f28b9d;
          --flower-purple: #9a76b9;
          --flower-yellow: #f9d559;
          --header-bg: ${isDark ? 'rgba(24, 47, 29, 0.85)' : 'rgba(249, 244, 234, 0.85)'};
        }

        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          -webkit-tap-highlight-color: transparent;
        }

        body {
          /* Background is transparent to show React Native Image behind WebView */
          background-color: transparent;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          overflow: hidden;
        }

        .app-container {
          width: 100%;
          height: 100vh;
          background-color: transparent;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        /* Floating Circular Controls */
        .floating-back-btn {
          position: absolute;
          top: 20px;
          left: 20px;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background-color: var(--header-bg);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 2px solid rgba(0,0,0,0.05);
          color: var(--text-main);
          display: flex;
          justify-content: center;
          align-items: center;
          cursor: pointer;
          box-shadow: 0 4px 10px rgba(0,0,0,0.15);
          z-index: 1000;
          transition: transform 0.2s;
        }
        .floating-back-btn:active {
          transform: scale(0.9);
        }

        .floating-star-counter {
          position: absolute;
          top: 20px;
          right: 20px;
          height: 32px;
          padding: 0 10px;
          border-radius: 16px;
          background-color: var(--header-bg);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 2px solid rgba(0,0,0,0.05);
          display: flex;
          align-items: center;
          box-shadow: 0 4px 10px rgba(0,0,0,0.15);
          z-index: 1000;
        }

        .floating-next-stage {
          position: absolute;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          height: 44px;
          padding: 0 20px;
          border-radius: 22px;
          background-color: ${isDark ? '#2C4A36' : '#7ac143'};
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 2px solid rgba(255,255,255,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(122,193,67,0.3);
          z-index: 1000;
          font-weight: 800;
          font-size: 0.95rem;
          color: white;
          cursor: pointer;
          transition: transform 0.2s;
        }
        .floating-next-stage:active:not(.locked-stage) {
          transform: translateX(-50%) scale(0.95);
        }
        
        .floating-next-stage.locked-stage {
          background-color: ${isDark ? 'rgba(255,255,255,0.1)' : '#e0e0e0'};
          border: 2px solid ${isDark ? 'rgba(255,255,255,0.05)' : '#c0c0c0'};
          color: ${isDark ? '#888' : '#888'};
          box-shadow: none;
          filter: grayscale(100%);
        }

        .subtitle-container {
          text-align: center;
          padding: 40px 0 12px 0;
          background: linear-gradient(180deg, ${isDark ? 'rgba(17, 34, 21, 0.8)' : 'rgba(253, 250, 245, 0.9)'} 0%, transparent 100%);
        }

        .journey-title {
          font-size: 1.6rem;
          font-weight: 900;
          color: var(--text-main);
          text-shadow: 0 2px 4px rgba(255,255,255,0.5);
        }

        .journey-subtitle {
          font-size: 0.9rem;
          color: var(--text-light);
          font-weight: 700;
          margin-top: 4px;
        }

        /* Scrollable Map Area */
        .map-container {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          position: relative;
          scroll-behavior: smooth;
        }

        .map-container::-webkit-scrollbar {
          width: 0px; /* Hide scrollbar for a cleaner look */
        }

        .map-content {
          position: relative;
          width: 100%;
          height: 2600px;
        }

        .vine-svg {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 1;
          pointer-events: none;
        }

        .decorations-layer {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 2;
          pointer-events: none;
        }

        .deco-item {
          position: absolute;
          filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1));
        }

        .nodes-layer {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 10;
        }

        .map-node {
          position: absolute;
          transform: translate(-50%, -50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
          transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .map-node:active {
          transform: translate(-50%, -50%) scale(0.95);
        }

        /* Grayed out locked state */
        .map-node.locked {
          opacity: 0.65;
          filter: grayscale(85%) drop-shadow(0 4px 4px rgba(0,0,0,0.08));
        }

        /* Wooden Sign Node (Locked) */
        .wood-sign {
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
          width: 160px;
          height: 60px;
        }

        .wood-sign-text-container {
          position: absolute;
          text-align: center;
          width: 100%;
          top: 50%;
          transform: translateY(-50%);
        }

        .wood-sign-level {
          font-size: 0.65rem;
          font-weight: 800;
          color: rgba(255,255,255,0.8);
          text-transform: uppercase;
          letter-spacing: 1px;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.6);
        }

        .wood-sign-title {
          font-size: 0.95rem;
          font-weight: 800;
          color: #fff;
          text-shadow: 1px 1px 3px rgba(0,0,0,0.8);
        }

        .lock-icon-wrapper {
          position: absolute;
          top: -12px;
          right: -12px;
          background: white;
          border-radius: 50%;
          padding: 6px;
          box-shadow: 0 4px 8px rgba(0,0,0,0.3);
          display: flex;
          justify-content: center;
          align-items: center;
        }

        /* Current Active Node */
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 var(--green-active-glow), 0 6px 12px rgba(0,0,0,0.15); }
          70% { box-shadow: 0 0 0 18px rgba(122, 193, 67, 0), 0 6px 12px rgba(0,0,0,0.15); }
          100% { box-shadow: 0 0 0 0 rgba(122, 193, 67, 0), 0 6px 12px rgba(0,0,0,0.15); }
        }

        .active-node-container {
          position: relative;
          background: ${isDark ? '#1a3320' : '#f4fae8'};
          border: 3px solid var(--green-active);
          border-radius: 18px;
          padding: 14px 28px;
          min-width: 160px;
          display: flex;
          flex-direction: column;
          align-items: center;
          animation: pulse 2.5s infinite;
          z-index: 20;
        }

        .active-node-container::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          border-radius: 14px;
          box-shadow: inset 0 0 20px rgba(122, 193, 67, 0.2);
          pointer-events: none;
        }

        .active-badge {
          position: absolute;
          top: -14px;
          right: -10px;
          background-color: var(--green-active);
          color: white;
          font-size: 0.75rem;
          font-weight: 800;
          padding: 5px 12px;
          border-radius: 14px;
          border: 2px solid white;
          box-shadow: 0 4px 8px rgba(0,0,0,0.2);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .active-level-text {
          font-size: 0.8rem;
          font-weight: 800;
          color: var(--green-active);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 2px;
}

        .active-title-text {
          font-size: 1.2rem;
          font-weight: 900;
          color: var(--text-main);
        }
      </style>
    </head>
    <body>
      <div class="app-container">
        <!-- Floating Circular Controls -->
        <button class="floating-back-btn" onclick="postMsg({type: 'goBack'})">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 18L9 12L15 6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>

        <div class="floating-star-counter" onclick="postMsg({type: 'starPress'})" style="cursor: pointer;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right: 4px;">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#F9D559" stroke="#E5AC15" stroke-width="1.5" stroke-linejoin="round"/>
          </svg>
          <span style="font-weight: 850; font-size: 0.8rem; color: var(--text-main);">${stars}</span>
        </div>

        <div class="floating-next-stage ${unlockedLevel <= 11 ? 'locked-stage' : ''}" onclick="postMsg({type: 'nextStagePress'})">
          Next Stage
        </div>
      </div>
    </body>
    </html>
  `;

  const mapData = [
    { id: 1, levelNumber: 1, title: 'Petal Path', y: 2300, x: 220 },
    { id: 't1', type: 'treasure', y: 2150, x: 330, requiredLevel: 2 },
    { id: 2, levelNumber: 2, title: 'Bloom Trail', y: 1970, x: 130 },
    { id: 't2', type: 'treasure', y: 1800, x: 90, requiredLevel: 3 },
    { id: 3, levelNumber: 3, title: 'Thorn Way', y: 1630, x: 280 },
    { id: 't3', type: 'treasure', y: 1470, x: 340, requiredLevel: 4 },
    { id: 4, levelNumber: 4, title: 'Wild Bloom', y: 1300, x: 170 },
    { id: 't4', type: 'treasure', y: 1150, x: 100, requiredLevel: 5 },
    { id: 5, levelNumber: 5, title: 'Floral Summit', y: 1000, x: 250 },
    { id: 't5', type: 'treasure', y: 850, x: 340, requiredLevel: 6 },
    { id: 6, levelNumber: 6, title: 'Dew Drop', y: 700, x: 170 },
    { id: 't6', type: 'treasure', y: 550, x: 100, requiredLevel: 7 },
    { id: 7, levelNumber: 7, title: 'Rosy Bower', y: 400, x: 250 },
    { id: 't7', type: 'treasure', y: 250, x: 340, requiredLevel: 8 },
    { id: 8, levelNumber: 8, title: 'Secret Garden', y: 100, x: 170 },
  ];

  const scrollViewRef = useRef<any>(null);

  useEffect(() => {
    setWebviewLoaded(true);
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
        colors={isDark ? ['#1e2e22', '#2a3a2d'] : ['#f7fcf2', '#f0e8dc']} 
        style={styles.bgImage} 
      />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Floating Controls */}
        <TouchableOpacity style={styles.floatingBackBtn} onPress={() => {
          soundManager.play('button_click');
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          navigation.goBack();
        }}>
          <X size={24} color="#6b5c51" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.floatingStarCounter} onPress={() => {
          soundManager.play('button_click');
          setShowLevelSelectModal(true);
        }}>
          <Text style={{ fontFamily: 'Poppins-Bold', fontSize: 14, color: '#6b5c51' }}>⭐ {stars}</Text>
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
        >
          <Text style={{ fontFamily: 'Poppins-Bold', fontSize: 14, color: unlockedLevel <= 11 ? '#a89d92' : '#fff' }}>Next Stage</Text>
        </TouchableOpacity>

        <ScrollView 
          ref={scrollViewRef}
          style={styles.webview} 
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={{ width: 428, height: 2600, alignSelf: 'center' }}>
            <View style={styles.subtitleContainer}>
              <Text style={styles.journeyTitle}>{title} Journey</Text>
              <Text style={styles.journeySubtitle}>Level {unlockedLevel}: {currentLevelTitle}</Text>
            </View>

            {/* SVG Vines */}
            <Svg viewBox="0 0 428 2600" width="428" height="2600" style={{ position: 'absolute', top: 0, left: 0 }}>
              <Path d="M220,2500 C 220,1950 400,1950 330,1800 C 260,1650 50,1700 90,1550 C 130,1400 350,1450 280,1300 C 210,1150 80,1200 120,1050 C 160,900 320,950 250,800 C 180,650 50,700 90,550 C 130,400 350,450 280,300 C 210,150 80,200 120,50 C 160,-100 320,-50 250,-200" fill="none" stroke="#63853b" strokeWidth="24" strokeLinecap="round"/>
              <Path d="M220,2500 C 220,1950 400,1950 330,1800 C 260,1650 50,1700 90,1550 C 130,1400 350,1450 280,1300 C 210,1150 80,1200 120,1050 C 160,900 320,950 250,800 C 180,650 50,700 90,550 C 130,400 350,450 280,300 C 210,150 80,200 120,50 C 160,-100 320,-50 250,-200" fill="none" stroke="#8bb953" strokeWidth="16" strokeLinecap="round"/>
              <Path d="M250,2000 C270,1980 280,1990 270,2010 Z" fill="#88B564"/>
              <Path d="M180,1650 C160,1670 150,1660 160,1640 Z" fill="#88B564"/>
              <Path d="M250,1400 C270,1380 280,1390 270,1410 Z" fill="#88B564"/>
              <Path d="M160,1120 C140,1140 130,1130 140,1110 Z" fill="#88B564"/>
              <Path d="M230,820 C250,800 260,810 250,830 Z" fill="#88B564"/>
              <Path d="M140,550 C120,570 110,560 120,540 Z" fill="#88B564"/>
              <Path d="M250,250 C270,230 280,240 270,260 Z" fill="#88B564"/>
            </Svg>

            {/* Nodes */}
            {mapData.map((node: any) => {
              if (node.type === 'treasure') {
                const isClaimed = claimedChests.includes(node.id);
                return (
                  <TouchableOpacity 
                    key={node.id}
                    style={[styles.nodeAbsolute, { top: node.y, left: node.x, width: 80, height: 80, marginLeft: -40, marginTop: -40, justifyContent: 'center', alignItems: 'center' }]}
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
                  >
                    <LottieView
                      source={require('../../assets/animations/chest.json')}
                      autoPlay={false}
                      loop={false}
                      style={{ width: 100, height: 100 }}
                      progress={isClaimed ? 1 : 0}
                    />
                  </TouchableOpacity>
                );
              }

              let status = 'locked';
              if (node.levelNumber < unlockedLevel) status = 'done';
              else if (node.levelNumber === unlockedLevel) status = 'current';

              return (
                <TouchableOpacity
                  key={node.id}
                  style={[styles.nodeAbsolute, { top: node.y, left: node.x, marginLeft: -40, marginTop: -40, alignItems: 'center' }]}
                  onPress={() => {
                    if (status === 'done') {
                      soundManager.play('locked_error');
                      Toast.show({ type: 'info', text1: 'Level Completed', text2: "You've already completed this level." });
                    } else if (status === 'current') {
                      soundManager.play('button_click');
                      handleLevelPress(node.levelNumber);
                    } else {
                      soundManager.play('button_click');
                      handleLevelPress(node.levelNumber); // Will show locked message in handleLevelPress
                    }
                  }}
                >
                  {status === 'done' && (
                    <View style={{ alignItems: 'center' }}>
                      <View style={styles.doneIconWrapper}>
                        <Text style={{ fontSize: 24 }}>⭐</Text>
                      </View>
                      <Text style={styles.doneLevelText}>Level {node.levelNumber}</Text>
                      <Text style={styles.doneTitleText}>{node.title}</Text>
                    </View>
                  )}
                  {status === 'current' && (
                    <View style={styles.activeNodeContainer}>
                      <View style={styles.activeBadge}><Text style={styles.activeBadgeText}>Current</Text></View>
                      <Text style={styles.activeLevelText}>Level {node.levelNumber}</Text>
                      <Text style={styles.activeTitleText}>{node.title}</Text>
                    </View>
                  )}
                  {status === 'locked' && (
                    <View style={styles.woodSign}>
                      <View style={styles.woodSignContent}>
                        <Text style={styles.woodSignLevel}>Level {node.levelNumber}</Text>
                        <Text style={styles.woodSignTitle}>{node.title}</Text>
                      </View>
                      <View style={styles.lockIconWrapper}>
                        <Lock size={12} color="#C49117" />
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
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
          {/* Tap backdrop to close */}
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
              backgroundColor: 'rgba(255,255,255,0.9)',
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
            <X size={18} color="#6b5c51" />
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
              },
            ]}
          >
            {/* Drag handle */}
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#d0c3b6', alignSelf: 'center', marginBottom: 16 }} />

            <Text style={[styles.rewardTitle, { marginTop: 0, marginBottom: 16, color: '#4a3d31' }]}>Stages</Text>

            <View style={{ width: '100%', gap: 10, marginBottom: 24 }}>
              {/* Stage 1 — Unlocked */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  setShowLevelSelectModal(false);
                  webviewRef.current?.injectJavaScript("document.getElementById('map-container').scrollTop = 1800; true;");
                }}
                style={{
                  flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f5ec',
                  padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#8bb953'
                }}
              >
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#8bb953', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Text style={{ fontFamily: 'Poppins-Bold', fontSize: 13, color: '#fff' }}>1</Text>
                </View>
                <Text style={{ fontFamily: 'Poppins-Bold', fontSize: 14, color: '#4a3d31', flex: 1 }}>Blossom Garden</Text>
              </TouchableOpacity>

              {/* Stage 2 — Locked */}
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
                  <Text style={{ fontFamily: 'Poppins-Bold', fontSize: 14, color: '#a89a8c', flex: 1 }}>Crystal Grove</Text>
                  <Text style={{ fontFamily: 'Manrope-Medium', fontSize: 11, color: '#c0b4a8' }}>Locked</Text>
                </View>
              </View>

              {/* Stage 3 — Locked */}
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

              {/* Stage 4 — Locked */}
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
            </View>

            <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
              <TouchableOpacity
                style={[styles.claimBtn, { backgroundColor: '#fdfaf5', borderWidth: 1, borderColor: '#e5d5c5', flex: 1 }]}
                onPress={() => setShowLevelSelectModal(false)}
              >
                <Text style={[styles.claimBtnText, { color: '#6b5c51' }]}>Cancel</Text>
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
          <View style={[styles.modalContent, { width: '75%', padding: 24 }]}>
            <RotateCcw size={40} color="#E05252" style={{ marginBottom: 16 }} />
            <Text style={{ fontFamily: 'Poppins-Bold', fontSize: 20, color: '#4a3d31', textAlign: 'center', marginBottom: 8 }}>
              Are you sure?
            </Text>
            <Text style={{ fontFamily: 'Manrope-Medium', fontSize: 14, color: '#6b5c51', textAlign: 'center', marginBottom: 24 }}>
              This will reset your level progress back to 1. Your claimed treasures will remain unlocked.
            </Text>
            
            <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
              <TouchableOpacity 
                style={{ flex: 1, backgroundColor: '#fdfaf5', borderWidth: 1, borderColor: '#e5d5c5', paddingVertical: 12, borderRadius: 12, alignItems: 'center' }}
                onPress={() => {
                  soundManager.play('button_click');
                  setShowResetConfirmModal(false);
                }}
              >
                <Text style={{ fontFamily: 'Manrope-Bold', fontSize: 14, color: '#6b5c51' }}>Cancel</Text>
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
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
  },
  rewardModalContent: {
    width: '85%',
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#d28020',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 15,
    borderWidth: 2,
    borderColor: '#fbd7b5',
    overflow: 'hidden',
  },
  lottieAnim: {
    width: 250,
    height: 250,
    marginTop: -40,
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
    backgroundColor: '#fdfaf5',
    borderWidth: 1,
    borderColor: '#e5d5c5',
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
    backgroundColor: 'rgba(249, 244, 234, 0.85)',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  floatingStarCounter: {
    position: 'absolute',
    top: 50,
    right: 20,
    height: 36,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(249, 244, 234, 0.85)',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
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
  },
  lockedStage: {
    backgroundColor: '#d1cfc9',
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
    fontSize: 32,
    color: '#6b5c51',
    marginBottom: 4,
  },
  journeySubtitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 16,
    color: '#9c8e82',
  },
  nodeAbsolute: {
    position: 'absolute',
    zIndex: 10,
  },
  doneIconWrapper: {
    backgroundColor: '#fff',
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#f2eadc',
  },
  doneLevelText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 11,
    color: '#9c8e82',
    textTransform: 'uppercase',
    marginTop: 6,
  },
  doneTitleText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 16,
    color: '#6b5c51',
  },
  activeNodeContainer: {
    backgroundColor: '#7ac143',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  activeBadge: {
    backgroundColor: '#f4c74a',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginBottom: 4,
  },
  activeBadgeText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 10,
    color: '#937119',
    textTransform: 'uppercase',
  },
  activeLevelText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
  },
  activeTitleText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 18,
    color: '#fff',
  },
  woodSign: {
    width: 140,
    height: 60,
    backgroundColor: '#B7825E',
    borderRadius: 8,
    borderWidth: 4,
    borderColor: '#7A523A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  woodSignContent: {
    alignItems: 'center',
  },
  woodSignLevel: {
    fontFamily: 'Manrope-Bold',
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
  },
  woodSignTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 14,
    color: 'rgba(255,255,255,0.95)',
  },
  lockIconWrapper: {
    position: 'absolute',
    top: -12,
    right: -12,
    width: 32,
    height: 32,
    backgroundColor: '#fff',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  }
});