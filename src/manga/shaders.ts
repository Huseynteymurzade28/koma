// SkSL sources for the manga pipeline. Shared by the app (react-native-skia)
// and the desktop test harness (canvaskit), so keep this file dependency-free.

// Pass 1 — "flatten": luminance + Kuwahara filter.
// Kills photo texture (pores, noise, soft gradients) while keeping edges sharp,
// so the result reads as painted areas instead of a photograph.
// Output: grey in rgb.
export const FLATTEN_SKSL = `
uniform shader image;
uniform float radius; // sample spacing in px, ~1.0 at 700px wide

float lum(float2 p) {
  half4 c = image.eval(p);
  return dot(float3(c.rgb), float3(0.299, 0.587, 0.114));
}

half4 main(float2 xy) {
  float m[4];
  float v[4];
  for (int q = 0; q < 4; q++) {
    float sx = (q == 0 || q == 2) ? -1.0 : 1.0;
    float sy = (q < 2) ? -1.0 : 1.0;
    float s = 0.0;
    float s2 = 0.0;
    for (int i = 0; i <= 4; i++) {
      for (int j = 0; j <= 4; j++) {
        float l = lum(xy + float2(sx * float(i), sy * float(j)) * radius);
        s += l;
        s2 += l * l;
      }
    }
    m[q] = s / 25.0;
    v[q] = s2 / 25.0 - m[q] * m[q];
  }
  float best = m[0];
  float bv = v[0];
  for (int q = 1; q < 4; q++) {
    if (v[q] < bv) { bv = v[q]; best = m[q]; }
  }
  return half4(half3(best), 1.0);
}
`;

// Pass 2 — "ink": XDoG ink lines + quantised screentone + optional effect lines.
// With a subject mask the background can also be cleared to paper or filled
// black, and effect lines stay behind the subject.
// Input: flattened grey image, and a subject mask scaled to the same size
// (white = subject; pass any shader and hasMask = 0 when there is none). All thresholds are in that image's grey units
// (computed from its percentiles), so every photo gets a balanced page.
export const INK_SKSL = `
uniform shader image;
uniform shader mask;
uniform float2 size;     // image size in px
uniform float unit;      // px per "design pixel" (image width / 700)
uniform float lo;        // grey levels used to normalise contrast
uniform float hi;
uniform float tLight;    // below: light dot tone
uniform float tDark;     // below: dark tone (dense dots + hatching)
uniform float tBlack;    // below: solid black
uniform float lines;     // 0..1 ink line strength
uniform float fx;        // 0 none, 1 focus lines, 2 speed lines
uniform float2 fxCenter; // 0..1, focus point
uniform float hasMask;   // 1 when the mask shader is a real subject mask
uniform float bg;        // 0 keep the background, 1 blank paper, 2 solid black

float subject(float2 p) { return mask.eval(p).r; }

float g(float2 p) { return image.eval(p).r; }

float hash(float n) { return fract(sin(n * 12.9898) * 43758.5453); }

// 1 = paper, 0 = ink
float dots(float2 p, float spacing, float r) {
  float a = 0.7853982; // 45deg
  float2 u = float2(p.x * cos(a) + p.y * sin(a), -p.x * sin(a) + p.y * cos(a));
  float2 d = mod(u, spacing) - spacing * 0.5;
  return length(d) > r ? 1.0 : 0.0;
}

float hatch(float2 p, float spacing, float w) {
  float u = (p.x - p.y) * 0.7071068;
  return mod(u, spacing) > w ? 1.0 : 0.0;
}

half4 main(float2 xy) {
  // Gaussian blur at two scales in one sweep (sigma 1.0 and 1.6, in design px)
  float s1 = 0.0; float w1 = 0.0;
  float s2 = 0.0; float w2 = 0.0;
  for (int i = -4; i <= 4; i++) {
    for (int j = -4; j <= 4; j++) {
      float2 o = float2(float(i), float(j));
      float v = g(xy + o * unit * 0.75);
      float r2 = dot(o, o) * 0.5625;
      float a = exp(-r2 / 2.0);
      float b = exp(-r2 / 5.12);
      s1 += v * a; w1 += a;
      s2 += v * b; w2 += b;
    }
  }
  float g1 = s1 / w1;
  float g2 = s2 / w2;

  // XDoG ink lines on contrast-normalised grey
  float span = max(hi - lo, 0.05);
  float n1 = (g1 - lo) / span;
  float n2 = (g2 - lo) / span;
  float p = 20.0;
  float d = (1.0 + p) * n1 - p * n2;
  // XDoG soft threshold 1 + tanh(14 (d - 0.3)) binarised at 0.5
  // is the same as a hard cut at d = 0.3 - atanh(0.5) / 14 ~= 0.26
  float ink = d > 0.26 ? 1.0 : 0.0;
  ink = mix(1.0, ink, lines);

  // Tone levels
  float2 dp = xy / unit;
  float tone = 1.0;
  if (g2 < tLight) tone = dots(dp, 6.0, 1.3);
  if (g2 < tDark) tone = dots(dp, 5.0, 2.0) * hatch(dp, 5.0, 1.6);
  if (g2 < tBlack) tone = 0.0;

  bool masked = hasMask > 0.5;
  bool back = masked && subject(xy) < 0.5;
  bool night = back && bg > 1.5;
  if (back && bg > 0.5) {
    tone = night ? 0.0 : 1.0;
    ink = 1.0;
  }

  // Effect lines: behind the subject when it is known, otherwise only on
  // blank paper so the subject stays readable
  bool lineArea = masked ? (back && (bg > 0.5 || g2 >= tLight)) : g2 >= tLight;
  if (fx > 0.5 && lineArea) {
    float lineInk = 0.0;
    if (fx < 1.5) {
      float2 c = fxCenter * size;
      float2 v = xy - c;
      float r = length(v) / length(size);
      float ang = atan(v.y, v.x) / 6.2831853 + 0.5;
      float n = 220.0;
      float k = floor(ang * n);
      float f = fract(ang * n);
      float on = step(0.45, hash(k));
      float inner = 0.16 + 0.12 * hash(k + 7.0);
      float w = clamp((r - inner) * 1.6, 0.0, 0.5) * (0.4 + 0.6 * hash(k + 3.0));
      lineInk = on * step(abs(f - 0.5), w);
    } else {
      float n = size.y / (unit * 7.0);
      float yy = xy.y / size.y * n;
      float k = floor(yy);
      float f = fract(yy);
      float on = step(0.4, hash(k));
      float len = 0.35 + 0.5 * hash(k + 11.0);
      float x = xy.x / size.x;
      float w = clamp((len - x) / len, 0.0, 1.0) * 0.35 * (0.5 + 0.5 * hash(k + 5.0));
      lineInk = on * step(abs(f - 0.5), w);
    }
    // on a black background the lines are cut out in white
    tone = night ? lineInk : min(tone, 1.0 - lineInk);
  }

  float o = tone * ink;

  // a contour around the subject once its background is gone
  if (masked && bg > 0.5) {
    float r = unit * 1.5;
    float a = subject(xy + float2(r, 0.0));
    float b = subject(xy - float2(r, 0.0));
    float c = subject(xy + float2(0.0, r));
    float e = subject(xy - float2(0.0, r));
    if (min(min(a, b), min(c, e)) < 0.5 && max(max(a, b), max(c, e)) >= 0.5) o = bg > 1.5 ? 1.0 : 0.0;
  }
  return half4(half3(o), 1.0);
}
`;
