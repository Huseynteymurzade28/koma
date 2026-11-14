import { PAGE_H, PAGE_W } from './types';

export type Rect = { x: number; y: number; w: number; h: number };

// Panel boxes are written as fractions of the drawing area, then laid out
// with a fixed gutter so every layout has the same rhythm.
type Box = [x: number, y: number, w: number, h: number];

export type Layout = { id: string; count: number; boxes: Box[] };

export const MARGIN = 44;
export const GUTTER = 16;
export const TITLE_H = 92;

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
];

export const layoutsFor = (count: number) => LAYOUTS.filter((l) => l.count === count);

export const getLayout = (id: string, count: number) =>
  LAYOUTS.find((l) => l.id === id && l.count === count) ?? layoutsFor(count)[0];

export const MAX_PANELS = 4;

const AREA = { x: MARGIN, y: MARGIN + TITLE_H, w: PAGE_W - MARGIN * 2, h: PAGE_H - MARGIN * 2 - TITLE_H };

export function panelRects(layout: Layout): Rect[] {
  const g = GUTTER / 2;
  return layout.boxes.map(([bx, by, bw, bh]) => {
    // shrink by half a gutter on every inner edge
    const l = bx > 0 ? g : 0;
    const t = by > 0 ? g : 0;
    const r = bx + bw < 0.999 ? g : 0;
    const b = by + bh < 0.999 ? g : 0;
    return {
      x: AREA.x + bx * AREA.w + l,
      y: AREA.y + by * AREA.h + t,
      w: bw * AREA.w - l - r,
      h: bh * AREA.h - t - b,
    };
  });
}

export const TITLE_Y = MARGIN + TITLE_H / 2 - 4;
