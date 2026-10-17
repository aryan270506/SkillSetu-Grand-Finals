import i18n from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { API_ORIGIN } from '../ui/config';
import { DEFAULT_LANGUAGE, LANGUAGES, languageByCode } from './languages';
import { loadScriptFonts } from './fonts';
import en from './locales/en.json';
import hi from './locales/hi.json';
import mr from './locales/mr.json';
import ta from './locales/ta.json';
import te from './locales/te.json';
import kn from './locales/kn.json';

// Keys are the English source text (gettext style), so en.json maps text to itself and
// translators edit the values in the other files.
i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    hi: { translation: hi },
    mr: { translation: mr },
    ta: { translation: ta },
    te: { translation: te },
    kn: { translation: kn },
  },
  lng: DEFAULT_LANGUAGE,
  fallbackLng: DEFAULT_LANGUAGE,
  keySeparator: false,
  nsSeparator: false,
  interpolation: { escapeValue: false },
  returnNull: false,
  returnEmptyString: false,
});

const STORAGE_KEY = 'skillsetu.language';

// Translate a piece of display text if a translation exists; otherwise return it unchanged
// (backend data such as course titles passes through untouched).
export function tx(text) {
  if (typeof text !== 'string') return text;
  const trimmed = text.trim();
  if (!trimmed || !/[A-Za-z]/.test(trimmed) || i18n.language === DEFAULT_LANGUAGE) return text;
  if (!i18n.exists(trimmed)) return text;
  const translated = i18n.t(trimmed);
  return text === trimmed ? translated : text.replace(trimmed, translated);
}

export function translateChildren(children) {
  if (typeof children === 'string') return tx(children);
  if (Array.isArray(children)) return children.map((c) => (typeof c === 'string' ? tx(c) : c));
  return children;
}

export async function setLanguage(code, { persist = true } = {}) {
  const lang = languageByCode(code);
  await loadScriptFonts(lang.script);
  await i18n.changeLanguage(lang.code);
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    document.documentElement.lang = lang.code;
  }
  if (persist) {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, lang.code);
    } catch (e) {
      // Storage can be unavailable (private mode); the choice still applies for this session.
    }
  }
}

export async function bootLanguage() {
  let code = null;
  try {
    code = await AsyncStorage.getItem(STORAGE_KEY);
  } catch (e) {
    code = null;
  }
  if (!code) {
    const device = (getLocales()[0] || {}).languageCode;
    code = LANGUAGES.some((l) => l.code === device) ? device : DEFAULT_LANGUAGE;
  }
  await setLanguage(code, { persist: false });
}

// Every request to our API carries the active language so the backend can answer AI prompts in it.
let fetchPatched = false;
export function installLanguageHeader() {
  if (fetchPatched || typeof globalThis.fetch !== 'function') return;
  const original = globalThis.fetch.bind(globalThis);
  globalThis.fetch = (input, init = {}) => {
    const url = typeof input === 'string' ? input : input?.url || '';
    if (!url.startsWith(API_ORIGIN)) return original(input, init);
    const headers = new Headers(init.headers || (typeof input !== 'string' ? input.headers : undefined) || {});
    if (!headers.has('Accept-Language')) headers.set('Accept-Language', i18n.language || DEFAULT_LANGUAGE);
    return original(input, { ...init, headers });
  };
  fetchPatched = true;
}

export function useLanguage() {
  const { i18n: inst } = useTranslation();
  const lang = languageByCode(inst.language);
  return { language: lang.code, script: lang.script, locale: lang.locale, setLanguage };
}

export { useTranslation };
export default i18n;
