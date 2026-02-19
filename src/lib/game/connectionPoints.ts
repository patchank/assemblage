/**
 * Connection points per side (top, right, bottom, left) in default orientation (0°).
 * Replace placeholder zeros with actual values from the card face reference.
 */
export interface SideCounts {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

const CARD_CODES = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K"] as const;

/**
 * Connection points per side (top, right, bottom, left) for each card type in default orientation.
 * Verified against ref/cards/*.png images.
 */
const CONNECTION_POINTS: Record<string, SideCounts> = {
  A: { top: 0, right: 0, bottom: 0, left: 1 },
  B: { top: 0, right: 1, bottom: 0, left: 1 },
  C: { top: 0, right: 0, bottom: 0, left: 2 },
  D: { top: 1, right: 0, bottom: 1, left: 1 },
  E: { top: 0, right: 1, bottom: 0, left: 2 },
  F: { top: 0, right: 0, bottom: 0, left: 3 },
  G: { top: 1, right: 1, bottom: 1, left: 1 },
  H: { top: 1, right: 0, bottom: 1, left: 2 },
  I: { top: 0, right: 2, bottom: 0, left: 2 },
  J: { top: 0, right: 1, bottom: 0, left: 3 },
  K: { top: 0, right: 0, bottom: 0, left: 4 }
};

export type Rotation = 0 | 90 | 180 | 270;

/**
 * Returns connection counts for a card in the given rotation (degrees clockwise).
 * 90°: top->left, right->top, bottom->right, left->bottom.
 */
export function getConnectionCounts(
  cardCode: string,
  rotation: Rotation
): SideCounts {
  const base = CONNECTION_POINTS[cardCode] ?? {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0
  };
  if (rotation === 0) return { ...base };
  const { top, right, bottom, left } = base;
  switch (rotation) {
    case 90:
      return { top: left, right: top, bottom: right, left: bottom };
    case 180:
      return { top: bottom, right: left, bottom: top, left: right };
    case 270:
      return { top: right, right: bottom, bottom: left, left: top };
    default:
      return { ...base };
  }
}

export function setConnectionPoints(
  cardCode: string,
  counts: SideCounts
): void {
  CONNECTION_POINTS[cardCode] = { ...counts };
}

export function getConnectionPointsForCard(cardCode: string): SideCounts {
  return { ...(CONNECTION_POINTS[cardCode] ?? { top: 0, right: 0, bottom: 0, left: 0 }) };
}
