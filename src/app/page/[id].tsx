import { Canvas, Group, type SkImage } from '@shopify/react-native-skia';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { prepare, renderInk, type Prepared } from '@/manga/process';
import { type InkParams } from '@/manga/tones';
import { renderPagePng, renderStripPng, saveToPhotos, sharePng } from '@/page/export';
import { pageColor } from '@/page/colors';
import { usePageFonts } from '@/page/fonts';
import { frameOf, layoutsFor, MAX_PANELS, MAX_SHEETS, sheetRects, TITLE_H, MARGIN } from '@/page/layouts';
import { PageDrawing } from '@/page/PageDrawing';
import { pickPhotos } from '@/page/photos';
import { copyPhoto, loadPage, makeSheet, newPanel, photoFile, prunePhotos, savePage, uid } from '@/page/store';
import {
  type MarkKind,
  PAGE_H,
  PAGE_W,
  type Frame,
  type Mood,
  type Page,
  type Panel,
  type Sheet,
  type TextItem,
  type TextKind,
} from '@/page/types';
import { font, space, themed, usePalette } from '@/theme';
import { Button, Field, Row, Segmented } from '@/ui/kit';
import { MOODS, randomLine, randomTitle } from '@/words/bank';
import { ItemHit, PanelHit, SELECT } from '@/editor/touch';
import { AddKinds, AddMarks, Done, ItemTools, PanelTools, SheetTools } from '@/editor/tools';

type Selection =
  | { type: 'panel'; index: number }
  | { type: 'item'; id: string }
  | { type: 'title' }
  | { type: 'sheet' } // the current page itself: its frame, order, removal
  | { type: 'export' }
  | null;

// an undo step remembers which page it happened on, so undo can show it
type Snapshot = { page: Page; at: number };

const MAX_HISTORY = 50;

export default function Editor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const fonts = usePageFonts();
  const s = useStyles();
  const color = usePalette();

  const [page, setPage] = useState<Page | null>(null);
  const [prepared, setPrepared] = useState<Record<string, Prepared>>({});
  const [sel, setSel] = useState<Selection>(null);
  const [editing, setEditing] = useState<{ target: 'title' | string; text: string } | null>(null);
  const [stage, setStage] = useState({ w: 0, h: 0 });
  const [busy, setBusy] = useState<string | null>(null);
  // which sheet of the chapter is on screen
  const [atState, setAtState] = useState(0);

  // always the newest page, so several edits in one frame build on each other
  const pageRef = useRef<Page | null>(null);
  const atRef = useRef(0);
  const goTo = useCallback((i: number) => {
    atRef.current = i;
    setAtState(i);
    setSel(null);
  }, []);

  // ---- load + autosave ----------------------------------------------------

  useEffect(() => {
    loadPage(id).then((p) => {
      if (!p) return router.back();
      prunePhotos(p);
      pageRef.current = p;
      setPage(p);
    });
  }, [id]);

  useEffect(() => {
    if (!page) return;
    const t = setTimeout(() => savePage(page), 400);
    return () => clearTimeout(t);
  }, [page]);

  // the text editor is an overlay, not a Modal, so Android back has to close it
  const isEditing = !!editing;
  useEffect(() => {
    if (!isEditing) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setEditing(null);
      return true;
    });
    return () => sub.remove();
  }, [isEditing]);

  // ---- edits + undo history ------------------------------------------------

  const history = useRef({ past: [] as Snapshot[], future: [] as Snapshot[], gesture: false });
  // the last export: which version of the chapter it drew, and the files
  const rendered = useRef<{ page: Page; uris: string[]; strip: string | null } | null>(null);
  // the item the last nudge moved: nudging another one starts a new undo step
  const nudged = useRef<string | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // `live` marks the many small updates of one drag or pinch: they share a
  // single history entry, opened by beginGesture().
  const update = useCallback((fn: (p: Page) => Page, live = false) => {
    const p = pageRef.current;
    if (!p) return;
    const h = history.current;
    if (!(live && h.gesture)) {
      h.past.push({ page: p, at: atRef.current });
      if (h.past.length > MAX_HISTORY) h.past.shift();
    }
    h.gesture = live;
    if (!live) nudged.current = null;
    h.future.length = 0;
    pageRef.current = fn(p);
    setPage(pageRef.current);
    setCanUndo(true);
    setCanRedo(false);
  }, []);

  const beginGesture = useCallback(() => {
    history.current.gesture = false;
    nudged.current = null;
  }, []);

  const travel = (from: Snapshot[], to: Snapshot[]) => {
    const p = pageRef.current;
    const next = from.pop();
    if (!p || !next) return;
    to.push({ page: p, at: next.at });
    history.current.gesture = false;
    pageRef.current = next.page;
    setPage(next.page);
    goTo(Math.min(next.at, next.page.sheets.length - 1));
    setCanUndo(history.current.past.length > 0);
    setCanRedo(history.current.future.length > 0);
    Haptics.selectionAsync().catch(() => {});
  };
  const undo = () => travel(history.current.past, history.current.future);
  const redo = () => travel(history.current.future, history.current.past);

  // ---- photos -> manga ----------------------------------------------------

  // undo can drop the sheet we were on, so clamp rather than trust the index
  const at = page ? Math.min(atState, page.sheets.length - 1) : 0;
  const sheet: Sheet | undefined = page?.sheets[at];

  const photosKey = sheet?.panels.map((p) => p.photo).join('|');
  useEffect(() => {
    if (!page || !sheet) return;
    for (const panel of sheet.panels) {
      if (prepared[panel.photo]) continue;
      prepare(photoFile(page.id, panel.photo).uri)
        .then((p) => setPrepared((m) => ({ ...m, [panel.photo]: p })))
        .catch((e) => Alert.alert('Could not draw a photo', String(e?.message ?? e)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photosKey]);

  // Inked images are GPU work, so they are kept across renders by settings key.
  /* eslint-disable react-hooks/refs -- render-time cache: same key, same image */
  const inkCache = useRef(new Map<string, SkImage>());
  const inksKey = sheet?.panels.map((p) => p.photo + JSON.stringify(p.ink)).join('|');
  const images = useMemo(() => {
    if (!sheet) return [];
    const next = new Map<string, SkImage>();
    const out = sheet.panels.map((panel) => {
      const prep = prepared[panel.photo];
      if (!prep) return null;
      const key = panel.photo + JSON.stringify(panel.ink);
      const img = inkCache.current.get(key) ?? renderInk(prep, panel.ink);
      next.set(key, img);
      return img;
    });
    inkCache.current = next;
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inksKey, prepared]);
  /* eslint-enable react-hooks/refs */

  // keep the library thumbnail fresh when leaving the editor
  const latest = useRef({ page, at, images, prepared, fonts });
  useEffect(() => {
    latest.current = { page, at, images, prepared, fonts };
  });
  useFocusEffect(
    useCallback(
      () => () => {
        const { page: p, at: i, images: imgs, prepared: prep, fonts: f } = latest.current;
        if (!p) return;
        prunePhotos(p);
        savePage(p);
        // the thumbnail is the first sheet, which may not be the one on screen
        const first = p.sheets[0];
        const thumb = i === 0 ? imgs : first.panels.map((x) => (prep[x.photo] ? renderInk(prep[x.photo], x.ink) : null));
        if (f && thumb.length === first.panels.length && thumb.every(Boolean)) {
          renderPagePng(p, 0, thumb, f).catch(() => {});
        }
      },
      [],
    ),
  );

  // ---- geometry -----------------------------------------------------------

  const scale = stage.w ? Math.min(stage.w / PAGE_W, stage.h / PAGE_H) : 0;
  const pageW = PAGE_W * scale;
  const pageH = PAGE_H * scale;
  const rects = sheet ? sheetRects(sheet, at) : [];

  if (!page || !sheet || !fonts) {
    return (
      <View style={[s.screen, s.center]}>
        <ActivityIndicator color={color.ink} />
      </View>
    );
  }

  // ---- actions ------------------------------------------------------------

  const tap = () => Haptics.selectionAsync().catch(() => {});

  // edits to the sheet on screen; the index is read when the edit runs
  const updateSheet = (fn: (sh: Sheet) => Sheet, live = false) =>
    update((p) => {
      const i = Math.min(atRef.current, p.sheets.length - 1);
      return { ...p, sheets: p.sheets.map((x, j) => (j === i ? fn(x) : x)) };
    }, live);

  const setPanel = (i: number, patch: Partial<Panel>, live = false) =>
    updateSheet((sh) => ({ ...sh, panels: sh.panels.map((x, j) => (j === i ? { ...x, ...patch } : x)) }), live);
  const setInk = (i: number, patch: Partial<InkParams>) => setPanel(i, { ink: { ...sheet.panels[i].ink, ...patch } });

  const setItem = (itemId: string, patch: Partial<TextItem>, live = false) =>
    updateSheet((sh) => ({ ...sh, items: sh.items.map((x) => (x.id === itemId ? { ...x, ...patch } : x)) }), live);

  const setFrame = (patch: Partial<Frame>, all = false) => {
    const next = { ...frameOf(sheet), ...patch };
    if (all) update((p) => ({ ...p, sheets: p.sheets.map((x) => ({ ...x, frame: next })) }));
    else updateSheet((sh) => ({ ...sh, frame: next }));
    tap();
  };

  const addItem = (kind: TextKind | MarkKind, isMark = false) => {
    const target = sel?.type === 'panel' ? rects[sel.index] : null;
    const x = target ? target.x + target.w / 2 : PAGE_W / 2;
    const y = target ? target.y + Math.min(target.h / 2, 140) : PAGE_H / 2;
    const item: TextItem = isMark
      ? { id: uid(), kind: 'mark', mark: kind as MarkKind, text: '', x, y }
      : {
          id: uid(),
          kind: kind as TextKind,
          text: randomLine(kind as TextKind, page.mood, new Set(sheet.items.map((i) => i.text))),
          x,
          y,
          rotate: kind === 'sfx' ? -8 : undefined,
        };
    updateSheet((sh) => ({ ...sh, items: [...sh.items, item] }));
    setSel({ type: 'item', id: item.id });
    tap();
  };

  const deleteItem = (itemId: string) => {
    updateSheet((sh) => ({ ...sh, items: sh.items.filter((i) => i.id !== itemId) }));
    setSel(null);
  };

  // A run of nudges on one item is one undo step, like a drag.
  const nudgeItem = (item: TextItem, dx: number, dy: number) => {
    if (nudged.current !== item.id) beginGesture();
    nudged.current = item.id;
    setItem(item.id, { x: Math.max(0, Math.min(PAGE_W, item.x + dx)), y: Math.max(0, Math.min(PAGE_H, item.y + dy)) }, true);
  };

  // text whose centre lies inside panel i; marks are left out
  const inPanel = (i: number) => {
    const r = rects[i];
    if (!r) return [];
    return sheet.items.filter((it) => it.kind !== 'mark' && it.x >= r.x && it.x <= r.x + r.w && it.y >= r.y && it.y <= r.y + r.h);
  };

  const shufflePanel = (i: number) => {
    const ids = new Set(inPanel(i).map((it) => it.id));
    updateSheet((sh) => {
      const used = new Set(sh.items.map((it) => it.text));
      return {
        ...sh,
        items: sh.items.map((it) => {
          if (!ids.has(it.id)) return it;
          const text = randomLine(it.kind as TextKind, page.mood, used);
          used.add(text);
          return { ...it, text };
        }),
      };
    });
    tap();
  };

  // for starting a page's lettering over; marks go too
  const clearItems = () =>
    Alert.alert(page.sheets.length > 1 ? `Clear page ${at + 1}?` : 'Clear the page?', 'All text and marks on it go. You can undo this.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          updateSheet((sh) => ({ ...sh, items: [] }));
          setSel(null);
        },
      },
    ]);

  // items draw in array order, so the last one sits on top
  const restackItem = (itemId: string, toFront: boolean) => {
    updateSheet((sh) => {
      const item = sh.items.find((i) => i.id === itemId);
      if (!item) return sh;
      const rest = sh.items.filter((i) => i.id !== itemId);
      return { ...sh, items: toFront ? [...rest, item] : [item, ...rest] };
    });
    tap();
  };

  const duplicateItem = (src: TextItem) => {
    const item: TextItem = {
      ...src,
      id: uid(),
      x: Math.min(PAGE_W, src.x + 40),
      y: Math.min(PAGE_H, src.y + 40),
    };
    updateSheet((sh) => ({ ...sh, items: [...sh.items, item] }));
    setSel({ type: 'item', id: item.id });
    tap();
  };

  // swaps a panel with its neighbour; the layout stays, the photos trade places
  const movePanel = (i: number, by: -1 | 1) => {
    const j = i + by;
    if (j < 0 || j >= sheet.panels.length) return;
    updateSheet((sh) => {
      const panels = [...sh.panels];
      [panels[i], panels[j]] = [panels[j], panels[i]];
      return { ...sh, panels };
    });
    setSel({ type: 'panel', index: j });
    tap();
  };

  // New words for the whole chapter in the given mood; picking a mood does
  // this too. Lines already used in the chapter are skipped so none repeats.
  const shuffleAll = (mood: Mood = page.mood) => {
    update((p) => {
      const used = new Set(p.sheets.flatMap((sh) => sh.items.map((it) => it.text)));
      const fresh = (it: TextItem): TextItem => {
        if (it.kind === 'mark') return it;
        const text = randomLine(it.kind, mood, used);
        used.add(text);
        return { ...it, text };
      };
      return {
        ...p,
        mood,
        title: randomTitle(mood, p.title),
        sheets: p.sheets.map((sh) => ({ ...sh, items: sh.items.map(fresh) })),
      };
    });
    tap();
  };

  const cycleLayout = () => {
    const ls = layoutsFor(sheet.panels.length);
    const i = ls.findIndex((l) => l.id === sheet.layout);
    updateSheet((sh) => ({ ...sh, layout: ls[(i + 1) % ls.length].id }));
    tap();
  };

  const pickOne = async () => {
    try {
      const [uri] = await pickPhotos(1);
      return uri ? await copyPhoto(page.id, uri) : null;
    } catch (e) {
      Alert.alert('Could not add the photo', String((e as Error)?.message ?? e));
      return null;
    }
  };

  const addPanel = async () => {
    const photo = await pickOne();
    if (!photo) return;
    updateSheet((sh) => {
      const panels = [...sh.panels, newPanel(photo)];
      return { ...sh, panels, layout: layoutsFor(panels.length)[0].id };
    });
  };

  // Replaced and removed photos stay on disk so undo can bring them back;
  // prunePhotos() clears them when the editor closes.
  const replacePanel = async (i: number) => {
    const photo = await pickOne();
    if (!photo) return;
    setPanel(i, { photo, focus: [0.5, 0.5], zoom: 1 });
  };

  const removePanel = (i: number) => {
    updateSheet((sh) => {
      const panels = sh.panels.filter((_, j) => j !== i);
      return { ...sh, panels, layout: layoutsFor(panels.length)[0].id };
    });
    setSel(null);
  };

  // ---- sheets ---------------------------------------------------------------

  // a new sheet goes right after the one on screen and takes over its frame
  const addSheet = async () => {
    let photos: string[] = [];
    try {
      const uris = await pickPhotos(MAX_PANELS);
      for (const uri of uris) photos.push(await copyPhoto(page.id, uri));
    } catch (e) {
      Alert.alert('Could not add the photos', String((e as Error)?.message ?? e));
      photos = [];
    }
    if (photos.length === 0) return;
    const i = atRef.current + 1;
    update((p) => {
      const sheets = [...p.sheets];
      sheets.splice(i, 0, makeSheet(photos, p.mood, frameOf(p.sheets[i - 1]), false));
      return { ...p, sheets };
    });
    goTo(i);
    tap();
  };

  const moveSheet = (by: -1 | 1) => {
    const i = at;
    const j = i + by;
    if (j < 0 || j >= page.sheets.length) return;
    update((p) => {
      const sheets = [...p.sheets];
      [sheets[i], sheets[j]] = [sheets[j], sheets[i]];
      return { ...p, sheets };
    });
    atRef.current = j;
    setAtState(j);
    tap();
  };

  const removeSheet = () =>
    Alert.alert(`Delete page ${at + 1}?`, 'Its panels and text go with it. You can undo this.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          const i = at;
          update((p) => ({ ...p, sheets: p.sheets.filter((_, j) => j !== i) }));
          goTo(Math.max(0, i - 1));
        },
      },
    ]);

  const step = (by: -1 | 1) => {
    const j = at + by;
    if (j < 0 || j >= page.sheets.length) return;
    goTo(j);
    tap();
  };

  // inks a sheet that is not on screen, for export
  const inkSheet = async (sh: Sheet) => {
    const out: SkImage[] = [];
    for (const panel of sh.panels) out.push(renderInk(await prepare(photoFile(page.id, panel.photo).uri), panel.ink));
    return out;
  };

  // Renders every sheet once per version of the chapter: the export tools
  // can then save, share and build the strip without drawing it all again.
  const renderAll = async () => {
    const done = rendered.current;
    if (done && done.page === page) return done;
    const n = page.sheets.length;
    setBusy('Rendering…');
    try {
      await savePage(page);
      const uris: string[] = [];
      for (let i = 0; i < n; i++) {
        if (n > 1) setBusy(`Rendering page ${i + 1} of ${n}…`);
        const imgs = i === at ? images : await inkSheet(page.sheets[i]);
        uris.push(await renderPagePng(page, i, imgs, fonts));
      }
      prunePhotos(page);
      rendered.current = { page, uris, strip: null };
      return rendered.current;
    } finally {
      setBusy(null);
    }
  };

  const renderStrip = async () => {
    const done = await renderAll();
    if (!done.strip) {
      setBusy('Joining pages…');
      try {
        done.strip = await renderStripPng(page, done.uris);
      } finally {
        setBusy(null);
      }
    }
    return done.strip;
  };

  const runExport = async (what: 'save' | 'share' | 'saveStrip' | 'shareStrip') => {
    if (!ready || busy) return;
    try {
      if (what === 'save') await saveToPhotos((await renderAll()).uris);
      else if (what === 'share') await sharePng((await renderAll()).uris[at]);
      else if (what === 'saveStrip') await saveToPhotos([await renderStrip()]);
      else await sharePng(await renderStrip(), 'Share chapter');
      if (what.startsWith('save')) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e) {
      Alert.alert('Could not export', String((e as Error)?.message ?? e));
    }
  };

  // the reader loads the chapter from disk, so save the latest edits first
  const read = async () => {
    await savePage(page);
    router.push({ pathname: '/read/[id]', params: { id: page.id, at: String(at) } });
  };

  const commitEdit = () => {
    if (!editing) return;
    const text = editing.text.trim();
    if (editing.target === 'title') {
      if (text) update((p) => ({ ...p, title: text }));
    } else if (text) {
      setItem(editing.target, { text });
    }
    setEditing(null);
  };

  const selectedItem = sel?.type === 'item' ? sheet.items.find((i) => i.id === sel.id) : undefined;
  const ready = images.length === sheet.panels.length && images.every(Boolean);
  const frame = frameOf(sheet);
  const many = page.sheets.length > 1;

  // ---- render -------------------------------------------------------------

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <View style={s.topbar}>
        <Button label="‹ Library" variant="plain" onPress={() => router.back()} />
        <Row>
          <Button label="Undo" variant="plain" onPress={undo} disabled={!canUndo} />
          <Button label="Redo" variant="plain" onPress={redo} disabled={!canRedo} />
          <Button label="Read" variant="plain" onPress={read} disabled={!!busy} />
          <Button label="Export" variant="plain" onPress={() => setSel({ type: 'export' })} disabled={!ready || !!busy} />
        </Row>
      </View>

      {many && (
        <View style={s.pager}>
          <Button label="‹" variant="plain" onPress={() => step(-1)} disabled={at === 0} style={s.square} />
          <Pressable onPress={() => setSel({ type: 'sheet' })} hitSlop={8}>
            <Text style={s.pagerText}>
              Page {at + 1} of {page.sheets.length}
            </Text>
          </Pressable>
          <Button label="›" variant="plain" onPress={() => step(1)} disabled={at === page.sheets.length - 1} style={s.square} />
        </View>
      )}

      <Pressable style={s.stage} onPress={() => setSel(null)} onLayout={(e) => setStage({ w: e.nativeEvent.layout.width - space(8), h: e.nativeEvent.layout.height - space(6) })}>
        {scale > 0 && (
          <View style={[s.sheet, { width: pageW, height: pageH }]}>
            <Canvas style={{ width: pageW, height: pageH }}>
              <Group transform={[{ scale }]}>
                <PageDrawing page={page} sheet={at} images={images} fonts={fonts} />
              </Group>
            </Canvas>

            {/* touch layer, in page units * scale */}
            {at === 0 && (
              <Pressable
                style={[s.abs, { left: 0, top: MARGIN * 0.4 * scale, width: pageW, height: (TITLE_H + MARGIN * 0.6) * scale }]}
                onPress={() => setSel({ type: 'title' })}
              >
                {sel?.type === 'title' && <View style={[StyleSheet.absoluteFill, s.selBox]} />}
              </Pressable>
            )}

            {rects.map((r, i) => (
              <PanelHit
                key={`${at}-${sheet.layout}-${i}`}
                rect={r}
                scale={scale}
                panel={sheet.panels[i]}
                prep={prepared[sheet.panels[i]?.photo]}
                selected={sel?.type === 'panel' && sel.index === i}
                loading={!images[i]}
                onSelect={() => setSel({ type: 'panel', index: i })}
                onBegin={beginGesture}
                onFocus={(focus) => setPanel(i, { focus }, true)}
                onZoom={(zoom) => setPanel(i, { zoom }, true)}
              />
            ))}

            {sheet.items.map((item) => (
              <ItemHit
                key={item.id}
                item={item}
                fonts={fonts}
                scale={scale}
                selected={sel?.type === 'item' && sel.id === item.id}
                onSelect={() => setSel({ type: 'item', id: item.id })}
                onBegin={beginGesture}
                onMove={(x, y) => setItem(item.id, { x, y }, true)}
              />
            ))}
          </View>
        )}
        {busy && (
          <View style={[StyleSheet.absoluteFill, s.center, { backgroundColor: color.veil }]}>
            <Text style={s.busy}>{busy}</Text>
          </View>
        )}
      </Pressable>

      <ScrollView style={s.tools} contentContainerStyle={[s.toolsInner, { paddingBottom: insets.bottom + space(4) }]} keyboardShouldPersistTaps="handled">
        {sel === null && (
          <>
            <Field label="Mood">
              {[MOODS.slice(0, 3), MOODS.slice(3)].map((row, i) => (
                <Segmented key={i} options={row} value={page.mood} onChange={(m) => shuffleAll(m)} />
              ))}
            </Field>
            <Field label="Add text">
              <AddKinds onAdd={addItem} />
            </Field>
            <Field label="Add mark">
              <AddMarks onAdd={(m) => addItem(m, true)} />
            </Field>
            <Row>
              <Button label="Shuffle words" onPress={() => shuffleAll()} style={s.flex} />
              <Button label="Layout" onPress={cycleLayout} style={s.flex} disabled={layoutsFor(sheet.panels.length).length < 2} />
              {sheet.panels.length < MAX_PANELS && <Button label="Add photo" onPress={addPanel} style={s.flex} />}
            </Row>
            <Row>
              <Button label="Page style" onPress={() => setSel({ type: 'sheet' })} style={s.flex} />
              <Button label="New page" onPress={addSheet} style={s.flex} disabled={page.sheets.length >= MAX_SHEETS} />
              <Button label="Clear text" onPress={clearItems} style={s.flex} disabled={sheet.items.length === 0} />
            </Row>
            <Text style={s.hint}>Tap a panel or text to edit. Drag to move, pinch a panel to zoom.</Text>
          </>
        )}

        {sel?.type === 'sheet' && (
          <SheetTools
            frame={frame}
            index={at}
            count={page.sheets.length}
            onFrame={setFrame}
            onMove={moveSheet}
            onRemove={removeSheet}
            ending={!!sheet.ending}
            onEnding={(ending) => { updateSheet((sh) => ({ ...sh, ending })); tap(); }}
            onDone={() => setSel(null)}
          />
        )}

        {sel?.type === 'export' && (
          <>
            <Text style={s.hint}>
              Chapter {page.chapter} · {page.title}
              {many ? ` · ${page.sheets.length} pages` : ''}
            </Text>
            <Field label={many ? 'Pages' : 'Page'}>
              <Row>
                <Button label={many ? `Save all ${page.sheets.length}` : 'Save to Photos'} onPress={() => runExport('save')} disabled={!!busy} style={s.flex} />
                <Button label={many ? 'Share this page' : 'Share'} onPress={() => runExport('share')} disabled={!!busy} style={s.flex} />
              </Row>
            </Field>
            {many && (
              <Field label="One long strip">
                <Row>
                  <Button label="Save strip" onPress={() => runExport('saveStrip')} disabled={!!busy} style={s.flex} />
                  <Button label="Share strip" onPress={() => runExport('shareStrip')} disabled={!!busy} style={s.flex} />
                </Row>
              </Field>
            )}
            {many && <Text style={s.hint}>The strip puts every page under the last, for reading by scrolling.</Text>}
            <Done onPress={() => setSel(null)} />
          </>
        )}

        {sel?.type === 'title' && (
          <>
            <Field label="Title">
              <Row>
                <Button label="Shuffle" onPress={() => { update((p) => ({ ...p, title: randomTitle(p.mood, p.title) })); tap(); }} style={s.flex} />
                <Button label="Edit" onPress={() => setEditing({ target: 'title', text: page.title })} style={s.flex} />
              </Row>
            </Field>
            <Field label="Chapter">
              <Row>
                <Button label="−" onPress={() => update((p) => ({ ...p, chapter: Math.max(1, p.chapter - 1) }))} style={s.square} />
                <Text style={s.value}>{page.chapter}</Text>
                <Button label="+" onPress={() => update((p) => ({ ...p, chapter: p.chapter + 1 }))} style={s.square} />
              </Row>
            </Field>
            <Done onPress={() => setSel(null)} />
          </>
        )}

        {sel?.type === 'panel' && sheet.panels[sel.index] && (
          <PanelTools
            panel={sheet.panels[sel.index]}
            canRemove={sheet.panels.length > 1}
            hasSubject={!!prepared[sheet.panels[sel.index].photo]?.subject}
            canMoveBack={sel.index > 0}
            canMoveOn={sel.index < sheet.panels.length - 1}
            onMove={(by) => movePanel(sel.index, by)}
            onInk={(patch) => setInk(sel.index, patch)}
            onZoom={(zoom) => setPanel(sel.index, { zoom })}
            onFade={(fade) => setPanel(sel.index, { fade })}
            onReplace={() => replacePanel(sel.index)}
            onRemove={() => removePanel(sel.index)}
            onAdd={addItem}
            onShuffle={inPanel(sel.index).length > 0 ? () => shufflePanel(sel.index) : undefined}
            onDone={() => setSel(null)}
          />
        )}

        {selectedItem && (
          <ItemTools
            item={selectedItem}
            onChange={(patch) => setItem(selectedItem.id, patch)}
            onShuffle={() => { setItem(selectedItem.id, { text: randomLine(selectedItem.kind as TextKind, page.mood, selectedItem.text) }); tap(); }}
            onEdit={() => setEditing({ target: selectedItem.id, text: selectedItem.text })}
            onDelete={() => deleteItem(selectedItem.id)}
            onDuplicate={() => duplicateItem(selectedItem)}
            onRestack={(toFront) => restackItem(selectedItem.id, toFront)}
            onNudge={(dx, dy) => nudgeItem(selectedItem, dx, dy)}
            canRestack={sheet.items.length > 1}
            onDone={() => setSel(null)}
          />
        )}
      </ScrollView>

      {/* Android is edge-to-edge, so the window does not resize for the keyboard:
          the sheet has to be padded above it on both platforms. */}
      {editing && (
        <KeyboardAvoidingView style={[StyleSheet.absoluteFill, s.modalWrap]} behavior="padding">
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setEditing(null)} />
          <View style={[s.modal, { paddingBottom: insets.bottom + space(4) }]}>
            <TextInput
              value={editing.text}
              onChangeText={(text) => setEditing((e) => (e ? { ...e, text } : e))}
              style={s.input}
              multiline
              autoFocus
              maxLength={120}
              placeholder="Write something…"
              placeholderTextColor={color.muted}
              selectionColor={SELECT}
            />
            <Row>
              <Button label="Cancel" onPress={() => setEditing(null)} style={s.flex} />
              <Button label="Done" variant="solid" onPress={commitEdit} style={s.flex} />
            </Row>
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const useStyles = themed((color) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  center: { alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, paddingHorizontal: space(1) },
  square: { width: 44, paddingHorizontal: 0 },
  abs: { position: 'absolute' },

  topbar: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space(2),
  },

  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space(2), height: 36 },
  pagerText: { fontFamily: font.medium, fontSize: 13, color: color.ink, letterSpacing: 0.2 },

  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sheet: { backgroundColor: pageColor.sheet, borderWidth: StyleSheet.hairlineWidth, borderColor: color.line },
  selBox: { borderWidth: 2, borderColor: SELECT },
  busy: { fontFamily: font.medium, fontSize: 14, color: color.ink },

  tools: {
    flexGrow: 0,
    maxHeight: 340,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.line,
  },
  toolsInner: { padding: space(4), gap: space(4) },
  hint: { fontFamily: font.regular, fontSize: 12, color: color.muted, textAlign: 'center' },
  value: { fontFamily: font.semibold, fontSize: 16, color: color.ink, minWidth: 32, textAlign: 'center' },

  modalWrap: { justifyContent: 'flex-end', backgroundColor: color.scrim },
  modal: { backgroundColor: color.paper, padding: space(4), gap: space(3) },
  input: {
    fontFamily: font.regular,
    fontSize: 18,
    color: color.ink,
    minHeight: 72,
    borderWidth: 1,
    borderColor: color.ink,
    padding: space(3),
    textAlignVertical: 'top',
  },
}));
