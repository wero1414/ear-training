// UI strings live in <lang>.json next to this module. All languages are fetched at boot
// (relative to this file, so it works under the Pages subpath) and kept in memory, so a
// language switch in settings is synchronous.
export const LANGS = ['en', 'es'];

const tables = {};
let current = 'en';

export async function loadStrings() {
  await Promise.all(
    LANGS.map(async l => {
      const r = await fetch(new URL('./' + l + '.json', import.meta.url));
      tables[l] = await r.json();
    }),
  );
}

export function setLang(l) {
  current = tables[l] ? l : 'en';
  document.documentElement.lang = current;
}

export const lang = () => current;

// t('a.b.c', {n: 1}) looks up a dotted key and fills {name} placeholders. Non-string
// values (arrays, objects) are returned as they are. A missing key is logged as an
// error, which the browser tests treat as a failure, and renders as the key itself.
export function t(key, vars) {
  const v = key.split('.').reduce((o, k) => (o == null ? o : o[k]), tables[current]);
  if (v === undefined) {
    console.error('i18n: missing "' + key + '" in ' + current);
    return key;
  }
  if (typeof v !== 'string' || !vars) return v;
  return v.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
}

// Static markup in index.html: data-i18n sets textContent, data-i18n-html sets innerHTML.
export function applyStatic(root = document) {
  root.querySelectorAll('[data-i18n]').forEach(e => (e.textContent = t(e.dataset.i18n)));
  root.querySelectorAll('[data-i18n-html]').forEach(e => (e.innerHTML = t(e.dataset.i18nHtml)));
  document.title = t('app.title');
}
