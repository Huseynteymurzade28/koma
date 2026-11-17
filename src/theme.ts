import { useMemo } from 'react';
import { useColorScheme } from 'react-native';

// One ink, one paper. Everything else is a shade between them.
// The app UI follows the system theme; the manga page itself never does.

export type Palette = {
  paper: string; // screen background
  ink: string; // text, outlines, solid buttons
  onInk: string; // text on a solid (ink) button
  inkSoft: string;
  muted: string;
  line: string;
  danger: string;
  scrim: string; // dims the screen behind sheets and overlays
  veil: string; // translucent paper, for busy overlays
};

const light: Palette = {
  paper: '#F4F1EA',
  ink: '#121212',
  onInk: '#FBFAF6',
  inkSoft: '#3A3835',
  muted: '#8A857A',
  line: '#DCD7CB',
  danger: '#B3261E',
  scrim: 'rgba(18,18,18,0.25)',
  veil: 'rgba(244,241,234,0.7)',
};

const dark: Palette = {
  paper: '#151413',
  ink: '#ECE8DF',
  onInk: '#151413',
  inkSoft: '#C9C4B9',
  muted: '#8F8A80',
  line: '#34322E',
  danger: '#F2766B',
  scrim: 'rgba(0,0,0,0.5)',
  veil: 'rgba(21,20,19,0.7)',
};

export const palettes = { light, dark } as const;

export function usePalette(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}

// Styles that depend on the palette: `const useStyles = themed((c) => StyleSheet.create({...}))`.
// Each palette's styles are built once and reused.
export function themed<T>(make: (c: Palette) => T) {
  const cache = new Map<Palette, T>();
  return function useThemed(): T {
    const c = usePalette();
    return useMemo(() => {
      let v = cache.get(c);
      if (!v) cache.set(c, (v = make(c)));
      return v;
    }, [c]);
  };
}

export const font = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  display: 'Bangers_400Regular',
} as const;

export const space = (n: number) => n * 4;
