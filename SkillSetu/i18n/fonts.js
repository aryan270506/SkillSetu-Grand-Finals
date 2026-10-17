import * as Font from 'expo-font';

// Indic scripts are not covered by Plus Jakarta Sans; each script gets a Noto Sans family
// (which also contains Latin glyphs, so mixed text renders correctly).
const WEIGHTS = { 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold' };
const FAMILY_PREFIX = {
  devanagari: 'NotoSansDevanagari',
  tamil: 'NotoSansTamil',
  telugu: 'NotoSansTelugu',
  kannada: 'NotoSansKannada',
};

const loaders = {
  devanagari: () => require('@expo-google-fonts/noto-sans-devanagari'),
  tamil: () => require('@expo-google-fonts/noto-sans-tamil'),
  telugu: () => require('@expo-google-fonts/noto-sans-telugu'),
  kannada: () => require('@expo-google-fonts/noto-sans-kannada'),
};

const loaded = new Set(['latin']);

export async function loadScriptFonts(script) {
  if (loaded.has(script) || !loaders[script]) return;
  const mod = loaders[script]();
  const prefix = FAMILY_PREFIX[script];
  const map = {};
  Object.entries(WEIGHTS).forEach(([w, name]) => {
    const key = `${prefix}_${w}${name}`;
    if (mod[key]) map[key] = mod[key];
  });
  await Font.loadAsync(map);
  loaded.add(script);
}

// Maps a Plus Jakarta Sans family (e.g. PlusJakartaSans_700Bold) to the same weight in the
// active script's Noto family. Unknown families pass through unchanged.
export function familyForScript(family, script) {
  if (!family || script === 'latin' || !FAMILY_PREFIX[script]) return family;
  const m = /^PlusJakartaSans_(\d{3})/.exec(family);
  if (!m) return family;
  const w = m[1];
  return `${FAMILY_PREFIX[script]}_${w}${WEIGHTS[w] || 'Regular'}`;
}
