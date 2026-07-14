// "Side fillers" — leafy / horizontal sprawling plants → go left/right edges
export const SIDE_FILLER_IDS = new Set([
  'english-ivy', 'maidenhair-fern', 'silver-dollar-eucalyptus',
  'olive-branches', 'baby-blue-eucalyptus', 'monstera-leaves', 'ruscus-branches',
]);
// "Round fillers" — full circle blooms → fill gaps in center/mid
export const ROUND_FILLER_IDS = new Set([
  'purple-blue-hydrangea', 'white-hydrangea', 'light-blue-hydrangea', 'lilac-hydrangea',
]);
// "Tall accents" — tall vertical stems → go top/back
export const TALL_ACCENT_IDS = new Set([
  'purple-delphinium', 'pink-snapdragon', 'purple-wisteria',
  'peach-gladiolus', 'sword-fern',
]);

interface PlacedFlower {
  id: string;
  uniqueId: string;
  x: number; // 0-100 percent
  y: number; // 0-100 percent
  rotation: number;
  scale: number;
  zIndex: number;
}

export const generateRandomPosition = (flowerId: string, existing: PlacedFlower[] = [], bgIndex: number | null) => {
  let bestCandidate: { x: number; y: number } | null = null;
  let maxMinDist = -1;

  const isSideFiller  = SIDE_FILLER_IDS.has(flowerId);
  const isRoundFiller = ROUND_FILLER_IDS.has(flowerId);
  const isTallAccent  = TALL_ACCENT_IDS.has(flowerId);

  for (let i = 0; i < 25; i++) {
    let x: number, y: number;

    if (isSideFiller) {
      const isLeft = Math.random() > 0.5;
      x = isLeft ? 10 + Math.random() * 20 : 70 + Math.random() * 20;
      y = 40 + Math.random() * 40;
    } else if (isRoundFiller) {
      const rx = (Math.random() + Math.random() + Math.random()) / 3;
      x = 25 + rx * 50;
      y = 35 + Math.random() * 45;
    } else if (isTallAccent) {
      x = 20 + Math.random() * 60;
      y = 10 + Math.random() * 30;
    } else {
      const rx = (Math.random() + Math.random() + Math.random()) / 3;
      x = 25 + rx * 50;
      y = 30 + Math.random() * 50;
    }

    let minDist = existing.length === 0 ? 100 : 1000;
    for (const f of existing) {
      const dist = Math.sqrt((f.x - x) ** 2 + (f.y - y) ** 2);
      if (dist < minDist) minDist = dist;
    }

    if (minDist > maxMinDist) {
      maxMinDist = minDist;
      bestCandidate = { x, y };
      if (minDist > 20) break;
    }
  }

  const { x, y } = bestCandidate ?? { x: 50, y: 55 };

  let rotation: number;
  let scale: number;

  if (isSideFiller) {
    scale    = 1.3 + Math.random() * 0.4;
    rotation = x < 50 ? -40 + Math.random() * 20 : 20 + Math.random() * 20;
  } else if (isRoundFiller) {
    scale    = 0.8 + Math.random() * 0.3;
    rotation = -15 + Math.random() * 30;
  } else if (isTallAccent) {
    scale    = 1.1 + Math.random() * 0.35;
    rotation = -12 + Math.random() * 24;
  } else {
    scale    = 0.85 + Math.random() * 0.3;
    rotation = -15 + Math.random() * 30;
  }

  const clampedX = Math.max(10, Math.min(90, x));
  const clampedY = Math.max(10, Math.min(88, y));

  // zIndex: tall accents go behind (1-10), side fillers mid-back (5-25),
  // everything else uses Y-based depth. All >= 1 so always above BG overlay.
  let zIndex: number;
  if (isTallAccent) {
    zIndex = 1 + Math.floor(Math.random() * 10);
  } else if (isSideFiller) {
    zIndex = 5 + Math.floor(Math.random() * 20);
  } else {
    zIndex = Math.floor(clampedY);
  }

  return { x: clampedX, y: clampedY, rotation, scale, zIndex };
};
