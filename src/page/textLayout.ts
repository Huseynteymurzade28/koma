import type { SkFont } from '@shopify/react-native-skia';

import type { PageFonts } from './fonts';
import type { TextItem } from './types';

export type ItemLayout = {
  font: SkFont;
  lines: { text: string; width: number }[];
  lineH: number;
  // box around the item, centred on item.x / item.y (page units)
  w: number;
  h: number;
};

const width = (font: SkFont, s: string) => font.measureText(s).width;

export function wrap(font: SkFont, text: string, maxW: number) {
  const out: { text: string; width: number }[] = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (line && width(font, next) > maxW) {
        out.push({ text: line, width: width(font, line) });
        line = word;
      } else {
        line = next;
      }
    }
    out.push({ text: line, width: width(font, line) });
  }
  return out;
}

// layoutItem() works at size 1; drawing and hit boxes scale by this around the centre
export const itemSize = (item: TextItem) => item.size ?? 1;

const MAX_W = { bubble: 250, thought: 240, caption: 320, sfx: 1000 } as const;

export function layoutItem(item: TextItem, fonts: PageFonts): ItemLayout {
  const font = item.kind === 'sfx' ? fonts.sfx : item.kind === 'caption' ? fonts.caption : fonts.bubble;
  const lines = wrap(font, item.text || ' ', MAX_W[item.kind]);
  const lineH = font.getSize() * (item.kind === 'sfx' ? 0.95 : 1.18);
  const textW = Math.max(...lines.map((l) => l.width));
  const textH = lines.length * lineH;
  switch (item.kind) {
    case 'bubble':
    case 'thought': {
      // an ellipse that fits a w x h text box needs ~sqrt(2) the size
      const w = Math.max(textW * 1.32 + 36, 120);
      const h = Math.max(textH * 1.3 + 34, 84);
      return { font, lines, lineH, w, h };
    }
    case 'caption':
      return { font, lines, lineH, w: textW + 36, h: textH + 26 };
    case 'sfx':
      return { font, lines, lineH, w: textW + 24, h: textH + 16 };
  }
}
