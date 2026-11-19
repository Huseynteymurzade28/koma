import { Directory, File, Paths } from 'expo-file-system';

import { DEFAULT_INK } from '@/manga/tones';
import { randomLine, randomTitle } from '@/words/bank';
import { getLayout, MAX_PANELS, panelRects } from './layouts';
import { DEFAULT_FRAME, type Frame, type Mood, type Page, type Panel, type Sheet, type TextItem } from './types';

// Each chapter lives in its own folder:
//   pages/<id>/page.json   the editable model
//   pages/<id>/p0.jpg ...  copies of the source photos, shared by all its sheets
//   pages/<id>/p0.jpg.mask.png  subject mask of a photo, made on first use
//   pages/<id>/page.png    last export of the first sheet, also the library thumbnail
//   pages/<id>/page-2.png  ... and of the sheets after it
//   pages/<id>/strip.png   last export of the whole chapter as one tall strip

const root = () => {
  const d = new Directory(Paths.document, 'pages');
  if (!d.exists) d.create();
  return d;
};

export const pageDir = (id: string) => new Directory(root(), id);
export const photoFile = (id: string, name: string) => new File(pageDir(id), name);
export const exportFile = (id: string, sheet = 0) => new File(pageDir(id), sheet === 0 ? 'page.png' : `page-${sheet + 1}.png`);

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// Pages saved before chapters had several sheets kept one sheet's fields at the top level.
type LegacyPage = Omit<Page, 'sheets'> & Partial<Sheet> & { sheets?: Sheet[] };

function upgrade(raw: LegacyPage): Page {
  if (raw.sheets) return raw as Page;
  const { layout = '', panels = [], items = [], frame, ...rest } = raw;
  return { ...rest, sheets: [{ layout, panels, items, frame }] };
}

async function readPage(f: File): Promise<Page> {
  return upgrade(JSON.parse(await f.text()));
}

export async function listPages(): Promise<Page[]> {
  const pages: Page[] = [];
  for (const entry of root().list()) {
    if (!(entry instanceof Directory)) continue;
    const f = new File(entry, 'page.json');
    if (!f.exists) continue;
    try {
      pages.push(await readPage(f));
    } catch {
      // a half-written page is not worth crashing the library over
    }
  }
  return pages.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function loadPage(id: string): Promise<Page | null> {
  const f = new File(pageDir(id), 'page.json');
  if (!f.exists) return null;
  return readPage(f);
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

// A copy under a new id with its photos and subject masks. The exports stay
// behind: they carry the old chapter number, and the editor redraws them.
export async function duplicatePage(src: Page, chapter: number): Promise<Page> {
  const id = uid();
  const from = pageDir(src.id);
  const to = pageDir(id);
  to.create();
  for (const entry of from.list()) {
    if (entry instanceof File && /^p.+\.jpg(\.mask\.png)?$/.test(entry.name)) await entry.copy(new File(to, entry.name));
  }
  const now = Date.now();
  const page: Page = { ...src, id, chapter, createdAt: now, updatedAt: now };
  await savePage(page);
  return page;
}

export async function renamePage(page: Page, title: string): Promise<Page> {
  const next = { ...page, title, updatedAt: Date.now() };
  await savePage(next);
  return next;
}

export async function copyPhoto(id: string, uri: string): Promise<string> {
  const dir = pageDir(id);
  if (!dir.exists) dir.create();
  const name = `p${uid()}.jpg`;
  await new File(uri).copy(new File(dir, name));
  return name;
}

// Deletes photo copies and sheet exports the chapter no longer uses. Removing or
// replacing a panel keeps its file around so the change can be undone; this
// cleans up afterwards.
export function prunePhotos(page: Page) {
  const dir = pageDir(page.id);
  if (!dir.exists) return;
  const used = new Set(page.sheets.flatMap((s) => s.panels.map((p) => p.photo)));
  for (const entry of dir.list()) {
    if (!(entry instanceof File)) continue;
    const sheetPng = /^page-(\d+)\.png$/.exec(entry.name);
    if (sheetPng) {
      if (Number(sheetPng[1]) > page.sheets.length) entry.delete();
      continue;
    }
    if (!/^p.+\.jpg(\.mask\.png)?$/.test(entry.name)) continue;
    // a subject mask (see manga/subject.ts) lives and dies with its photo
    if (!used.has(entry.name.replace(/\.mask\.png$/, ''))) entry.delete();
  }
}

export const newPanel = (photo: string): Panel => ({ photo, ink: { ...DEFAULT_INK }, focus: [0.5, 0.5], zoom: 1 });

// A sheet with the photos in, a layout picked and a first line or two of text,
// so it already looks like manga before the user touches it.
export function makeSheet(photos: string[], mood: Mood, frame: Frame, withTitle: boolean): Sheet {
  const layout = getLayout('', photos.length);
  const rects = panelRects(layout, frame, withTitle);
  const items: TextItem[] = [];
  const first = rects[0];
  items.push({ id: uid(), kind: 'caption', text: randomLine('caption', mood), x: first.x + 170, y: first.y + 50 });
  if (rects.length > 1) {
    const last = rects[rects.length - 1];
    items.push({ id: uid(), kind: 'bubble', text: randomLine('bubble', mood), x: last.x + last.w * 0.62, y: last.y + 110 });
  }
  return { layout: layout.id, panels: photos.map(newPanel), items, frame };
}

// Splits photos over as few sheets as fit, as evenly as possible: 7 -> 4 + 3.
export function splitPhotos<T>(photos: T[]): T[][] {
  const n = Math.max(1, Math.ceil(photos.length / MAX_PANELS));
  const out: T[][] = [];
  let at = 0;
  for (let i = 0; i < n; i++) {
    const take = Math.ceil((photos.length - at) / (n - i));
    out.push(photos.slice(at, at + take));
    at += take;
  }
  return out;
}

export async function createPage(uris: string[], chapter: number): Promise<Page> {
  const id = uid();
  const mood: Mood = 'drama';
  const photos = [];
  for (const uri of uris) photos.push(await copyPhoto(id, uri));
  const page: Page = {
    id,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    chapter,
    title: randomTitle(mood),
    mood,
    sheets: splitPhotos(photos).map((group, i) => makeSheet(group, mood, DEFAULT_FRAME, i === 0)),
  };
  await savePage(page);
  return page;
}
