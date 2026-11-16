import { Directory, File, Paths } from 'expo-file-system';

import { DEFAULT_INK } from '@/manga/tones';
import { randomLine, randomTitle } from '@/words/bank';
import { getLayout, panelRects } from './layouts';
import type { Mood, Page, TextItem } from './types';

// Each page lives in its own folder:
//   pages/<id>/page.json   the editable model
//   pages/<id>/p0.jpg ...  copies of the source photos
//   pages/<id>/p0.jpg.mask.png  subject mask of a photo, made on first use
//   pages/<id>/page.png    last export, also the library thumbnail

const root = () => {
  const d = new Directory(Paths.document, 'pages');
  if (!d.exists) d.create();
  return d;
};

export const pageDir = (id: string) => new Directory(root(), id);
export const photoFile = (id: string, name: string) => new File(pageDir(id), name);
export const exportFile = (id: string) => new File(pageDir(id), 'page.png');

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export async function listPages(): Promise<Page[]> {
  const pages: Page[] = [];
  for (const entry of root().list()) {
    if (!(entry instanceof Directory)) continue;
    const f = new File(entry, 'page.json');
    if (!f.exists) continue;
    try {
      pages.push(JSON.parse(await f.text()));
    } catch {
      // a half-written page is not worth crashing the library over
    }
  }
  return pages.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function loadPage(id: string): Promise<Page | null> {
  const f = new File(pageDir(id), 'page.json');
  if (!f.exists) return null;
  return JSON.parse(await f.text());
}

export async function savePage(page: Page) {
  const dir = pageDir(page.id);
  if (!dir.exists) dir.create();
  const f = new File(dir, 'page.json');
  if (!f.exists) f.create();
  await f.write(JSON.stringify({ ...page, updatedAt: Date.now() }));
}

export function deletePage(id: string) {
  const dir = pageDir(id);
  if (dir.exists) dir.delete();
}

export async function copyPhoto(id: string, uri: string): Promise<string> {
  const dir = pageDir(id);
  if (!dir.exists) dir.create();
  const name = `p${uid()}.jpg`;
  await new File(uri).copy(new File(dir, name));
  return name;
}

// Deletes photo copies the page no longer uses. Removing or replacing a panel
// keeps its file around so the change can be undone; this cleans up afterwards.
export function prunePhotos(page: Page) {
  const dir = pageDir(page.id);
  if (!dir.exists) return;
  const used = new Set(page.panels.map((p) => p.photo));
  for (const entry of dir.list()) {
    if (!(entry instanceof File) || !/^p.+\.jpg(\.mask\.png)?$/.test(entry.name)) continue;
    // a subject mask (see manga/subject.ts) lives and dies with its photo
    if (!used.has(entry.name.replace(/\.mask\.png$/, ''))) entry.delete();
  }
}

// A fresh page with the photos in, a layout picked and a first line of text,
// so the very first thing the user sees already looks like manga.
export async function createPage(uris: string[], chapter: number): Promise<Page> {
  const id = uid();
  const mood: Mood = 'drama';
  const photos = [];
  for (const uri of uris) photos.push(await copyPhoto(id, uri));
  const layout = getLayout('', photos.length);
  const rects = panelRects(layout);
  const items: TextItem[] = [];
  const first = rects[0];
  items.push({ id: uid(), kind: 'caption', text: randomLine('caption', mood), x: first.x + 170, y: first.y + 50 });
  const last = rects[rects.length - 1];
  items.push({ id: uid(), kind: 'bubble', text: randomLine('bubble', mood), x: last.x + last.w * 0.62, y: last.y + 110 });

  const page: Page = {
    id,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    chapter,
    title: randomTitle(mood),
    mood,
    layout: layout.id,
    panels: photos.map((photo) => ({ photo, ink: { ...DEFAULT_INK }, focus: [0.5, 0.5], zoom: 1 })),
    items,
  };
  await savePage(page);
  return page;
}
