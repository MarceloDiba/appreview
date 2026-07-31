import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = join(root, 'src');
const localesRoot = join(sourceRoot, 'i18n', 'owner', 'locales');
const locales = ['pt-BR', 'pt-PT', 'en'];

const flatten = (value, prefix = '', result = new Map()) => {
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object' && !Array.isArray(child)) {
      flatten(child, path, result);
    } else {
      result.set(path, child);
    }
  }
  return result;
};

const catalogs = Object.fromEntries(
  locales.map((locale) => {
    const path = join(localesRoot, `${locale}.json`);
    return [locale, flatten(JSON.parse(readFileSync(path, 'utf8')))];
  })
);

const failures = [];
const base = catalogs['pt-BR'];
const baseKeys = new Set(base.keys());

for (const locale of locales) {
  const keys = new Set(catalogs[locale].keys());
  const missing = [...baseKeys].filter((key) => !keys.has(key));
  const extra = [...keys].filter((key) => !baseKeys.has(key));

  if (missing.length) failures.push(`${locale}: chaves ausentes: ${missing.join(', ')}`);
  if (extra.length) failures.push(`${locale}: chaves extras: ${extra.join(', ')}`);

  for (const [key, value] of catalogs[locale]) {
    if (typeof value !== 'string' || value.trim() === '') {
      failures.push(`${locale}: valor vazio ou inválido em ${key}`);
    }
  }
}

const validKeys = new Set(baseKeys);
for (const key of baseKeys) {
  if (key.endsWith('_one')) validKeys.add(key.slice(0, -4));
  if (key.endsWith('_other')) validKeys.add(key.slice(0, -6));
}

const ownerPrefixes = [...new Set([...baseKeys].map((key) => key.split('.')[0]))];
const usedKeys = new Map();

const scan = (directory) => {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      scan(path);
      continue;
    }
    if (!/\.(ts|tsx)$/.test(entry.name) || entry.name.includes(' 2.')) continue;

    const content = readFileSync(path, 'utf8');
    const pattern = /\bt\(\s*['"]([a-zA-Z0-9_.-]+)['"]/g;
    for (const match of content.matchAll(pattern)) {
      const key = match[1];
      if (!ownerPrefixes.some((prefix) => key.startsWith(`${prefix}.`))) continue;
      if (!usedKeys.has(key)) usedKeys.set(key, new Set());
      usedKeys.get(key).add(relative(root, path));
    }
  }
};

scan(sourceRoot);

for (const [key, files] of usedKeys) {
  if (!validKeys.has(key)) {
    failures.push(`chave usada e não definida: ${key} (${[...files].join(', ')})`);
  }
}

if (failures.length) {
  console.error('Falha na verificação do i18n do painel:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `i18n do painel verificado: ${baseKeys.size} chaves idênticas em ${locales.length} idiomas; ` +
    `${usedKeys.size} referências estáticas resolvidas.`
);
