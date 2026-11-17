import { DEFAULT_FRAME, PAGE_H, PAGE_W, type Border, type Frame, type Gutter, type Sheet } from './types';

export type Rect = { x: number; y: number; w: number; h: number };

// Panel boxes are written as fractions of the drawing area, then laid out
// with the sheet's gutter so every layout has the same rhythm.
type Box = [x: number, y: number, w: number, h: number];

export type Layout = { id: string; count: number; boxes: Box[] };

export const MARGIN = 44;
export const TITLE_H = 92;

export const GUTTERS: Record<Gutter, number> = { tight: 6, normal: 16, wide: 32 };
export const BORDERS: Record<Border, number> = { none: 0, thin: 3, normal: 6, bold: 11 };

const T = 1 / 3;

export const LAYOUTS: Layout[] = [
  { id: '1-full', count: 1, boxes: [[0, 0, 1, 1]] },
  { id: '1-wide', count: 1, boxes: [[0, 0.18, 1, 0.64]] },

  { id: '2-stack', count: 2, boxes: [[0, 0, 1, 0.56], [0, 0.56, 1, 0.44]] },
  { id: '2-split', count: 2, boxes: [[0, 0, 0.5, 1], [0.5, 0, 0.5, 1]] },
  { id: '2-hero', count: 2, boxes: [[0, 0, 1, 0.34], [0, 0.34, 1, 0.66]] },

  { id: '3-top', count: 3, boxes: [[0, 0, 1, 0.42], [0, 0.42, 0.55, 0.58], [0.55, 0.42, 0.45, 0.58]] },
  { id: '3-bottom', count: 3, boxes: [[0, 0, 0.45, 0.55], [0.45, 0, 0.55, 0.55], [0, 0.55, 1, 0.45]] },
  { id: '3-strips', count: 3, boxes: [[0, 0, 1, 0.3], [0, 0.3, 1, 0.36], [0, 0.66, 1, 0.34]] },
  { id: '3-side', count: 3, boxes: [[0, 0, 0.58, 1], [0.58, 0, 0.42, 0.5], [0.58, 0.5, 0.42, 0.5]] },

  { id: '4-grid', count: 4, boxes: [[0, 0, 0.5, 0.5], [0.5, 0, 0.5, 0.5], [0, 0.5, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5]] },
  { id: '4-sandwich', count: 4, boxes: [[0, 0, 1, 0.3], [0, 0.3, 0.5, 0.36], [0.5, 0.3, 0.5, 0.36], [0, 0.66, 1, 0.34]] },
  { id: '4-side', count: 4, boxes: [[0, 0, 0.5, 1], [0.5, 0, 0.5, 0.33], [0.5, 0.33, 0.5, 0.34], [0.5, 0.67, 0.5, 0.33]] },
  { id: '4-steps', count: 4, boxes: [[0, 0, 0.62, 0.32], [0.62, 0, 0.38, 0.32], [0, 0.32, 1, 0.36], [0, 0.68, 1, 0.32]] },

  {
    id: '5-band',
    count: 5,
    boxes: [[0, 0, 0.55, 0.32], [0.55, 0, 0.45, 0.32], [0, 0.32, 1, 0.36], [0, 0.68, 0.45, 0.32], [0.45, 0.68, 0.55, 0.32]],
  },
  {
    id: '5-top',
    count: 5,
    boxes: [[0, 0, 1, 0.3], [0, 0.3, 0.5, 0.35], [0.5, 0.3, 0.5, 0.35], [0, 0.65, 0.4, 0.35], [0.4, 0.65, 0.6, 0.35]],
  },
  {
    id: '5-mosaic',
    count: 5,
    boxes: [[0, 0, 1, 0.25], [0, 0.25, 0.5, 0.4], [0.5, 0.25, 0.5, 0.2], [0.5, 0.45, 0.5, 0.2], [0, 0.65, 1, 0.35]],
  },

  {
    id: '6-classic',
    count: 6,
    boxes: [[0, 0, 0.6, T], [0.6, 0, 0.4, T], [0, T, 0.4, T], [0.4, T, 0.6, T], [0, 2 * T, 0.55, T], [0.55, 2 * T, 0.45, T]],
  },
  {
    id: '6-grid',
    count: 6,
    boxes: [[0, 0, 0.5, T], [0.5, 0, 0.5, T], [0, T, 0.5, T], [0.5, T, 0.5, T], [0, 2 * T, 0.5, T], [0.5, 2 * T, 0.5, T]],
  },
  {
    id: '6-strip',
    count: 6,
    boxes: [[0, 0, 1, 0.24], [0, 0.24, T, 0.38], [T, 0.24, T, 0.38], [2 * T, 0.24, T, 0.38], [0, 0.62, 0.5, 0.38], [0.5, 0.62, 0.5, 0.38]],
  },
];

export const layoutsFor = (count: number) => LAYOUTS.filter((l) => l.count === count);

export const getLayout = (id: string, count: number) =>
  LAYOUTS.find((l) => l.id === id && l.count === count) ?? layoutsFor(count)[0];

export const MAX_PANELS = 6;
export const MAX_SHEETS = 12;

// The box the panels are laid out in. The first sheet keeps room for the title.
export function drawArea(frame: Frame, withTitle: boolean): Rect {
  const m = frame.bleed ? 0 : MARGIN;
  const top = withTitle ? MARGIN + TITLE_H : m;
  return { x: m, y: top, w: PAGE_W - m * 2, h: PAGE_H - m - top };
}

export function panelRects(layout: Layout, frame: Frame = DEFAULT_FRAME, withTitle = true): Rect[] {
  const area = drawArea(frame, withTitle);
  const g = GUTTERS[frame.gutter] / 2;
  return layout.boxes.map(([bx, by, bw, bh]) => {
    // shrink by half a gutter on every inner edge
    const l = bx > 0.001 ? g : 0;
    const t = by > 0.001 ? g : 0;
    const r = bx + bw < 0.999 ? g : 0;
    const b = by + bh < 0.999 ? g : 0;
    return {
      x: area.x + bx * area.w + l,
      y: area.y + by * area.h + t,
      w: bw * area.w - l - r,
      h: bh * area.h - t - b,
    };
  });
}

export const frameOf = (sheet: Sheet): Frame => sheet.frame ?? DEFAULT_FRAME;

// Panel boxes of one sheet of a chapter; only the first sheet has the title.
export const sheetRects = (sheet: Sheet, index: number) =>
  panelRects(getLayout(sheet.layout, sheet.panels.length), frameOf(sheet), index === 0);

export const TITLE_Y = MARGIN + TITLE_H / 2 - 4;
