import { HapticButton } from '../components/HapticButton';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  StatusBar, Modal, Share, Platform, Clipboard, Alert, BackHandler
, Dimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from '../utils/haptics';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import { usePartyRoom, saveRoomProgress, loadRoomProgress, getLastRoomId, setLastRoomId, clearRoomProgress } from '../hooks/usePartyRoom';
import { uploadImage } from '../utils/cloudinaryUpload';
import { useAuth } from '../contexts/AuthContext';

import LobbyPhase, { SetupGuide } from './together/LobbyPhase';
import SelectPhase from './together/SelectPhase';
import DrawPhase from './together/DrawPhase';
import ArrangePhase from './together/ArrangePhase';
import MessagePhase from './together/MessagePhase';
import SongPhase from './together/SongPhase';
import { WaitingPhase, DonePhase } from './together/SubmitPhases';
import ShareModal from '../components/ShareModal';

// Generate a 6-digit numeric room code
function genCode() { return String(Math.floor(100000 + Math.random() * 900000)); }
// Generate a unique connection id
function genConnId() { return `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; }

const PHASE_LABELS = {
  lobby: 'Get Started',
  select: 'Pick Flowers',
  draw: 'Draw',
  arrange: 'Arrange',
  message: 'Message',
  song: 'Song',
  waiting: 'Submit',
  done: 'Done!',
};

export default function MakeBouquetTogetherScreen({ navigation }) {
  const { theme: t } = useTheme();
  const [connId, setConnId] = useState(null);
  const insets = useSafeAreaInsets();

  // ── Room state ─────────────────────────────────────────────────────────────
  const [roomId, setRoomId] = useState(null);
  const [isCreator, setIsCreator] = useState(false);
  const [serverState, setServerState] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lobbyError, setLobbyError] = useState(null);
  const [resumeRoomId, setResumeRoomId] = useState(null);
  const [myName, setMyName] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  
  const [showExitModal, setShowExitModal] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);

  const [togetherSheetItem, setTogetherSheetItem] = useState(null);
  const [togetherSheetVisible, setTogetherSheetVisible] = useState(false);

  // Ref forwarded to DrawPhase → DrawingCanvas for capturing the canvas as an image
  const viewShotRef = useRef(null);

  // Local drawing state (not echoed back from server to avoid lag)
  const [myStrokes, setMyStrokes] = useState([]);
  const [tracingFlower, setTracingFlower] = useState(null);
  const [roomHistory, setRoomHistory] = useState([]);

  // Track partner arrange actions for locking
  const [partnerArrangeAction, setPartnerArrangeAction] = useState(null); // { timestamp, label }
  const isSavingFlowerRef = useRef(false);

  // ── Init connection ID and check resumable session ─────────────────────────
  useEffect(() => {
    const init = async () => {
      let id = await AsyncStorage.getItem('bouquet_together_conn_id');
      if (!id) {
        id = genConnId();
        await AsyncStorage.setItem('bouquet_together_conn_id', id);
      }
      setConnId(id);
      const lastRoom = await getLastRoomId();
      if (lastRoom) setResumeRoomId(lastRoom);
      
      const historyStr = await AsyncStorage.getItem('bouquet_together_history');
      if (historyStr) {
        try { setRoomHistory(JSON.parse(historyStr)); } catch(e){}
      }
    };
    init();
  }, []);


  const saveToHistory = useCallback(async (code, role, roomName, currentPhase, inlineData) => {
    try {
      const historyStr = await AsyncStorage.getItem('bouquet_together_history');
      let history = historyStr ? JSON.parse(historyStr) : [];
      
      const existing = history.find(h => h.code === code);
      const finalRoomName = roomName || existing?.roomName || '';
      const finalPhase = currentPhase || existing?.phase || 'lobby';
      const finalInlineData = inlineData || existing?.inlineData || null;
      
      history = history.filter(h => h.code !== code);
      history.unshift({
        code,
        role,
        roomName: finalRoomName,
        phase: finalPhase,
        inlineData: finalInlineData,
        date: new Date().toISOString()
      });
      history = history.slice(0, 10);
      await AsyncStorage.setItem('bouquet_together_history', JSON.stringify(history));
      setRoomHistory(history);
    } catch(e){}
  }, []);

  // Keep phase fresh in history whenever phase changes
  useEffect(() => {
    if (!roomId || !phase || phase === 'lobby') return;
    const role = isCreator ? 'Created' : 'Joined';
    saveToHistory(roomId, role, null, phase);
  }, [phase, roomId, isCreator, saveToHistory]);


  // ── PartyKit message handler ───────────────────────────────────────────────
  const handleMessage = useCallback((msg) => {
    switch (msg.type) {
      case 'STATE_SYNC':
        setServerState(msg.state);
        break;
      case 'PARTNER_JOINED':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Toast.show({ type: 'success', text1: '🎉 Partner joined!', text2: `${msg.name} is here.` });
        break;
      case 'STROKE_ADDED':
        // Partner's strokes come in via full STATE_SYNC; local strokes are kept locally
        break;
      case 'PARTNER_ARRANGED':
        // Partner moved flowers — lock the arrange board and show toast
        setPartnerArrangeAction({ timestamp: Date.now(), label: 'Partner arranged flowers' });
        Toast.show({
          type: 'info',
          text1: '🔒 Partner updated the bouquet',
          text2: 'Board locked for 3 seconds',
        });
        break;
      case 'PARTNER_GREENERY':
        setPartnerArrangeAction({ timestamp: Date.now(), label: 'Partner changed greenery' });
        Toast.show({
          type: 'info',
          text1: '🌿 Partner changed greenery',
          text2: 'Board locked for 3 seconds',
        });
        break;
      case 'ROOM_CLOSED':
        Toast.show({ type: 'info', text1: 'Room Expired', text2: 'This room was closed due to inactivity.' });
        setServerState(null);
        setRoomId(null);
        break;
      default:
        break;
    }
  }, []);

  const { connected, send } = usePartyRoom({
    roomId,
    connectionId: connId,
    onMessage: handleMessage,
  });

  // ── Derive my slot and partner slot from serverState ───────────────────────
  const mySlot = serverState
    ? (serverState.userA?.connectionId === connId ? serverState.userA : serverState.userB?.connectionId === connId ? serverState.userB : null)
    : null;
  const partnerSlot = serverState
    ? (serverState.userA?.connectionId === connId ? serverState.userB : serverState.userA)
    : null;
  const phase = serverState?.phase || 'lobby';

  const handleCreate = async () => {
    setLoading(true);
    setLobbyError(null);
    const code = genCode();
    setRoomId(code);
    setIsCreator(true);
    await setLastRoomId(code);
    await saveToHistory(code, 'Created', myName.trim() || 'Room A', 'lobby');
    send({ type: 'CREATE_ROOM', connectionId: connId, name: myName.trim() || 'User A' });
    setLoading(false);
    setShowCode(true);
  };

  const handleJoin = async (code) => {
    setLoading(true);
    setLobbyError(null);
    setRoomId(code);
    await setLastRoomId(code);
    await saveToHistory(code, 'Joined', myName.trim() || 'Room B', 'lobby');
    send({ type: 'JOIN_ROOM', connectionId: connId, name: myName.trim() || 'User B' });
    setLoading(false);
  };

  const handleResumeHistory = async (itemOrCode) => {
    const item = typeof itemOrCode === 'string'
      ? roomHistory.find(h => h.code === itemOrCode)
      : itemOrCode;
    const code = item?.code || itemOrCode;

    if (item?.phase === 'done' && item?.inlineData) {
      navigation.navigate('BouquetView', { inlineData: item.inlineData, shouldGoToHomeOnClose: false });
      return;
    }

    const saved = await loadRoomProgress(code);
    if (saved?.state) {
      setRoomId(code);
      setServerState(saved.state);
    } else {
      setRoomId(code);
    }
  };

  const handleTogetherCopyCode = async () => {
    setTogetherSheetVisible(false);
    await Clipboard.setStringAsync(togetherSheetItem?.code || '');
    Toast.show({ type: 'success', text1: 'Code copied!', text2: `Room code: ${togetherSheetItem?.code}`, visibilityTime: 2500 });
  };

  const handleTogetherDelete = () => {
    setTogetherSheetVisible(false);
    const item = togetherSheetItem;
    if (!item) return;
    Alert.alert('Remove Room?', `Remove room #${item.code} from history?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        try {
          const raw = await AsyncStorage.getItem('bouquet_together_history');
          const hist = raw ? JSON.parse(raw) : [];
          const updated = hist.filter(h => h.code !== item.code);
          await AsyncStorage.setItem('bouquet_together_history', JSON.stringify(updated));
          setRoomHistory(updated);
          Toast.show({ type: 'success', text1: 'Room removed' });
        } catch {}
      }},
    ]);
  };

  const handleResume = async () => {
    await handleResumeHistory(resumeRoomId);
  };

  // ── Select phase ───────────────────────────────────────────────────────────
  const myFlowers = mySlot?.flowers || [];
  const partnerFlowers = partnerSlot?.flowers || [];

  const handleSelect = (flower) => send({ type: 'SELECT_FLOWER', flower });
  const handleDeselect = (flower) => send({ type: 'DESELECT_FLOWER', flower });
  const handleConfirmFlowers = () => send({ type: 'FLOWERS_CONFIRMED' });

  // ── Draw phase ─────────────────────────────────────────────────────────────
  const [activeDrawFlower, setActiveDrawFlower] = useState(null);
  const [strokesByFlower, setStrokesByFlower] = useState({});
  const [redoStrokesByFlower, setRedoStrokesByFlower] = useState({});

  useEffect(() => {
    if (phase === 'draw' && myFlowers.length > 0 && !activeDrawFlower) {
      setActiveDrawFlower(myFlowers[0].id || myFlowers[0]);
    }
  }, [phase, myFlowers]);

  const handleStroke = (stroke) => {
    if (!activeDrawFlower) return;
    setStrokesByFlower(prev => ({
      ...prev,
      [activeDrawFlower]: [...(prev[activeDrawFlower] || []), stroke]
    }));
    // Clear redo stack on new stroke
    setRedoStrokesByFlower(prev => ({
      ...prev,
      [activeDrawFlower]: []
    }));
  };
  
  const handleUndo = () => {
    if (!activeDrawFlower) return;
    const currentStrokes = strokesByFlower[activeDrawFlower] || [];
    if (currentStrokes.length === 0) return;
    
    const lastStroke = currentStrokes[currentStrokes.length - 1];
    setStrokesByFlower(prev => ({
      ...prev,
      [activeDrawFlower]: currentStrokes.slice(0, -1)
    }));
    setRedoStrokesByFlower(prev => ({
      ...prev,
      [activeDrawFlower]: [...(prev[activeDrawFlower] || []), lastStroke]
    }));
  };

  const handleRedo = () => {
    if (!activeDrawFlower) return;
    const redoStrokes = redoStrokesByFlower[activeDrawFlower] || [];
    if (redoStrokes.length === 0) return;
    
    const nextStroke = redoStrokes[redoStrokes.length - 1];
    setStrokesByFlower(prev => ({
      ...prev,
      [activeDrawFlower]: [...(prev[activeDrawFlower] || []), nextStroke]
    }));
    setRedoStrokesByFlower(prev => ({
      ...prev,
      [activeDrawFlower]: redoStrokes.slice(0, -1)
    }));
  };

  const handleClearCanvas = () => {
    if (!activeDrawFlower) return;
    setShowClearModal(true);
  };
  
  const confirmClearCanvas = () => {
    setStrokesByFlower(prev => ({
      ...prev,
      [activeDrawFlower]: []
    }));
    setRedoStrokesByFlower(prev => ({
      ...prev,
      [activeDrawFlower]: []
    }));
    setShowClearModal(false);
  };
  const handleSaveFlower = async () => {
    if (isSavingFlowerRef.current) return;
    isSavingFlowerRef.current = true;
    try {
      const activeStrokes = strokesByFlower[activeDrawFlower] || [];
      if (viewShotRef.current && activeStrokes.length > 0) {
        Toast.show({
          type: 'info',
          text1: 'Saving flower drawing… 🎨',
          text2: 'Optimizing and uploading your artwork.',
          autoClose: false,
        });
        const uri = await viewShotRef.current.capture();
        const uploadedUrl = await uploadImage(uri);
        Toast.show({
          type: 'success',
          text1: 'Flower artwork saved! ✨',
          text2: 'Move on to the next flower.',
        });
        send({ type: 'FLOWER_DRAWN', flowerId: activeDrawFlower, drawingUrl: uploadedUrl });
      }
    } catch (err) {
      console.error('Error saving flower drawing:', err);
      Toast.show({
        type: 'error',
        text1: 'Failed to upload artwork',
        text2: 'Please try again.',
      });
    } finally {
      isSavingFlowerRef.current = false;
    }
  };

  const handleAllDrawingDone = () => {
    send({ type: 'DRAWING_DONE' });
  };

  // ── Arrange ────────────────────────────────────────────────────────────────
  const handleArrangement = (arr) => send({ type: 'UPDATE_ARRANGEMENT', arrangement: arr });
  const handleArrangeDone = () => send({ type: 'ARRANGEMENT_DONE' });

  // ── Message ────────────────────────────────────────────────────────────────
  const handleMessageUpdate = (msg) => send({ type: 'UPDATE_MESSAGE', message: msg });
  const handleMessageDone = () => send({ type: 'MESSAGE_DONE' });

  // ── Song ───────────────────────────────────────────────────────────────────
  const handleSelectSong = (song) => send({ type: 'SELECT_SONG', song });
  const handleSongDone = () => send({ type: 'SONG_DONE' });

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = () => {
    send({ type: 'SUBMIT' });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // ── Done ───────────────────────────────────────────────────────────────────
  const handleClose = async () => {
    await clearRoomProgress(roomId);
    await setLastRoomId('');
    navigation.goBack();
  };

  // Build a BouquetData object from partner + my data for BouquetView
  const buildTogetherBouquetData = useCallback((partnerSlot, mySlot) => {
    // V2 Bouquets expect selectedFlowers to be the arrangement itself (with x,y,scale,etc)
    const rawArrangement = partnerSlot?.arrangement || mySlot?.arrangement || [];
    const arrangementAsFlowers = rawArrangement.map(item => ({
      id: item.flowerId,
      uniqueId: item.id,
      x: item.x,
      y: item.y,
      scale: item.scale ?? 1,
      rotation: item.rotation ?? 0,
      zIndex: item.zIndex ?? 1,
      image: item.image, // Pass the custom drawing image URL if it exists
      isUri: item.isUri,
      isDrawn: item.isDrawn,
      isCustom: item.isCustom
    }));

    return {
      version: 2,
      selectedFlowers: arrangementAsFlowers.length > 0 ? arrangementAsFlowers : [
        ...(partnerSlot?.selectedFlowers || []),
        ...(mySlot?.selectedFlowers || []),
      ],
      background: 0,
      greeneryBg: partnerSlot?.greenery || mySlot?.greenery || null,
      arrangement: partnerSlot?.arrangement ?? mySlot?.arrangement ?? null,
      drawnFlowers: {
        ...(partnerSlot?.drawnFlowers || {}),
        ...(mySlot?.drawnFlowers || {}),
      },
      message: partnerSlot?.message || '',
      recipientName: partnerSlot?.name || 'Your Partner',
      senderName: mySlot?.name || 'You',
      song: partnerSlot?.song || null,
      isTogether: true,
      myMessage: mySlot?.message || '',
      mySong: mySlot?.song || null,
    };
  }, []);

  // Auto-navigate to BouquetView when done
  const hasNavigatedToDone = useRef(false);
  useEffect(() => {
    if (phase !== 'done' || hasNavigatedToDone.current) return;
    if (!mySlot && !partnerSlot) return;
    hasNavigatedToDone.current = true;
    const inlineData = buildTogetherBouquetData(partnerSlot, mySlot);
    
    // Save to history so it can be resumed/viewed later from history even if inactive
    const role = isCreator ? 'Created' : 'Joined';
    saveToHistory(roomId, role, null, 'done', inlineData);
    
    navigation.navigate('BouquetView', { inlineData, shouldGoToHomeOnClose: false });
  }, [phase, mySlot, partnerSlot, roomId, isCreator, saveToHistory, navigation, buildTogetherBouquetData]);

  const attemptExit = useCallback(() => {
    if (!roomId || phase === 'done') {
      navigation.goBack();
      return true;
    }
    setShowExitModal(true);
    return true; // prevent default back
  }, [roomId, phase, navigation]);

  // Intercept Android hardware back button
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', attemptExit);
      return () => subscription.remove();
    }, [attemptExit])
  );

  // ── Share code modal ───────────────────────────────────────────────────────
  const copyCode = () => {
    Clipboard.setString(roomId);
    Toast.show({ type: 'success', text1: 'Code copied!', text2: `Share ${roomId} with your partner.` });
  };

  // ── Progress steps ─────────────────────────────────────────────────────────
  const PHASES = ['select', 'draw', 'arrange', 'message', 'song'];
  const currentStep = PHASES.indexOf(phase);

  const renderPhase = () => {
    if (!roomId || phase === 'lobby') {
      return (
        <LobbyPhase
          roomId={roomId}
          showCode={showCode}
          isCreator={isCreator}
          onShareCode={() => setShareModalVisible(true)}
          onEndRoom={() => {
            setRoomId(null);
            setShowCode(false);
            setLastRoomId('');
            clearRoomProgress(roomId);
          }}
          myName={myName}
        onNameChange={setMyName}
        onCreateRoom={handleCreate}
          onJoinRoom={handleJoin}
          loading={loading}
          error={lobbyError}
          resumeRoomId={resumeRoomId}
          onResume={handleResume}
          roomHistory={roomHistory}
          onResumeHistory={(item) => {
            setTogetherSheetItem(item);
            setTogetherSheetVisible(true);
          }}
          myData={mySlot}
          partnerData={partnerSlot}
          onStartReady={() => send({ type: 'START_READY' })}
        />
      );
    }
    if (phase === 'select') return (
      <SelectPhase
        myFlowers={myFlowers}
        onSelect={handleSelect}
        onDeselect={handleDeselect}
        onConfirm={handleConfirmFlowers}
        confirmed={!!mySlot?.flowersConfirmed}
        partnerConfirmed={!!partnerSlot?.flowersConfirmed}
      />
    );
    if (phase === 'draw') return (
      <DrawPhase
        ref={viewShotRef}
        activeDrawFlower={activeDrawFlower}
        setActiveDrawFlower={setActiveDrawFlower}
        myStrokes={strokesByFlower[activeDrawFlower] || []}
        onStrokeComplete={handleStroke}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClear={handleClearCanvas}
        myFlowers={myFlowers}
        done={!!mySlot?.drawingDone}
        partnerDone={!!partnerSlot?.drawingDone}
        onSaveFlower={handleSaveFlower}
        onDone={handleAllDrawingDone}
        drawnFlowers={mySlot?.drawnFlowers || {}}
      />
    );
    if (phase === 'arrange') return (
      <ArrangePhase
        myFlowers={myFlowers}
        partnerFlowers={partnerFlowers}
        myDrawingUrl={mySlot?.drawingUrl}
        partnerDrawingUrl={partnerSlot?.drawingUrl}
        drawnFlowers={mySlot?.drawnFlowers || {}}
        partnerDrawnFlowers={partnerSlot?.drawnFlowers || {}}
        arrangement={mySlot?.arrangement}
        onUpdateArrangement={(arr) => {
          handleArrangement(arr);
          // Notify partner so they can lock
          send({ type: 'PARTNER_ARRANGED' });
        }}
        onDone={handleArrangeDone}
        done={!!mySlot?.arrangementDone}
        partnerDone={!!partnerSlot?.arrangementDone}
        partnerActionTimestamp={partnerArrangeAction?.timestamp}
        partnerActionLabel={partnerArrangeAction?.label}
      />
    );
    if (phase === 'message') return (
      <MessagePhase
        message={mySlot?.message || ''}
        onUpdateMessage={handleMessageUpdate}
        onDone={handleMessageDone}
        done={!!mySlot?.messageDone}
        partnerDone={!!partnerSlot?.messageDone}
      />
    );
    if (phase === 'song') return (
      <SongPhase
        song={mySlot?.song}
        onSelectSong={handleSelectSong}
        onDone={handleSongDone}
        done={!!mySlot?.songDone}
        partnerDone={!!partnerSlot?.songDone}
      />
    );
    if (phase === 'waiting') return (
      <WaitingPhase onSubmit={handleSubmit} submitted={!!mySlot?.submitted} />
    );
    if (phase === 'done') return (
      <DonePhase myData={mySlot} partnerData={partnerSlot} onClose={handleClose} />
    );
    return null;
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: t.bg }]}>
      <StatusBar barStyle={t.isDarkMode ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: t.border, paddingTop: Math.max(insets.top + 10, 24) }]}>
        <HapticButton onPress={attemptExit} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Feather name="x" size={22} color={t.text} />
        </HapticButton>
        {/* Always show phase title in header */}
        <Text style={[styles.headerTitle, { color: t.text }]}>
          {phase === 'lobby'   ? 'Bouquet Together'
         : phase === 'select'  ? 'Pick Your Flowers'
         : phase === 'draw'    ? 'Draw Your Flowers'
         : phase === 'arrange' ? 'Arrange Bouquet'
         : phase === 'message' ? 'Write a Message'
         : phase === 'song'    ? 'Pick a Song'
         : phase === 'waiting' ? 'Almost There!'
         : phase === 'done'    ? 'Bouquet Ready!'
         : 'Bouquet Together'}
        </Text>
        <View style={styles.headerRight}>
          {connected && roomId && phase !== 'lobby' && (
            <View style={[styles.connDot, { backgroundColor: '#5BAD8E' }]} />
          )}
          <HapticButton onPress={() => setShowGuide(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="help-circle" size={20} color={t.textMuted} />
          </HapticButton>
          {roomId && isCreator && phase !== 'lobby' && (
            <HapticButton onPress={copyCode} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="share-2" size={18} color={t.textMuted} />
            </HapticButton>
          )}
        </View>
      </View>

      {/* Progress bar (only when in a room) */}
      {roomId && phase !== 'lobby' && phase !== 'done' && (
        <View style={[styles.progressBar, { backgroundColor: t.border }]}>
          <View style={[styles.progressFill, {
            backgroundColor: t.brand,
            width: `${((currentStep + 1) / PHASES.length) * 100}%`,
          }]} />
        </View>
      )}

      {/* Phase label */}
      {roomId && phase !== 'lobby' && (
        <View style={styles.phaseRow}>
          <Text style={[styles.phaseLabel, { color: t.textMuted }]}>{PHASE_LABELS[phase] || phase}</Text>
          {!connected && roomId && (
            <View style={styles.reconnectBadge}>
              <Text style={styles.reconnectText}>Reconnecting…</Text>
            </View>
          )}
        </View>
      )}


      {/* Main content */}
      <View style={{ flex: 1 }}>
        {renderPhase()}
      </View>

      {/* Share Modal */}
      {roomId && (
        <ShareModal
          visible={shareModalVisible}
          url={`${process.env.EXPO_PUBLIC_EGREET_URL || 'https://egreet.in'}/together?code=${roomId}`}
          recipientName="Partner"
          onClose={() => setShareModalVisible(false)}
        />
      )}
      {/* Guide Modal */}
      <Modal visible={showGuide} transparent animationType="slide">
        <View style={styles.guideModalRoot}>
          <View style={[styles.guideModalCard, { backgroundColor: t.bg }]}>
            <View style={styles.guideModalHeader}>
              <Text style={[styles.headerTitle, { color: t.text }]}>How it works</Text>
              <HapticButton onPress={() => setShowGuide(false)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Feather name="x" size={22} color={t.text} />
              </HapticButton>
            </View>
            <SetupGuide />
          </View>
        </View>
      </Modal>

      {/* ── Custom Exit Warning Modal ── */}
      <Modal visible={showExitModal} transparent animationType="fade" onRequestClose={() => setShowExitModal(false)}>
        <View style={styles.modalOverlay}>
          <HapticButton style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => setShowExitModal(false)} />
          <View style={[styles.modalBox, { backgroundColor: t.cardBg }]}>
            <Text style={[styles.modalTitle, { textAlign: 'center', color: t.text }]}>Leave Room?</Text>
            <Text style={{ color: t.textMuted, marginVertical: 12, textAlign: 'center', fontFamily: 'Manrope-Regular', fontSize: 14 }}>
              Are you sure you want to exit? Your progress will be saved and you can rejoin this room later using the code.
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <HapticButton style={[styles.modalBtn, { flex: 1, backgroundColor: t.surface, borderColor: t.border }]} onPress={() => setShowExitModal(false)}>
                <Text style={[styles.modalBtnText, { color: t.text }]}>Stay</Text>
              </HapticButton>
              <HapticButton
                style={[styles.modalBtn, { flex: 1, backgroundColor: '#E63946', borderColor: '#E63946' }]}
                onPress={() => {
                  setShowExitModal(false);
                  navigation.goBack();
                }}
              >
                <Text style={[styles.modalBtnText, { color: 'white' }]}>Leave</Text>
              </HapticButton>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Custom Clear Canvas Modal ── */}
      <Modal visible={showClearModal} transparent animationType="fade" onRequestClose={() => setShowClearModal(false)}>
        <View style={styles.modalOverlay}>
          <HapticButton style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => setShowClearModal(false)} />
          <View style={[styles.modalBox, { backgroundColor: t.cardBg }]}>
            <Text style={[styles.modalTitle, { textAlign: 'center', color: '#E63946' }]}>Clear Canvas?</Text>
            <Text style={{ color: t.textMuted, marginVertical: 12, textAlign: 'center', fontFamily: 'Manrope-Regular', fontSize: 14 }}>
              Are you sure you want to clear the entire canvas? This cannot be undone.
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <HapticButton style={[styles.modalBtn, { flex: 1, backgroundColor: t.surface, borderColor: t.border }]} onPress={() => setShowClearModal(false)}>
                <Text style={[styles.modalBtnText, { color: t.text }]}>Cancel</Text>
              </HapticButton>
              <HapticButton
                style={[styles.modalBtn, { flex: 1, backgroundColor: '#E63946', borderColor: '#E63946' }]}
                onPress={confirmClearCanvas}
              >
                <Text style={[styles.modalBtnText, { color: 'white' }]}>Clear All</Text>
              </HapticButton>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Together Room Action Sheet ── */}
      {togetherSheetVisible && togetherSheetItem && (
        <>
          <View pointerEvents="auto" style={[styles.sheetOverlay, { opacity: 1 }]}>
            <HapticButton style={{ flex: 1 }} activeOpacity={1} onPress={() => setTogetherSheetVisible(false)} />
          </View>
          <View style={[styles.sheet, { backgroundColor: t.cardBg }]}>
            <View style={[styles.sheetHeader, { borderBottomColor: t.border }]}>
              <View style={[styles.sheetHandle, { backgroundColor: t.border }]} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
                <Text style={[styles.sheetRecipient, { color: t.text }]}>
                  {togetherSheetItem.roomName ? togetherSheetItem.roomName : `Room #${togetherSheetItem.code}`}
                </Text>
                <View style={{ borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2, backgroundColor: togetherSheetItem.phase === 'done' ? '#5BAD8E' : '#F5A623' }}>
                  <Text style={{ fontFamily: 'Manrope-Bold', fontSize: 8, color: '#fff' }}>{togetherSheetItem.phase === 'done' ? 'DONE' : 'IN PROGRESS'}</Text>
                </View>
              </View>
              <Text style={[styles.sheetDate, { color: t.textMuted }]}>
                {togetherSheetItem.roomName ? `Room #${togetherSheetItem.code} • ` : ''}{togetherSheetItem.role} • {togetherSheetItem.date ? new Date(togetherSheetItem.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
              </Text>
            </View>
            <View style={styles.sheetOptions}>
              <HapticButton style={styles.sheetRow} onPress={() => { setTogetherSheetVisible(false); handleResumeHistory(togetherSheetItem); }} activeOpacity={0.7}>
                <View style={[styles.sheetIconWrap, { backgroundColor: t.isDarkMode ? '#332E2C' : '#FAF7F2' }]}>
                  <Feather name={togetherSheetItem.phase === 'done' ? "eye" : "log-in"} size={20} color={t.brand} />
                </View>
                <Text style={[styles.sheetRowLabel, { color: t.text }]}>
                  {togetherSheetItem.phase === 'done' ? 'View Finished Bouquet' : 'Rejoin Room'}
                </Text>
              </HapticButton>
              <HapticButton style={styles.sheetRow} onPress={handleTogetherCopyCode} activeOpacity={0.7}>
                <View style={[styles.sheetIconWrap, { backgroundColor: t.isDarkMode ? '#332E2C' : '#FAF7F2' }]}><Feather name="copy" size={20} color={t.brand} /></View>
                <Text style={[styles.sheetRowLabel, { color: t.text }]}>Copy Room Code</Text>
              </HapticButton>
              <View style={[styles.sheetDivider, { backgroundColor: t.border }]} />
              <HapticButton style={styles.sheetRow} onPress={handleTogetherDelete} activeOpacity={0.7}>
                <View style={[styles.sheetIconWrap, { backgroundColor: t.isDarkMode ? '#3D2220' : '#FFF0F0' }]}><Feather name="trash-2" size={20} color="#E05252" /></View>
                <Text style={[styles.sheetRowLabel, { color: '#E05252' }]}>Remove from History</Text>
              </HapticButton>
            </View>
            <HapticButton style={[styles.sheetCancel, { backgroundColor: t.isDarkMode ? '#332E2C' : '#FAF7F2', marginBottom: insets.bottom + 8 }]} onPress={() => setTogetherSheetVisible(false)} activeOpacity={0.7}>
              <Text style={[styles.sheetCancelText, { color: t.brand }]}>Cancel</Text>
            </HapticButton>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1,
  },
  headerTitle: { fontFamily: 'Manrope-Bold', fontSize: 16 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  connDot: { width: 8, height: 8, borderRadius: 4 },
  steps: {
    flexDirection: 'row', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8,
    alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  stepDot: { width: 8, height: 8, borderRadius: 4 },
  stepLine: { height: 2, flex: 1, borderRadius: 1 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 20,
  },
  modalBox: {
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 8,
  },
  modalTitle: {
    fontFamily: 'Manrope-Bold', fontSize: 18,
  },
  modalBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnText: {
    fontFamily: 'Manrope-Bold', fontSize: 14,
  },
  progressBar: { height: 3, width: '100%' },
  progressFill: { height: 3, borderRadius: 2 },
  phaseRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 4,
  },
  phaseLabel: { fontFamily: 'Manrope-SemiBold', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  reconnectBadge: { backgroundColor: '#F4A261', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  reconnectText: { fontFamily: 'Manrope-SemiBold', fontSize: 11, color: '#fff' },
  codeBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 16, marginTop: 10, borderRadius: 16, borderWidth: 1.5, padding: 16,
  },
  codeLabel: { fontFamily: 'Manrope-SemiBold', fontSize: 12, marginBottom: 2 },
  codeBig: { fontFamily: 'Manrope-Bold', fontSize: 32, letterSpacing: 6 },
  codeHint: { fontFamily: 'Manrope-Regular', fontSize: 12, marginTop: 4 },
  copyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12,
  },
  copyBtnText: { fontFamily: 'Manrope-Bold', fontSize: 14, color: '#fff' },
  guideModalRoot: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  guideModalCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40, maxHeight: '80%' },
  guideModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },

  // Action sheet
  sheetOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 1200 },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    zIndex: 1201, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, elevation: 1201,
  },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#EAE0D5', alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  sheetHeader: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#EAE0D5' },
  sheetRecipient: { fontFamily: 'Manrope-Bold', fontSize: 17, color: '#5C4844', marginTop: 8 },
  sheetDate: { fontFamily: 'Manrope-Regular', fontSize: 13, color: '#997E7A', marginTop: 2 },
  sheetOptions: { paddingTop: 8 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 24 },
  sheetIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  sheetRowLabel: { fontFamily: 'Manrope-SemiBold', fontSize: 16, color: '#5C4844' },
  sheetDivider: { height: 1, backgroundColor: '#EAE0D5', marginHorizontal: 24, marginVertical: 4 },
  sheetCancel: { marginHorizontal: 20, marginTop: 8, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  sheetCancelText: { fontFamily: 'Manrope-Bold', fontSize: 16, color: '#7A5C58' },
});
