// Stored progress (`pe.prog`) schema. Bump PROGRESS_SCHEMA and add a step below whenever
// the stored shape or meaning changes; data without `schema` is version 1.
import { DIA_MAJ } from '../theory/scales.js';

export const PROGRESS_SCHEMA = 2;

// v1 keyed degree stats by degree index (0-6) in diatonic drills and by semitone (0-11)
// in chromatic ones, in the same bucket, for major and minor keys alike. v2 keys every
// degree stat by semitone above the tonic. A v1 key below 7 cannot be disambiguated; it
// is read as a major-scale degree index, which is how v1 displayed it, so existing rows
// keep their labels. Rows that land on the same semitone are merged.
function v1to2(p) {
  const old = p.stats && p.stats.degree;
  if (old) {
    const next = {};
    for (const [k, s] of Object.entries(old)) {
      const semi = /^[0-6]$/.test(k) ? DIA_MAJ[+k] : k;
      const t = next[semi] || (next[semi] = { n: 0, ok: 0 });
      t.n += s.n;
      t.ok += s.ok;
    }
    p.stats.degree = next;
  }
  p.schema = 2;
}

export function migrateProgress(p) {
  if (!p.schema || p.schema < 2) v1to2(p);
  return p;
}

// Defaults that depend on the device language. Spanish is the default for every es*
// locale (not a fallback), with fixed-do note names; everything else gets English and
// letter names. Degree labels default to numbers in both.
export function localeDefaults(language) {
  const es = /^es(-|$)/i.test(language || '');
  return { lang: es ? 'es' : 'en', naming: es ? 'solf' : 'sharp', degNaming: 'num' };
}

// Stored settings (`pe.set`) from before degree labels had their own setting: Do-Re-Mi
// note names used to switch degrees to movable-do syllables too, so keep that for them.
export function upgradeSettings(s) {
  if (s.degNaming === undefined) s.degNaming = s.naming === 'solf' ? 'movable' : 'num';
  return s;
}
