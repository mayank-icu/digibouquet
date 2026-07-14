import { PremiumImage } from '../../components/PremiumImage';
import { HapticButton } from '../../components/HapticButton';
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Animated, Dimensions, Alert, Modal } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { getFlowerImage } from '../../utils/bouquetData';
import { SvgXml } from 'react-native-svg';
import { bouquetTogetherSvg } from '../../svgStrings';

const { width: W } = Dimensions.get('window');

// Interactive Demo Components
function DrawDemo({ color }) {
  const progress = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(progress, { toValue: 1, duration: 1400, useNativeDriver: false }),
      Animated.timing(progress, { toValue: 0, duration: 400, useNativeDriver: false }),
    ])).start();
  }, []);
  const w = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 100] });
  return (
    <View style={demoStyles.drawBox}>
      <View style={demoStyles.canvasArea}>
        <Animated.View style={[demoStyles.strokeLine, { width: w, backgroundColor: color }]} />
        <View style={[demoStyles.strokeLine, { width: 60, backgroundColor: color, opacity: 0.5, marginTop: 8 }]} />
        <View style={[demoStyles.strokeLine, { width: 40, backgroundColor: color, opacity: 0.3, marginTop: 8 }]} />
      </View>
      <View style={[demoStyles.refBox, { borderColor: color }]}>
        <Text style={{ fontSize: 18 }}>🌸</Text>
      </View>
    </View>
  );
}

function ArrangeDemo({ color }) {
  const positions = [
    React.useRef(new Animated.ValueXY({ x: 0, y: 0 })).current,
    React.useRef(new Animated.ValueXY({ x: 30, y: -10 })).current,
  ];
  React.useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.parallel(positions.map((p, i) => Animated.timing(p, { toValue: { x: [-10, 20][i], y: [15, -10][i] }, duration: 900, useNativeDriver: true }))),
      Animated.parallel(positions.map((p, i) => Animated.timing(p, { toValue: { x: [0, 30][i], y: [0, -10][i] }, duration: 900, useNativeDriver: true }))),
    ])).start();
  }, []);
  return (
    <View style={demoStyles.arrangeBox}>
      {positions.map((p, i) => (
        <Animated.Text key={i} style={[{ fontSize: 26, position: 'absolute' }, { transform: [...p.getTranslateTransform()] }]}>
          {['🌹', '🌷'][i]}
        </Animated.Text>
      ))}
    </View>
  );
}

export default function LobbyPhase({  
  roomId, showCode, isCreator, onShareCode, onEndRoom,
  onCreateRoom, onJoinRoom, loading, error, resumeRoomId, onResume,
  roomHistory, onResumeHistory,
  myData, partnerData, onStartReady,
  myName, onNameChange
}) {
  const { theme: t } = useTheme();
  const [code, setCode] = useState('');
  const [mode, setMode] = useState(null); // 'join'
  const [showEndDialog, setShowEndDialog] = useState(false);

  const hasPartner = partnerData && partnerData.connectionId;

  // 1. PARTNER JOINED SCREEN (Waiting for both to click Start)
  if (roomId && hasPartner) {
    return (
      <View style={s.root}>
        <View style={s.waitingContainer}>
          <View style={{ flexDirection: 'row', gap: 16, marginBottom: 24, alignItems: 'center' }}>
            <View style={[s.iconCircle, { backgroundColor: myData?.ready ? '#D1E8D5' : '#FFF0EC', marginBottom: 0 }]}>
              <Feather name="user" size={32} color={myData?.ready ? '#4A5D3A' : '#7A5C58'} />
              {myData?.ready && (
                <View style={[s.checkBadgeLobby, { backgroundColor: '#4A5D3A' }]}>
                  <Feather name="check" size={12} color="#fff" />
                </View>
              )}
            </View>
            <View style={{ width: 40, height: 2, backgroundColor: t.border }} />
            <View style={[s.iconCircle, { backgroundColor: partnerData?.ready ? '#D1E8D5' : '#FFF0EC', marginBottom: 0 }]}>
              <Feather name="user" size={32} color={partnerData?.ready ? '#4A5D3A' : '#7A5C58'} />
              {partnerData?.ready && (
                <View style={[s.checkBadgeLobby, { backgroundColor: '#4A5D3A' }]}>
                  <Feather name="check" size={12} color="#fff" />
                </View>
              )}
            </View>
          </View>
          
          <Text style={[s.title, { color: t.text }]}>Both Connected!</Text>
          <Text style={[s.sub, { color: t.textMuted, marginBottom: 16 }]}>
            {partnerData?.ready 
              ? "Partner is ready! Click start to begin."
              : "Waiting for everyone to be ready..."}
          </Text>

          <HapticButton 
            style={[s.btn, { backgroundColor: myData?.ready ? t.border : t.brand, marginTop: 20 }]} 
            onPress={onStartReady}
            disabled={myData?.ready}
          >
            <Text style={[s.btnText, { color: myData?.ready ? t.textMuted : '#fff' }]}>
              {myData?.ready ? 'Waiting for Partner...' : 'Start Creating'}
            </Text>
          </HapticButton>
        </View>
      </View>
    );
  }

  // 2. CREATOR WAITING SCREEN (Room created, waiting for partner)
  if (showCode) {
    return (
      <View style={s.root}>
        <View style={s.waitingContainer}>
          <View style={[s.iconCircle, { backgroundColor: '#FFF0EC' }]}>
            <Feather name="users" size={32} color="#7A5C58" />
          </View>
          <Text style={[s.title, { color: t.text }]}>Room Created!</Text>
          <Text style={[s.sub, { color: t.textMuted }]}>
            Share this code with your partner so they can join you.
          </Text>

          <View style={[s.codeBox, { borderColor: '#C4978F', backgroundColor: '#FFF0EC' }]}>
            <Text style={[s.codeLabel, { color: '#7A5C58' }]}>ROOM CODE</Text>
            <Text style={[s.codeBig, { color: '#7A5C58' }]}>{roomId}</Text>
          </View>

          <HapticButton style={[s.btn, { backgroundColor: t.brand, marginTop: 24 }]} onPress={onShareCode}>
            <Feather name="share-2" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={s.btnText}>Share Invite Link</Text>
          </HapticButton>

          <HapticButton style={[s.btnOutline, { borderColor: t.border, marginTop: 12 }]} onPress={() => setShowEndDialog(true)}>
            <Text style={[s.btnOutlineText, { color: t.textMuted }]}>End Room & Go Back</Text>
          </HapticButton>
        </View>

        {/* Custom End Room Dialog */}
        <Modal visible={showEndDialog} transparent animationType="fade">
          <View style={s.modalOverlay}>
            <View style={[s.modalCard, { backgroundColor: t.cardBg, borderColor: t.border }]}>
              <Text style={[s.modalTitle, { color: t.text }]}>End Room</Text>
              <Text style={[s.modalSub, { color: t.textMuted }]}>Are you sure you want to end this room? Your partner will not be able to join.</Text>
              <View style={s.modalRow}>
                <HapticButton style={[s.modalBtn, { backgroundColor: t.bg }]} onPress={() => setShowEndDialog(false)}>
                  <Text style={[s.modalBtnText, { color: t.text }]}>Cancel</Text>
                </HapticButton>
                <HapticButton style={[s.modalBtn, { backgroundColor: '#E05252' }]} onPress={() => { setShowEndDialog(false); onEndRoom(); }}>
                  <Text style={[s.modalBtnText, { color: '#fff' }]}>End Room</Text>
                </HapticButton>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // 3. JOIN SCREEN
  if (mode === 'join') {
    return (
      <View style={s.root}>
        <View style={s.card}>
          <Text style={[s.title, { color: t.text }]}>Join a Room</Text>
          <Text style={[s.sub, { color: t.textMuted, marginBottom: 24 }]}>
            Enter the 6-digit code shared by your partner.
          </Text>
          <TextInput
            style={[s.codeInput, { borderColor: t.border, color: t.text, backgroundColor: t.inputBg }]}
            placeholder="XXXXXX"
            placeholderTextColor={t.textMuted}
            value={code}
            onChangeText={v => {
              const urlMatch = v.match(/code=(\d{6})/);
              if (urlMatch) {
                setCode(urlMatch[1]);
              } else {
                setCode(v.replace(/\D/g, '').slice(0, 6));
              }
            }}
            keyboardType="number-pad"
            maxLength={100} // allow pasting links
            autoFocus
          />
          <TextInput
            style={[s.nameInput, { borderColor: t.border, color: t.text, backgroundColor: t.inputBg, marginBottom: 12 }]}
            placeholder="Room Name (e.g. Anniversary)"
            placeholderTextColor={t.textMuted}
            value={myName}
            onChangeText={onNameChange}
            maxLength={30}
          />
          {error ? <Text style={s.error}>{error}</Text> : null}
          <HapticButton
            style={[s.btn, { backgroundColor: t.brand, opacity: code.length === 6 ? 1 : 0.45 }]}
            onPress={() => onJoinRoom(code)}
            disabled={code.length !== 6 || loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Join Room</Text>}
          </HapticButton>
          <HapticButton onPress={() => setMode(null)} style={s.back}>
            <Text style={[s.backText, { color: t.textMuted }]}>Create a Room instead</Text>
          </HapticButton>
        </View>
      </View>
    );
  }

  // 3. SETUP SCREEN (Guide + Actions)
  return (
    <ScrollView contentContainerStyle={s.scrollRoot} showsVerticalScrollIndicator={false}>
      {typeof bouquetTogetherSvg === 'string' && bouquetTogetherSvg.trim() !== '' ? (
        <SvgXml xml={bouquetTogetherSvg} width={180} height={180} style={{ marginBottom: 12 }} />
      ) : (
        <PremiumImage source={getFlowerImage('rose-1')} style={{ width: 64, height: 64, marginBottom: 12 }} resizeMode="contain" />
      )}
      <Text style={[s.sub, { color: t.textMuted, marginBottom: 32 }]}>
        Connect in real-time to build a shared digital bouquet.
      </Text>

      {resumeRoomId && (
        <HapticButton style={[s.resumeCard, { backgroundColor: '#FFF0EC', borderColor: '#C4978F' }]} onPress={onResume}>
          <MaterialCommunityIcons name="history" size={20} color="#C4978F" />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={[s.resumeTitle, { color: '#7A5C58' }]}>Resume previous session</Text>
            <Text style={[s.resumeSub, { color: '#997E7A' }]}>Room #{resumeRoomId}</Text>
          </View>
          <Feather name="arrow-right" size={16} color="#C4978F" />
        </HapticButton>
      )}

      <TextInput
        style={[s.nameInput, { borderColor: t.border, color: t.text, backgroundColor: t.inputBg, marginBottom: 16, width: '100%' }]}
        placeholder="Room Name (e.g. Anniversary)"
        placeholderTextColor={t.textMuted}
        value={myName}
        onChangeText={onNameChange}
        maxLength={30}
      />

      <View style={s.modeRow}>
        <HapticButton style={[s.modeBtn, { backgroundColor: t.brand }]} onPress={onCreateRoom} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Feather name="plus-circle" size={20} color="#fff" />
              <Text style={s.modeBtnText}>Create Room</Text>
            </>
          )}
        </HapticButton>
        <HapticButton style={[s.modeBtn, { backgroundColor: t.cardBg, borderWidth: 1.5, borderColor: t.border }]} onPress={() => setMode('join')}>
          <Feather name="log-in" size={20} color={t.brand} />
          <Text style={[s.modeBtnText, { color: t.brand }]}>Join Room</Text>
        </HapticButton>
      </View>

      {roomHistory && roomHistory.length > 0 && (
        <View style={{ width: '100%', marginTop: 32 }}>
          <Text style={{ fontFamily: 'Manrope-Bold', fontSize: 16, color: t.text, marginBottom: 12 }}>Room History</Text>
          {roomHistory.map((item, idx) => (
            <HapticButton key={idx} style={[s.historyCard, { backgroundColor: t.cardBg, borderColor: t.border }]} onPress={() => onResumeHistory(item)}>
              <View style={[s.historyIcon, { backgroundColor: item.role === 'Created' ? '#EBF4FF' : '#F3E8FF' }]}>
                <Feather name={item.role === 'Created' ? "plus-circle" : "log-in"} size={16} color={item.role === 'Created' ? '#3B82F6' : '#8B5CF6'} />
              </View>
              <View style={{ flex: 1, marginLeft: 12, marginRight: 8 }}>
                <Text style={[s.historyCode, { color: t.text }]} numberOfLines={1}>
                  {item.roomName ? item.roomName : `Room #${item.code}`}
                </Text>
                <Text style={[s.historyDate, { color: t.textMuted }]} numberOfLines={1}>
                  {item.roomName ? `Room #${item.code} • ` : ''}{new Date(item.date).toLocaleDateString()} • {item.role}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: item.phase === 'done' ? '#E8F5E9' : '#FFF3E0', borderWidth: 0.5, borderColor: item.phase === 'done' ? '#81C784' : '#FFB74D' }}>
                  <Text style={{ fontFamily: 'Manrope-Bold', fontSize: 10, color: item.phase === 'done' ? '#2E7D32' : '#E65100' }}>
                    {item.phase === 'done' ? 'Finished' : 'In Progress'}
                  </Text>
                </View>
                <Feather name="chevron-right" size={16} color={t.textMuted} />
              </View>
            </HapticButton>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

export function SetupGuide() {
  const { theme: t } = useTheme();
  return (
    <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={{ width: '100%', paddingBottom: 16 }}>
      <View style={[s.guideBox, { backgroundColor: t.cardBg, borderColor: t.border, marginRight: 16 }]}>
        <Text style={[s.stepTitle, { color: t.text }]}>1. Create or Join</Text>
        <Text style={[s.stepDesc, { color: t.textMuted, marginBottom: 12 }]}>Share a 6-digit code to connect instantly.</Text>
        <View style={[demoStyles.row, { flex: 1, backgroundColor: t.bg, borderRadius: 12, padding: 12 }]}>
          <View style={[demoStyles.codeBox, { borderColor: '#C4978F' }]}>
            {['4','8','3','7','1','9'].map((d, i) => <Text key={i} style={[demoStyles.codeDigit, { color: '#7A5C58' }]}>{d}</Text>)}
          </View>
        </View>
      </View>

      <View style={[s.guideBox, { backgroundColor: t.cardBg, borderColor: t.border, marginRight: 16 }]}>
        <Text style={[s.stepTitle, { color: t.text }]}>2. Pick & Draw</Text>
        <Text style={[s.stepDesc, { color: t.textMuted, marginBottom: 12 }]}>Secretly select and draw up to 4 flowers each.</Text>
        <View style={[demoStyles.row, { flex: 1, backgroundColor: t.bg, borderRadius: 12, padding: 12 }]}>
          <DrawDemo color="#5B9BD5" />
        </View>
      </View>

      <View style={[s.guideBox, { backgroundColor: t.cardBg, borderColor: t.border, marginRight: 16 }]}>
        <Text style={[s.stepTitle, { color: t.text }]}>3. Arrange & Surprise</Text>
        <Text style={[s.stepDesc, { color: t.textMuted, marginBottom: 12 }]}>Assemble the bouquet and attach a song & message.</Text>
        <View style={[demoStyles.row, { flex: 1, backgroundColor: t.bg, borderRadius: 12, padding: 12 }]}>
          <ArrangeDemo color="#5BAD8E" />
        </View>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scrollRoot: { flexGrow: 1, alignItems: 'center', paddingTop: 20, paddingHorizontal: 24, paddingBottom: 40 },
  root: { flex: 1, alignItems: 'center', paddingTop: 32, paddingHorizontal: 24 },
  title: { fontFamily: 'Manrope-Bold', fontSize: 24, textAlign: 'center', marginBottom: 8 },
  sub: { fontFamily: 'Manrope-Regular', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  
  // Setup Guide
  guideBox: {
    width: W - 48, borderRadius: 16, borderWidth: 1,
    padding: 20, gap: 16,
  },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  stepNum: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  stepText: { flex: 1 },
  stepTitle: { fontFamily: 'Manrope-SemiBold', fontSize: 15, marginBottom: 2 },
  stepDesc: { fontFamily: 'Manrope-Regular', fontSize: 13, lineHeight: 18 },

  // Waiting Screen
  waitingContainer: { width: '100%', alignItems: 'center', marginTop: 20 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  checkBadgeLobby: {
    position: 'absolute', bottom: 0, right: 0, width: 24, height: 24,
    borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff',
  },
  codeBox: {
    width: '100%', borderWidth: 2, borderRadius: 16, borderStyle: 'dashed',
    paddingVertical: 20, alignItems: 'center', marginTop: 12,
  },
  codeLabel: { fontFamily: 'Manrope-SemiBold', fontSize: 12, letterSpacing: 1, marginBottom: 4 },
  codeBig: { fontFamily: 'Manrope-Bold', fontSize: 44, letterSpacing: 8 },

  // Join Screen
  card: { width: '100%', marginTop: 20, alignItems: 'center' },
  codeInput: {
    width: '100%', borderWidth: 1.5, borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 20,
    fontSize: 32, fontFamily: 'Manrope-Bold', textAlign: 'center',
    letterSpacing: 8, marginBottom: 12,
  },
  nameInput: {
    width: '100%', borderWidth: 1.5, borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 20,
    fontSize: 16, fontFamily: 'Manrope-SemiBold', textAlign: 'center',
  },
  
  // Shared Components
  resumeCard: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1.5,
    borderRadius: 14, padding: 14, marginBottom: 20, width: '100%',
  },
  resumeTitle: { fontFamily: 'Manrope-SemiBold', fontSize: 14 },
  resumeSub: { fontFamily: 'Manrope-Regular', fontSize: 12, marginTop: 2 },
  
  modeRow: { flexDirection: 'row', gap: 12, width: '100%' },
  modeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16, borderRadius: 16,
  },
  modeBtnText: { fontFamily: 'Manrope-Bold', fontSize: 15, color: '#fff' },
  
  btn: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16 },
  btnText: { fontFamily: 'Manrope-Bold', fontSize: 16, color: '#fff' },
  btnOutline: { width: '100%', paddingVertical: 16, borderRadius: 16, alignItems: 'center', borderWidth: 1.5 },
  btnOutlineText: { fontFamily: 'Manrope-SemiBold', fontSize: 15 },
  
  back: { marginTop: 16, padding: 8 },
  backText: { fontFamily: 'Manrope-SemiBold', fontSize: 14 },
  error: { color: '#E05252', fontFamily: 'Manrope-Regular', fontSize: 13, marginBottom: 8 },

  // Custom Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { width: '100%', borderRadius: 20, borderWidth: 1, padding: 24, alignItems: 'center' },
  modalTitle: { fontFamily: 'Manrope-Bold', fontSize: 20, marginBottom: 8 },
  modalSub: { fontFamily: 'Manrope-Regular', fontSize: 14, textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  modalRow: { flexDirection: 'row', gap: 12, width: '100%' },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  modalBtnText: { fontFamily: 'Manrope-Bold', fontSize: 15 },

  historyCard: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, borderRadius: 16, borderWidth: 1,
    marginBottom: 10,
  },
  historyIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  historyCode: { fontFamily: 'Manrope-Bold', fontSize: 14, marginBottom: 2 },
  historyDate: { fontFamily: 'Manrope-Regular', fontSize: 12 },
});

const demoStyles = StyleSheet.create({
  row: { alignItems: 'center', justifyContent: 'center' },
  codeBox: { flexDirection: 'row', gap: 6, borderWidth: 2, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, borderStyle: 'dashed' },
  codeDigit: { fontFamily: 'Manrope-Bold', fontSize: 18, letterSpacing: 2 },
  drawBox: { flexDirection: 'row', alignItems: 'center', gap: 12, width: '100%' },
  canvasArea: { flex: 1, backgroundColor: '#fff', borderRadius: 8, padding: 8, borderWidth: 1, borderColor: '#eee' },
  strokeLine: { height: 6, borderRadius: 3 },
  refBox: { width: 40, height: 40, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  arrangeBox: { width: 100, height: 60, alignItems: 'center', justifyContent: 'center' },
});
