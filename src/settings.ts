import { File, Paths } from 'expo-file-system';

// App-wide preferences, kept in one small JSON file next to the pages.

export type Settings = {
  // reader turns pages right to left, as printed manga does
  readRtl: boolean;
};

const DEFAULTS: Settings = { readRtl: false };

const file = () => new File(Paths.document, 'settings.json');

let current: Settings | null = null;

export function getSettings(): Settings {
  if (current) return current;
  let read: Settings = { ...DEFAULTS };
  try {
    const f = file();
    if (f.exists) read = { ...DEFAULTS, ...JSON.parse(f.textSync()) };
  } catch {
    // unreadable settings fall back to the defaults
  }
  current = read;
  return read;
}

export function setSettings(patch: Partial<Settings>): Settings {
  current = { ...getSettings(), ...patch };
  try {
    const f = file();
    if (!f.exists) f.create();
    f.writeSync(JSON.stringify(current));
  } catch {
    // a preference that does not stick is not worth an error
  }
  return current;
}
