// Runs the app's manga shaders on the desktop with canvaskit (CPU), so the
// look can be tuned without a phone. Slow (tens of seconds) — the phone GPU is not.
//
//   node --no-warnings tools/shader-harness/run.mts <in.png> <out.png> [ink 0..1] [fx 0|1|2]
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const CanvasKitInit = createRequire(root + 'package.json')('canvaskit-wasm');
const { FLATTEN_SKSL, INK_SKSL } = await import(root + 'src/manga/shaders.ts');
const { statsFromPixels, thresholds } = await import(root + 'src/manga/tones.ts');

const CK = await CanvasKitInit();
const [, , inPath, outPath, ink = '0.5', fx = '0'] = process.argv;
const src = CK.MakeImageFromEncoded(readFileSync(inPath));
const W = 1000;
const H = Math.round((src.height() * W) / src.width());

function pass(sksl: string, child: any, uniforms: number[]) {
  const eff = CK.RuntimeEffect.Make(sksl, (e: string) => console.error('SkSL error:', e));
  if (!eff) process.exit(1);
  const surf = CK.MakeSurface(W, H);
  const sh = child.makeShaderOptions(CK.TileMode.Clamp, CK.TileMode.Clamp, CK.FilterMode.Linear, CK.MipmapMode.None);
  const p = new CK.Paint();
  p.setShader(eff.makeShaderWithChildren(uniforms, [sh]));
  surf.getCanvas().drawRect(CK.XYWHRect(0, 0, W, H), p);
  return surf.makeImageSnapshot();
}

const rs = CK.MakeSurface(W, H);
rs.getCanvas().drawImageRect(src, CK.XYWHRect(0, 0, src.width(), src.height()), CK.XYWHRect(0, 0, W, H), new CK.Paint());
const unit = W / 700;
const t = performance.now();
const flat = pass(FLATTEN_SKSL, rs.makeImageSnapshot(), [unit]);

const sm = CK.MakeSurface(96, 96);
sm.getCanvas().drawImageRect(flat, CK.XYWHRect(0, 0, W, H), CK.XYWHRect(0, 0, 96, 96), new CK.Paint());
const px = sm.makeImageSnapshot().readPixels(0, 0, {
  width: 96, height: 96, colorType: CK.ColorType.RGBA_8888, alphaType: CK.AlphaType.Unpremul, colorSpace: CK.ColorSpace.SRGB,
});
const st = statsFromPixels(px);
const th = thresholds(st, Number(ink));
const out = pass(INK_SKSL, flat, [W, H, unit, st.lo, st.hi, th.tLight, th.tDark, th.tBlack, 1, Number(fx), 0.45, 0.35]);
console.log(inPath, Math.round(performance.now() - t) + 'ms', JSON.stringify({ lo: st.lo.toFixed(2), hi: st.hi.toFixed(2), ...Object.fromEntries(Object.entries(th).map(([k, v]) => [k, (v as number).toFixed(2)])) }));
writeFileSync(outPath, out.encodeToBytes());
