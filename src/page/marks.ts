import { Skia, type SkPath } from '@shopify/react-native-skia';

import type { MarkKind } from './types';

// Manga emotion marks, drawn in a 100 x 100 box centred on the item. Each is
// a few SVG paths: `fill` paths are closed and filled white under the ink line,
// the rest are bare strokes.

type Part = { d: string; fill?: boolean };

const SHAPES: Record<MarkKind, Part[]> = {
  // a drop of sweat with a highlight
  sweat: [
    { d: 'M4 -44 C 16 -20 30 -2 30 16 A 28 28 0 0 1 -26 16 C -26 -2 -10 -20 4 -44 Z', fill: true },
    { d: 'M-12 10 Q -12 22 -2 28' },
  ],
  // the popping vein: four bent strokes, their corners towards the middle
  anger: [
    { d: 'M-40 -12 Q -12 -12 -12 -40' },
    { d: 'M12 -40 Q 12 -12 40 -12' },
    { d: 'M40 12 Q 12 12 12 40' },
    { d: 'M-12 40 Q -12 12 -40 12' },
  ],
  // one big four-point star and a small one
  sparkle: [
    { d: 'M-8 -46 Q -4 -10 30 -6 Q -4 -2 -8 34 Q -12 -2 -46 -6 Q -12 -10 -8 -46 Z', fill: true },
    { d: 'M32 14 Q 34 28 46 30 Q 34 32 32 46 Q 30 32 18 30 Q 30 28 32 14 Z', fill: true },
  ],
  heart: [
    { d: 'M0 40 C -52 4 -46 -40 -18 -40 C -6 -40 0 -30 0 -22 C 0 -30 6 -40 18 -40 C 46 -40 52 4 0 40 Z', fill: true },
  ],
  // surprise: three strokes fanning up from a point
  shock: [
    { d: 'M-14 24 L -40 -26' },
    { d: 'M0 18 L 0 -46' },
    { d: 'M14 24 L 40 -26' },
  ],
  // gloom: wavy lines hanging down
  gloom: [
    { d: 'M-30 -44 Q -40 -30 -30 -16 Q -20 -2 -30 12 Q -40 26 -30 40' },
    { d: 'M0 -44 Q -10 -30 0 -16 Q 10 -2 0 12 Q -10 26 0 40' },
    { d: 'M30 -44 Q 20 -30 30 -16 Q 40 -2 30 12 Q 20 26 30 40' },
  ],
};

export const MARK_SIZE = 100;

export const MARK_LABEL: Record<MarkKind, string> = {
  sweat: 'Sweat',
  anger: 'Anger',
  sparkle: 'Sparkle',
  heart: 'Heart',
  shock: 'Shock',
  gloom: 'Gloom',
};

// three to a row, as the editor shows them
export const MARK_ROWS: MarkKind[][] = [
  ['sweat', 'anger', 'sparkle'],
  ['heart', 'shock', 'gloom'],
];

// Skia may load after this module, so the paths are parsed on first use
const parsed = new Map<MarkKind, { path: SkPath; fill: boolean }[]>();

export function markPaths(kind: MarkKind) {
  let out = parsed.get(kind);
  if (!out) {
    out = SHAPES[kind].map((p) => ({ path: Skia.Path.MakeFromSVGString(p.d)!, fill: !!p.fill }));
    parsed.set(kind, out);
  }
  return out;
}
