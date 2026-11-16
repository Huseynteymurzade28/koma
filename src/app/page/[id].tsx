import { Canvas, Group, type SkImage } from '@shopify/react-native-skia';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  KeyboardAvoidingView,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { prepare, renderInk, type Prepared } from '@/manga/process';
import { DEFAULT_INK, type InkParams } from '@/manga/tones';
import { renderPagePng, saveToPhotos, sharePng } from '@/page/export';
import { usePageFonts, type PageFonts } from '@/page/fonts';
import { getLayout, layoutsFor, MAX_PANELS, panelRects, TITLE_H, MARGIN, type Rect } from '@/page/layouts';
import { PageDrawing } from '@/page/PageDrawing';
import { pickPhotos } from '@/page/photos';
import { copyPhoto, loadPage, photoFile, prunePhotos, savePage, uid } from '@/page/store';
import { itemSize, layoutItem } from '@/page/textLayout';
import { PAGE_H, PAGE_W, type Mood, type Page, type Panel, type TextItem, type TextKind } from '@/page/types';
import { color, font, space } from '@/theme';
import { Button, Field, Row, Segmented } from '@/ui/kit';
import { KIND_LABEL, MOODS, randomLine, randomTitle } from '@/words/bank';

type Selection = { type: 'panel'; index: number } | { type: 'item'; id: string } | { type: 'title' } | null;

const SELECT = '#E0452B';
const TAP_SLOP = 6;
const MAX_ZOOM = 3;
const MAX_HISTORY = 50;

export default function Editor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const fonts = usePageFonts();

  const [page, setPage] = useState<Page | null>(null);
  const [prepared, setPrepared] = useState<Record<string, Prepared>>({});
  const [sel, setSel] = useState<Selection>(null);
  const [editing, setEditing] = useState<{ target: 'title' | string; text: string } | null>(null);
  const [stage, setStage] = useState({ w: 0, h: 0 });
  const [busy, setBusy] = useState<string | null>(null);

  // always the newest page, so several edits in one frame build on each other
  const pageRef = useRef<Page | null>(null);

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

  const history = useRef({ past: [] as Page[], future: [] as Page[], gesture: false });
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // `live` marks the many small updates of one drag or pinch: they share a
  // single history entry, opened by beginGesture().
  const update = useCallback((fn: (p: Page) => Page, live = false) => {
    const p = pageRef.current;
    if (!p) return;
    const h = history.current;
    if (!(live && h.gesture)) {
      h.past.push(p);
      if (h.past.length > MAX_HISTORY) h.past.shift();
    }
    h.gesture = live;
    h.future.length = 0;
    pageRef.current = fn(p);
    setPage(pageRef.current);
    setCanUndo(true);
    setCanRedo(false);
  }, []);

  const beginGesture = useCallback(() => {
    history.current.gesture = false;
  }, []);

  const travel = (from: Page[], to: Page[]) => {
    const p = pageRef.current;
    const next = from.pop();
    if (!p || !next) return;
    to.push(p);
    history.current.gesture = false;
    pageRef.current = next;
    setPage(next);
    setSel(null);
    setCanUndo(history.current.past.length > 0);
    setCanRedo(history.current.future.length > 0);
    Haptics.selectionAsync().catch(() => {});
  };
  const undo = () => travel(history.current.past, history.current.future);
  const redo = () => travel(history.current.future, history.current.past);

  // ---- photos -> manga ----------------------------------------------------

  const photosKey = page?.panels.map((p) => p.photo).join('|');
  useEffect(() => {
    if (!page) return;
    for (const panel of page.panels) {
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
  const inksKey = page?.panels.map((p) => p.photo + JSON.stringify(p.ink)).join('|');
  const images = useMemo(() => {
    if (!page) return [];
    const next = new Map<string, SkImage>();
    const out = page.panels.map((panel) => {
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
  const latest = useRef({ page, images, fonts });
  useEffect(() => {
    latest.current = { page, images, fonts };
  });
  useFocusEffect(
    useCallback(
      () => () => {
        const { page: p, images: imgs, fonts: f } = latest.current;
        if (!p) return;
        prunePhotos(p);
        if (f && imgs.every(Boolean)) {
          savePage(p);
          renderPagePng(p, imgs, f).catch(() => {});
        }
      },
      [],
    ),
  );

  // ---- geometry -----------------------------------------------------------

  const scale = stage.w ? Math.min(stage.w / PAGE_W, stage.h / PAGE_H) : 0;
  const pageW = PAGE_W * scale;
  const pageH = PAGE_H * scale;
  const rects = page ? panelRects(getLayout(page.layout, page.panels.length)) : [];

  if (!page || !fonts) {
    return (
      <View style={[s.screen, s.center]}>
        <ActivityIndicator color={color.ink} />
      </View>
    );
  }

  // ---- actions ------------------------------------------------------------

  const tap = () => Haptics.selectionAsync().catch(() => {});

  const setPanel = (i: number, patch: Partial<Panel>, live = false) =>
    update((p) => ({ ...p, panels: p.panels.map((x, j) => (j === i ? { ...x, ...patch } : x)) }), live);
  const setInk = (i: number, patch: Partial<InkParams>) => setPanel(i, { ink: { ...page.panels[i].ink, ...patch } });

  const setItem = (itemId: string, patch: Partial<TextItem>, live = false) =>
    update((p) => ({ ...p, items: p.items.map((x) => (x.id === itemId ? { ...x, ...patch } : x)) }), live);

  const addItem = (kind: TextKind) => {
    const target = sel?.type === 'panel' ? rects[sel.index] : null;
    const x = target ? target.x + target.w / 2 : PAGE_W / 2;
    const y = target ? target.y + Math.min(target.h / 2, 140) : PAGE_H / 2;
    const item: TextItem = {
      id: uid(),
      kind,
      text: randomLine(kind, page.mood),
      x,
      y,
      rotate: kind === 'sfx' ? -8 : undefined,
    };
    update((p) => ({ ...p, items: [...p.items, item] }));
    setSel({ type: 'item', id: item.id });
    tap();
  };

  const duplicateItem = (src: TextItem) => {
    const item: TextItem = {
      ...src,
      id: uid(),
      x: Math.min(PAGE_W, src.x + 40),
      y: Math.min(PAGE_H, src.y + 40),
    };
    update((p) => ({ ...p, items: [...p.items, item] }));
    setSel({ type: 'item', id: item.id });
    tap();
  };

  // swaps a panel with its neighbour; the layout stays, the photos trade places
  const movePanel = (i: number, by: -1 | 1) => {
    const j = i + by;
    if (j < 0 || j >= page.panels.length) return;
    update((p) => {
      const panels = [...p.panels];
      [panels[i], panels[j]] = [panels[j], panels[i]];
      return { ...p, panels };
    });
    setSel({ type: 'panel', index: j });
    tap();
  };

  const shuffleAll = (mood: Mood = page.mood) => {
    update((p) => ({
      ...p,
      mood,
      title: randomTitle(mood, p.title),
      items: p.items.map((it) => ({ ...it, text: randomLine(it.kind, mood, it.text) })),
    }));
    tap();
  };

  const cycleLayout = () => {
    const ls = layoutsFor(page.panels.length);
    const i = ls.findIndex((l) => l.id === page.layout);
    update((p) => ({ ...p, layout: ls[(i + 1) % ls.length].id }));
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
    update((p) => {
      const panels = [...p.panels, { photo, ink: { ...DEFAULT_INK }, focus: [0.5, 0.5] as [number, number], zoom: 1 }];
      return { ...p, panels, layout: layoutsFor(panels.length)[0].id };
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
    update((p) => {
      const panels = p.panels.filter((_, j) => j !== i);
      return { ...p, panels, layout: layoutsFor(panels.length)[0].id };
    });
    setSel(null);
  };

  const exportPage = async () => {
    if (!images.every(Boolean)) return;
    setBusy('Rendering…');
    try {
      await savePage(page);
      const uri = await renderPagePng(page, images, fonts);
      setBusy(null);
      Alert.alert('Page ready', `Chapter ${page.chapter} · ${page.title}`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Share', onPress: () => sharePng(uri).catch((e) => Alert.alert('Could not share', String(e?.message ?? e))) },
        {
          text: 'Save to Photos',
          onPress: () =>
            saveToPhotos(uri)
              .then(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}))
              .catch((e) => Alert.alert('Could not save', String(e?.message ?? e))),
        },
      ]);
    } catch (e) {
      setBusy(null);
      Alert.alert('Could not render the page', String((e as Error)?.message ?? e));
    }
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

  const selectedItem = sel?.type === 'item' ? page.items.find((i) => i.id === sel.id) : undefined;
  const ready = images.length === page.panels.length && images.every(Boolean);

  // ---- render -------------------------------------------------------------

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <View style={s.topbar}>
        <Button label="‹ Library" variant="plain" onPress={() => router.back()} />
        <Row>
          <Button label="Undo" variant="plain" onPress={undo} disabled={!canUndo} />
          <Button label="Redo" variant="plain" onPress={redo} disabled={!canRedo} />
          <Button label="Export" variant="plain" onPress={exportPage} disabled={!ready || !!busy} />
        </Row>
      </View>

      <Pressable style={s.stage} onPress={() => setSel(null)} onLayout={(e) => setStage({ w: e.nativeEvent.layout.width - space(8), h: e.nativeEvent.layout.height - space(6) })}>
        {scale > 0 && (
          <View style={[s.sheet, { width: pageW, height: pageH }]}>
            <Canvas style={{ width: pageW, height: pageH }}>
              <Group transform={[{ scale }]}>
                <PageDrawing page={page} images={images} fonts={fonts} />
              </Group>
            </Canvas>

            {/* touch layer, in page units * scale */}
            <Pressable
              style={[s.abs, { left: 0, top: MARGIN * 0.4 * scale, width: pageW, height: (TITLE_H + MARGIN * 0.6) * scale }]}
              onPress={() => setSel({ type: 'title' })}
            >
              {sel?.type === 'title' && <View style={[StyleSheet.absoluteFill, s.selBox]} />}
            </Pressable>

            {rects.map((r, i) => (
              <PanelHit
                key={`${page.layout}-${i}`}
                rect={r}
                scale={scale}
                panel={page.panels[i]}
                prep={prepared[page.panels[i]?.photo]}
                selected={sel?.type === 'panel' && sel.index === i}
                loading={!images[i]}
                onSelect={() => setSel({ type: 'panel', index: i })}
                onBegin={beginGesture}
                onFocus={(focus) => setPanel(i, { focus }, true)}
                onZoom={(zoom) => setPanel(i, { zoom }, true)}
              />
            ))}

            {page.items.map((item) => (
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
          <View style={[StyleSheet.absoluteFill, s.center, { backgroundColor: 'rgba(244,241,234,0.7)' }]}>
            <Text style={s.busy}>{busy}</Text>
          </View>
        )}
      </Pressable>

      <ScrollView style={s.tools} contentContainerStyle={[s.toolsInner, { paddingBottom: insets.bottom + space(4) }]} keyboardShouldPersistTaps="handled">
        {sel === null && (
          <>
            <Field label="Mood">
              <Segmented options={MOODS} value={page.mood} onChange={(m) => update((p) => ({ ...p, mood: m }))} />
            </Field>
            <Field label="Add text">
              <Row>
                {(['bubble', 'thought', 'caption', 'sfx'] as TextKind[]).map((k) => (
                  <Button key={k} label={KIND_LABEL[k]} onPress={() => addItem(k)} style={s.flex} />
                ))}
              </Row>
            </Field>
            <Row>
              <Button label="Shuffle words" onPress={() => shuffleAll()} style={s.flex} />
              <Button label="Layout" onPress={cycleLayout} style={s.flex} disabled={layoutsFor(page.panels.length).length < 2} />
              {page.panels.length < MAX_PANELS && <Button label="Add photo" onPress={addPanel} style={s.flex} />}
            </Row>
            <Text style={s.hint}>Tap a panel or text to edit. Drag to move, pinch a panel to zoom.</Text>
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

        {sel?.type === 'panel' && page.panels[sel.index] && (
          <PanelTools
            panel={page.panels[sel.index]}
            canRemove={page.panels.length > 1}
            canMoveBack={sel.index > 0}
            canMoveOn={sel.index < page.panels.length - 1}
            onMove={(by) => movePanel(sel.index, by)}
            onInk={(patch) => setInk(sel.index, patch)}
            onZoom={(zoom) => setPanel(sel.index, { zoom })}
            onReplace={() => replacePanel(sel.index)}
            onRemove={() => removePanel(sel.index)}
            onAdd={addItem}
            onDone={() => setSel(null)}
          />
        )}

        {selectedItem && (
          <>
            <Field label={KIND_LABEL[selectedItem.kind]}>
              <Row>
                <Button
                  label="Shuffle"
                  onPress={() => { setItem(selectedItem.id, { text: randomLine(selectedItem.kind, page.mood, selectedItem.text) }); tap(); }}
                  style={s.flex}
                />
                <Button label="Edit" onPress={() => setEditing({ target: selectedItem.id, text: selectedItem.text })} style={s.flex} />
              </Row>
            </Field>
            <Field label="Style">
              <Segmented
                options={(['bubble', 'thought', 'caption', 'sfx'] as TextKind[]).map((k) => ({ id: k, label: KIND_LABEL[k] }))}
                value={selectedItem.kind}
                onChange={(kind) => setItem(selectedItem.id, { kind, rotate: kind === 'sfx' ? (selectedItem.rotate ?? -8) : selectedItem.rotate })}
              />
            </Field>
            <Field label="Size">
              <Segmented options={SIZES} value={nearest(SIZES, itemSize(selectedItem))} onChange={(size) => setItem(selectedItem.id, { size })} />
            </Field>
            {(selectedItem.kind === 'bubble' || selectedItem.kind === 'thought') && (
              <Field label="Tail">
                <Segmented
                  options={[{ id: 0, label: 'Left' }, { id: 1, label: 'Right' }]}
                  value={selectedItem.flip ? 1 : 0}
                  onChange={(v) => setItem(selectedItem.id, { flip: v === 1 })}
                />
              </Field>
            )}
            {selectedItem.kind === 'sfx' && (
              <Field label="Tilt">
                <Segmented
                  options={[-14, -7, 0, 7, 14].map((d) => ({ id: d, label: d === 0 ? '0°' : `${d > 0 ? '+' : ''}${d}°` }))}
                  value={selectedItem.rotate ?? -8}
                  onChange={(rotate) => setItem(selectedItem.id, { rotate })}
                />
              </Field>
            )}
            <Row>
              <Button
                label="Delete"
                danger
                onPress={() => { update((p) => ({ ...p, items: p.items.filter((i) => i.id !== selectedItem.id) })); setSel(null); }}
                style={s.flex}
              />
              <Button label="Duplicate" onPress={() => duplicateItem(selectedItem)} style={s.flex} />
              <Button label="Done" variant="solid" onPress={() => setSel(null)} style={s.flex} />
            </Row>
          </>
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

// ---- panel tools ------------------------------------------------------------

const TONES = [
  { id: 0.2, label: 'Light' },
  { id: 0.5, label: 'Medium' },
  { id: 0.8, label: 'Heavy' },
];

const ZOOMS = [1, 1.5, 2, MAX_ZOOM].map((id) => ({ id, label: `${id}×` }));

const SIZES = [
  { id: 0.75, label: 'Small' },
  { id: 1, label: 'Normal' },
  { id: 1.3, label: 'Large' },
  { id: 1.7, label: 'Huge' },
];

const nearest = (options: { id: number }[], v: number) =>
  options.reduce((a, b) => (Math.abs(b.id - v) < Math.abs(a.id - v) ? b : a)).id;

function PanelTools({
  panel,
  canRemove,
  canMoveBack,
  canMoveOn,
  onMove,
  onInk,
  onZoom,
  onReplace,
  onRemove,
  onAdd,
  onDone,
}: {
  panel: Panel;
  canRemove: boolean;
  canMoveBack: boolean;
  canMoveOn: boolean;
  onMove: (by: -1 | 1) => void;
  onInk: (patch: Partial<InkParams>) => void;
  onZoom: (zoom: number) => void;
  onReplace: () => void;
  onRemove: () => void;
  onAdd: (k: TextKind) => void;
  onDone: () => void;
}) {
  const tone = nearest(TONES, panel.ink.ink);
  const zoom = nearest(ZOOMS, panel.zoom || 1);
  return (
    <>
      <Field label="Tone">
        <Segmented options={TONES} value={tone} onChange={(ink) => onInk({ ink })} />
      </Field>
      <Field label="Lines">
        <Segmented
          options={[{ id: 0, label: 'None' }, { id: 0.6, label: 'Soft' }, { id: 1, label: 'Bold' }]}
          value={panel.ink.lines}
          onChange={(lines) => onInk({ lines })}
        />
      </Field>
      <Field label="Effect">
        <Segmented
          options={[{ id: 'none' as const, label: 'None' }, { id: 'focus' as const, label: 'Focus lines' }, { id: 'speed' as const, label: 'Speed lines' }]}
          value={panel.ink.fx}
          onChange={(fx) => onInk({ fx })}
        />
      </Field>
      <Field label="Zoom">
        <Segmented options={ZOOMS} value={zoom} onChange={onZoom} />
      </Field>
      {(canMoveBack || canMoveOn) && (
        <Field label="Order">
          <Row>
            <Button label="‹ Move earlier" onPress={() => onMove(-1)} disabled={!canMoveBack} style={s.flex} />
            <Button label="Move later ›" onPress={() => onMove(1)} disabled={!canMoveOn} style={s.flex} />
          </Row>
        </Field>
      )}
      <Field label="Add to this panel">
        <Row>
          {(['bubble', 'thought', 'caption', 'sfx'] as TextKind[]).map((k) => (
            <Button key={k} label={KIND_LABEL[k]} onPress={() => onAdd(k)} style={s.flex} />
          ))}
        </Row>
      </Field>
      <Row>
        <Button label="Replace photo" onPress={onReplace} style={s.flex} />
        {canRemove && <Button label="Remove" danger onPress={onRemove} style={s.flex} />}
        <Button label="Done" variant="solid" onPress={onDone} style={s.flex} />
      </Row>
    </>
  );
}

function Done({ onPress }: { onPress: () => void }) {
  return <Button label="Done" variant="solid" onPress={onPress} />;
}

// ---- touch targets ----------------------------------------------------------

function useLatest<T>(v: T) {
  const r = useRef(v);
  useEffect(() => {
    r.current = v;
  });
  return r;
}

function PanelHit({
  rect,
  scale,
  panel,
  prep,
  selected,
  loading,
  onSelect,
  onBegin,
  onFocus,
  onZoom,
}: {
  rect: Rect;
  scale: number;
  panel: Panel | undefined;
  prep: Prepared | undefined;
  selected: boolean;
  loading: boolean;
  onSelect: () => void;
  onBegin: () => void;
  onFocus: (f: [number, number]) => void;
  onZoom: (zoom: number) => void;
}) {
  const props = useLatest({ rect, scale, panel, prep, onSelect, onBegin, onFocus, onZoom });
  const start = useRef<[number, number]>([0.5, 0.5]);
  // set once a second finger lands; the gesture is then a pinch until it ends
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);
  const responder = useMemo(
    () =>
      // eslint-disable-next-line react-hooks/refs -- the handlers read the ref only when a touch arrives
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          start.current = props.current.panel?.focus ?? [0.5, 0.5];
          pinch.current = null;
          props.current.onBegin();
        },
        onPanResponderMove: (e, g) => {
          const { rect: r, scale: sc, panel: p, prep: pr } = props.current;
          if (!p || !pr) return;
          const [a, b] = e.nativeEvent.touches;
          if (a && b) {
            const dist = Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
            if (!pinch.current) pinch.current = { dist: Math.max(dist, 1), zoom: p.zoom || 1 };
            const z = Math.max(1, Math.min(MAX_ZOOM, (pinch.current.zoom * dist) / pinch.current.dist));
            if (Math.abs(z - (p.zoom || 1)) > 0.005) props.current.onZoom(z);
            return;
          }
          if (pinch.current || Math.hypot(g.dx, g.dy) < TAP_SLOP) return;
          // drag the photo inside its frame: how far it can travel = overflow
          const s = Math.max(r.w / pr.width, r.h / pr.height) * (p.zoom || 1);
          const ox = pr.width * s - r.w;
          const oy = pr.height * s - r.h;
          const fx = ox > 1 ? start.current[0] - g.dx / sc / ox : 0.5;
          const fy = oy > 1 ? start.current[1] - g.dy / sc / oy : 0.5;
          props.current.onFocus([clamp01(fx), clamp01(fy)]);
        },
        onPanResponderRelease: (_, g) => {
          if (!pinch.current && Math.hypot(g.dx, g.dy) < TAP_SLOP) props.current.onSelect();
          else Haptics.selectionAsync().catch(() => {});
        },
      }),
    [props],
  );
  return (
    <View
      {...responder.panHandlers}
      style={[s.abs, { left: rect.x * scale, top: rect.y * scale, width: rect.w * scale, height: rect.h * scale }]}
    >
      {selected && <View style={[StyleSheet.absoluteFill, s.selBox]} pointerEvents="none" />}
      {loading && (
        <View style={[StyleSheet.absoluteFill, s.center]} pointerEvents="none">
          <Text style={s.drawing}>Drawing…</Text>
        </View>
      )}
    </View>
  );
}

function ItemHit({
  item,
  fonts,
  scale,
  selected,
  onSelect,
  onBegin,
  onMove,
}: {
  item: TextItem;
  fonts: PageFonts;
  scale: number;
  selected: boolean;
  onSelect: () => void;
  onBegin: () => void;
  onMove: (x: number, y: number) => void;
}) {
  const L = layoutItem(item, fonts);
  const props = useLatest({ item, scale, onSelect, onBegin, onMove });
  const start = useRef({ x: 0, y: 0 });
  const responder = useMemo(
    () =>
      // eslint-disable-next-line react-hooks/refs -- the handlers read the ref only when a touch arrives
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          start.current = { x: props.current.item.x, y: props.current.item.y };
          props.current.onBegin();
        },
        onPanResponderMove: (_, g) => {
          if (Math.hypot(g.dx, g.dy) < TAP_SLOP) return;
          const sc = props.current.scale;
          props.current.onMove(
            Math.max(0, Math.min(PAGE_W, start.current.x + g.dx / sc)),
            Math.max(0, Math.min(PAGE_H, start.current.y + g.dy / sc)),
          );
        },
        onPanResponderRelease: (_, g) => {
          props.current.onSelect();
          if (Math.hypot(g.dx, g.dy) >= TAP_SLOP) Haptics.selectionAsync().catch(() => {});
        },
      }),
    [props],
  );
  const pad = 6;
  const k = itemSize(item);
  return (
    <View
      {...responder.panHandlers}
      style={[
        s.abs,
        {
          left: (item.x - (L.w * k) / 2) * scale - pad,
          top: (item.y - (L.h * k) / 2) * scale - pad,
          width: L.w * k * scale + pad * 2,
          height: L.h * k * scale + pad * 2,
        },
      ]}
    >
      {selected && <View style={[StyleSheet.absoluteFill, s.selBox]} pointerEvents="none" />}
    </View>
  );
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

const s = StyleSheet.create({
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

  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sheet: { backgroundColor: color.sheet, borderWidth: StyleSheet.hairlineWidth, borderColor: color.line },
  selBox: { borderWidth: 2, borderColor: SELECT },
  drawing: { fontFamily: font.medium, fontSize: 12, color: color.muted },
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

  modalWrap: { justifyContent: 'flex-end', backgroundColor: 'rgba(18,18,18,0.25)' },
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
});
