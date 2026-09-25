import { PROGRESS_SCHEMA, localeDefaults, migrateProgress, upgradeSettings } from './migrate.js';

export const DEFS = {
  a4: 440,
  timbre: 'rhodes',
  vol: 0.55,
  rev: 0.26,
  dur: 1.5,
  mask: true,
  sfx: true,
  adaptive: true,
  kinds: ['note'],
  pcs: [0, 4, 7],
  ivls: [3, 4, 5, 7, 12],
  chords: ['maj', 'min', 'maj7', 'dom7', 'min7'],
  scales: ['ionian', 'aeolian', 'dorian', 'mixolydian'],
  dir: 'asc',
  arp: 0,
  octLow: 3,
  octHigh: 5,
  reqOct: false,
  keyMode: 'fixed',
  keyQual: 'maj',
  melLen: 4,
  chrom: false,
  limit: 0,
  jamKey: 0,
  jamPreset: 0,
  jamBpm: 82,
  jamDrums: true,
  jamBass: true,
  iosMediaChannel: true,
  ...localeDefaults(navigator.language),
};
export const DEFP = { xp: 0, stars: {}, best: {}, stats: {}, days: 0, last: '', schema: PROGRESS_SCHEMA };

function ldj(k, d, migrate = x => x) {
  try {
    const v = localStorage.getItem(k);
    return v ? Object.assign({}, d, migrate(JSON.parse(v))) : Object.assign({}, d);
  } catch {
    return Object.assign({}, d);
  }
}

export const S = ldj('pe.set', DEFS, upgradeSettings);
// Reassigned by resetProgress(); importers see the new object through the live binding.
export let P = ldj('pe.prog', DEFP, migrateProgress);
if (!P.stats) P.stats = {};

export function sv() {
  try {
    localStorage.setItem('pe.set', JSON.stringify(S));
    localStorage.setItem('pe.prog', JSON.stringify(P));
  } catch {
    // Private mode or a full quota: keep running on in-memory state.
  }
}

// Replace settings and progress wholesale (progress import). Settings keep the object
// identity every module imported; missing keys fall back to the defaults.
export function replaceAll(settings, progress) {
  for (const k of Object.keys(S)) delete S[k];
  Object.assign(S, DEFS, settings);
  P = Object.assign({}, DEFP, progress);
}

export function resetProgress() {
  P = Object.assign({}, DEFP, { stars: {}, best: {}, stats: {} });
}

// Level n starts at 60 * (n - 1)^2 xp.
export const lvlOf = xp => Math.floor(Math.sqrt(xp / 60)) + 1;
export const xpFor = l => Math.round(60 * (l - 1) * (l - 1));

// Daily streak, keyed by UTC date.
export function touchDay() {
  const d = new Date(),
    k = d.toISOString().slice(0, 10);
  if (P.last === k) return;
  const y = new Date(d.getTime() - 864e5).toISOString().slice(0, 10);
  P.days = P.last === y ? P.days + 1 : 1;
  P.last = k;
}
