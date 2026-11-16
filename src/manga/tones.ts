// Turns the grey histogram of a flattened photo into tone thresholds.
// Pure functions — shared by the app and the desktop test harness.

export type ToneStats = {
  lo: number;
  hi: number;
  // percentile lookup: pct(q) -> grey value at q% (0..100)
  levels: number[]; // 101 entries
};

export function statsFromPixels(rgba: Uint8Array | Float32Array): ToneStats {
  const isFloat = rgba instanceof Float32Array;
  const hist = new Array<number>(256).fill(0);
  let n = 0;
  for (let i = 0; i < rgba.length; i += 4) {
    const v = isFloat ? Math.round(rgba[i] * 255) : rgba[i];
    hist[Math.max(0, Math.min(255, v))]++;
    n++;
  }
  const levels: number[] = [];
  let acc = 0;
  let bin = 0;
  for (let q = 0; q <= 100; q++) {
    const target = (q / 100) * n;
    while (bin < 255 && acc + hist[bin] < target) {
      acc += hist[bin];
      bin++;
    }
    levels.push(bin / 255);
  }
  return { lo: levels[2], hi: levels[98], levels };
}

export type InkParams = {
  ink: number; // 0..1, how much tone / black
  lines: number; // 0..1, ink line strength
  fx: 'none' | 'focus' | 'speed';
  fxCenter: [number, number];
  // what to do behind the subject; needs a subject mask, 'keep' when missing
  bg?: Background;
};

export type Background = 'keep' | 'white' | 'black';

export const BG_CODE = { keep: 0, white: 1, black: 2 } as const;

export const DEFAULT_INK: InkParams = {
  ink: 0.5,
  lines: 1,
  fx: 'none',
  fxCenter: [0.5, 0.4],
};

export function thresholds(stats: ToneStats, ink: number) {
  const k = Math.max(0, Math.min(1, ink));
  // +0.01 so a percentile that lands on a pure value (e.g. 0 = black) still matches it
  const pct = (q: number) => stats.levels[Math.round(Math.max(0, Math.min(100, q)))] + 0.01;
  return {
    tLight: pct(40 + 30 * k),
    tDark: pct(18 + 24 * k),
    tBlack: pct(3 + 14 * k),
  };
}

export const FX_CODE = { none: 0, focus: 1, speed: 2 } as const;
