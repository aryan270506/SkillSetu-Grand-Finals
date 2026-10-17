import i18n from 'i18next';

// Translate a source-text key with interpolation, e.g. tl('Hi {{name}}', { name }).
export const tl = (key, options) => i18n.t(key, options);
