// Rhythm material (labRhythm): one-bar 4/4 patterns built from one-beat cells, and
// tap-back grading. Durations are in sixteenths; onsets and taps in beats or seconds.
export const CELLS = {
  q: { durs: [4], glyph: '\u2669' }, // quarter
  ee: { durs: [2, 2], glyph: '\u266b' }, // two eighths
  ssss: { durs: [1, 1, 1, 1], glyph: '\u266c\u266c' }, // four sixteenths
  ess: { durs: [2, 1, 1], glyph: '\u266a\u266c' }, // eighth, two sixteenths
  sse: { durs: [1, 1, 2], glyph: '\u266c\u266a' }, // two sixteenths, eighth
};
export const LEVELS = { 1: ['q', 'ee'], 2: ['q', 'ee', 'ssss', 'ess', 'sse'] };

export function onsets(cells) {
  const out = [];
  let t = 0;
  for (const c of cells)
    for (const d of CELLS[c].durs) {
      out.push(t / 4);
      t += d;
    }
  return out;
}

// Four cells; a bar of plain quarters teaches nothing, so it is redrawn.
export function pattern(level, rand = Math.random) {
  const vocab = LEVELS[level] || LEVELS[2];
  let p;
  do p = Array.from({ length: 4 }, () => vocab[Math.floor(rand() * vocab.length)]);
  while (p.every(c => c === 'q'));
  return p;
}

// Half a sixteenth at the default 80 bpm: adjacent sixteenths stay distinguishable.
const TOLERANCE_S = 0.09;
// A constant early/late is latency (speaker, touch screen), not rhythm, so it is
// removed; beyond this it is more likely a misplaced subdivision.
const MAX_OFFSET_S = 0.15;

export function gradeTaps(expected, taps, { tol = TOLERANCE_S, maxOffset = MAX_OFFSET_S } = {}) {
  if (taps.length !== expected.length) return { ok: false, offsetMs: null, worstMs: null };
  const offset = taps.reduce((a, t, i) => a + t - expected[i], 0) / taps.length;
  const worst = Math.max(...taps.map((t, i) => Math.abs(t - expected[i] - offset)));
  return {
    ok: Math.abs(offset) <= maxOffset && worst <= tol,
    offsetMs: Math.round(offset * 1000),
    worstMs: Math.round(worst * 1000),
  };
}
