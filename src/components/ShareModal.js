import { HapticButton } from '../components/HapticButton';
import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Platform, Linking, Share
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useCountry } from '../contexts/CountryContext';
import { APP_METADATA } from '../utils/countryUtils';
import SharedBottomSheet from './SharedBottomSheet';

export default function ShareModal({ visible, url, onClose, title, subtitle, recipientName, shareText: customShareText, onEnableNotifications = undefined, onShareImage = undefined }) {
  const insets = useSafeAreaInsets();
  const { theme: t } = useTheme();
  const { t: translate } = useLanguage();
  const { apps: countryApps } = useCountry();

  const [hasRequestedNotify, setHasRequestedNotify] = useState(false);

  useEffect(() => {
    if (visible) {
      setHasRequestedNotify(false);
    }
  }, [visible]);

  // Build personalized share text
  const getShareText = () => {
    if (customShareText) return customShareText;
    
    // Try to get translated share text
    const translatedDefault = translate('share.defaultText');
    if (translatedDefault && translatedDefault !== 'share.defaultText') {
      // Translation exists
      if (recipientName) {
        return `${translatedDefault.replace('🌸', '')} for ${recipientName}! 🌸`;
      }
      return translatedDefault;
    }
    
    // Fallback to English with personalization
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
      // ── Messaging apps ──────────────────────────────────────────────────
      case 'whatsapp':
        appUrl = `whatsapp://send?text=${encodedText}`;
        break;

      case 'telegram':
        appUrl = `tg://msg?text=${encodedText}`;
        break;

      case 'messenger':
        // Messenger deep-link; falls back to native share if not installed
        appUrl = Platform.OS === 'web'
          ? `https://www.messenger.com/t/`
          : `fb-messenger://share?link=${encodedUrl}`;
        break;

      case 'imessage':
        // sms: works for iMessage and SMS on iOS; no-op on Android (falls back)
        appUrl = `sms:&body=${encodedText}`;
        break;

      case 'signal':
        appUrl = `sgnl://send?text=${encodedText}`;
        break;

      case 'snapchat':
        // Snapchat doesn't support direct text share via deep-link; open the app
        appUrl = Platform.OS === 'web'
          ? `https://www.snapchat.com`
          : `snapchat://`;
        if (Platform.OS !== 'web') {
          await Clipboard.setStringAsync(url);
          Toast.show({ type: 'success', text1: 'Link copied! Paste it in your post' });
        }
        break;

      case 'viber':
        appUrl = `viber://forward?text=${encodedText}`;
        break;

      case 'line':
        appUrl = `line://msg/text/${encodedText}`;
        break;

      case 'kakaotalk':
        // KakaoTalk share via URL scheme
        appUrl = `kakaolink://send?appkey=&appver=1.0&formatted_text=${encodedText}&formatted_url=${encodedUrl}`;
        break;

      case 'zalo':
        appUrl = `zalo://to/0?text=${encodedText}`;
        break;

      case 'imo':
        // IMO doesn't publish a reliable deep-link; open the app
        appUrl = `imo://`;
        break;

      case 'threema':
        appUrl = `threema://compose?text=${encodedText}`;
        break;

      // ── Social / posting apps ───────────────────────────────────────────
      case 'instagram':
        // Instagram doesn't allow pre-filled text; open the app
        appUrl = Platform.OS === 'web'
          ? `https://www.instagram.com`
          : `instagram://app`;
        if (Platform.OS !== 'web') {
          await Clipboard.setStringAsync(url);
          Toast.show({ type: 'success', text1: 'Link copied! Paste it in your post' });
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

      // ── CIS / China ─────────────────────────────────────────────────────
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

      // ── Email ───────────────────────────────────────────────────────────
      case 'email':
        appUrl = `mailto:?subject=${encodeURIComponent('A bouquet for you 🌸')}&body=${encodedText}`;
        break;

      default:
        break;
    }

    try {
      if (platform === 'others') {
        await Share.share({ message: fullText, url });
      } else {
        const canOpen = await Linking.canOpenURL(appUrl);
        if (canOpen) {
          await Linking.openURL(appUrl);
        } else {
          // App not installed — fall back to the native share sheet
          await Share.share({ message: fullText, url });
        }
      }
    } catch (e) {
      console.warn('Share error:', e);
    }
    onClose();
  };

  // ── Icon resolver ────────────────────────────────────────────────────────
  // Some keys use Feather, some use MaterialCommunityIcons.
  // Keys with no dedicated MCI icon fall back to Feather.
  const FEATHER_KEYS = new Set(['imessage', 'snapchat', 'signal', 'imo', 'zalo', 'others']);

  const renderIcon = (appKey, meta) => {
    if (appKey === 'others') {
      return <Feather name="more-horizontal" size={26} color={t.textMuted} />;
    }
    if (FEATHER_KEYS.has(appKey)) {
      // Use Feather for apps without a great MCI icon
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

  // ── App grid ─────────────────────────────────────────────────────────────
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

  const renderOption = ({ key, label, icon, bg }) => (
    <HapticButton key={key} style={styles.option} onPress={() => handleSharePlatform(key)}>
      <View style={[styles.iconWrap, { backgroundColor: bg }]}>{icon}</View>
      <Text style={[styles.optionText, { color: t.text }]}>{label}</Text>
    </HapticButton>
  );

  return (
    <SharedBottomSheet
      visible={visible}
      onClose={onClose}
      style={{
        backgroundColor: t.cardBg, 
        paddingBottom: insets.bottom + 16,
        paddingHorizontal: 20, paddingTop: 12,
      }}
    >
      <View style={[styles.handle, { backgroundColor: t.border }]} />
      <Text style={[styles.title, { color: t.text }]}>
        {title || translate('history.share') || 'Share Bouquet'}
      </Text>
      {subtitle ? <Text style={[styles.subtitle, { color: t.textMuted }]}>{subtitle}</Text> : null}

      {renderAppOptions()}



      {onShareImage ? (
        <HapticButton 
          style={[styles.notifyBtn, { backgroundColor: t.brand + '15', marginTop: onEnableNotifications && !hasRequestedNotify ? 8 : 0 }]} 
          onPress={() => {
            onClose();
            onShareImage();
          }}
        >
          <Feather name="image" size={18} color={t.brand} />
          <Text style={[styles.notifyText, { color: t.brand }]}>Share as Image</Text>
        </HapticButton>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  notifyText: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 14,
  },
});