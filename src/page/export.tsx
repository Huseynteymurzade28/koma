import { drawAsImage, FilterMode, Group, ImageFormat, MipmapMode, Skia, type SkImage } from '@shopify/react-native-skia';
import { File } from 'expo-file-system';
import { Asset, requestPermissionsAsync } from 'expo-media-library';
import * as Sharing from 'expo-sharing';

import type { PageFonts } from './fonts';
import { PageDrawing } from './PageDrawing';
import { pageColor } from './colors';
import { exportFile, pageDir } from './store';
import { PAGE_H, PAGE_W, type Page } from './types';

const SCALE = 1.6; // 1600 x 2262 px

// Renders one sheet of the chapter and stores it next to the page (see store.ts).
export async function renderPagePng(page: Page, sheet: number, images: (SkImage | null)[], fonts: PageFonts) {
  const img = await drawAsImage(
    <Group transform={[{ scale: SCALE }]}>
      <PageDrawing page={page} sheet={sheet} images={images} fonts={fonts} />
    </Group>,
    { width: Math.round(PAGE_W * SCALE), height: Math.round(PAGE_H * SCALE) },
  );
  if (!img) throw new Error('Could not render the page');
  const bytes = img.encodeToBytes(ImageFormat.PNG, 100);
  const file = exportFile(page.id, sheet);
  if (!file.exists) file.create();
  await file.write(bytes);
  return file.uri;
}

// The whole chapter as one tall image, pages one under the other, for
// scrolling on a phone the way webtoons read. Built from the page PNGs on a
// CPU surface: twelve pages are taller than many GPUs allow for one texture.
const STRIP_W = 800; // half the page export, the usual webtoon width
const STRIP_GAP = 48;

export async function renderStripPng(page: Page, pageUris: string[]) {
  const pageH = Math.round((STRIP_W * PAGE_H) / PAGE_W);
  const height = pageUris.length * pageH + (pageUris.length - 1) * STRIP_GAP;
  const surface = Skia.Surface.Make(STRIP_W, height);
  if (!surface) throw new Error('Not enough memory for the strip');
  const canvas = surface.getCanvas();
  canvas.drawColor(Skia.Color(pageColor.sheet));
  for (let i = 0; i < pageUris.length; i++) {
    const img = Skia.Image.MakeImageFromEncoded(await Skia.Data.fromURI(pageUris[i]));
    if (!img) throw new Error(`Could not read page ${i + 1}`);
    const src = Skia.XYWHRect(0, 0, img.width(), img.height());
    const dest = Skia.XYWHRect(0, i * (pageH + STRIP_GAP), STRIP_W, pageH);
    // mipmaps keep the halftone dots from turning into moiré when halved
    canvas.drawImageRectOptions(img, src, dest, FilterMode.Linear, MipmapMode.Linear);
  }
  surface.flush();
  const bytes = surface.makeImageSnapshot().encodeToBytes(ImageFormat.PNG, 100);
  const file = new File(pageDir(page.id), 'strip.png');
  if (!file.exists) file.create();
  await file.write(bytes);
  return file.uri;
}

// Saves in order, so the sheets of a chapter sit one after another in the gallery.
export async function saveToPhotos(uris: string[]) {
  const { granted } = await requestPermissionsAsync(true, ['photo']);
  if (!granted) throw new Error('Koma needs permission to save to your photos.');
  for (const uri of uris) await Asset.create(uri);
}

export async function sharePng(uri: string, dialogTitle = 'Share page') {
  await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle });
}
