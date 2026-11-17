// Renders PageDrawing to a PNG on the desktop, using the shader harness output
// as panel images. Lets us check layout, bubbles and type without a phone.
//   npx tsx --tsconfig tools/page-harness/tsconfig.json tools/page-harness/render.tsx <out.png> <layout-id> <img1.png> [img2...]
// Optional env: FRAME='{"gutter":"wide","border":"bold","dark":true,"bleed":true}', SHEET=1 to draw it as a later page.
import { readFileSync, writeFileSync } from 'node:fs';
import React from 'react';

// tsx compiles app files with the classic JSX runtime
(globalThis as any).React = React;

const { LoadSkiaWeb } = require('@shopify/react-native-skia/lib/commonjs/web/LoadSkiaWeb');

async function main() {
  await LoadSkiaWeb();
  const { drawOffscreen, makeOffscreenSurface, getSkiaExports, Group } = require('@shopify/react-native-skia/lib/commonjs/headless');
  const { Skia } = getSkiaExports();
  const { PageDrawing } = require('@/page/PageDrawing');
  const { getLayout, panelRects, layoutsFor } = require('@/page/layouts');
  const { DEFAULT_FRAME } = require('@/page/types');
  const { DEFAULT_INK } = require('@/manga/tones');
  const { PAGE_W, PAGE_H } = require('@/page/types');

  const [out, layoutId, ...imgs] = process.argv.slice(2);
  const fontDir = __dirname + '/../../node_modules/@expo-google-fonts/';
  const tf = (p: string) => Skia.Typeface.MakeFreeTypeFaceFromData(Skia.Data.fromBytes(readFileSync(fontDir + p)));
  const bangers = tf('bangers/400Regular/Bangers_400Regular.ttf');
  const comic = tf('comic-neue/700Bold/ComicNeue_700Bold.ttf');
  const comicI = tf('comic-neue/700Bold_Italic/ComicNeue_700Bold_Italic.ttf');
  const fonts = {
    sfx: Skia.Font(bangers, 92), title: Skia.Font(bangers, 54), chapter: Skia.Font(comic, 22),
    bubble: Skia.Font(comic, 29), caption: Skia.Font(comicI, 26),
  };
  const images = imgs.map((p) => Skia.Image.MakeImageFromEncoded(Skia.Data.fromBytes(readFileSync(p))));
  const layout = getLayout(layoutId, imgs.length);
  const frame = { ...DEFAULT_FRAME, ...JSON.parse(process.env.FRAME ?? '{}') };
  const at = Number(process.env.SHEET ?? 0);
  const r = panelRects(layout, frame, at === 0);
  const sheet = {
    layout: layout.id,
    frame,
    panels: imgs.map(() => ({ photo: '', ink: DEFAULT_INK, focus: [0.5, 0.5], zoom: 1 })),
    items: [
      { id: '1', kind: 'caption', text: 'It was an ordinary day.', x: r[0].x + 190, y: r[0].y + 46 },
      { id: '2', kind: 'sfx', text: 'KRAK!', x: r[0].x + r[0].w - 150, y: r[0].y + r[0].h - 90, rotate: -8 },
      { id: '3', kind: 'bubble', text: "This coffee... was my last hope.", x: r[1].x + r[1].w * 0.66, y: r[1].y + 110 },
      { id: '4', kind: 'thought', text: 'Act cool...', x: r[r.length - 1].x + r[r.length - 1].w * 0.4, y: r[r.length - 1].y + 90 },
      { id: '5', kind: 'caption', text: 'The cat had seen everything.', x: r[r.length - 1].x + r[r.length - 1].w / 2, y: r[r.length - 1].y + r[r.length - 1].h - 50 },
    ],
  };
  // a later sheet needs one before it; the first only carries the title
  const page = {
    id: 'x', createdAt: 0, updatedAt: 0, chapter: 7, title: 'The Coffee Incident', mood: 'comedy',
    sheets: at === 0 ? [sheet, sheet] : [...Array(at).fill(sheet), sheet],
  };
  const S = 1.2;
  const surface = makeOffscreenSurface(PAGE_W * S, PAGE_H * S);
  const image = await drawOffscreen(
    surface,
    <Group transform={[{ scale: S }]}>
      <PageDrawing page={page} sheet={at} images={images} fonts={fonts} />
    </Group>,
  );
  writeFileSync(out, image.encodeToBytes());
  console.log('wrote', out, layout.id, layoutsFor(imgs.length).map((l: any) => l.id).join(','));
}
main().catch((e) => { console.error(e); process.exit(1); });
