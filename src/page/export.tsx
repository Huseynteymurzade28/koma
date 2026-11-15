import { drawAsImage, Group, ImageFormat, type SkImage } from '@shopify/react-native-skia';
import { Asset, requestPermissionsAsync } from 'expo-media-library';
import * as Sharing from 'expo-sharing';

import type { PageFonts } from './fonts';
import { PageDrawing } from './PageDrawing';
import { exportFile } from './store';
import { PAGE_H, PAGE_W, type Page } from './types';

const SCALE = 1.6; // 1600 x 2262 px

export async function renderPagePng(page: Page, images: (SkImage | null)[], fonts: PageFonts) {
  const img = await drawAsImage(
    <Group transform={[{ scale: SCALE }]}>
      <PageDrawing page={page} images={images} fonts={fonts} />
    </Group>,
    { width: Math.round(PAGE_W * SCALE), height: Math.round(PAGE_H * SCALE) },
  );
  if (!img) throw new Error('Could not render the page');
  const bytes = img.encodeToBytes(ImageFormat.PNG, 100);
  const file = exportFile(page.id);
  if (!file.exists) file.create();
  await file.write(bytes);
  return file.uri;
}

export async function saveToPhotos(uri: string) {
  const { granted } = await requestPermissionsAsync(true, ['photo']);
  if (!granted) throw new Error('Koma needs permission to save to your photos.');
  await Asset.create(uri);
}

export async function sharePng(uri: string) {
  await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: 'Share page' });
}
