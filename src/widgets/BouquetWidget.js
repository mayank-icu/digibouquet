import React from 'react';
import { FlexWidget, TextWidget, ImageWidget, OverlapWidget } from 'react-native-android-widget';

// ─── Flower / BG image map (inlined to avoid .ts module resolution issues in the
//     widget background process — do NOT import from bouquetData.ts here) ─────────
export const FLOWER_IMAGE_MAP = {
  rose: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/rose.webp',
  tulip: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/tulip.webp',
  lily: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/lily.webp',
  orchid: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/orchid.webp',
  peony: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/peony.webp',
  daisy: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/daisy.webp',
  carnation: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/carnation.webp',
  chrysanthemum: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/chrysanthemum.webp',
  lotus: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/lotus.webp',
  camellia: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/camellia.webp',
  sunflower: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/sunflower.webp',
  alstroemeria: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/alstroemeria.webp',
  anemone: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/anemone.webp',
  buttercup: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/buttercup.webp',
  coreopsis: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/coreopsis.webp',
  cosmos: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/cosmos.webp',
  freesia: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/freesia.webp',
  gaillardia: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/gaillardia.webp',
  'gerbera-daisy': 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/gerbera%20daisy.webp',
  hellebore: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/hellebore.webp',
  zinnia: 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/zinnia.webp',
  'red-rose': 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/red-rose.webp',
  'purple-rose': 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/purple-rose.webp',
  'yellow-rose': 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/yellow-rose.webp',
  'ivory-rose': 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/ivory-rose.webp',
  'red-tulip': 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/red-tulip.webp',
  'purple-tulip': 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/purple-tulip.webp',
  'yellow-tulip': 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/yellow-tulip.webp',
  'orange-tulip': 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/orange-tulip.webp',
  'ivory-tulip': 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/ivory-tulip.webp',
  'pink-orchid': 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/pink-orchid.webp',
  'white-orchid': 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/white-orchid.webp',
  'yellow-orchid': 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/yellow-orchid.webp',
  'red-peony': 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/red-peony.webp',
  'peach-peony': 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/peach-peony.webp',
  'white-peony': 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/white-peony.webp',
  'red-camellia': 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/red-camellia.webp',
  'peach-camellia': 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/peach-camellia.webp',
  'white-camellia': 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/white-camellia.webp',
  'pink-petals-daisy': 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/pink-petals-daisy.webp',
  'white-yellow-daisy': 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/white%20petals%20with%20yellow%20center%20daisy.webp',
  'pink-dahlia': 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/pink_dahlia.webp',
  'pink-hibiscus': 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/pink_hibiscus.webp',
  'cream-magnolia': 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/cream_magnolia.webp',
  'purple-delphinium': 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/purple_delphinium.webp',
  'pink-snapdragon': 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/pink_snapdragon.webp',
  'purple-wisteria': 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/purple_wisteria.webp',
  'peach-gladiolus': 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/peach_gladiolus.webp',
  'english-ivy': 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/english_ivy.webp',
  'maidenhair-fern': 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/maidenhair_fern.webp',
  'silver-dollar-eucalyptus': 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/silver_dollar_eucalyptus.webp',
  'sword-fern': 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/sword_fern.webp',
  'olive-branches': 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/olive_branches.webp',
  'baby-blue-eucalyptus': 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/baby_blue_eucalyptus.webp',
  'monstera-leaves': 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/monstera_leaves.webp',
  'ruscus-branches': 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/ruscus_branches.webp',
  'purple-blue-hydrangea': 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/purple_blue_hydrangea.webp',
  'white-hydrangea': 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/white_hydrangea.webp',
  'light-blue-hydrangea': 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/light_blue_hydrangea.webp',
  'lilac-hydrangea': 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/lilac_hydrangea.webp',
  'bg-1': 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/1.webp',
  'bg-2': 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/2.webp',
  'bg-3': 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/3.webp',
  'bg-4': 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/4.webp',
  'bg-5': 'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/5.webp',
};

export const BG_IMAGES = [
  'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/1.webp',
  'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/2.webp',
  'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/3.webp',
  'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/4.webp',
  'https://raw.githubusercontent.com/mayank-icu/digibouquet-assets/main/bouquet/5.webp',
];

// ─── Helpers ───────────────────────────────────────────────────────────────────
function getFlowerImage(id) {
  if (!id) return null;
  return FLOWER_IMAGE_MAP[id] || null;
}

function getBgForBouquet(bouquetId, background, greeneryBg) {
  // greeneryBg takes priority (it's already a bg-N string or a flower id)
  if (greeneryBg) {
    const img = FLOWER_IMAGE_MAP[greeneryBg];
    if (img) return img;
  }
  // Fall back to background index
  if (background !== undefined && background !== null) {
    const bgKey = `bg-${background + 1}`;
    const img = FLOWER_IMAGE_MAP[bgKey];
    if (img) return img;
  }
  // Ultimate fallback
  return BG_IMAGES[0];
}

// ─── Shared sub-components ─────────────────────────────────────────────────────

/**
 * Full bouquet display with background and all flowers in their actual positions.
 * Handles both V1 (flat id list) and V2 (objects with x/y positions).
 */
function BouquetDisplay({ flowerIds, bouquetId, flowers, version, background, greeneryBg, isCompact = true, localImages = {} }) {
  const bgImageRemote = getBgForBouquet(bouquetId, background, greeneryBg);
  const bgImage = localImages[bgImageRemote] || bgImageRemote;
  const isV2 = version === 2;

  // Adjusted dimensions for horizontal layout
  const displayHeight = isCompact ? 140 : 180;
  const displayWidth = isCompact ? 140 : 300;

  // Shift content left slightly for visual balance
  const leftShift = -8;

  // ── V2: flower objects with x/y positions ────────────────────────────────────
  if (isV2 && flowers && flowers.length > 0) {
    // Filter to only flowers that have position data; plain strings fall through below
    const positionedFlowers = flowers.filter(f => typeof f === 'object' && f !== null && f.x !== undefined && f.y !== undefined);

    if (positionedFlowers.length > 0) {
      return (
        <OverlapWidget
          style={{
            width: displayWidth,
            height: displayHeight,
            borderRadius: 16,
            overflow: 'hidden',
            marginLeft: leftShift,
          }}
        >
          {/* Background image */}
          <ImageWidget
            image={bgImage}
            imageWidth={displayWidth}
            imageHeight={displayHeight}
          />

          {/* Positioned flowers */}
          <OverlapWidget
            style={{
              width: displayWidth,
              height: displayHeight,
            }}
          >
            {positionedFlowers.slice(0, 8).map((flower, i) => {
              const flowerId = flower.id;
              const flowerImgRemote = getFlowerImage(flowerId);
              const flowerImg = flowerImgRemote ? (localImages[flowerImgRemote] || flowerImgRemote) : null;
              if (!flowerImg) return null;

              const scaleFactor = isCompact ? 0.7 : 1.0;
              const size = 48 * (flower.scale || 1) * scaleFactor;
              const left = (flower.x / 100) * displayWidth - size / 2;
              const top = (flower.y / 100) * displayHeight - size / 2;

              return (
                <FlexWidget
                  key={flower.uniqueId || i}
                  style={{
                    width: displayWidth,
                    height: displayHeight,
                    paddingLeft: left > 0 ? left : 0,
                    paddingTop: top > 0 ? top : 0,
                  }}
                >
                  <ImageWidget
                    image={flowerImg}
                    imageWidth={size}
                    imageHeight={size}
                  />
                </FlexWidget>
              );
            })}
          </OverlapWidget>
        </OverlapWidget>
      );
    }
  }

  // ── V1 / flat list fallback (also handles V2 with only string ids) ─────────────
  // Collect all valid flower ids from both sources
  const ids = (() => {
    if (flowers && flowers.length > 0) {
      return flowers.map(f => (typeof f === 'string' ? f : f.id)).filter(Boolean);
    }
    if (flowerIds && flowerIds.length > 0) {
      return flowerIds;
    }
    return ['rose'];
  })();

  return (
    <OverlapWidget
      style={{
        width: displayWidth,
        height: displayHeight,
        borderRadius: 16,
        overflow: 'hidden',
        marginLeft: leftShift,
      }}
    >
      {/* Background image */}
      <ImageWidget
        image={bgImage}
        imageWidth={displayWidth}
        imageHeight={displayHeight}
      />

      {/* Flowers layer – natural bouquet fan pattern */}
      <FlexWidget
        style={{
          width: displayWidth,
          height: displayHeight,
          flexDirection: 'row',
          alignItems: 'flex-end',
          justifyContent: 'center',
          paddingBottom: 8,
        }}
      >
        {ids.slice(0, 6).map((id, i) => {
          const flowerImgRemote = getFlowerImage(id);
          const flowerImg = flowerImgRemote ? (localImages[flowerImgRemote] || flowerImgRemote) : null;
          if (!flowerImg) return null;

          const size = (isCompact ? 40 : 50) + (Math.sin(i * 1.5) * 8);
          const offsetY = Math.sin(i * 2) * 15;

          return (
            <ImageWidget
              key={i}
              image={flowerImg}
              imageWidth={size}
              imageHeight={size}
              style={{
                marginLeft: i > 0 ? -15 : 0,
                marginBottom: offsetY,
              }}
            />
          );
        })}
      </FlexWidget>
    </OverlapWidget>
  );
}


/**
 * Thin decorative divider line.
 */
function Divider({ color, opacity = 0.25 }) {
  return (
    <FlexWidget
      style={{
        width: 36,
        height: 1,
        backgroundColor: color,
        opacity,
        alignSelf: 'center',
        marginVertical: 5,
      }}
    />
  );
}

/**
 * Recipient name, sender name, and date - minimalist and premium.
 */
function RecipientBlock({ recipient, sender, date, nameColor, senderColor, dateColor }) {
  return (
    <FlexWidget
      style={{ flexDirection: 'column', alignItems: 'flex-start', width: 'match_parent' }}
    >
      <TextWidget
        text={recipient || 'Someone special'}
        style={{ fontSize: 18, fontWeight: 'bold', color: nameColor, letterSpacing: 0.2 }}
        maxLines={2}
      />
      {sender ? (
        <TextWidget
          text={`from ${sender}`}
          style={{ fontSize: 11, color: senderColor, marginTop: 4, letterSpacing: 0.5 }}
          maxLines={1}
        />
      ) : null}
      {date ? (
        <TextWidget
          text={date}
          style={{ fontSize: 9, color: dateColor, marginTop: 12, opacity: 0.8, letterSpacing: 1 }}
          maxLines={1}
        />
      ) : null}
    </FlexWidget>
  );
}


/**
 * Tiny pill-shaped tap hint at the bottom.
 */
function TapHint({ textColor }) {
  return (
    <FlexWidget style={{ width: 'match_parent', alignItems: 'center', justifyContent: 'center' }}>
      <TextWidget
        text="open ↗"
        style={{ fontSize: 9, color: textColor, letterSpacing: 1.4, textTransform: 'uppercase' }}
      />
    </FlexWidget>
  );
}

// ─── Style 1: Petal (warm blush, ultra-clean) ──────────────────────────────────
function StylePetal({ recipient, sender, date, flowerIds, bouquetId, flowers, version, background, greeneryBg, localImages = {} }) {
  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#FDF6F0',
        borderRadius: 24,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#F2DECE',
      }}
      clickAction="OPEN_APP"
    >
      <FlexWidget style={{ flex: 1, flexDirection: 'column', justifyContent: 'center', paddingRight: 8 }}>
        <RecipientBlock
          recipient={recipient}
          sender={sender}
          date={date}
          nameColor="#3D1F14"
          senderColor="#A07060"
          dateColor="#C4907A"
        />
      </FlexWidget>
      <FlexWidget style={{ flex: 1, justifyContent: 'center', alignItems: 'flex-end' }}>
        <BouquetDisplay flowerIds={flowerIds} bouquetId={bouquetId} flowers={flowers} version={version} background={background} greeneryBg={greeneryBg} localImages={localImages} />
      </FlexWidget>
    </FlexWidget>
  );
}


// ─── Style 2: Noir (deep plum, editorial) ─────────────────────────────────────
function StyleNoir({ recipient, sender, date, flowerIds, bouquetId, flowers, version, background, greeneryBg, localImages = {} }) {
  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#1A0E1F',
        borderRadius: 24,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#3D1F3D',
      }}
      clickAction="OPEN_APP"
    >
      <FlexWidget style={{ flex: 1, flexDirection: 'column', justifyContent: 'center', paddingRight: 8 }}>
        <RecipientBlock
          recipient={recipient}
          sender={sender}
          date={date}
          nameColor="#F5E6F0"
          senderColor="#F0C0E0"
          dateColor="#D0A0C0"
        />
      </FlexWidget>
      <FlexWidget style={{ flex: 1, justifyContent: 'center', alignItems: 'flex-end' }}>
        <BouquetDisplay flowerIds={flowerIds} bouquetId={bouquetId} flowers={flowers} version={version} background={background} greeneryBg={greeneryBg} localImages={localImages} />
      </FlexWidget>
    </FlexWidget>
  );
}


// ─── Style 3: Grove (sage green, organic) ─────────────────────────────────────
function StyleGrove({ recipient, sender, date, flowerIds, bouquetId, flowers, version, background, greeneryBg, localImages = {} }) {
  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#E8F4EC',
        borderRadius: 24,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#C8E0D0',
      }}
      clickAction="OPEN_APP"
    >
      <FlexWidget style={{ flex: 1, flexDirection: 'column', justifyContent: 'center', paddingRight: 8 }}>
        <RecipientBlock
          recipient={recipient}
          sender={sender}
          date={date}
          nameColor="#1A3D28"
          senderColor="#4A7A5C"
          dateColor="#5E8C70"
        />
      </FlexWidget>
      <FlexWidget style={{ flex: 1, justifyContent: 'center', alignItems: 'flex-end' }}>
        <BouquetDisplay flowerIds={flowerIds} bouquetId={bouquetId} flowers={flowers} version={version} background={background} greeneryBg={greeneryBg} localImages={localImages} />
      </FlexWidget>
    </FlexWidget>
  );
}


// ─── Style 4: Canvas (photo bg, frosted overlay) ───────────────────────────────
function StyleCanvas({ recipient, sender, date, flowerIds, bouquetId, flowers, version, background, greeneryBg, localImages = {} }) {
  const bgImageRemote = getBgForBouquet(bouquetId, background, greeneryBg);
  const bgImage = localImages[bgImageRemote] || bgImageRemote;

  return (
    <OverlapWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        borderRadius: 24,
        overflow: 'hidden',
      }}
      clickAction="OPEN_APP"
    >
      {/* Background photo */}
      <ImageWidget
        image={bgImage}
        imageWidth={300}
        imageHeight={200}
      />

      {/* Dark scrim for readability */}
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          padding: 16,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <FlexWidget style={{ flex: 1, flexDirection: 'column', justifyContent: 'center', paddingRight: 8 }}>
          <RecipientBlock
            recipient={recipient}
            sender={sender}
            date={date}
            nameColor="#FFFFFF"
            senderColor="#FFCEE0"
            dateColor="#FFD6C8"
          />
        </FlexWidget>
        <FlexWidget style={{ flex: 1, justifyContent: 'center', alignItems: 'flex-end' }}>
          <BouquetDisplay flowerIds={flowerIds} bouquetId={bouquetId} flowers={flowers} version={version} background={background} greeneryBg={greeneryBg} />
        </FlexWidget>
      </FlexWidget>
    </OverlapWidget>
  );
}


// ─── Style 5: Ivory (clean, neutral luxury) ────────────────────────────────────
function StyleIvory({ recipient, sender, date, flowerIds, bouquetId, flowers, version, background, greeneryBg }) {
  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#FAFAF7',
        borderRadius: 24,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E8E6DE',
      }}
      clickAction="OPEN_APP"
    >
      <FlexWidget style={{ flex: 1, flexDirection: 'column', justifyContent: 'center', paddingRight: 8 }}>
        <RecipientBlock
          recipient={recipient}
          sender={sender}
          date={date}
          nameColor="#2A2520"
          senderColor="#7A7060"
          dateColor="#9A9080"
        />
      </FlexWidget>
      <FlexWidget style={{ flex: 1, justifyContent: 'center', alignItems: 'flex-end' }}>
        <BouquetDisplay flowerIds={flowerIds} bouquetId={bouquetId} flowers={flowers} version={version} background={background} greeneryBg={greeneryBg} />
      </FlexWidget>
    </FlexWidget>
  );
}

// ─── Registry ──────────────────────────────────────────────────────────────────
const STYLES = {
  petal: StylePetal,
  noir: StyleNoir,
  grove: StyleGrove,
  ivory: StyleIvory,
  canvas: StyleCanvas,
};

export const WIDGET_STYLES = [
  { id: 'petal',  label: 'Petal',   preview: '#FDF6F0' },
  { id: 'noir',   label: 'Noir',    preview: '#1A0E1F' },
  { id: 'grove',  label: 'Grove',   preview: '#E8F4EC' },
  { id: 'ivory',  label: 'Ivory',   preview: '#FAFAF7' },
];

export function BouquetWidget({
  recipient,
  sender,
  date,
  flowerIds,
  bouquetId,
  widgetStyle = 'petal',
  flowers,
  version,
  background,
  greeneryBg,
  localImages = {},
}) {
  const WidgetStyle = STYLES[widgetStyle] || StylePetal;
  return (
    <WidgetStyle
      recipient={recipient}
      sender={sender}
      date={date}
      flowerIds={flowerIds}
      bouquetId={bouquetId}
      flowers={flowers}
      version={version}
      background={background}
      greeneryBg={greeneryBg}
      localImages={localImages}
    />
  );
}