import { Skia, useTypeface, type SkFont, type SkTypeface } from '@shopify/react-native-skia';
import { useMemo } from 'react';

export type PageFonts = {
  sfx: SkFont;
  title: SkFont;
  chapter: SkFont;
  bubble: SkFont;
  caption: SkFont;
};

export function usePageFonts(): PageFonts | null {
  const bangers = useTypeface(require('@expo-google-fonts/bangers/400Regular/Bangers_400Regular.ttf'));
  const comic = useTypeface(require('@expo-google-fonts/comic-neue/700Bold/ComicNeue_700Bold.ttf'));
  const comicItalic = useTypeface(require('@expo-google-fonts/comic-neue/700Bold_Italic/ComicNeue_700Bold_Italic.ttf'));
  return useMemo(() => {
    if (!bangers || !comic || !comicItalic) return null;
    const f = (t: SkTypeface, size: number) => Skia.Font(t, size);
    return {
      sfx: f(bangers, 92),
      title: f(bangers, 54),
      chapter: f(comic, 22),
      bubble: f(comic, 29),
      caption: f(comicItalic, 26),
    };
  }, [bangers, comic, comicItalic]);
}
