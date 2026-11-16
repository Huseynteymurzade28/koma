import { AlphaType, ColorType, Skia, type SkImage } from '@shopify/react-native-skia';
import { File } from 'expo-file-system';

import KomaSubject from '../../modules/koma-subject/src/KomaSubjectModule';

// The subject of a photo (person, animal, object), found on the device by the
// koma-subject native module. Android only; everywhere else, and whenever the
// model is not ready or finds nothing useful, there is simply no subject and
// the page is drawn as before.

export type Subject = {
  mask: SkImage; // grey, white = subject; any resolution, same aspect as the photo
  center: [number, number]; // 0..1, middle of the subject
};

// The mask is kept next to the photo, so it is worked out once per photo.
const maskUri = (photoUri: string) => `${photoUri}.mask.png`;

export async function findSubject(photoUri: string): Promise<Subject | null> {
  if (!KomaSubject) return null;
  try {
    const file = new File(maskUri(photoUri));
    if (!file.exists) await KomaSubject.segment(photoUri, file.uri);
    const mask = Skia.Image.MakeImageFromEncoded(Skia.Data.fromBytes(await file.bytes()));
    return mask ? measure(mask) : null;
  } catch {
    // e.g. the model is still downloading: no subject this time, try again next time
    return null;
  }
}

// Where the subject sits, and whether there is one worth using at all.
function measure(mask: SkImage): Subject | null {
  const N = 64;
  const surface = Skia.Surface.Make(N, N);
  if (!surface) return null;
  surface.getCanvas().drawImageRect(mask, Skia.XYWHRect(0, 0, mask.width(), mask.height()), Skia.XYWHRect(0, 0, N, N), Skia.Paint());
  const px = surface.makeImageSnapshot().readPixels(0, 0, {
    width: N,
    height: N,
    colorType: ColorType.RGBA_8888,
    alphaType: AlphaType.Unpremul,
  });
  if (!px) return null;
  let n = 0;
  let sx = 0;
  let sy = 0;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (px[(y * N + x) * 4] < 128) continue;
      n++;
      sx += x + 0.5;
      sy += y + 0.5;
    }
  }
  // nothing found, or the "subject" is nearly the whole photo: not a usable cut-out
  const cover = n / (N * N);
  if (cover < 0.03 || cover > 0.9) return null;
  return { mask, center: [sx / n / N, sy / n / N] };
}
