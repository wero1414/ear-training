import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { CHAPTERS } from '../../js/drills/chapters.js';
import { JAMP } from '../../js/theory/harmony.js';

const load = l => JSON.parse(readFileSync(new URL(`../../js/i18n/${l}.json`, import.meta.url), 'utf8'));
const en = load('en');

// [path, value] for every leaf.
const leaves = (o, p = '') =>
  typeof o === 'object' && o !== null
    ? Object.entries(o).flatMap(([k, v]) => leaves(v, p ? p + '.' + k : k))
    : [[p, o]];
const placeholders = s => (typeof s === 'string' ? [...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort() : []);
// Allowed to be empty: semitones with no conventional function name.
const MAY_BE_EMPTY = /^theory\.degreeSub\.\d+$/;
const SAME = new Set(JSON.parse(readFileSync(new URL('../../js/i18n/same-in-all.json', import.meta.url), 'utf8')).keys);

for (const lang of ['es']) {
  describe(`${lang}.json`, () => {
    const table = load(lang);
    const want = leaves(en),
      got = leaves(table);

    it('has exactly the keys of en.json', () => {
      expect(got.map(([p]) => p)).toEqual(want.map(([p]) => p));
    });

    it('uses the same placeholders in every string', () => {
      const byPath = Object.fromEntries(got);
      for (const [p, v] of want) expect(placeholders(byPath[p]), p).toEqual(placeholders(v));
    });

    it('translates every string not listed in same-in-all.json', () => {
      const enByPath = Object.fromEntries(want);
      expect(got.filter(([p, v]) => v === enByPath[p] && !SAME.has(p)).map(([p]) => p)).toEqual([]);
    });

    it('has no empty or untranslated-type values', () => {
      for (const [p, v] of got) {
        expect(typeof v, p).toBe('string');
        if (!MAY_BE_EMPTY.test(p)) expect(v.trim(), p).not.toBe('');
      }
    });
  });
}

it('names every stage, chapter and jam preset', () => {
  expect(en.chapters.map(c => c.stages.length)).toEqual(CHAPTERS.map(c => c.st.length));
  expect(en.jam.presets.length).toBe(JAMP.length);
});
