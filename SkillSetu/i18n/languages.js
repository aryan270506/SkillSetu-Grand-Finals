// Supported UI languages. `script` selects the font family; `locale` drives Intl formatting.
export const LANGUAGES = [
  { code: 'en', nativeName: 'English', englishName: 'English', script: 'latin', locale: 'en-IN', aiName: 'English' },
  { code: 'hi', nativeName: 'हिन्दी', englishName: 'Hindi', script: 'devanagari', locale: 'hi-IN', aiName: 'Hindi' },
  { code: 'mr', nativeName: 'मराठी', englishName: 'Marathi', script: 'devanagari', locale: 'mr-IN', aiName: 'Marathi' },
  { code: 'ta', nativeName: 'தமிழ்', englishName: 'Tamil', script: 'tamil', locale: 'ta-IN', aiName: 'Tamil' },
  { code: 'te', nativeName: 'తెలుగు', englishName: 'Telugu', script: 'telugu', locale: 'te-IN', aiName: 'Telugu' },
  { code: 'kn', nativeName: 'ಕನ್ನಡ', englishName: 'Kannada', script: 'kannada', locale: 'kn-IN', aiName: 'Kannada' },
];

export const DEFAULT_LANGUAGE = 'en';

export const languageByCode = (code) => LANGUAGES.find((l) => l.code === code) || LANGUAGES[0];
