import { Platform } from 'react-native';

// Single source of truth for the SkillSetu visual language.
// Black frame, soft light canvas, white cards, pastel semantic accents.

export const colors = {
  frame: '#0B0B0C',
  frameSoft: '#1C1C1F',
  frameText: '#FFFFFF',
  frameMuted: '#A1A1AA',
  backdrop: '#DDF4F7',

  canvas: '#F6F6F4',
  panel: '#EDEDEA',
  surface: '#FFFFFF',
  surfaceMuted: '#F1F1EF',
  surfaceSunken: '#E9E9E6',

  ink: '#111113',
  text: '#1E1E21',
  textMuted: '#6B6B73',
  textSubtle: '#9A9AA2',
  border: '#E6E6E2',
  borderStrong: '#D4D4CF',

  sky: '#DDF3FB',
  skyStrong: '#8FD3EA',
  skyInk: '#0B6A86',
  mint: '#D5F5DC',
  mintStrong: '#7BD88F',
  mintInk: '#1F7A37',
  lilac: '#EBD9FB',
  lilacStrong: '#C9A4F2',
  lilacInk: '#6B3FA0',
  butter: '#FCEFC0',
  butterStrong: '#F2CF5B',
  butterInk: '#8A6512',
  pink: '#FBD3E0',
  pinkStrong: '#F28DB0',
  pinkInk: '#A3325A',
  peach: '#FFE0CC',
  peachInk: '#A4501A',

  success: '#3FB25F',
  danger: '#E5484D',
  dangerSoft: '#FDE2E2',
  connector: '#5BBF6F',
};

// Semantic tones -> { bg, inner, strong, ink }
export const tones = {
  info: { bg: colors.sky, inner: '#EEF9FD', strong: colors.skyStrong, ink: colors.skyInk },
  success: { bg: colors.mint, inner: '#ECFBEF', strong: colors.mintStrong, ink: colors.mintInk },
  accent: { bg: colors.lilac, inner: '#F6EDFD', strong: colors.lilacStrong, ink: colors.lilacInk },
  warning: { bg: colors.butter, inner: '#FEF8E2', strong: colors.butterStrong, ink: colors.butterInk },
  pink: { bg: colors.pink, inner: '#FDEBF1', strong: colors.pinkStrong, ink: colors.pinkInk },
  peach: { bg: colors.peach, inner: '#FFF0E6', strong: '#F5A26F', ink: colors.peachInk },
  neutral: { bg: colors.surfaceMuted, inner: colors.surface, strong: colors.borderStrong, ink: colors.textMuted },
  danger: { bg: colors.dangerSoft, inner: '#FEF1F1', strong: '#F59A9C', ink: '#B4232A' },
  dark: { bg: colors.ink, inner: colors.frameSoft, strong: '#3A3A3F', ink: colors.frameText },
};

export const toneOf = (name) => tones[name] || tones.neutral;

export const radii = {
  xs: 8,
  sm: 12,
  md: 18,
  lg: 24,
  xl: 28,
  xxl: 36,
  pill: 999,
};

export const space = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 44,
};

// Plus Jakarta Sans families keyed by weight (loaded in App.js).
export const fonts = {
  400: 'PlusJakartaSans_400Regular',
  500: 'PlusJakartaSans_500Medium',
  600: 'PlusJakartaSans_600SemiBold',
  700: 'PlusJakartaSans_700Bold',
  800: 'PlusJakartaSans_800ExtraBold',
};

export const font = (weight = 400) => ({ fontFamily: fonts[weight] || fonts[400] });

export const type = {
  display: { ...font(700), fontSize: 34, lineHeight: 40, letterSpacing: -0.8 },
  h1: { ...font(700), fontSize: 28, lineHeight: 34, letterSpacing: -0.6 },
  h2: { ...font(700), fontSize: 22, lineHeight: 28, letterSpacing: -0.4 },
  h3: { ...font(700), fontSize: 18, lineHeight: 24, letterSpacing: -0.2 },
  title: { ...font(600), fontSize: 16, lineHeight: 22 },
  body: { ...font(400), fontSize: 14, lineHeight: 21 },
  bodyStrong: { ...font(600), fontSize: 14, lineHeight: 21 },
  small: { ...font(500), fontSize: 13, lineHeight: 18 },
  caption: { ...font(500), fontSize: 12, lineHeight: 16 },
  overline: { ...font(700), fontSize: 11, lineHeight: 14, letterSpacing: 0.8, textTransform: 'uppercase' },
  stat: { ...font(700), fontSize: 32, lineHeight: 36, letterSpacing: -1 },
};

const webShadow = (value) => (Platform.OS === 'web' ? { boxShadow: value } : {});

export const shadows = {
  none: {},
  soft: Platform.select({
    web: webShadow('0 1px 2px rgba(17,17,19,0.04), 0 8px 24px rgba(17,17,19,0.05)'),
    default: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  }),
  raised: Platform.select({
    web: webShadow('0 2px 6px rgba(17,17,19,0.06), 0 22px 48px rgba(17,17,19,0.12)'),
    default: { shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 6 },
  }),
  float: Platform.select({
    web: webShadow('0 30px 60px rgba(17,17,19,0.18)'),
    default: { shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 30, shadowOffset: { width: 0, height: 18 }, elevation: 10 },
  }),
};

export const breakpoints = {
  phone: 640,
  tablet: 900,
  desktop: 1180,
};

export const webOnly = (style) => (Platform.OS === 'web' ? style : {});

export default { colors, tones, toneOf, radii, space, fonts, font, type, shadows, breakpoints, webOnly };
