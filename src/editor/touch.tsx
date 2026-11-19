import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';

import type { Prepared } from '@/manga/process';
import type { PageFonts } from '@/page/fonts';
import type { Rect } from '@/page/layouts';
import { itemSize, layoutItem } from '@/page/textLayout';
import { PAGE_H, PAGE_W, type Panel, type TextItem } from '@/page/types';
import { font, themed } from '@/theme';

// Touch targets laid over the page canvas, in page units times the screen
// scale: one per panel (drag to reframe, pinch to zoom) and one per item.

export const SELECT = '#E0452B';
export const MAX_ZOOM = 3;
const TAP_SLOP = 6;

function useLatest<T>(v: T) {
  const r = useRef(v);
  useEffect(() => {
    r.current = v;
  });
  return r;
}

export function PanelHit({
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
  const s = useStyles();
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

export function ItemHit({
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
  const s = useStyles();
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

const useStyles = themed((color) => StyleSheet.create({
  abs: { position: 'absolute' },
  center: { alignItems: 'center', justifyContent: 'center' },
  selBox: { borderWidth: 2, borderColor: SELECT },
  drawing: { fontFamily: font.medium, fontSize: 12, color: color.muted },
}));
