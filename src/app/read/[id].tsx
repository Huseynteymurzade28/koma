import { Canvas, Group, type SkImage } from '@shopify/react-native-skia';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type GestureResponderEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { prepare, renderInk } from '@/manga/process';
import { pageColor } from '@/page/colors';
import { usePageFonts, type PageFonts } from '@/page/fonts';
import { PageDrawing } from '@/page/PageDrawing';
import { loadPage, photoFile } from '@/page/store';
import { PAGE_H, PAGE_W, type Page } from '@/page/types';
import { getSettings, setSettings } from '@/settings';
import { font, palettes, space } from '@/theme';

// Reads a chapter one page at a time, full screen. Swipe or tap the edges to
// turn pages; tap the middle to show or hide the controls. Pages can turn
// left to right or right to left, as printed manga does.

// the reader is always dark, whatever the system theme, so the page stands out
const C = palettes.dark;
const BG = '#0B0B0A';
// share of the width at each edge that turns the page on tap
const EDGE = 0.3;

export default function Reader() {
  const { id, at: start } = useLocalSearchParams<{ id: string; at?: string }>();
  const insets = useSafeAreaInsets();
  const { width: w, height: h } = useWindowDimensions();
  const fonts = usePageFonts();

  const [page, setPage] = useState<Page | null>(null);
  const [at, setAt] = useState(() => Math.max(0, Number(start) || 0));
  const [rtl, setRtl] = useState(() => getSettings().readRtl);
  const [chrome, setChrome] = useState(true);
  const list = useRef<FlatList<number>>(null);

  useEffect(() => {
    loadPage(id).then((p) => {
      if (!p) return router.back();
      setAt((a) => Math.min(a, p.sheets.length - 1));
      setPage(p);
    });
  }, [id]);

  const n = page?.sheets.length ?? 0;
  // position in the list of a sheet, and back: right to left lists them reversed
  const posOf = useCallback((sheet: number) => (rtl ? n - 1 - sheet : sheet), [rtl, n]);
  const order = useMemo(() => {
    const idx = Array.from({ length: n }, (_, i) => i);
    return rtl ? idx.reverse() : idx;
  }, [n, rtl]);

  const turn = useCallback(
    (by: -1 | 1) => {
      const j = at + by;
      if (j < 0 || j >= n) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
        return;
      }
      list.current?.scrollToIndex({ index: posOf(j), animated: true });
      setAt(j);
    },
    [at, n, posOf],
  );

  const onTap = useCallback(
    (e: GestureResponderEvent) => {
      const x = e.nativeEvent.locationX;
      if (x > EDGE * w && x < (1 - EDGE) * w) return setChrome((v) => !v);
      // the edge the next page comes from depends on the direction
      const towardsRight = x >= (1 - EDGE) * w;
      turn(towardsRight !== rtl ? 1 : -1);
    },
    [w, rtl, turn],
  );

  const onScrolled = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const pos = Math.round(e.nativeEvent.contentOffset.x / w);
    setAt(Math.max(0, Math.min(n - 1, posOf(pos))));
  };

  const flip = () => {
    setRtl(setSettings({ readRtl: !rtl }).readRtl);
    Haptics.selectionAsync().catch(() => {});
  };

  if (!page || !fonts) {
    return (
      <View style={[s.screen, s.center]}>
        <StatusBar style="light" />
        <ActivityIndicator color={C.ink} />
      </View>
    );
  }

  const progress = n > 1 ? (at + 1) / n : 1;

  return (
    <View style={s.screen}>
      <StatusBar style="light" hidden={!chrome} animated />
      <FlatList
        // a new list per direction, so it opens on the right page
        key={rtl ? 'rtl' : 'ltr'}
        ref={list}
        data={order}
        keyExtractor={String}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={posOf(at)}
        getItemLayout={(_, i) => ({ length: w, offset: w * i, index: i })}
        onMomentumScrollEnd={onScrolled}
        extraData={at}
        windowSize={3}
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        renderItem={({ item }) => (
          <Pressable onPress={onTap} style={{ width: w, height: h }}>
            <ReaderSheet page={page} index={item} near={Math.abs(item - at) <= 1} fonts={fonts} w={w} h={h} />
          </Pressable>
        )}
      />

      {chrome && (
        <>
          <View style={[s.top, { paddingTop: insets.top + space(1) }]} pointerEvents="box-none">
            <Chip label="‹ Close" onPress={() => router.back()} />
            <View style={s.titleWrap} pointerEvents="none">
              <Text style={s.chapter}>Chapter {page.chapter}</Text>
              <Text style={s.title} numberOfLines={1}>
                {page.title}
              </Text>
            </View>
            <Chip label={rtl ? '← Right to left' : 'Left to right →'} onPress={flip} />
          </View>

          <View style={[s.bottom, { paddingBottom: insets.bottom + space(3) }]} pointerEvents="none">
            <Text style={s.count}>
              {at + 1} / {n}
            </Text>
            <View style={s.track}>
              <View style={[s.fill, { width: `${progress * 100}%` }, rtl && { alignSelf: 'flex-end' }]} />
            </View>
          </View>
        </>
      )}
    </View>
  );
}

type SheetProps = { page: Page; index: number; near: boolean; fonts: PageFonts; w: number; h: number };

// One sheet, inked only while it is on screen or next to it, so a long
// chapter does not hold every panel image in memory.
const ReaderSheet = memo(function ReaderSheet({ page, index, near, fonts, w, h }: SheetProps) {
  const [images, setImages] = useState<(SkImage | null)[] | null>(null);
  const sheet = page.sheets[index];

  useEffect(() => {
    if (!near || !sheet) return;
    let live = true;
    Promise.all(
      sheet.panels.map((p) =>
        prepare(photoFile(page.id, p.photo).uri)
          .then((prep) => renderInk(prep, p.ink))
          .catch(() => null),
      ),
    ).then((imgs) => {
      if (live) setImages(imgs);
    });
    return () => {
      live = false;
      setImages(null);
    };
  }, [near, page.id, sheet]);

  const k = Math.min(w / PAGE_W, h / PAGE_H);
  const pw = PAGE_W * k;
  const ph = PAGE_H * k;
  return (
    <View style={[s.center, { width: w, height: h }]}>
      <View style={{ width: pw, height: ph, backgroundColor: pageColor.sheet }}>
        {images && (
          <Canvas style={{ width: pw, height: ph }}>
            <Group transform={[{ scale: k }]}>
              <PageDrawing page={page} sheet={index} images={images} fonts={fonts} />
            </Group>
          </Canvas>
        )}
        {!images && (
          <View style={[StyleSheet.absoluteFill, s.center]}>
            <ActivityIndicator color={pageColor.muted} />
          </View>
        )}
      </View>
    </View>
  );
});

function Chip({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} style={({ pressed }) => [s.chip, pressed && { opacity: 0.55 }]}>
      <Text style={s.chipText} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  center: { alignItems: 'center', justifyContent: 'center' },

  top: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(2),
    paddingHorizontal: space(3),
    paddingBottom: space(2),
    backgroundColor: 'rgba(11,11,10,0.82)',
  },
  titleWrap: { flex: 1, alignItems: 'center' },
  chapter: { fontFamily: font.medium, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: C.muted },
  title: { fontFamily: font.semibold, fontSize: 14, color: C.ink },
  chip: {
    height: 34,
    paddingHorizontal: space(3),
    borderRadius: 2,
    borderWidth: 1,
    borderColor: C.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: { fontFamily: font.medium, fontSize: 13, color: C.ink },

  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    gap: space(2),
    paddingTop: space(3),
    paddingHorizontal: space(10),
    backgroundColor: 'rgba(11,11,10,0.82)',
  },
  count: { fontFamily: font.medium, fontSize: 13, color: C.ink, letterSpacing: 0.4 },
  track: { alignSelf: 'stretch', height: 2, backgroundColor: C.line },
  fill: { height: 2, backgroundColor: C.ink },
});
