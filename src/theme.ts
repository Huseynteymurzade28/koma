// One ink, one paper. Everything else is a shade between them.
export const color = {
  paper: '#F4F1EA',
  sheet: '#FBFAF6', // the manga page itself
  ink: '#121212',
  inkSoft: '#3A3835',
  muted: '#8A857A',
  line: '#DCD7CB',
  danger: '#B3261E',
} as const;

export const font = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  display: 'Bangers_400Regular',
} as const;

export const space = (n: number) => n * 4;
