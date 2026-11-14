import { Canvas, Group, type SkImage } from '@shopify/react-native-skia';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
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
import { copyPhoto, loadPage, photoFile, savePage, uid } from '@/page/store';
import { layoutItem } from '@/page/textLayout';
import { PAGE_H, PAGE_W, type Mood, type Page, type Panel, type TextItem, type TextKind } from '@/page/types';
import { color, font, space } from '@/theme';
import { Button, Field, Row, Segmented } from '@/ui/kit';
import { KIND_LABEL, MOODS, randomLine, randomTitle } from '@/words/bank';

type Selection = { type: 'panel'; index: number } | { type: 'item'; id: string } | { type: 'title' } | null;

const SELECT = '#E0452B';
const TAP_SLOP = 6;

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

  // ---- load + autosave ----------------------------------------------------

  useEffect(() => {
    loadPage(id).then((p) => (p ? setPage(p) : router.back()));
  }, [id]);

  useEffect(() => {
    if (!page) return;
    const t = setTimeout(() => savePage(page), 400);
    return () => clearTimeout(t);
  }, [page]);

  const update = useCallback((fn: (p: Page) => Page) => setPage((p) => (p ? fn(p) : p)), []);

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

  // keep the library thumbnail fresh when leaving the editor
  const latest = useRef({ page, images, fonts });
  latest.current = { page, images, fonts };
  useFocusEffect(
    useCallback(
      () => () => {
        const { page: p, images: imgs, fonts: f } = latest.current;
        if (p && f && imgs.every(Boolean)) {
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

  const setPanel = (i: number, patch: Partial<Panel>) =>
    update((p) => ({ ...p, panels: p.panels.map((x, j) => (j === i ? { ...x, ...patch } : x)) }));
  const setInk = (i: number, patch: Partial<InkParams>) => setPanel(i, { ink: { ...page.panels[i].ink, ...patch } });

  const setItem = (itemId: string, patch: Partial<TextItem>) =>
    update((p) => ({ ...p, items: p.items.map((x) => (x.id === itemId ? { ...x, ...patch } : x)) }));

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
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (res.canceled || !res.assets[0]) return null;
    return copyPhoto(page.id, res.assets[0].uri);
  };

  const addPanel = async () => {
    const photo = await pickOne();
    if (!photo) return;
    update((p) => {
      const panels = [...p.panels, { photo, ink: { ...DEFAULT_INK }, focus: [0.5, 0.5] as [number, number], zoom: 1 }];
      return { ...p, panels, layout: layoutsFor(panels.length)[0].id };
    });
  };

  const replacePanel = async (i: number) => {
    const old = page.panels[i].photo;
    const photo = await pickOne();
    if (!photo) return;
    setPanel(i, { photo, focus: [0.5, 0.5] });
    const f = photoFile(page.id, old);
    if (f.exists && !page.panels.some((p, j) => j !== i && p.photo === old)) f.delete();
  };

  const removePanel = (i: number) => {
    const old = page.panels[i].photo;
    update((p) => {
      const panels = p.panels.filter((_, j) => j !== i);
      return { ...p, panels, layout: layoutsFor(panels.length)[0].id };
    });
    setSel(null);
    const f = photoFile(page.id, old);
    if (f.exists) f.delete();
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
        <Text style={s.topTitle}>Chapter {page.chapter}</Text>
        <Button label="Export" variant="plain" onPress={exportPage} disabled={!ready || !!busy} />
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
                onFocus={(focus) => setPanel(i, { focus })}
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
                onMove={(x, y) => setItem(item.id, { x, y })}
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
            <Text style={s.hint}>Tap a panel or text to edit. Drag to move.</Text>
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
            onInk={(patch) => setInk(sel.index, patch)}
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
              <Button label="Done" variant="solid" onPress={() => setSel(null)} style={s.flex} />
            </Row>
          </>
        )}
      </ScrollView>

      <Modal visible={!!editing} transparent animationType="fade" onRequestClose={() => setEditing(null)}>
        <KeyboardAvoidingView style={s.modalWrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setEditing(null)} />
          <View style={[s.modal, { paddingBottom: insets.bottom + space(4) }]}>
            <TextInput
              value={editing?.text ?? ''}
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
      </Modal>
    </View>
  );
}

// ---- panel tools ------------------------------------------------------------

const TONES = [
  { id: 0.2, label: 'Light' },
  { id: 0.5, label: 'Medium' },
  { id: 0.8, label: 'Heavy' },
];

function PanelTools({
  panel,
  canRemove,
  onInk,
  onReplace,
  onRemove,
  onAdd,
  onDone,
}: {
  panel: Panel;
  canRemove: boolean;
  onInk: (patch: Partial<InkParams>) => void;
  onReplace: () => void;
  onRemove: () => void;
  onAdd: (k: TextKind) => void;
  onDone: () => void;
}) {
  const tone = TONES.reduce((a, b) => (Math.abs(b.id - panel.ink.ink) < Math.abs(a.id - panel.ink.ink) ? b : a)).id;
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
  r.current = v;
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
  onFocus,
}: {
  rect: Rect;
  scale: number;
  panel: Panel | undefined;
  prep: Prepared | undefined;
  selected: boolean;
  loading: boolean;
  onSelect: () => void;
  onFocus: (f: [number, number]) => void;
}) {
  const props = useLatest({ rect, scale, panel, prep, onSelect, onFocus });
  const start = useRef<[number, number]>([0.5, 0.5]);
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          start.current = props.current.panel?.focus ?? [0.5, 0.5];
        },
        onPanResponderMove: (_, g) => {
          const { rect: r, scale: sc, panel: p, prep: pr } = props.current;
          if (!p || !pr || Math.hypot(g.dx, g.dy) < TAP_SLOP) return;
          // drag the photo inside its frame: how far it can travel = overflow
          const s = Math.max(r.w / pr.width, r.h / pr.height) * (p.zoom || 1);
          const ox = pr.width * s - r.w;
          const oy = pr.height * s - r.h;
          const fx = ox > 1 ? start.current[0] - g.dx / sc / ox : 0.5;
          const fy = oy > 1 ? start.current[1] - g.dy / sc / oy : 0.5;
          props.current.onFocus([clamp01(fx), clamp01(fy)]);
        },
        onPanResponderRelease: (_, g) => {
          if (Math.hypot(g.dx, g.dy) < TAP_SLOP) props.current.onSelect();
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
  onMove,
}: {
  item: TextItem;
  fonts: PageFonts;
  scale: number;
  selected: boolean;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
}) {
  const L = layoutItem(item, fonts);
  const props = useLatest({ item, scale, onSelect, onMove });
  const start = useRef({ x: 0, y: 0 });
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          start.current = { x: props.current.item.x, y: props.current.item.y };
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
  return (
    <View
      {...responder.panHandlers}
      style={[
        s.abs,
        {
          left: (item.x - L.w / 2) * scale - pad,
          top: (item.y - L.h / 2) * scale - pad,
          width: L.w * scale + pad * 2,
          height: L.h * scale + pad * 2,
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
  topTitle: { fontFamily: font.medium, fontSize: 14, color: color.ink },

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

  modalWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(18,18,18,0.25)' },
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
