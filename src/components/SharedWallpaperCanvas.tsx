import React, { useMemo, forwardRef } from 'react';
import { View, Image, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, {
  Defs, RadialGradient, Stop, Rect, Circle, Ellipse, Path, G
} from 'react-native-svg';
import { getFlowerImage } from '../utils/bouquetData';
import { CachedImage } from './CachedImage';

const { width: W, height: H } = Dimensions.get('window');

// ─── Themes ─────────────────────────────────────────────────────────────────
export type Theme = {
  label:        string;
  icon:         string;
  bg:           string;   
  bokeh:        string[]; 
  textAccent:   string;
  nameColor:    string;
  labelColor:   string;
  dividerColor: string;
};

export const THEMES: Record<string, Theme> = {
  linen: {
    label: 'Linen',        icon: '🤍',
    bg:           '#F7F2EC',
    bokeh:        ['#EDE5D8', '#F2ECE2', '#E8DDD0', '#F0E8DC'],
    textAccent:   '#8A6E56',
    nameColor:    '#3D2B1A',
    labelColor:   'rgba(61,43,26,0.45)',
    dividerColor: 'rgba(138,110,86,0.30)',
  },
  sand: {
    label: 'Sand',         icon: '🌾',
    bg:           '#EFE8D8',
    bokeh:        ['#E6DCC8', '#F4EEE2', '#DDD0BA', '#EAE0CC'],
    textAccent:   '#7A6040',
    nameColor:    '#3E2C12',
    labelColor:   'rgba(62,44,18,0.45)',
    dividerColor: 'rgba(122,96,64,0.28)',
  },
  blush: {
    label: 'Blush',        icon: '🌸',
    bg:           '#F5E8E6',
    bokeh:        ['#EED8D4', '#F8EDEB', '#E8CCC8', '#F2E2DE'],
    textAccent:   '#A0625A',
    nameColor:    '#5C2822',
    labelColor:   'rgba(92,40,34,0.45)',
    dividerColor: 'rgba(160,98,90,0.28)',
  },
  petal: {
    label: 'Petal',        icon: '💮',
    bg:           '#F9EEF2',
    bokeh:        ['#F0E0E8', '#FCF4F7', '#E8D4DC', '#F4E8EE'],
    textAccent:   '#B07088',
    nameColor:    '#6E2E46',
    labelColor:   'rgba(110,46,70,0.45)',
    dividerColor: 'rgba(176,112,136,0.28)',
  },
  sage: {
    label: 'Sage',         icon: '🌿',
    bg:           '#E8EEEA',
    bokeh:        ['#DAE6DC', '#EEF5F0', '#CCD8CE', '#E0EBE2'],
    textAccent:   '#4A7058',
    nameColor:    '#1E3D2A',
    labelColor:   'rgba(30,61,42,0.45)',
    dividerColor: 'rgba(74,112,88,0.28)',
  },
  mist: {
    label: 'Mist',         icon: '🩵',
    bg:           '#E8EEF4',
    bokeh:        ['#D8E2EC', '#EEF3F8', '#CCD6E4', '#E0EAF2'],
    textAccent:   '#4A6880',
    nameColor:    '#1E3448',
    labelColor:   'rgba(30,52,72,0.45)',
    dividerColor: 'rgba(74,104,128,0.28)',
  },
  dusk: {
    label: 'Dusk',         icon: '🌙',
    bg:           '#2A2434',
    bokeh:        ['#332B44', '#3E354E', '#2A2238', '#3A3048'],
    textAccent:   '#D0B8E8',
    nameColor:    '#F0E8FF',
    labelColor:   'rgba(240,232,255,0.55)',
    dividerColor: 'rgba(208,184,232,0.35)',
  },
  noir: {
    label: 'Noir',         icon: '🖤',
    bg:           '#1C1C22',
    bokeh:        ['#242430', '#2A2A36', '#1E1E28', '#262632'],
    textAccent:   '#C8B89A',
    nameColor:    '#F4EEE4',
    labelColor:   'rgba(244,238,228,0.55)',
    dividerColor: 'rgba(200,184,154,0.35)',
  },
};

// ─── Font options ───────────────────────────────────────────────────────────
export const FONTS: { key: string; label: string; font: string; size: number; preview: string }[] = [
  { key: 'default',     label: 'Default',     font: 'Manrope-Regular',         size: 34, preview: 'With Love' },
  { key: 'handwritten', label: 'Handwritten', font: 'DancingScript-Regular',   size: 46, preview: 'With Love' },
  { key: 'elegant',     label: 'Elegant',     font: 'PlayfairDisplay-Regular', size: 38, preview: 'With Love' },
  { key: 'modern',      label: 'Modern',      font: 'Manrope-ExtraLight',      size: 34, preview: 'WITH LOVE' },
  { key: 'classic',     label: 'Classic',     font: 'Lora-Italic',             size: 36, preview: 'With Love' },
  { key: 'casual',      label: 'Casual',      font: 'Satisfy-Regular',         size: 42, preview: 'With Love' },
];

// ─── Layout config ───────────────────────────────────────────────────────────
export type LayoutConfig = {
  key:          string;
  label:        string;
  icon:         string;
  flowerTop:    number;   
  flowerH:      number;   
  attrTop?:     number;   
  attrBottom?:  number;   
  attrAlign:    'top' | 'bottom';
};

export const LAYOUTS: LayoutConfig[] = [
  {
    key: 'top', label: 'Flowers Top', icon: '⬆',
    flowerTop: H * 0.03,  flowerH: H * 0.50,
    attrBottom: H * 0.22, attrAlign: 'bottom',
  },
  {
    key: 'center', label: 'Centre', icon: '⊙',
    flowerTop: H * 0.28,  flowerH: H * 0.46,    
    attrTop:   H * 0.05,  attrAlign: 'top',
  },
  {
    key: 'bottom', label: 'Flowers Bottom', icon: '⬇',
    flowerTop: H * 0.46,  flowerH: H * 0.46,
    attrTop:   H * 0.06,  attrAlign: 'top',
  },
];

// ─── Bouquet size options ───────────────────────────────────────────────────
export const SIZES = [
  { val: 0.62, label: 'Small',  emoji: '🌸' },
  { val: 0.78, label: 'Medium', emoji: '🌸🌸' },
  { val: 0.94, label: 'Large',  emoji: '🌸🌸🌸' },
];

// ─── Types ──────────────────────────────────────────────────────────────────
export interface FlowerV2 {
  id: string; x: number; y: number;
  rotation: number; scale: number; zIndex: number; uniqueId?: string;
}

export interface BouquetData {
  version?: number;
  selectedFlowers: (string | FlowerV2)[];
  background: number;
  greeneryBg?: string | null;
  message?: string;
  recipientName?: string;
  senderName?: string;
  messageCard?: { message?: string; recipientName?: string; senderName?: string };
}

// ─── Painted background ─────────────────────────────────────────────────────
const PaintedBg = ({ themeKey, showPetals }: { themeKey: string; showPetals: boolean }) => {
  const th = THEMES[themeKey] || THEMES['linen'];

  const bokeh = [
    { cx: W * 0.08,  cy: H * 0.07,  r: W * 0.38 },
    { cx: W * 0.88,  cy: H * 0.14,  r: W * 0.30 },
    { cx: W * 0.50,  cy: H * 0.42,  r: W * 0.44 },
    { cx: W * 0.12,  cy: H * 0.60,  r: W * 0.32 },
    { cx: W * 0.90,  cy: H * 0.55,  r: W * 0.34 },
    { cx: W * 0.35,  cy: H * 0.82,  r: W * 0.40 },
    { cx: W * 0.78,  cy: H * 0.78,  r: W * 0.30 },
    { cx: W * 0.55,  cy: H * 0.96,  r: W * 0.36 },
  ];

  const sparkles = [
    { cx: W*0.18, cy: H*0.10, r: 2.4 }, { cx: W*0.80, cy: H*0.20, r: 1.8 },
    { cx: W*0.44, cy: H*0.07, r: 2.0 }, { cx: W*0.66, cy: H*0.34, r: 1.5 },
    { cx: W*0.10, cy: H*0.44, r: 2.2 }, { cx: W*0.92, cy: H*0.52, r: 1.8 },
    { cx: W*0.32, cy: H*0.67, r: 2.0 }, { cx: W*0.60, cy: H*0.76, r: 1.5 },
    { cx: W*0.84, cy: H*0.84, r: 2.2 }, { cx: W*0.22, cy: H*0.90, r: 1.8 },
    { cx: W*0.70, cy: H*0.96, r: 2.0 },
  ];

  const petals = showPetals ? [
    { cx: W*0.16, cy: H*0.16, rx: 11, ry: 6, rot: 28  },
    { cx: W*0.84, cy: H*0.26, rx: 9,  ry: 5, rot: -18 },
    { cx: W*0.36, cy: H*0.44, rx: 13, ry: 7, rot: 52  },
    { cx: W*0.74, cy: H*0.58, rx: 10, ry: 5, rot: -38 },
    { cx: W*0.24, cy: H*0.70, rx: 12, ry: 6, rot: 14  },
    { cx: W*0.88, cy: H*0.76, rx: 8,  ry: 5, rot: -58 },
    { cx: W*0.54, cy: H*0.86, rx: 11, ry: 6, rot: 44  },
    { cx: W*0.07, cy: H*0.60, rx: 9,  ry: 5, rot: -8  },
    { cx: W*0.93, cy: H*0.40, rx: 10, ry: 5, rot: 68  },
  ] : [];

  return (
    <Svg width={W} height={H} style={StyleSheet.absoluteFillObject}>
      <Defs>
        {bokeh.map((_, i) => (
          <RadialGradient key={i} id={`bk${i}`} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={th.bokeh[i % th.bokeh.length]} stopOpacity="0.38" />
            <Stop offset="1" stopColor={th.bokeh[i % th.bokeh.length]} stopOpacity="0"   />
          </RadialGradient>
        ))}
        <RadialGradient id="lift" cx="50%" cy="40%" r="55%">
          <Stop offset="0" stopColor="#ffffff" stopOpacity="0.28" />
          <Stop offset="1" stopColor="#ffffff" stopOpacity="0"    />
        </RadialGradient>
      </Defs>

      <Rect width={W} height={H} fill={th.bg} />

      {bokeh.slice(0, 5).map((b, i) => (
        <Circle key={i} cx={b.cx} cy={b.cy} r={b.r} fill={`url(#bk${i})`} />
      ))}

      <Rect width={W} height={H} fill="url(#lift)" />

      {petals.map((p, i) => (
        <G key={i} transform={`rotate(${p.rot}, ${p.cx}, ${p.cy})`}>
          <Ellipse cx={p.cx} cy={p.cy} rx={p.rx} ry={p.ry} fill="#ffffff" fillOpacity="0.40" />
        </G>
      ))}

      {sparkles.map((s, i) => (
        <G key={i}>
          <Circle cx={s.cx} cy={s.cy} r={s.r}     fill="#ffffff" fillOpacity="0.80" />
          <Circle cx={s.cx} cy={s.cy} r={s.r*2.4} fill="none" stroke="#ffffff" strokeWidth="0.5" strokeOpacity="0.28" />
        </G>
      ))}
    </Svg>
  );
};

// ─── Decorative SVG divider ─────────────────────────────────────────────────
const Divider = ({ color }: { color: string }) => (
  <Svg width={160} height={16} viewBox="0 0 160 16">
    <Path d="M 0 8 L 54 8"   stroke={color} strokeWidth="0.7" strokeLinecap="round" />
    <Circle cx="63"  cy="8" r="1.8" fill={color} fillOpacity="0.60" />
    <Circle cx="72"  cy="8" r="1.2" fill={color} fillOpacity="0.40" />
    <Circle cx="80"  cy="8" r="3.2" fill="none" stroke={color} strokeWidth="1" strokeOpacity="0.85" />
    <Circle cx="80"  cy="8" r="1.2" fill={color} />
    <Circle cx="88"  cy="8" r="1.2" fill={color} fillOpacity="0.40" />
    <Circle cx="97"  cy="8" r="1.8" fill={color} fillOpacity="0.60" />
    <Path d="M 106 8 L 160 8" stroke={color} strokeWidth="0.7" strokeLinecap="round" />
  </Svg>
);

// ─── Corner botanical ornament ──────────────────────────────────────────────
const Corner = ({ color, size = 72 }: { color: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 72 72">
    <Path d="M 7 65 Q 25 40 46 22 Q 57 13 65 7" stroke={color} strokeWidth="0.9" fill="none" strokeLinecap="round" strokeOpacity="0.65" />
    <Path d="M 25 40 Q 12 27 23 18 Q 31 30 25 40" fill={color} fillOpacity="0.28" />
    <Path d="M 46 22 Q 56 11 63 17 Q 54 24 46 22" fill={color} fillOpacity="0.28" />
    <Circle cx="65" cy="7"  r="3.5" fill="none" stroke={color} strokeWidth="0.85" strokeOpacity="0.60" />
    <Circle cx="65" cy="7"  r="1.3" fill={color} fillOpacity="0.65" />
    <Circle cx="52" cy="17" r="2.4" fill="none" stroke={color} strokeWidth="0.7" strokeOpacity="0.45" />
    <Circle cx="52" cy="17" r="0.9" fill={color} fillOpacity="0.55" />
  </Svg>
);

// ─── Attribution block ──────────────────────────────────────────────────────
const Attribution = ({
  senderName,
  font,
  fontSize,
  nameColor,
  labelColor,
  dividerColor,
  showBrand,
  showMessage,
  message,
}: {
  senderName:   string;
  font:         string;
  fontSize:     number;
  nameColor:    string;
  labelColor:   string;
  dividerColor: string;
  showBrand:    boolean;
  showMessage:  boolean;
  message:      string;
}) => (
  <View style={{ alignItems: 'center', paddingHorizontal: 24 }}>
    <View style={{ width: 1, height: 20, backgroundColor: dividerColor, marginBottom: 12 }} />
    <Divider color={dividerColor} />
    <View style={{ height: 14 }} />
    <Text style={{
      fontFamily: 'Manrope-Light',
      fontSize: 10,
      letterSpacing: 4.5,
      textTransform: 'uppercase',
      color: labelColor,
      marginBottom: 4,
    }}>
      — from —
    </Text>
    <Text style={{
      fontFamily:   font,
      fontSize:     fontSize,
      color:        nameColor,
      textAlign:    'center',
      lineHeight:   fontSize * 1.2,
      textShadowColor:  'rgba(255,255,255,0.55)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 5,
    }}>
      {senderName}
    </Text>
    {showMessage && !!message && (
      <Text style={{
        marginTop: 10,
        fontFamily: 'Manrope-LightItalic',
        fontSize: 12,
        color: labelColor,
        textAlign: 'center',
        lineHeight: 18,
        paddingHorizontal: 16,
      }} numberOfLines={2}>
        {message}
      </Text>
    )}
    <View style={{ height: 14 }} />
    <Divider color={dividerColor} />
    {showBrand && (
      <Text style={{
        marginTop: 10,
        fontFamily: 'Manrope-SemiBold',
        fontSize: 8,
        letterSpacing: 4,
        textTransform: 'uppercase',
        color: labelColor,
      }}>
        ✦  DigiBouquet  ✦
      </Text>
    )}
  </View>
);

interface SharedWallpaperCanvasProps {
  themeKey: string;
  fontKey: string;
  layoutKey: string;
  sizeVal: number;
  showPetals: boolean;
  showMessage: boolean;
  showBrand: boolean;
  bouquetData: BouquetData | null;
}

export const SharedWallpaperCanvas = forwardRef<View, SharedWallpaperCanvasProps>(({
  themeKey,
  fontKey,
  layoutKey,
  sizeVal,
  showPetals,
  showMessage,
  showBrand,
  bouquetData,
}, ref) => {
  const th = THEMES[themeKey] ?? THEMES['linen'];
  const fontDef = FONTS.find(f => f.key === fontKey) || FONTS[0];
  const layout = LAYOUTS.find(l => l.key === layoutKey) || LAYOUTS[1];
  
  const isV2 = bouquetData?.version === 2;
  const senderName = bouquetData?.senderName || bouquetData?.messageCard?.senderName || 'With Love';
  const cardMessage = bouquetData?.message || bouquetData?.messageCard?.message || '';
  const CANVAS = W * sizeVal;

  const CanvasInner = useMemo(() => (
    <>
      <PaintedBg themeKey={themeKey} showPetals={showPetals} />



      <View style={{ position: 'absolute', top: 52, left: 14, zIndex: 2 }}>
        <Corner color={th.textAccent} size={70} />
      </View>
      <View style={{ position: 'absolute', top: 52, right: 14, transform: [{ scaleX: -1 }], zIndex: 2 }}>
        <Corner color={th.textAccent} size={70} />
      </View>
      <View style={{ position: 'absolute', bottom: 52, left: 14, transform: [{ scaleY: -1 }], zIndex: 2 }}>
        <Corner color={th.textAccent} size={52} />
      </View>
      <View style={{ position: 'absolute', bottom: 52, right: 14, transform: [{ scaleX: -1 }, { scaleY: -1 }], zIndex: 2 }}>
        <Corner color={th.textAccent} size={52} />
      </View>

      {layout.attrAlign === 'top' ? (
        <View style={[styles.attrWrapper, { top: layout.attrTop, zIndex: 3 }]}>
          <Attribution
            senderName={senderName} font={fontDef.font} fontSize={fontDef.size}
            nameColor={th.nameColor} labelColor={th.labelColor} dividerColor={th.dividerColor}
            showBrand={showBrand} showMessage={showMessage} message={cardMessage}
          />
        </View>
      ) : (
        <View style={[styles.attrWrapper, { bottom: layout.attrBottom, zIndex: 3 }]}>
          <Attribution
            senderName={senderName} font={fontDef.font} fontSize={fontDef.size}
            nameColor={th.nameColor} labelColor={th.labelColor} dividerColor={th.dividerColor}
            showBrand={showBrand} showMessage={showMessage} message={cardMessage}
          />
        </View>
      )}

      <View style={[styles.flowerArea, { top: layout.flowerTop, height: layout.flowerH, zIndex: 4 }]}>
        <View style={{ width: CANVAS, height: CANVAS, alignItems: 'center', justifyContent: 'center' }}>
          {/* Greenery plant overlay — same aspect ratio and placement as Stage 2 */}
          {bouquetData?.greeneryBg && getFlowerImage(bouquetData.greeneryBg) && (
            <Image
              source={getFlowerImage(bouquetData.greeneryBg)}
              style={[
                StyleSheet.absoluteFillObject,
                { opacity: 0.85, zIndex: 0 },
                bouquetData.greeneryBg === 'baby-blue-eucalyptus' ? { transform: [{ translateY: -25 }, { scale: 1.1 }] } : {}
              ]}
              resizeMode="cover"
            />
          )}
          {isV2
            ? ([...(bouquetData?.selectedFlowers as FlowerV2[] || [])]
                .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
                .map((fl, i) => {
                  const img = getFlowerImage(fl.id);
                  if (!img) return null;
                  const fs   = CANVAS * 0.22 * (fl.scale || 1);
                  const left = (fl.x / 100) * CANVAS - fs / 2;
                  const top  = (fl.y / 100) * CANVAS - fs / 2;
                  return (
                    <View key={fl.uniqueId || i} style={{
                      position: 'absolute', left, top, width: fs, height: fs,
                      transform: [{ rotate: `${fl.rotation || 0}deg` }],
                      zIndex: fl.zIndex || i + 1,
                    }}>
                      <CachedImage source={img} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
                    </View>
                  );
                }))
            : (
              <View style={styles.legacyRow}>
                {(bouquetData?.selectedFlowers as string[] || []).map((fid, i) => {
                  const img = getFlowerImage(fid);
                  return img
                    ? <CachedImage key={i} source={img} style={{ width: CANVAS * 0.22, height: CANVAS * 0.22, margin: 4 }} resizeMode="contain" />
                    : null;
                })}
              </View>
            )
          }
        </View>
      </View>
    </>
  ), [themeKey, fontKey, layoutKey, sizeVal, showPetals, showMessage, showBrand, bouquetData, CANVAS, isV2, th, fontDef, layout, senderName, cardMessage]);

  return (
    <View ref={ref} collapsable={false}
      style={{ width: W, height: H, overflow: 'hidden', backgroundColor: th.bg }}>
      {CanvasInner}
    </View>
  );
});

SharedWallpaperCanvas.displayName = 'SharedWallpaperCanvas';

const styles = StyleSheet.create({
  attrWrapper: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  flowerArea:  { position: 'absolute', left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
  legacyRow:   { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', padding: 16 },
});
