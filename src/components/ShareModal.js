import { HapticButton } from '../components/HapticButton';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Platform, Linking, Share,
  ScrollView, Switch, Dimensions,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useCountry } from '../contexts/CountryContext';
import { APP_METADATA } from '../utils/countryUtils';
import SharedBottomSheet from './SharedBottomSheet';
import {
  SharedWallpaperCanvas,
  THEMES,
  FONTS,
  LAYOUTS,
} from './SharedWallpaperCanvas';

const { width: W, height: H } = Dimensions.get('window');
// Scale factor for the in-modal preview card
const PREVIEW_SCALE = 0.32;
const PREVIEW_W = W * PREVIEW_SCALE;
const PREVIEW_H = H * PREVIEW_SCALE;

export default function ShareModal({
  visible,
  url,
  onClose,
  title,
  subtitle,
  recipientName,
  shareText: customShareText,
  onEnableNotifications = undefined,
  onShareImage = undefined,
  // Bouquet data for the image tab
  bouquetData = null,
  initialTab = 'link',
}) {
  const insets = useSafeAreaInsets();
  const { theme: t } = useTheme();
  const { t: translate } = useLanguage();
  const { apps: countryApps } = useCountry();

  const [activeTab, setActiveTab] = useState('link');
  const [hasRequestedNotify, setHasRequestedNotify] = useState(false);

  // Image tab customization state
  const [themeKey, setThemeKey] = useState('linen');
  const [fontKey, setFontKey] = useState('handwritten');
  const [layoutKey, setLayoutKey] = useState('center');
  const [showPetals, setShowPetals] = useState(true);
  const [showMessage, setShowMessage] = useState(true);
  const [showBrand, setShowBrand] = useState(true);
  const [isCapturing, setIsCapturing] = useState(false);

  const canvasRef = useRef(null);

  useEffect(() => {
    if (visible) {
      setHasRequestedNotify(false);
      setActiveTab(initialTab);
    }
  }, [visible, initialTab]);

  // Build personalized share text
  const getShareText = () => {
    if (customShareText) return customShareText;

    const translatedDefault = translate('share.defaultText');
    if (translatedDefault && translatedDefault !== 'share.defaultText') {
      if (recipientName) {
        return `${translatedDefault.replace('🌸', '')} for ${recipientName}! 🌸`;
      }
      return translatedDefault;
    }

    if (recipientName) {
      return `I made a digital bouquet for ${recipientName}! 🌸 Open it here: `;
    }
    return 'I made a digital bouquet for you! 🌸 Open it here: ';
  };

  const shareText = getShareText();

  const handleSharePlatform = async (platform) => {
    const fullText = `${shareText}\n${url}`;
    const encodedText = encodeURIComponent(fullText);
    const encodedUrl = encodeURIComponent(url);
    let appUrl = '';

    switch (platform) {
      case 'whatsapp':
        appUrl = `whatsapp://send?text=${encodedText}`;
        break;
      case 'telegram':
        appUrl = `tg://msg?text=${encodedText}`;
        break;
      case 'messenger':
        appUrl = Platform.OS === 'web'
          ? `https://www.messenger.com/t/`
          : `fb-messenger://share?link=${encodedUrl}`;
        break;
      case 'imessage':
        appUrl = `sms:&body=${encodedText}`;
        break;
      case 'signal':
        appUrl = `sgnl://send?text=${encodedText}`;
        break;
      case 'snapchat':
        appUrl = `https://www.snapchat.com/share?link=${encodedUrl}`;
        if (Platform.OS !== 'web') {
          await Clipboard.setStringAsync(shareText);
          Toast.show({ type: 'success', text1: 'Message copied! Paste it as your caption' });
        }
        break;
      case 'viber':
        appUrl = `viber://forward?text=${encodedText}`;
        break;
      case 'line':
        appUrl = `line://msg/text/${encodedText}`;
        break;
      case 'kakaotalk':
        appUrl = `kakaolink://send?appkey=&appver=1.0&formatted_text=${encodedText}&formatted_url=${encodedUrl}`;
        break;
      case 'zalo':
        appUrl = `zalo://to/0?text=${encodedText}`;
        break;
      case 'imo':
        appUrl = `imo://`;
        break;
      case 'threema':
        appUrl = `threema://compose?text=${encodedText}`;
        break;
      case 'instagram':
        appUrl = Platform.OS === 'web'
          ? `https://www.instagram.com`
          : `instagram://app`;
        if (Platform.OS !== 'web') {
          await Clipboard.setStringAsync(fullText);
          Toast.show({ type: 'success', text1: 'Link & message copied! Paste it in your post' });
        }
        break;
      case 'facebook':
        appUrl = Platform.OS === 'web'
          ? `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`
          : `fb://facewebmodal/f?href=${encodedUrl}`;
        break;
      case 'twitter':
        appUrl = Platform.OS === 'web'
          ? `https://twitter.com/intent/tweet?text=${encodedText}`
          : `twitter://post?message=${encodedText}`;
        break;
      case 'reddit':
        appUrl = `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodeURIComponent(shareText)}`;
        break;
      case 'vk':
        appUrl = Platform.OS === 'web'
          ? `https://vk.com/share.php?url=${encodedUrl}&title=${encodeURIComponent(shareText)}`
          : `vk://share?url=${encodedUrl}&title=${encodeURIComponent(shareText)}`;
        break;
      case 'wechat':
        appUrl = `weixin://app`;
        break;
      case 'qq':
        appUrl = `mqqapi://forward?srcType=5&version=1&key=${encodedUrl}`;
        break;
      case 'weibo':
        appUrl = Platform.OS === 'web'
          ? `https://service.weibo.com/share/share.php?url=${encodedUrl}&title=${encodeURIComponent(shareText)}`
          : `sinaweibo://qr?url=${encodedUrl}`;
        break;
      case 'douyin':
        appUrl = `snssdk1128://aweme/share?url=${encodedUrl}`;
        break;
      case 'email':
        appUrl = `mailto:?subject=${encodeURIComponent('A bouquet for you 🌸')}&body=${encodedText}`;
        break;
      default:
        break;
    }

    try {
      if (platform === 'others') {
        if (Platform.OS === 'web') {
          try {
            await Share.share({ message: fullText, url });
          } catch (err) {
            await Clipboard.setStringAsync(fullText);
            Toast.show({ type: 'success', text1: 'Link & message copied to clipboard!' });
          }
        } else {
          await Share.share({ message: fullText, url });
        }
      } else if (Platform.OS === 'web') {
        Linking.openURL(appUrl);
        if (platform === 'instagram') {
          await Clipboard.setStringAsync(fullText);
          Toast.show({ type: 'success', text1: 'Link & message copied! Paste it in your post' });
        } else if (platform === 'snapchat') {
          await Clipboard.setStringAsync(shareText);
          Toast.show({ type: 'success', text1: 'Message copied! Paste it as your caption' });
        }
      } else {
        const canOpen = await Linking.canOpenURL(appUrl);
        if (canOpen) {
          await Linking.openURL(appUrl);
        } else {
          await Share.share({ message: fullText, url });
        }
      }
    } catch (e) {
      console.warn('Share error:', e);
    }
    onClose();
  };

  // ── Capture the off-screen canvas ───────────────────────────────────────────
  const captureCanvas = useCallback(async () => {
    if (!canvasRef.current) return null;
    await new Promise(r => setTimeout(r, 400)); // let SVG + images settle
    const pixelRatio = 3;
    const uri = await captureRef(canvasRef.current, {
      format: 'jpg',
      quality: 0.92,
      result: 'tmpfile',
      width:  Math.round(W * pixelRatio),
      height: Math.round(H * pixelRatio),
    });
    return uri;
  }, []);

  const handleSaveImage = useCallback(async () => {
    try {
      setIsCapturing(true);
      const { status } = await MediaLibrary.requestPermissionsAsync(true);
      if (status !== 'granted') {
        Toast.show({ type: 'error', text1: 'Permission denied' });
        return;
      }
      const uri = await captureCanvas();
      if (!uri) return;
      await MediaLibrary.saveToLibraryAsync(uri);
      Toast.show({ type: 'success', text1: '✓ Saved to Gallery!', text2: 'Your bouquet image is in your photos.' });
    } catch (e) {
      console.error(e);
      Toast.show({ type: 'error', text1: 'Could not save image.' });
    } finally {
      setIsCapturing(false);
    }
  }, [captureCanvas]);

  const handleShareImageNative = useCallback(async () => {
    try {
      setIsCapturing(true);
      const uri = await captureCanvas();
      if (!uri) return;
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/jpeg',
          dialogTitle: 'Share your bouquet',
        });
      } else {
        Toast.show({ type: 'error', text1: 'Sharing not available on this device.' });
      }
    } catch (e) {
      console.error(e);
      Toast.show({ type: 'error', text1: 'Could not share image.' });
    } finally {
      setIsCapturing(false);
    }
  }, [captureCanvas]);

  // ── Icon resolver ────────────────────────────────────────────────────────────
  const FEATHER_KEYS = new Set(['imessage', 'snapchat', 'signal', 'imo', 'zalo', 'others']);

  const renderIcon = (appKey, meta) => {
    if (appKey === 'others') {
      return <Feather name="more-horizontal" size={26} color={t.textMuted} />;
    }
    if (FEATHER_KEYS.has(appKey)) {
      const featherMap = {
        imessage: 'message-circle',
        snapchat:  'camera',
        signal:    'shield',
        imo:       'video',
        zalo:      'message-circle',
      };
      return <Feather name={featherMap[appKey] || 'message-circle'} size={26} color={meta.color || t.text} />;
    }
    return <MaterialCommunityIcons name={meta.icon} size={26} color={meta.color} />;
  };

  // ── App grid ─────────────────────────────────────────────────────────────────
  const renderOption = ({ key, label, icon, bg }) => (
    <HapticButton key={key} style={styles.option} onPress={() => handleSharePlatform(key)}>
      <View style={[styles.iconWrap, { backgroundColor: bg }]}>{icon}</View>
      <Text style={[styles.optionText, { color: t.text }]}>{label}</Text>
    </HapticButton>
  );

  const renderAppOptions = () => {
    const appList = countryApps
      .map(appKey => {
        const meta = APP_METADATA[appKey];
        if (!meta) return null;
        return {
          key: appKey,
          label: meta.label,
          icon: renderIcon(appKey, meta),
          bg: meta.bg || t.surface2,
        };
      })
      .filter(Boolean);

    const row1 = appList.slice(0, 4);
    const row2 = appList.slice(4, 8);

    return (
      <>
        <View style={styles.row}>{row1.map(renderOption)}</View>
        {row2.length > 0 && <View style={styles.row}>{row2.map(renderOption)}</View>}
      </>
    );
  };

  // ── Image Tab ────────────────────────────────────────────────────────────────
  const renderImageTab = (onScroll) => {
    const th = THEMES[themeKey] ?? THEMES['linen'];
    // The canvas is W×H. We scale it by PREVIEW_SCALE.
    // To align the transform origin to top-left we shift by -(W - PREVIEW_W)/2 horizontally
    // and -(H - PREVIEW_H)/2 vertically after applying scale.
    const dx = -(W - PREVIEW_W) / 2;
    const dy = -(H - PREVIEW_H) / 2;
    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 8 }}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {/* Preview card */}
        <View style={styles.previewWrapper}>
          {/* Off-screen full-size canvas for capture */}
          <View
            collapsable={false}
            style={[styles.offscreenCanvas]}
            pointerEvents="none"
          >
            <SharedWallpaperCanvas
              ref={canvasRef}
              themeKey={themeKey}
              fontKey={fontKey}
              layoutKey={layoutKey}
              sizeVal={0.78}
              showPetals={showPetals}
              showMessage={showMessage}
              showBrand={showBrand}
              bouquetData={bouquetData}
            />
          </View>

          {/* Scaled visual preview — pinned to top-left of the frame */}
          <View style={[styles.previewFrame, { borderColor: t.border, backgroundColor: th.bg }]}>
            <View style={{
              width: W, height: H,
              transform: [
                { translateX: W * (PREVIEW_SCALE - 1) / 2 },
                { translateY: H * (PREVIEW_SCALE - 1) / 2 },
                { scale: PREVIEW_SCALE },
              ],
            }}>
              <SharedWallpaperCanvas
                themeKey={themeKey}
                fontKey={fontKey}
                layoutKey={layoutKey}
                sizeVal={0.78}
                showPetals={showPetals}
                showMessage={showMessage}
                showBrand={showBrand}
                bouquetData={bouquetData}
              />
            </View>
          </View>
        </View>

        {/* ── Theme selector ── */}
        <Text style={[styles.sectionLabel, { color: t.textMuted }]}>Background</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.themeRow}>
          {Object.entries(THEMES).map(([key, th]) => (
            <HapticButton
              key={key}
              style={[
                styles.themeCircle,
                { backgroundColor: th.bg, borderColor: themeKey === key ? t.brand : 'transparent' },
              ]}
              onPress={() => setThemeKey(key)}
            >
              <Text style={{ fontSize: 14 }}>{th.icon}</Text>
            </HapticButton>
          ))}
        </ScrollView>

        {/* ── Font selector ── */}
        <Text style={[styles.sectionLabel, { color: t.textMuted }]}>Font Style</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.fontRow}>
          {FONTS.map(f => (
            <HapticButton
              key={f.key}
              style={[
                styles.fontChip,
                {
                  backgroundColor: fontKey === f.key ? t.brand + '18' : t.surface2 || t.cardBg,
                  borderColor: fontKey === f.key ? t.brand : t.border,
                },
              ]}
              onPress={() => setFontKey(f.key)}
            >
              <Text style={[
                styles.fontChipText,
                { color: fontKey === f.key ? t.brand : t.text, fontFamily: f.font },
              ]}>
                {f.label}
              </Text>
            </HapticButton>
          ))}
        </ScrollView>

        {/* ── Layout selector ── */}
        <Text style={[styles.sectionLabel, { color: t.textMuted }]}>Layout</Text>
        <View style={styles.layoutRow}>
          {LAYOUTS.map(l => (
            <HapticButton
              key={l.key}
              style={[
                styles.layoutBtn,
                {
                  backgroundColor: layoutKey === l.key ? t.brand + '18' : t.surface2 || t.cardBg,
                  borderColor: layoutKey === l.key ? t.brand : t.border,
                },
              ]}
              onPress={() => setLayoutKey(l.key)}
            >
              <Text style={{ fontSize: 16 }}>{l.icon}</Text>
              <Text style={[styles.layoutBtnText, { color: layoutKey === l.key ? t.brand : t.text }]}>
                {l.label}
              </Text>
            </HapticButton>
          ))}
        </View>

        {/* ── Toggles ── */}
        <View style={[styles.toggleRow, { borderColor: t.border }]}>
          <Text style={[styles.toggleLabel, { color: t.text }]}>Floating Petals</Text>
          <Switch
            value={showPetals}
            onValueChange={setShowPetals}
            trackColor={{ false: t.border, true: t.brand + '80' }}
            thumbColor={showPetals ? t.brand : t.textMuted}
          />
        </View>
        <View style={[styles.toggleRow, { borderColor: t.border }]}>
          <Text style={[styles.toggleLabel, { color: t.text }]}>Show Message</Text>
          <Switch
            value={showMessage}
            onValueChange={setShowMessage}
            trackColor={{ false: t.border, true: t.brand + '80' }}
            thumbColor={showMessage ? t.brand : t.textMuted}
          />
        </View>
        <View style={[styles.toggleRow, { borderColor: t.border, borderBottomWidth: 0 }]}>
          <Text style={[styles.toggleLabel, { color: t.text }]}>DigiBouquet Watermark</Text>
          <Switch
            value={showBrand}
            onValueChange={setShowBrand}
            trackColor={{ false: t.border, true: t.brand + '80' }}
            thumbColor={showBrand ? t.brand : t.textMuted}
          />
        </View>

        {/* ── Action buttons ── */}
        <View style={styles.imageActions}>
          <HapticButton
            style={[styles.imageActionBtn, styles.imageActionBtnOutline, { borderColor: t.brand }]}
            onPress={handleSaveImage}
            disabled={isCapturing}
          >
            <Feather name="download" size={18} color={t.brand} />
            <Text style={[styles.imageActionText, { color: t.brand }]}>
              {isCapturing ? 'Saving…' : 'Save Image'}
            </Text>
          </HapticButton>
          <HapticButton
            style={[styles.imageActionBtn, { backgroundColor: t.brand }]}
            onPress={handleShareImageNative}
            disabled={isCapturing}
          >
            <Feather name="share-2" size={18} color="#fff" />
            <Text style={[styles.imageActionText, { color: '#fff' }]}>
              {isCapturing ? 'Preparing…' : 'Share Image'}
            </Text>
          </HapticButton>
        </View>
      </ScrollView>
    );
  };

  return (
    <SharedBottomSheet
      visible={visible}
      onClose={onClose}
      style={{
        backgroundColor: t.cardBg,
        paddingBottom: insets.bottom + 16,
        paddingHorizontal: 20,
        paddingTop: 12,
        maxHeight: H * 0.92,
      }}
    >
      {({ onScroll }) => (
        <>
          <View style={[styles.handle, { backgroundColor: t.border }]} />
          <Text style={[styles.title, { color: t.text }]}>
            {title || translate('history.share') || 'Share Bouquet'}
          </Text>
          {subtitle ? <Text style={[styles.subtitle, { color: t.textMuted }]}>{subtitle}</Text> : null}

          {/* ── Tab bar (only shown if bouquetData provided) ── */}
          {bouquetData && (
            <View style={[styles.tabBar, { backgroundColor: t.bg, borderColor: t.border }]}>
              <HapticButton
                style={[styles.tab, activeTab === 'link' && { backgroundColor: t.cardBg }]}
                onPress={() => setActiveTab('link')}
              >
                <Feather name="link-2" size={14} color={activeTab === 'link' ? t.brand : t.textMuted} style={{ marginRight: 5 }} />
                <Text style={[styles.tabText, { color: activeTab === 'link' ? t.brand : t.textMuted }]}>Link</Text>
              </HapticButton>
              <HapticButton
                style={[styles.tab, activeTab === 'image' && { backgroundColor: t.cardBg }]}
                onPress={() => setActiveTab('image')}
              >
                <Feather name="image" size={14} color={activeTab === 'image' ? t.brand : t.textMuted} style={{ marginRight: 5 }} />
                <Text style={[styles.tabText, { color: activeTab === 'image' ? t.brand : t.textMuted }]}>Image</Text>
              </HapticButton>
            </View>
          )}

          {/* ── Link Tab ── */}
          {(!bouquetData || activeTab === 'link') && (
            <>
              {renderAppOptions()}

              {(!bouquetData && onShareImage) ? (
                <>
                  <View style={[styles.divider, { backgroundColor: t.border }]} />
                  <HapticButton
                    style={[styles.notifyBtn, { backgroundColor: t.brand + '15' }]}
                    disabled={isCapturing}
                    onPress={async () => {
                      if (onShareImage) {
                        await onShareImage();
                        onClose();
                      }
                    }}
                  >
                    <Feather name="image" size={18} color={t.brand} />
                    <Text style={[styles.notifyText, { color: t.brand }]}>
                      {isCapturing ? 'Preparing...' : 'Share as Image'}
                    </Text>
                  </HapticButton>
                </>
              ) : null}

              {url ? (
                <View style={[styles.linkContainer, { borderColor: t.border }]}>
                  <Text style={[styles.linkText, { color: t.text }]} selectable>{url}</Text>
                  <HapticButton
                    style={styles.copyBtn}
                    onPress={async () => {
                      const { setStringAsync } = await import('expo-clipboard');
                      await setStringAsync(url);
                    }}
                  >
                    <Feather name="copy" size={18} color={t.brand} />
                  </HapticButton>
                </View>
              ) : null}

              <HapticButton style={[styles.cancelBtn, { backgroundColor: t.bg, marginTop: 8 }]} onPress={onClose}>
                <Text style={[styles.cancelText, { color: t.brand }]}>{translate('common.cancel') || 'Cancel'}</Text>
              </HapticButton>
            </>
          )}

          {/* ── Image Tab — onScroll passed so scrolling doesn't trigger swipe-to-close ── */}
          {bouquetData && activeTab === 'image' && renderImageTab(onScroll)}
        </>
      )}
    </SharedBottomSheet>
  );
}

const styles = StyleSheet.create({
  handle:      { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  title:       { fontFamily: 'Manrope-Bold', fontSize: 18, textAlign: 'center', marginBottom: 4 },
  subtitle:    { fontFamily: 'Manrope-Regular', fontSize: 13, textAlign: 'center', marginBottom: 16 },
  row:         { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  option:      { alignItems: 'center', flex: 1 },
  iconWrap:    { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  optionText:  { fontFamily: 'Manrope-SemiBold', fontSize: 11, textAlign: 'center' },
  linkContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 16, marginTop: 4,
  },
  linkText: { flex: 1, fontFamily: 'Manrope-Regular', fontSize: 13, marginRight: 8 },
  copyBtn: { padding: 4 },
  cancelBtn:   { borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  cancelText:  { fontFamily: 'Manrope-Bold', fontSize: 15 },
  notifyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 12, borderRadius: 12, marginBottom: 16,
  },
  notifyText: { fontFamily: 'Manrope-SemiBold', fontSize: 14 },
  divider: { height: 1, marginVertical: 4, marginBottom: 12 },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
  },
  tabText: { fontFamily: 'Manrope-SemiBold', fontSize: 13 },

  // Preview
  previewWrapper: {
    alignItems: 'center',
    marginBottom: 20,
  },
  offscreenCanvas: {
    position: 'absolute',
    left: -99999,
    top: 0,
    width: W,
    height: H,
    opacity: 0,
    pointerEvents: 'none',
  },
  previewFrame: {
    width: PREVIEW_W,
    height: PREVIEW_H,
    overflow: 'hidden',
    borderRadius: 16,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },

  // Customization sections
  sectionLabel: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 4,
  },
  themeRow: { paddingBottom: 8, gap: 10 },
  themeCircle: {
    width: 42, height: 42, borderRadius: 21,
    borderWidth: 2.5,
    alignItems: 'center', justifyContent: 'center',
  },
  fontRow: { paddingBottom: 8, gap: 8 },
  fontChip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5,
  },
  fontChipText: { fontSize: 13 },
  layoutRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  layoutBtn: {
    flex: 1, flexDirection: 'column', alignItems: 'center',
    paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, gap: 4,
  },
  layoutBtnText: { fontFamily: 'Manrope-SemiBold', fontSize: 11, textAlign: 'center' },

  // Toggles
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  toggleLabel: { fontFamily: 'Manrope-Regular', fontSize: 14 },

  // Action buttons
  imageActions: { flexDirection: 'row', gap: 10, marginTop: 20, marginBottom: 8 },
  imageActionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 7, paddingVertical: 14, borderRadius: 14,
  },
  imageActionBtnOutline: { borderWidth: 1.5, backgroundColor: 'transparent' },
  imageActionText: { fontFamily: 'Manrope-Bold', fontSize: 14 },
});