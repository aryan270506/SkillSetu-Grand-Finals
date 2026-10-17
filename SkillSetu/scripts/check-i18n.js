#!/usr/bin/env node
// Verifies every locale file has exactly the keys in en.json and keeps each {{placeholder}}.
// Usage: node scripts/check-i18n.js
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'i18n', 'locales');
const read = (code) => JSON.parse(fs.readFileSync(path.join(dir, `${code}.json`), 'utf8'));
const vars = (s) => (s.match(/\{\{[^}]+\}\}/g) || []).sort().join(',');

const en = read('en');
const enKeys = Object.keys(en);
const locales = fs.readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'en.json').map((f) => f.replace('.json', ''));

let failed = false;
for (const code of locales) {
  const data = read(code);
  const problems = [];
  for (const key of enKeys) {
    if (!(key in data)) problems.push(`missing: ${key}`);
    else if (typeof data[key] !== 'string' || !data[key].trim()) problems.push(`empty: ${key}`);
    else if (vars(data[key]) !== vars(key)) problems.push(`placeholders differ: ${key}`);
  }
  for (const key of Object.keys(data)) if (!(key in en)) problems.push(`not in en.json: ${key}`);
  console.log(`${code}: ${enKeys.length - problems.filter((p) => p.startsWith('missing')).length}/${enKeys.length} keys${problems.length ? `, ${problems.length} problems` : ''}`);
  problems.slice(0, 20).forEach((p) => console.log(`  ${p}`));
  if (problems.length) failed = true;
}
process.exit(failed ? 1 : 0);
