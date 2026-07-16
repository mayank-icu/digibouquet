import { HapticButton } from '../components/HapticButton';
/**
 * MessageMediaUploader
 * Lets logged-in users attach:
 *   - Up to 5 images (each compressed, uploaded to Cloudinary with debounce)
 *   - 1 audio note up to 10 seconds (compressed, uploaded to Cloudinary)
 *
 * Props:
 *   images        Array<{ uri, url, uploading, isPendingUpload }> (default [])
 *   audio         { uri, url, uploading, isPendingUpload, duration } | null
 *   onAddImages   (newImages) => void   — called after picker with new picks
 *   onRemoveImage (index) => void
 *   onEditImage   (index, { uri }) => void
 *   onAudio       (result) => void
 *   onRemoveAudio () => void
 *   disabled      boolean
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Image,
  Alert, ActivityIndicator, Platform, Animated, Modal, PanResponder,
  ScrollView, TextInput
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Audio } from 'expo-av';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import ViewShot from 'react-native-view-shot';
import { useCustomAlert } from '../contexts/AlertContext';
import { CachedImage } from './CachedImage';
import { uploadImage, uploadAudio } from '../utils/cloudinaryUpload';

const MAX_DURATION = 10; // seconds

function pointsToPath(points) {
  if (!points || points.length < 2) return '';
  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L${points[i].x},${points[i].y}`;
  }
  return d;
}

// ── DraggableText component helper ──
function DraggableText({ overlay, onUpdate, onDelete, onEdit }) {
  const pan = useRef(new Animated.ValueXY({ x: overlay.x, y: overlay.y })).current;

  const textPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gs) => Math.abs(gs.dx) > 5 || Math.abs(gs.dy) > 5,
      onPanResponderGrant: () => {
        pan.setOffset({
          x: pan.x._value,
          y: pan.y._value
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([
        null, { dx: pan.x, dy: pan.y }
      ], { useNativeDriver: false }),
      onPanResponderRelease: () => {
        pan.flattenOffset();
        onUpdate(overlay.id, { x: pan.x._value, y: pan.y._value });
      }
    })
  ).current;

  return (
    <Animated.View
      {...textPanResponder.panHandlers}
      style={{
        position: 'absolute',
        transform: [{ translateX: pan.x }, { translateY: pan.y }],
        padding: 8,
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderRadius: 6,
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <HapticButton onPress={() => onEdit && onEdit(overlay.id)}>
        <Text style={{ color: overlay.color, fontSize: overlay.fontSize, fontWeight: 'bold' }}>
          {overlay.text}
        </Text>
      </HapticButton>
      <HapticButton onPress={() => onDelete(overlay.id)} style={{ marginLeft: 8, padding: 4 }}>
        <Feather name="trash-2" size={14} color="#E63946" />
      </HapticButton>
    </Animated.View>
  );
}

export default function MessageMediaUploader({
  images = [], audio, onAddImages, onRemoveImage, onEditImage, onAudio, onRemoveAudio, disabled,
}) {
  const { theme: t } = useTheme();
  const showAlert = useCustomAlert();
  const [recording, setRecording] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);
  const recRef = useRef(null);

  const [waves, setWaves] = useState(Array(15).fill(0));
  const waveAnim = useRef(new Animated.Value(0)).current;
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // ── Drawing Editor State ──
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingImageIndex, setEditingImageIndex] = useState(null);
  const viewShotRef = useRef(null);
  const [strokes, setStrokes] = useState([]);
  const [currentPath, setCurrentPath] = useState(null);
  const [drawColor, setDrawColor] = useState('#E63946');
  const [drawSize, setDrawSize] = useState(6);
  const [drawType, setDrawType] = useState('pen'); // 'pen' | 'highlighter' | 'dashed'
  const [isDrawingMode, setIsDrawingMode] = useState(false);

  // ── Text Overlay State ──
  const [textOverlays, setTextOverlays] = useState([]);
  const [textInputVisible, setTextInputVisible] = useState(false);
  const [typedText, setTypedText] = useState('');
  const [editingTextId, setEditingTextId] = useState(null);

  // ── Crop State ──
  const [isCroppingMode, setIsCroppingMode] = useState(false);
  const [appliedCrop, setAppliedCrop] = useState(null); // { x, y, w, h }
  const [cropBox, setCropBox] = useState({ x: 50, y: 50, w: 200, h: 200 });
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [layoutSize, setLayoutSize] = useState({ w: 0, h: 0 });

  const activeEditImage = editingImageIndex !== null ? images[editingImageIndex] : null;

  useEffect(() => {
    if (activeEditImage?.uri) {
      Image.getSize(activeEditImage.uri, (w, h) => {
        setImgSize({ w, h });
      }, (err) => {
        console.log('Error getting image size:', err);
      });
    }
  }, [activeEditImage?.uri]);

  // Main drawing panResponder
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => isDrawingMode && !isCroppingMode,
      onMoveShouldSetPanResponder: () => isDrawingMode && !isCroppingMode,
      onPanResponderGrant: (evt) => {
        if (!isDrawingMode || isCroppingMode) return;
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentPath({
          color: drawColor,
          size: drawSize,
          type: drawType,
          points: [{ x: locationX, y: locationY }]
        });
      },
      onPanResponderMove: (evt) => {
        if (!isDrawingMode || !currentPath || isCroppingMode) return;
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentPath(prev => {
          if (!prev) return prev;
          return { ...prev, points: [...prev.points, { x: locationX, y: locationY }] };
        });
      },
      onPanResponderRelease: () => {
        if (!isDrawingMode || !currentPath || isCroppingMode) return;
        setStrokes(prev => [...prev, currentPath]);
        setCurrentPath(null);
      },
    })
  ).current;

  // Crop Box Drag Responders
  const cropStartPos = useRef({ x: 0, y: 0 });
  const cropMoveResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        cropStartPos.current = { x: cropBox.x, y: cropBox.y };
      },
      onPanResponderMove: (evt, gs) => {
        setCropBox(prev => {
          let newX = cropStartPos.current.x + gs.dx;
          let newY = cropStartPos.current.y + gs.dy;
          newX = Math.max(0, Math.min(layoutSize.w - prev.w, newX));
          newY = Math.max(0, Math.min(layoutSize.h - prev.h, newY));
          return { ...prev, x: newX, y: newY };
        });
      }
    })
  ).current;

  const cropStartSize = useRef({ w: 0, h: 0 });
  const cropResizeResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        cropStartSize.current = { w: cropBox.w, h: cropBox.h };
      },
      onPanResponderMove: (evt, gs) => {
        setCropBox(prev => {
          let newW = cropStartSize.current.w + gs.dx;
          let newH = cropStartSize.current.h + gs.dy;
          newW = Math.max(50, Math.min(layoutSize.w - prev.x, newW));
          newH = Math.max(50, Math.min(layoutSize.h - prev.y, newH));
          return { ...prev, w: newW, h: newH };
        });
      }
    })
  ).current;

  const handleApplyCrop = async () => {
    setAppliedCrop({
      x: cropBox.x,
      y: cropBox.y,
      w: cropBox.w,
      h: cropBox.h
    });
    setIsCroppingMode(false);
  };

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      recRef.current?.stopAndUnloadAsync().catch(() => {});
      sound?.unloadAsync().catch(() => {});
    };
  }, [sound]);

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(waveAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.timing(waveAnim, { toValue: 0, duration: 500, useNativeDriver: true })
        ])
      ).start();
    } else {
      waveAnim.stopAnimation();
      waveAnim.setValue(0);
    }
  }, [isRecording]);

  // ── Image picker ───────────────────────────────────────────────────────────
  // Uses the Android system photo picker (useLaunchedPhotoPicker: true) which
  // does not require READ_MEDIA_IMAGES / READ_MEDIA_VIDEO permissions.
  const pickImage = async () => {
    if (disabled) return;
    const remainingSlots = 5 - images.length;
    if (remainingSlots <= 0) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      useLaunchedPhotoPicker: true,
      allowsMultipleSelection: true,
      selectionLimit: remainingSlots,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const processed = [];
      for (const asset of result.assets) {
        let localUri = asset.uri;
        try {
          // Force resize width to 900px to save bandwidth
          const manipResult = await ImageManipulator.manipulateAsync(
            localUri,
            [{ resize: { width: 900 } }],
            { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
          );
          localUri = manipResult.uri;
        } catch (err) {
          console.warn('Image manipulation failed:', err);
        }
        processed.push({ uri: localUri });
      }
      onAddImages?.(processed);
    }
  };

  // ── Audio recording ────────────────────────────────────────────────────────
  const startRecording = async () => {
    if (disabled) return;
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        Alert.alert('Permission needed', 'Allow microphone access to record a voice note.');
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording: rec } = await Audio.Recording.createAsync({
        isMeteringEnabled: true,
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 22050,
          numberOfChannels: 1,
          bitRate: 32000,
        },
        ios: {
          extension: '.m4a',
          audioQuality: Audio.IOSAudioQuality.LOW,
          sampleRate: 22050,
          numberOfChannels: 1,
          bitRate: 32000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 32000,
        },
      });
      rec.setOnRecordingStatusUpdate((status) => {
        if (status.metering !== undefined) {
          setWaves(prev => {
            const next = [...prev];
            next.shift();
            // Map -50..0 dB to 0..1 scale
            const level = Math.max(0, (status.metering + 50) / 50);
            next.push(level);
            return next;
          });
        }
      });
      recRef.current = rec;
      setRecording(rec);
      setElapsed(0);

      timerRef.current = setInterval(() => {
        setElapsed(e => {
          if (e >= MAX_DURATION - 1) {
            stopRecording(MAX_DURATION);
            return MAX_DURATION;
          }
          return e + 1;
        });
      }, 1000);
    } catch (err) {
      Alert.alert('Error', 'Could not start recording: ' + err.message);
    }
  };

  const stopRecording = async (eventOrDuration) => {
    clearInterval(timerRef.current);
    const rec = recRef.current;
    if (!rec) return;
    try {
      await rec.stopAndUnloadAsync();
      const uri = rec.getURI();
      recRef.current = null;
      setRecording(null);
      
      let dur = elapsed;
      if (typeof eventOrDuration === 'number') {
        dur = eventOrDuration;
      }
      
      setElapsed(0);
      if (uri) {
        // Immediately show audio in UI and defer upload to submit
        onAudio?.({ uri, url: null, uploading: false, duration: dur });
      }
    } catch (err) {
      setRecording(null);
    }
  };

  const togglePlayback = async () => {
    if (isPlaying) {
      await sound?.pauseAsync();
      setIsPlaying(false);
    } else {
      if (sound) {
        await sound.playAsync();
        setIsPlaying(true);
      } else if (audio?.uri) {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: audio.uri },
          { shouldPlay: true }
        );
        newSound.setOnPlaybackStatusUpdate(status => {
          if (status.didJustFinish) setIsPlaying(false);
        });
        setSound(newSound);
        setIsPlaying(true);
      }
    }
  };

  const isRecording = !!recording;

  // ── Mosaic Collage Grid ────────────────────────────────────────────────────
  const renderImageGrid = () => {
    if (images.length === 0) return null;
    const GAP = 3;

    const ImageCell = ({ img, index }) => (
      <HapticButton
        style={{ flex: 1, borderRadius: 8, overflow: 'hidden', position: 'relative', backgroundColor: '#f0ece8' }}
        onPress={() => { setEditingImageIndex(index); setEditorVisible(true); setStrokes([]); setTextOverlays([]); setAppliedCrop(null); }}
        disabled={disabled || img.uploading}
      >
        <CachedImage source={{ uri: img.uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        {/* Uploading overlay */}
        {(img.uploading) && (
          <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}>
            <ActivityIndicator color="#fff" size="small" />
            <Text style={{ color: '#fff', fontSize: 10, marginTop: 4, fontFamily: 'Manrope-SemiBold' }}>Uploading</Text>
          </View>
        )}
        {/* Pending debounce indicator */}
        {(img.isPendingUpload && !img.uploading) && (
          <View style={{ position: 'absolute', bottom: 6, left: 6, backgroundColor: 'rgba(122,92,88,0.85)', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3 }}>
            <Text style={{ color: '#fff', fontSize: 9, fontFamily: 'Manrope-SemiBold' }}>● Pending</Text>
          </View>
        )}
        {/* Uploaded success indicator */}
        {img.url && !img.uploading && !img.isPendingUpload && (
          <View style={{ position: 'absolute', bottom: 6, left: 6, backgroundColor: 'rgba(91,173,142,0.9)', borderRadius: 10, padding: 3 }}>
            <Feather name="check" size={10} color="#fff" />
          </View>
        )}
        {/* Edit hint icon */}
        {!img.uploading && !img.isPendingUpload && (
          <View style={{ position: 'absolute', bottom: 6, right: 30, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 10, padding: 4 }}>
            <Feather name="edit-2" size={10} color="#fff" />
          </View>
        )}
        {/* Remove button */}
        <HapticButton
          style={{ position: 'absolute', top: 5, right: 5, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 12, padding: 4, zIndex: 10 }}
          onPress={() => onRemoveImage?.(index)}
          disabled={img.uploading}
        >
          <Feather name="x" size={12} color="#fff" />
        </HapticButton>
      </HapticButton>
    );

    const count = images.length;

    if (count === 1) {
      return (
        <View style={{ height: 220, borderRadius: 10, overflow: 'hidden' }}>
          <ImageCell img={images[0]} index={0} />
        </View>
      );
    }

    if (count === 2) {
      return (
        <View style={{ height: 180, flexDirection: 'row', gap: GAP, borderRadius: 10, overflow: 'hidden' }}>
          <ImageCell img={images[0]} index={0} />
          <ImageCell img={images[1]} index={1} />
        </View>
      );
    }

    if (count === 3) {
      return (
        <View style={{ height: 200, flexDirection: 'row', gap: GAP, borderRadius: 10, overflow: 'hidden' }}>
          <View style={{ flex: 1.4 }}>
            <ImageCell img={images[0]} index={0} />
          </View>
          <View style={{ flex: 1, gap: GAP }}>
            <ImageCell img={images[1]} index={1} />
            <ImageCell img={images[2]} index={2} />
          </View>
        </View>
      );
    }

    if (count === 4) {
      return (
        <View style={{ height: 210, gap: GAP, borderRadius: 10, overflow: 'hidden' }}>
          <View style={{ flex: 1, flexDirection: 'row', gap: GAP }}>
            <ImageCell img={images[0]} index={0} />
            <ImageCell img={images[1]} index={1} />
          </View>
          <View style={{ flex: 1, flexDirection: 'row', gap: GAP }}>
            <ImageCell img={images[2]} index={2} />
            <ImageCell img={images[3]} index={3} />
          </View>
        </View>
      );
    }

    // 5 images: bento / hero layout
    return (
      <View style={{ height: 230, flexDirection: 'row', gap: GAP, borderRadius: 10, overflow: 'hidden' }}>
        {/* Left: 1 large hero */}
        <View style={{ flex: 1.3 }}>
          <ImageCell img={images[0]} index={0} />
        </View>
        {/* Right: 2x2 grid */}
        <View style={{ flex: 1, gap: GAP }}>
          <View style={{ flex: 1, flexDirection: 'row', gap: GAP }}>
            <ImageCell img={images[1]} index={1} />
            <ImageCell img={images[2]} index={2} />
          </View>
          <View style={{ flex: 1, flexDirection: 'row', gap: GAP }}>
            <ImageCell img={images[3]} index={3} />
            <ImageCell img={images[4]} index={4} />
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <HapticButton
        style={[styles.accordionHeader, { borderColor: '#EAE0D5', backgroundColor: isExpanded ? '#f8f9fa' : '#fff' }]}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Feather name="paperclip" size={16} color="#7A5C58" />
          <Text style={[styles.label, { color: '#7A5C58', marginBottom: 0 }]}>
            Attach Media
            {images.length > 0 ? ` (${images.length}/5 photos` : ' (Photos / Voice'}
            {audio ? (images.length > 0 ? ' + Voice)' : ')') : (images.length > 0 ? ')' : ')')}
          </Text>
        </View>
        <Feather name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color="#7A5C58" />
      </HapticButton>

      {isExpanded && (
        <View style={[styles.row, { flexDirection: 'column', marginTop: 12 }]}>

          {/* ── Image Grid ── */}
          {images.length > 0 && (
            <View style={{ marginBottom: 10 }}>
              {renderImageGrid()}
            </View>
          )}

          {/* ── Add Photo button (shown if < 5 images) ── */}
          {images.length < 5 && (
            <HapticButton
              style={[styles.btn, styles.imageBtn, { borderColor: t.border, backgroundColor: t.cardBg, height: images.length === 0 ? 100 : 48, marginBottom: 8 }]}
              onPress={pickImage}
              disabled={disabled}
            >
              <Feather name="image" size={16} color={t.brand} />
              <Text style={[styles.btnText, { color: t.textMuted }]}>
                {images.length === 0 ? 'Add Photos (up to 5)' : `Add More (${5 - images.length} left)`}
              </Text>
            </HapticButton>
          )}

          {/* ── Audio ── */}
          {!audio ? (
            <HapticButton
              style={[
                styles.btn,
                { borderColor: isRecording ? '#E63946' : t.border, backgroundColor: isRecording ? '#FFF0F0' : t.cardBg, paddingVertical: 14 },
              ]}
              onPress={isRecording ? stopRecording : startRecording}
              disabled={disabled}
            >
              <Feather name={isRecording ? 'stop-circle' : 'mic'} size={18} color={isRecording ? '#E63946' : t.brand} />
              <Text style={[styles.btnText, { color: isRecording ? '#E63946' : t.textMuted }]}>
                {isRecording ? `Stop (${MAX_DURATION - elapsed}s)` : 'Voice Note'}
              </Text>
              {isRecording && (
                <View style={[styles.wavesContainer, { overflow: 'hidden' }]}>
                  {waves.map((val, i) => (
                    <View
                      key={i}
                      style={[
                        styles.waveBar,
                        { height: Math.max(4, Math.min(val * 40, 24)), opacity: 0.4 + (val * 0.6) }
                      ]}
                    />
                  ))}
                </View>
              )}
            </HapticButton>
          ) : (
            <View style={[styles.audioPreview, { borderColor: t.border, backgroundColor: t.cardBg }]}>
              {(audio.uploading || audio.isPendingUpload) ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <ActivityIndicator color={t.brand} size="small" />
                  <Text style={{ color: t.textMuted, fontSize: 11, fontFamily: 'Manrope-Regular' }}>
                    {audio.uploading ? 'Uploading…' : 'Pending upload…'}
                  </Text>
                </View>
              ) : (
                <HapticButton onPress={togglePlayback} style={styles.playBtn}>
                  <Feather name={isPlaying ? "pause" : "play"} size={16} color="white" />
                </HapticButton>
              )}
              <Text style={[styles.audioDur, { color: t.text }]}>
                {(audio.uploading || audio.isPendingUpload) ? '' : `${audio.duration ?? ''}s note`}
              </Text>
              {audio.url && !audio.uploading && <Feather name="check-circle" size={14} color="#5BAD8E" />}
              <HapticButton onPress={() => { onRemoveAudio?.(); setSound(null); setIsPlaying(false); }} disabled={audio.uploading} style={{ marginLeft: 6 }}>
                <Feather name="x" size={14} color={t.textMuted} />
              </HapticButton>
            </View>
          )}
        </View>
      )}

      {/* Custom Image Editor Modal */}
      <Modal visible={editorVisible && !!activeEditImage} animationType="slide" transparent={false} onRequestClose={() => { setEditorVisible(false); setEditingImageIndex(null); }}>
           <View style={{flex: 1, backgroundColor: '#000'}}>
             <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 50, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.5)'}}>
               <HapticButton onPress={() => {
                 if (isCroppingMode) {
                   setIsCroppingMode(false);
                 } else {
                   setEditorVisible(false);
                   setEditingImageIndex(null);
                 }
               }}>
                 <Text style={{color: '#fff', fontSize: 16, fontFamily: 'Manrope-SemiBold'}}>Cancel</Text>
               </HapticButton>
               <Text style={{color: '#fff', fontSize: 16, fontFamily: 'Manrope-Bold'}}>
                 {isCroppingMode ? 'Crop Photo' : 'Edit Photo'}
               </Text>
               <HapticButton onPress={async () => {
                 if (isCroppingMode) {
                   setAppliedCrop({ ...cropBox });
                   // Use setTimeout to allow ViewShot to resize to crop dimensions before capture
                   setTimeout(async () => {
                     if (viewShotRef.current) {
                       try {
                         const croppedUri = await viewShotRef.current.capture();
                         if (editingImageIndex !== null) onEditImage?.(editingImageIndex, { uri: croppedUri });
                         setAppliedCrop(null);
                         setIsCroppingMode(false);
                         setEditorVisible(false);
                         setEditingImageIndex(null);
                       } catch (err) {
                         Alert.alert('Error', 'Could not crop image');
                         setAppliedCrop(null);
                         setIsCroppingMode(false);
                       }
                     }
                   }, 150);
                 } else {
                    if (viewShotRef.current) {
                      try {
                        const uri = await viewShotRef.current.capture();
                        if (editingImageIndex !== null) onEditImage?.(editingImageIndex, { uri });
                        setEditorVisible(false);
                        setEditingImageIndex(null);
                      } catch (err) {
                        Alert.alert('Error', 'Could not save image');
                      }
                    }
                  }
               }}>
                 <Text style={{color: '#5BAD8E', fontSize: 16, fontFamily: 'Manrope-SemiBold'}}>
                   {isCroppingMode ? 'Apply' : 'Save'}
                 </Text>
               </HapticButton>
             </View>
             
             {/* Dynamic aspect-ratio editor wrapper container */}
             <View style={{flex: 1, padding: 20, justifyContent: 'center', alignItems: 'center'}}>
               <View 
                 style={{
                   width: '100%',
                   aspectRatio: imgSize.w && imgSize.h ? imgSize.w / imgSize.h : 1,
                   maxHeight: '70%',
                   position: 'relative'
                 }}
                 onLayout={(e) => {
                   const { width, height } = e.nativeEvent.layout;
                   setLayoutSize({ w: width, h: height });
                   setCropBox({
                     x: width * 0.1,
                     y: height * 0.1,
                     w: width * 0.8,
                     h: height * 0.8
                   });
                 }}
                 {...panResponder.panHandlers}
               >
                                   {(() => {
                    const effectiveCrop = isCroppingMode ? null : appliedCrop;
                    const cropX = effectiveCrop ? effectiveCrop.x : 0;
                    const cropY = effectiveCrop ? effectiveCrop.y : 0;
                    const cropW = effectiveCrop ? effectiveCrop.w : (layoutSize.w || '100%');
                    const cropH = effectiveCrop ? effectiveCrop.h : (layoutSize.h || '100%');

                    return (
                      <ViewShot 
                        ref={viewShotRef} 
                        style={{
                          position: 'absolute',
                          left: cropX,
                          top: cropY,
                          width: cropW,
                          height: cropH,
                          overflow: 'hidden'
                        }} 
                        options={{ format: 'jpg', quality: 0.4 }}
                      >
                                       <CachedImage 
                      source={{ uri: activeEditImage?.uri }} 
                      style={{
                        position: 'absolute',
                        left: -cropX,
                        top: -cropY,
                        width: layoutSize.w || '100%',
                        height: layoutSize.h || '100%',
                        resizeMode: 'contain'
                      }} 
                    />
                   
                   {/* Draw Overlay */}
                   {!isCroppingMode && (
                                       <View 
                      style={{
                        position: 'absolute',
                        left: -cropX,
                        top: -cropY,
                        width: layoutSize.w || '100%',
                        height: layoutSize.h || '100%'
                      }} 
                      pointerEvents="none"
                    >
                      <Svg style={StyleSheet.absoluteFill}>
                        {strokes.map((stroke, i) => (
                          <Path
                            key={`s-${i}`}
                            d={pointsToPath(stroke.points)}
                            stroke={stroke.color}
                            strokeWidth={stroke.size}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeDasharray={stroke.type === 'dashed' ? [10, 10] : undefined}
                            strokeOpacity={stroke.type === 'highlighter' ? 0.4 : 1}
                            fill="none"
                          />
                        ))}
                        {currentPath && (
                          <Path
                            d={pointsToPath(currentPath.points)}
                            stroke={currentPath.color}
                            strokeWidth={currentPath.size}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeDasharray={currentPath.type === 'dashed' ? [10, 10] : undefined}
                            strokeOpacity={currentPath.type === 'highlighter' ? 0.4 : 1}
                            fill="none"
                          />
                        )}
                      </Svg>
                     </View>
                    )}

                    {/* Text Overlays */}
                    {!isCroppingMode && (
                    <View 
                       style={{
                         position: 'absolute',
                         left: -cropX,
                         top: -cropY,
                         width: layoutSize.w || '100%',
                         height: layoutSize.h || '100%'
                       }} 
                       pointerEvents="box-none"
                     >
                       {textOverlays.map(overlay => (
                      <DraggableText
                        key={overlay.id}
                        overlay={overlay}
                        onUpdate={(id, coords) => {
                          setTextOverlays(prev => prev.map(o => o.id === id ? { ...o, ...coords } : o));
                        }}
                        onDelete={(id) => {
                          setTextOverlays(prev => prev.filter(o => o.id !== id));
                        }}
                        onEdit={(id) => {
                          const currentText = textOverlays.find(o => o.id === id)?.text || '';
                          setTypedText(currentText);
                          setEditingTextId(id);
                          setTextInputVisible(true);
                        }}
                      />
                                        ))}
                     </View>
                     )}
                                    </ViewShot>
                  );
                  })()}

                 {/* Drawing Touch Overlay */}
                 {isDrawingMode && (
                   <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers} />
                 )}

                 {/* Visual Crop Box Overlay */}
                 {isCroppingMode && (
                   <View style={{
                     position: 'absolute',
                     left: cropBox.x,
                     top: cropBox.y,
                     width: cropBox.w,
                     height: cropBox.h,
                     borderWidth: 2,
                     borderColor: '#fff',
                     borderStyle: 'dashed',
                     backgroundColor: 'rgba(255,255,255,0.15)',
                     zIndex: 20
                   }}>
                     {/* Move handle (Center area) */}
                     <View 
                       {...cropMoveResponder.panHandlers} 
                       style={{
                         flex: 1, 
                         justifyContent: 'center', 
                         alignItems: 'center'
                       }}
                     >
                       <Feather name="move" size={24} color="#fff" style={{ opacity: 0.8 }} />
                     </View>

                     {/* Resize handle (Bottom Right Corner) */}
                     <View 
                       {...cropResizeResponder.panHandlers} 
                       style={{
                         position: 'absolute',
                         right: -12,
                         bottom: -12,
                         width: 32,
                         height: 32,
                         borderRadius: 16,
                         backgroundColor: '#5BAD8E',
                         alignItems: 'center',
                         justifyContent: 'center',
                         zIndex: 30,
                         borderWidth: 2,
                         borderColor: '#fff'
                       }}
                     >
                       <Feather name="corner-right-down" size={16} color="#fff" />
                     </View>
                   </View>
                 )}
               </View>
             </View>

             {/* Brush Control Panel (Sizes, Styles, Colors) - Placed ABOVE bottom toolbar so it never overlaps nav bar */}
             {isDrawingMode && !isCroppingMode && (
               <View style={{ backgroundColor: '#181818', padding: 16, borderTopWidth: 1, borderTopColor: '#333' }}>
                 {/* Brush Sizes */}
                 <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                   <Text style={{ color: '#aaa', fontSize: 12, fontFamily: 'Manrope-Medium' }}>Size:</Text>
                   <View style={{ flexDirection: 'row', gap: 12 }}>
                     {[3, 6, 12, 20].map(sz => (
                       <HapticButton
                         key={sz}
                         onPress={() => setDrawSize(sz)}
                         style={{
                           width: 28, height: 28, borderRadius: 14,
                           backgroundColor: drawSize === sz ? '#5BAD8E' : '#333',
                           alignItems: 'center', justifyContent: 'center'
                         }}
                       >
                         <View style={{ width: sz/2 + 2, height: sz/2 + 2, borderRadius: (sz/2 + 2)/2, backgroundColor: '#fff' }} />
                       </HapticButton>
                     ))}
                   </View>
                 </View>

                 {/* Brush Styles */}
                 <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                   <Text style={{ color: '#aaa', fontSize: 12, fontFamily: 'Manrope-Medium' }}>Style:</Text>
                   <View style={{ flexDirection: 'row', gap: 8 }}>
                     {[
                       { key: 'pen', label: 'Pen' },
                       { key: 'highlighter', label: 'Highlighter' },
                       { key: 'dashed', label: 'Dashed' }
                     ].map(t => (
                       <HapticButton
                         key={t.key}
                         onPress={() => setDrawType(t.key)}
                         style={{
                           paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14,
                           backgroundColor: drawType === t.key ? '#5BAD8E' : '#333'
                         }}
                       >
                         <Text style={{ color: '#fff', fontSize: 11, fontFamily: 'Manrope-SemiBold' }}>{t.label}</Text>
                       </HapticButton>
                     ))}
                   </View>
                 </View>

                 {/* Color Picker & Clear */}
                 <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                   <Text style={{ color: '#aaa', fontSize: 12, fontFamily: 'Manrope-Medium', marginRight: 8 }}>Color:</Text>
                   <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                     {['#E63946', '#F4A261', '#E9C46A', '#2A9D8F', '#FFFFFF', '#000000', '#FF00FF', '#00FFFF'].map(c => (
                       <HapticButton key={c} onPress={() => setDrawColor(c)} style={{
                         width: 24, height: 24, borderRadius: 12, backgroundColor: c,
                         borderWidth: drawColor === c ? 2 : 0, borderColor: '#5BAD8E'
                       }} />
                     ))}
                   </ScrollView>
                   <HapticButton onPress={() => setStrokes([])} style={{ marginLeft: 12 }}>
                     <Text style={{ color: '#E63946', fontSize: 12, fontFamily: 'Manrope-Bold' }}>Clear</Text>
                   </HapticButton>
                 </View>
               </View>
             )}

              {/* Bottom Features with Safe Area padding */}
              <View style={{flexDirection: 'row', justifyContent: 'space-around', padding: 20, paddingBottom: Platform.OS === 'ios' ? 50 : 80, backgroundColor: '#111', borderTopWidth: 1, borderTopColor: '#222'}}>
                <HapticButton style={{alignItems: 'center'}} onPress={() => {
                  setIsCroppingMode(!isCroppingMode);
                  setIsDrawingMode(false);
                }}>
                  <Feather name="crop" size={24} color={isCroppingMode ? '#5BAD8E' : '#fff'} />
                  <Text style={{color: isCroppingMode ? '#5BAD8E' : '#fff', fontSize: 10, marginTop: 4}}>Crop</Text>
                </HapticButton>
                <HapticButton style={{alignItems: 'center'}} onPress={() => {
                  setIsDrawingMode(!isDrawingMode);
                  setIsCroppingMode(false);
                }}>
                  <Feather name="edit-2" size={24} color={isDrawingMode ? '#5BAD8E' : '#fff'} />
                  <Text style={{color: isDrawingMode ? '#5BAD8E' : '#fff', fontSize: 10, marginTop: 4}}>Draw</Text>
                </HapticButton>
                <HapticButton style={{alignItems: 'center'}} onPress={() => {
                  setTextInputVisible(true);
                  setIsDrawingMode(false);
                  setIsCroppingMode(false);
                }}>
                  <Feather name="type" size={24} color="#fff" />
                  <Text style={{color: '#fff', fontSize: 10, marginTop: 4}}>Text</Text>
                </HapticButton>
             </View>
           </View>
      </Modal>

      {/* Text Input Modal Overlay */}
      <Modal visible={textInputVisible} transparent animationType="fade" onRequestClose={() => setTextInputVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <TextInput
            style={{
              width: '100%',
              backgroundColor: '#222',
              color: '#fff',
              fontSize: 20,
              padding: 16,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#444',
              marginBottom: 20,
              textAlign: 'center',
              fontFamily: 'Manrope-Medium'
            }}
            placeholder="Type your overlay text here..."
            placeholderTextColor="#666"
            value={typedText}
            onChangeText={setTypedText}
            autoFocus
            maxLength={60}
          />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <HapticButton 
              onPress={() => { setTextInputVisible(false); setTypedText(''); setEditingTextId(null); }}
              style={{ paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, backgroundColor: '#333' }}
            >
              <Text style={{ color: '#fff', fontFamily: 'Manrope-SemiBold' }}>Cancel</Text>
            </HapticButton>
            <HapticButton 
              onPress={() => {
                if (typedText.trim()) {
                  if (editingTextId) {
                    setTextOverlays(prev => prev.map(o => o.id === editingTextId ? { ...o, text: typedText.trim() } : o));
                  } else {
                    setTextOverlays(prev => [
                      ...prev,
                      {
                        id: Math.random().toString(),
                        text: typedText.trim(),
                        x: layoutSize.w / 2 - 60,
                        y: layoutSize.h / 2 - 20,
                        color: drawColor,
                        fontSize: 20
                      }
                    ]);
                  }
                }
                setTextInputVisible(false);
                setTypedText('');
                setEditingTextId(null);
              }}
              style={{ paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, backgroundColor: '#5BAD8E' }}
            >
              <Text style={{ color: '#fff', fontFamily: 'Manrope-SemiBold' }}>{editingTextId ? 'Save Edit' : 'Add Text'}</Text>
            </HapticButton>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { marginTop: 14, marginBottom: 4 },
  accordionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderWidth: 1, borderRadius: 12 },
  label: { fontFamily: 'Manrope-SemiBold', fontSize: 12, letterSpacing: 0.5 },
  row: { gap: 10 },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed',
  },
  imageBtn: {
    height: 160,
  },
  btnText: { fontFamily: 'Manrope-SemiBold', fontSize: 12 },
  preview: {
    height: 160, width: '100%', borderRadius: 12, borderWidth: 1.5,
    overflow: 'hidden', position: 'relative',
  },
  previewImg: { width: '100%', height: '100%' },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  greenGradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 60,
  },
  doneOverlay: {
    position: 'absolute', bottom: 4, left: 4,
    backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 8, padding: 2,
  },
  removeBtn: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12, padding: 4,
  },
  audioPreview: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, gap: 6,
  },
  audioDur: { fontFamily: 'Manrope-SemiBold', fontSize: 12, flex: 1 },
  playBtn: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#7A5C58',
    alignItems: 'center', justifyContent: 'center', paddingLeft: 2
  },
  hint: { fontFamily: 'Manrope-Regular', fontSize: 10, marginTop: 6 },
  wavesContainer: { flexDirection: 'row', alignItems: 'center', gap: 3, height: 24 },
  waveBar: { width: 4, backgroundColor: '#E63946', borderRadius: 4 },
});
