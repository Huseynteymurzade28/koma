import {
  AlphaType,
  ColorType,
  FilterMode,
  MipmapMode,
  Skia,
  TileMode,
  type SkImage,
  type SkRuntimeEffect,
  type SkShader,
} from '@shopify/react-native-skia';
import { File } from 'expo-file-system';

import { FLATTEN_SKSL, INK_SKSL } from './shaders';
import { findSubject, type Subject } from './subject';
import { BG_CODE, FX_CODE, statsFromPixels, thresholds, type InkParams, type ToneStats } from './tones';

// Photo -> manga, on the GPU:
//   1. decode + downscale        (once per photo)
//   2. flatten (Kuwahara)        (once per photo)
//   3. histogram -> tone stats   (once per photo)
//   3b. subject mask             (once per photo, Android only, may be missing)
//   4. ink pass                  (every time the panel's settings change; cheap)

const MAX_SIDE = 1100;

export type Prepared = { flat: SkImage; stats: ToneStats; width: number; height: number; subject: Subject | null };

let flattenFx: SkRuntimeEffect | null = null;
let inkFx: SkRuntimeEffect | null = null;

function effects() {
  flattenFx ??= Skia.RuntimeEffect.Make(FLATTEN_SKSL);
  inkFx ??= Skia.RuntimeEffect.Make(INK_SKSL);
  if (!flattenFx || !inkFx) throw new Error('Manga shaders failed to compile');
  return { flattenFx, inkFx };
}

// `fitW` x `fitH` stretches the image to that size, for a mask that was made at another resolution
function shaderOf(image: SkImage, fitW = image.width(), fitH = image.height()): SkShader {
  const m = Skia.Matrix();
  m.scale(fitW / image.width(), fitH / image.height());
  return image.makeShaderOptions(TileMode.Clamp, TileMode.Clamp, FilterMode.Linear, MipmapMode.None, m);
}

function pass(effect: SkRuntimeEffect, children: SkShader[], uniforms: number[], w: number, h: number): SkImage {
  const surface = Skia.Surface.MakeOffscreen(w, h);
  if (!surface) throw new Error('Could not create offscreen surface');
  const paint = Skia.Paint();
  paint.setShader(effect.makeShaderWithChildren(uniforms, children));
  surface.getCanvas().drawRect(Skia.XYWHRect(0, 0, w, h), paint);
  surface.flush();
  return surface.makeImageSnapshot();
}

const cache = new Map<string, Promise<Prepared>>();

export function prepare(uri: string): Promise<Prepared> {
  let p = cache.get(uri);
  if (!p) {
    p = prepareUncached(uri);
    p.catch(() => cache.delete(uri));
    cache.set(uri, p);
  }
  return p;
}

async function prepareUncached(uri: string): Promise<Prepared> {
  const { flattenFx } = effects();
  const bytes = await new File(uri).bytes();
  const src = Skia.Image.MakeImageFromEncoded(Skia.Data.fromBytes(bytes));
  if (!src) throw new Error('Could not read this photo');

  const s = Math.min(1, MAX_SIDE / Math.max(src.width(), src.height()));
  const width = Math.round(src.width() * s);
  const height = Math.round(src.height() * s);

  const rs = Skia.Surface.MakeOffscreen(width, height);
  if (!rs) throw new Error('Could not create offscreen surface');
  const paint = Skia.Paint();
  rs.getCanvas().drawImageRect(src, Skia.XYWHRect(0, 0, src.width(), src.height()), Skia.XYWHRect(0, 0, width, height), paint);
  rs.flush();
  const resized = rs.makeImageSnapshot();

  const unit = width / 700;
  const flat = pass(flattenFx, [shaderOf(resized)], [unit], width, height);

  // Tone stats from a tiny copy — 96x96 is plenty for percentiles.
  const SM = 96;
  const sm = Skia.Surface.MakeOffscreen(SM, SM);
  if (!sm) throw new Error('Could not create offscreen surface');
  sm.getCanvas().drawImageRect(flat, Skia.XYWHRect(0, 0, width, height), Skia.XYWHRect(0, 0, SM, SM), paint);
  sm.flush();
  const px = sm.makeImageSnapshot().readPixels(0, 0, {
    width: SM,
    height: SM,
    colorType: ColorType.RGBA_8888,
    alphaType: AlphaType.Unpremul,
  });
  if (!px) throw new Error('Could not read pixels');

  return { flat, stats: statsFromPixels(px), width, height, subject: await findSubject(uri) };
}

export function renderInk(p: Prepared, ink: InkParams): SkImage {
  const { inkFx } = effects();
  const th = thresholds(p.stats, ink.ink);
  const flat = shaderOf(p.flat);
  // effect lines radiate from the subject when we know where it is
  const center = p.subject?.center ?? ink.fxCenter;
  const out = pass(
    inkFx,
    [flat, p.subject ? shaderOf(p.subject.mask, p.width, p.height) : flat],
    [
      p.width, p.height,
      p.width / 700,
      p.stats.lo, p.stats.hi,
      th.tLight, th.tDark, th.tBlack,
      ink.lines,
      FX_CODE[ink.fx],
      center[0], center[1],
      p.subject ? 1 : 0,
      BG_CODE[ink.bg ?? 'keep'],
    ],
    p.width,
    p.height,
  );
  // The editor canvas draws on another thread; hand it a CPU-backed copy.
  return out.makeNonTextureImage() ?? out;
}
