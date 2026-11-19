import {
  Circle,
  DashPathEffect,
  Group,
  Image,
  LinearGradient,
  Oval,
  Path,
  Rect,
  Skia,
  Text,
  type SkImage,
} from '@shopify/react-native-skia';

import { pageColor } from './colors';
import type { PageFonts } from './fonts';
import { markPaths } from './marks';
import { BORDERS, frameOf, MARGIN, sheetRects, type Rect as R, TITLE_Y } from './layouts';
import { itemSize, layoutItem } from './textLayout';
import { PAGE_H, PAGE_W, type Page, type Panel, type TextItem } from './types';

// Pure drawing of a page in page units (1000 x 1414). The editor scales it to
// the screen; export renders it offscreen at a higher scale. Same pixels both ways.

type Props = {
  page: Page;
  sheet: number; // which sheet of the chapter to draw
  images: (SkImage | null)[]; // inked photos of that sheet's panels
  fonts: PageFonts;
};

const INK = pageColor.ink;
const PAPER = pageColor.sheet;

export function PageDrawing({ page, sheet: index, images, fonts }: Props) {
  const sheet = page.sheets[index];
  if (!sheet) return null;
  const frame = frameOf(sheet);
  const rects = sheetRects(sheet, index);
  // on black paper the frame and lettering outside the panels turn white
  const paper = frame.dark ? INK : PAPER;
  const line = frame.dark ? PAPER : INK;
  const showNumber = page.sheets.length > 1 && !frame.bleed;
  return (
    <Group>
      <Rect x={0} y={0} width={PAGE_W} height={PAGE_H} color={paper} />
      {index === 0 && <Title page={page} fonts={fonts} color={line} />}
      {rects.map((r, i) => (
        <PanelBox key={i} rect={r} panel={sheet.panels[i]} image={images[i] ?? null} border={BORDERS[frame.border]} color={line} paper={paper} />
      ))}
      {sheet.items.map((item) => (
        <Item key={item.id} item={item} fonts={fonts} />
      ))}
      {sheet.ending && <Ending fonts={fonts} bleed={frame.bleed} />}
      {showNumber && <PageNumber n={index + 1} fonts={fonts} color={frame.dark ? PAPER : pageColor.muted} />}
    </Group>
  );
}

const ENDING = 'TO BE CONTINUED';

// a black tag in the bottom right corner, with an arrow on to the next page
function Ending({ fonts, bleed }: { fonts: PageFonts; bleed: boolean }) {
  const k = 0.62;
  const tw = fonts.title.measureText(ENDING).width * k;
  const h = 58;
  const arrow = 34;
  const w = tw + arrow + 54;
  const inset = bleed ? 28 : MARGIN + 18;
  const x = PAGE_W - inset - w;
  const y = PAGE_H - inset - h;
  const ax = x + w - 20 - arrow;
  const tip = Skia.Path.Polygon(
    [
      { x: ax, y: y + 14 },
      { x: ax + arrow, y: y + h / 2 },
      { x: ax, y: y + h - 14 },
    ],
    true,
  );
  return (
    <Group>
      <Rect x={x} y={y} width={w} height={h} color={INK} />
      <Rect x={x} y={y} width={w} height={h} color="white" style="stroke" strokeWidth={4} />
      <Group transform={[{ translateX: x + 20 }, { translateY: y + h / 2 + 15 }, { scale: k }]}>
        <Text x={0} y={0} text={ENDING} font={fonts.title} color="white" />
      </Group>
      <Path path={tip} color="white" />
    </Group>
  );
}

function PageNumber({ n, fonts, color }: { n: number; fonts: PageFonts; color: string }) {
  const text = String(n);
  const w = fonts.chapter.measureText(text).width;
  return <Text x={(PAGE_W - w) / 2} y={PAGE_H - MARGIN / 2 + 7} text={text} font={fonts.chapter} color={color} />;
}

function Title({ page, fonts, color }: { page: Page; fonts: PageFonts; color: string }) {
  const chapter = `CHAPTER ${page.chapter}`;
  const title = page.title.toUpperCase();
  const cw = fonts.chapter.measureText(chapter).width;
  const tw = fonts.title.measureText(title).width;
  // shrink very long titles instead of clipping them
  const max = PAGE_W - 120;
  const s = tw > max ? max / tw : 1;
  return (
    <Group>
      <Text x={(PAGE_W - cw) / 2} y={TITLE_Y - 26} text={chapter} font={fonts.chapter} color={color === INK ? pageColor.muted : color} />
      <Group transform={[{ translateX: PAGE_W / 2 }, { scale: s }, { translateX: -tw / 2 }]}>
        <Text x={0} y={TITLE_Y + 30} text={title} font={fonts.title} color={color} />
      </Group>
    </Group>
  );
}

type PanelProps = { rect: R; panel: Panel | undefined; image: SkImage | null; border: number; color: string; paper: string };

function PanelBox({ rect, panel, image, border, color, paper }: PanelProps) {
  const clip = Skia.XYWHRect(rect.x, rect.y, rect.w, rect.h);
  let img = null;
  if (image && panel) {
    // crop-to-fill around the panel's focus point
    const iw = image.width();
    const ih = image.height();
    const s = Math.max(rect.w / iw, rect.h / ih) * (panel.zoom || 1);
    const dw = iw * s;
    const dh = ih * s;
    const x = rect.x + (rect.w - dw) * panel.focus[0];
    const y = rect.y + (rect.h - dh) * panel.focus[1];
    img = <Image image={image} x={x} y={y} width={dw} height={dh} fit="fill" />;
  }
  return (
    <Group>
      <Group clip={clip}>
        <Rect x={rect.x} y={rect.y} width={rect.w} height={rect.h} color="#E9E6DE" />
        {img}
        {panel?.fade && <Fade rect={rect} paper={paper} />}
      </Group>
      {border > 0 && !panel?.fade && (
        <Rect x={rect.x} y={rect.y} width={rect.w} height={rect.h} color={color} style="stroke" strokeWidth={border} />
      )}
    </Group>
  );
}

type LinesProps = { item: TextItem; fonts: PageFonts; cx: number; top: number; color?: string; halo?: boolean };

// halo: a white outline under the type, for lettering straight on the art
// Four gradients from the paper colour to clear, one per edge, so the photo
// dissolves into the page like a memory.
function Fade({ rect: r, paper }: { rect: R; paper: string }) {
  const d = Math.min(r.w, r.h) * 0.18;
  const clear = `${paper}00`;
  const edges = [
    { x: r.x, y: r.y, w: r.w, h: d, from: [r.x, r.y], to: [r.x, r.y + d] },
    { x: r.x, y: r.y + r.h - d, w: r.w, h: d, from: [r.x, r.y + r.h], to: [r.x, r.y + r.h - d] },
    { x: r.x, y: r.y, w: d, h: r.h, from: [r.x, r.y], to: [r.x + d, r.y] },
    { x: r.x + r.w - d, y: r.y, w: d, h: r.h, from: [r.x + r.w, r.y], to: [r.x + r.w - d, r.y] },
  ];
  return edges.map((e, i) => (
    <Rect key={i} x={e.x} y={e.y} width={e.w} height={e.h}>
      <LinearGradient start={{ x: e.from[0], y: e.from[1] }} end={{ x: e.to[0], y: e.to[1] }} colors={[paper, clear]} />
    </Rect>
  ));
}

function Lines({ item, fonts, cx, top, color = INK, halo }: LinesProps) {
  const L = layoutItem(item, fonts);
  const ascent = L.font.getSize() * 0.8;
  return (
    <Group>
      {halo &&
        L.lines.map((line, i) => (
          <Text key={`h${i}`} x={cx - line.width / 2} y={top + ascent + i * L.lineH} text={line.text} font={L.font} color="white" style="stroke" strokeWidth={13} strokeJoin="round" />
        ))}
      {L.lines.map((line, i) => (
        <Text key={i} x={cx - line.width / 2} y={top + ascent + i * L.lineH} text={line.text} font={L.font} color={color} />
      ))}
    </Group>
  );
}

function Item({ item, fonts }: { item: TextItem; fonts: PageFonts }) {
  const k = itemSize(item);
  if (k === 1) return <ItemShape item={item} fonts={fonts} />;
  const { x, y } = item;
  return (
    <Group transform={[{ translateX: x }, { translateY: y }, { scale: k }, { translateX: -x }, { translateY: -y }]}>
      <ItemShape item={item} fonts={fonts} />
    </Group>
  );
}

// A mark gets a white halo first so it reads over dark tone, then the white
// fills and the ink line on top.
function Mark({ item }: { item: TextItem }) {
  if (!item.mark) return null;
  const parts = markPaths(item.mark);
  const rot = ((item.rotate ?? 0) * Math.PI) / 180;
  return (
    <Group transform={[{ translateX: item.x }, { translateY: item.y }, { rotate: rot }, { scaleX: item.flip ? -1 : 1 }]}>
      {parts.map((p, i) => (
        <Path key={`h${i}`} path={p.path} color="white" style="stroke" strokeWidth={18} strokeJoin="round" strokeCap="round" />
      ))}
      {parts.map((p, i) => p.fill && <Path key={`f${i}`} path={p.path} color="white" />)}
      {parts.map((p, i) => (
        <Path key={`s${i}`} path={p.path} color={INK} style="stroke" strokeWidth={7} strokeJoin="round" strokeCap="round" />
      ))}
    </Group>
  );
}

function ItemShape({ item, fonts }: { item: TextItem; fonts: PageFonts }) {
  if (item.kind === 'mark') return <Mark item={item} />;
  const L = layoutItem(item, fonts);
  const { x, y } = item;
  const d = item.flip ? -1 : 1; // which side the tail hangs on
  const left = x - L.w / 2;
  const top = y - L.h / 2;
  const textTop = y - (L.lines.length * L.lineH) / 2 - 2;

  if (item.kind === 'caption') {
    const box = item.box ?? 'white';
    if (box === 'none') return <Lines item={item} fonts={fonts} cx={x} top={textTop} halo />;
    // a black box reads as a narrator's voice from outside the scene
    const black = box === 'black';
    return (
      <Group>
        <Rect x={left} y={top} width={L.w} height={L.h} color={black ? INK : 'white'} />
        <Rect x={left} y={top} width={L.w} height={L.h} color={black ? 'white' : INK} style="stroke" strokeWidth={3} />
        <Lines item={item} fonts={fonts} cx={x} top={textTop} color={black ? 'white' : INK} />
      </Group>
    );
  }

  if (item.kind === 'sfx') {
    const rot = ((item.rotate ?? -8) * Math.PI) / 180;
    return (
      <Group transform={[{ translateX: x }, { translateY: y }, { rotate: rot }, { translateX: -x }, { translateY: -y }]}>
        {L.lines.map((line, i) => {
          const tx = x - line.width / 2;
          const ty = textTop + L.font.getSize() * 0.82 + i * L.lineH;
          return (
            <Group key={i}>
              <Text x={tx} y={ty} text={line.text} font={L.font} color="white" style="stroke" strokeWidth={14} strokeJoin="round" />
              <Text x={tx} y={ty} text={line.text} font={L.font} color={INK} />
            </Group>
          );
        })}
      </Group>
    );
  }

  // balloons: outline first, fills on top, so tail and body merge into one
  // shape with a single outline
  if (item.kind === 'shout') {
    const body = burst(item, x, y, L.w, L.h);
    const bx = x - d * L.w * 0.16;
    const by = y + L.h * 0.36;
    // a lightning-bolt tail, kinked once on the way down
    const tail = Skia.Path.Polygon(
      [
        { x: bx - d * 20, y: by },
        { x: bx + d * 18, y: by + 4 },
        { x: bx - d * 4, y: by + 36 },
        { x: bx - d * 44, y: by + 78 },
        { x: bx - d * 20, y: by + 30 },
      ],
      true,
    );
    return (
      <Group>
        <Path path={body} color={INK} style="stroke" strokeWidth={6} strokeJoin="miter" />
        <Path path={tail} color={INK} style="stroke" strokeWidth={6} strokeJoin="miter" />
        <Path path={body} color="white" />
        <Path path={tail} color="white" />
        <Lines item={item} fonts={fonts} cx={x} top={textTop} />
      </Group>
    );
  }

  const oval = Skia.XYWHRect(left, top, L.w, L.h);
  if (item.kind === 'thought') {
    const dots = [
      { cx: x - d * L.w * 0.18, cy: top + L.h + 16, r: 11 },
      { cx: x - d * L.w * 0.26, cy: top + L.h + 42, r: 7 },
    ];
    return (
      <Group>
        <Oval rect={oval} color={INK} style="stroke" strokeWidth={6} />
        {dots.map((d, i) => <Circle key={i} cx={d.cx} cy={d.cy} r={d.r} color={INK} style="stroke" strokeWidth={6} />)}
        <Oval rect={oval} color="white" />
        {dots.map((d, i) => <Circle key={`f${i}`} cx={d.cx} cy={d.cy} r={d.r} color="white" />)}
        <Lines item={item} fonts={fonts} cx={x} top={textTop} />
      </Group>
    );
  }

  const bx = x - d * L.w * 0.12;
  const tail = Skia.Path.Polygon(
    [
      { x: bx - d * 16, y: top + L.h - 12 },
      { x: bx + d * 16, y: top + L.h - 10 },
      { x: bx - d * 34, y: top + L.h + 46 },
    ],
    true,
  );
  // a whisper is drawn with a thinner, broken line
  const whisper = item.kind === 'whisper';
  const stroke = whisper ? 4 : 6;
  return (
    <Group>
      <Oval rect={oval} color={INK} style="stroke" strokeWidth={stroke}>
        {whisper && <DashPathEffect intervals={[16, 10]} />}
      </Oval>
      <Path path={tail} color={INK} style="stroke" strokeWidth={stroke} strokeJoin="round">
        {whisper && <DashPathEffect intervals={[12, 8]} />}
      </Path>
      <Oval rect={oval} color="white" />
      <Path path={tail} color="white" />
      <Lines item={item} fonts={fonts} cx={x} top={textTop} />
    </Group>
  );
}

// Spikes around an ellipse. Their spacing and length wobble a little, seeded
// by the item's id, so every shout looks hand drawn but stays put on redraw.
function burst(item: TextItem, cx: number, cy: number, w: number, h: number) {
  const rnd = seeded(item.id);
  const rx = w / 2;
  const ry = h / 2;
  const n = Math.max(12, Math.round((Math.PI * (rx + ry)) / 44));
  const points = [];
  for (let i = 0; i < n * 2; i++) {
    const a = ((i + (rnd() - 0.5) * 0.5) / (n * 2)) * Math.PI * 2;
    const k = i % 2 === 0 ? 1 + rnd() * 0.08 : 0.8 + rnd() * 0.04;
    points.push({ x: cx + Math.cos(a) * rx * k, y: cy + Math.sin(a) * ry * k });
  }
  return Skia.Path.Polygon(points, true);
}

function seeded(key: string) {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}
