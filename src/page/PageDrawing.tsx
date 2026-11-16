import {
  Circle,
  Group,
  Image,
  Oval,
  Path,
  Rect,
  Skia,
  Text,
  type SkImage,
} from '@shopify/react-native-skia';

import { color } from '@/theme';
import type { PageFonts } from './fonts';
import { getLayout, panelRects, type Rect as R, TITLE_Y } from './layouts';
import { itemSize, layoutItem } from './textLayout';
import { PAGE_H, PAGE_W, type Page, type Panel, type TextItem } from './types';

// Pure drawing of a page in page units (1000 x 1414). The editor scales it to
// the screen; export renders it offscreen at a higher scale. Same pixels both ways.

type Props = {
  page: Page;
  images: (SkImage | null)[];
  fonts: PageFonts;
};

const INK = color.ink;
const PAPER = color.sheet;
const BORDER = 6;

export function PageDrawing({ page, images, fonts }: Props) {
  const rects = panelRects(getLayout(page.layout, page.panels.length));
  return (
    <Group>
      <Rect x={0} y={0} width={PAGE_W} height={PAGE_H} color={PAPER} />
      <Title page={page} fonts={fonts} />
      {rects.map((r, i) => (
        <PanelBox key={i} rect={r} panel={page.panels[i]} image={images[i] ?? null} />
      ))}
      {page.items.map((item) => (
        <Item key={item.id} item={item} fonts={fonts} />
      ))}
    </Group>
  );
}

function Title({ page, fonts }: { page: Page; fonts: PageFonts }) {
  const chapter = `CHAPTER ${page.chapter}`;
  const title = page.title.toUpperCase();
  const cw = fonts.chapter.measureText(chapter).width;
  const tw = fonts.title.measureText(title).width;
  // shrink very long titles instead of clipping them
  const max = PAGE_W - 120;
  const s = tw > max ? max / tw : 1;
  return (
    <Group>
      <Text x={(PAGE_W - cw) / 2} y={TITLE_Y - 26} text={chapter} font={fonts.chapter} color={color.muted} />
      <Group transform={[{ translateX: PAGE_W / 2 }, { scale: s }, { translateX: -tw / 2 }]}>
        <Text x={0} y={TITLE_Y + 30} text={title} font={fonts.title} color={INK} />
      </Group>
    </Group>
  );
}

function PanelBox({ rect, panel, image }: { rect: R; panel: Panel | undefined; image: SkImage | null }) {
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
      </Group>
      <Rect
        x={rect.x}
        y={rect.y}
        width={rect.w}
        height={rect.h}
        color={INK}
        style="stroke"
        strokeWidth={BORDER}
      />
    </Group>
  );
}

function Lines({ item, fonts, cx, top }: { item: TextItem; fonts: PageFonts; cx: number; top: number }) {
  const L = layoutItem(item, fonts);
  const ascent = L.font.getSize() * 0.8;
  return (
    <Group>
      {L.lines.map((line, i) => (
        <Text key={i} x={cx - line.width / 2} y={top + ascent + i * L.lineH} text={line.text} font={L.font} color={INK} />
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

function ItemShape({ item, fonts }: { item: TextItem; fonts: PageFonts }) {
  const L = layoutItem(item, fonts);
  const { x, y } = item;
  const d = item.flip ? -1 : 1; // which side the tail hangs on
  const left = x - L.w / 2;
  const top = y - L.h / 2;
  const textTop = y - (L.lines.length * L.lineH) / 2 - 2;

  if (item.kind === 'caption') {
    return (
      <Group>
        <Rect x={left} y={top} width={L.w} height={L.h} color="white" />
        <Rect x={left} y={top} width={L.w} height={L.h} color={INK} style="stroke" strokeWidth={3} />
        <Lines item={item} fonts={fonts} cx={x} top={textTop} />
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

  // speech / thought bubble: outline first, fills on top, so tail and
  // ellipse merge into one shape with a single outline
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
  return (
    <Group>
      <Oval rect={oval} color={INK} style="stroke" strokeWidth={6} />
      <Path path={tail} color={INK} style="stroke" strokeWidth={6} strokeJoin="round" />
      <Oval rect={oval} color="white" />
      <Path path={tail} color="white" />
      <Lines item={item} fonts={fonts} cx={x} top={textTop} />
    </Group>
  );
}
