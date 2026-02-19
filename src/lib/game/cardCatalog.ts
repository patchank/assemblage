import type { CardDefinition, CardCategory } from "./types";

const POINT_VALUE = 1;
const LINE_VALUE = 2;
const TRIANGLE_VALUE = 3;
const SQUARE_VALUE = 4;

function cardPath(fileName: string): string {
  return `/api/cards/${encodeURIComponent(fileName)}`;
}

function def(
  code: string,
  category: CardCategory,
  imageSrc: string,
  count: number
): CardDefinition {
  let points = POINT_VALUE;
  if (category === "line") points = LINE_VALUE;
  if (category === "triangle") points = TRIANGLE_VALUE;
  if (category === "square") points = SQUARE_VALUE;
  return { code, category, imageSrc, count, points };
}

export const CARD_DEFINITIONS: CardDefinition[] = [
  // Point cards (16 total)
  def("A", "point", cardPath("a[face,16].png"), 16),

  // Line cards (11 total)
  def("B", "line", cardPath("b[face,5].png"), 5),
  def("C", "line", cardPath("c[face,6].png"), 6),

  // Triangle cards (10 total)
  def("D", "triangle", cardPath("d[face,4].png"), 4),
  def("E", "triangle", cardPath("e[face,4].png"), 4),
  def("F", "triangle", cardPath("f[face,2].png"), 2),

  // Square cards (11 total)
  def("G", "square", cardPath("g[face,2].png"), 2),
  def("H", "square", cardPath("h[face,3].png"), 3),
  def("I", "square", cardPath("i[face,2].png"), 2),
  def("J", "square", cardPath("j[face,2].png"), 2),
  def("K", "square", cardPath("k[face,2].png"), 2)
];

export const TOTAL_CARD_COUNT = CARD_DEFINITIONS.reduce(
  (sum, c) => sum + c.count,
  0
);

/** Canonical point value for a card by code (single source of truth for scoring). */
const POINTS_BY_CODE: Record<string, number> = Object.fromEntries(
  CARD_DEFINITIONS.map((d) => [d.code, d.points])
);

export function getPointsForCardCode(code: string): number {
  const pts = POINTS_BY_CODE[code];
  return typeof pts === "number" ? pts : 0;
}

/** Dot/accent color per card type (for takeable-card border). */
const DOT_COLOR_BY_CODE: Record<string, string> = {
  A: "#707174",
  B: "#3e4953",
  C: "#3e4953",
  D: "#603c2b",
  E: "#603c2b",
  F: "#603c2b",
  G: "#3b3f46",
  H: "#3b3f46",
  I: "#3b3f46",
  J: "#3b3f46",
  K: "#3b3f46"
};

export function getDotColorForCardCode(code: string): string {
  return DOT_COLOR_BY_CODE[code] ?? "#34424f";
}

