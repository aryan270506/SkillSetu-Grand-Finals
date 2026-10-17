import i18n from 'i18next';
import { languageByCode } from './languages';

const locale = () => languageByCode(i18n.language).locale;

export function formatNumber(value, options) {
  const n = Number(value);
  if (!Number.isFinite(n)) return value ?? '';
  return new Intl.NumberFormat(locale(), options).format(n);
}

export function formatCurrency(value, currency = 'INR') {
  return formatNumber(value, { style: 'currency', currency, maximumFractionDigits: 0 });
}

export function formatDate(value, options = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return new Intl.DateTimeFormat(locale(), options).format(d);
}

export function formatDateTime(value) {
  return formatDate(value, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}
