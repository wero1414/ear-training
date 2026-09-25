// Melodies for dictation, from a small phrase grammar instead of a random walk (a walk
// between scale degrees produces lines nobody would sing, so the dictation trains
// little). Rules:
//   - strong beats (even positions) take a chord tone of a simple plan: I at the start
//     and end, V before the end, IV before that;
//   - motion is stepwise about 70% of the time, leaps (a third to a fifth) otherwise;
//   - a leap is followed by a step in the opposite direction;
//   - the phrase ends on 1, 3 or 5, and never repeats a note back to back.
// Values are degree indices 0-6 into the key's scale.
export const CHORD_TONES = { I: [0, 2, 4], IV: [3, 5, 0], V: [4, 6, 1] };
const ENDINGS = [0, 2, 4];
const STEP_SHARE = 0.7;

// One chord per strong beat.
export function harmonyPlan(len) {
  const n = Math.ceil(len / 2);
  if (n === 1) return ['I'];
  const plan = ['I'];
  for (let i = 1; i < n - 1; i++) plan.push((n - 1 - i) % 2 ? 'V' : 'IV');
  plan.push('I');
  return plan;
}

// Draws every candidate once, each draw weighted, so search order follows the weights.
function weightedOrder(cands, rand) {
  const pool = cands.slice(),
    out = [];
  while (pool.length) {
    const total = pool.reduce((a, c) => a + c.w, 0);
    let r = rand() * total,
      k = 0;
    while (k < pool.length - 1 && (r -= pool[k].w) > 0) k++;
    out.push(pool.splice(k, 1)[0]);
  }
  return out;
}

export function phrase(len, rand = Math.random) {
  const plan = harmonyPlan(len);
  const out = [];

  const candidates = i => {
    const prev = out[i - 1],
      prev2 = out[i - 2],
      list = [];
    for (let d = 0; d <= 6; d++) {
      if (i > 0 && (d === prev || Math.abs(d - prev) > 4)) continue;
      if (i % 2 === 0 && !CHORD_TONES[plan[i >> 1]].includes(d)) continue;
      if (i === len - 1 && !ENDINGS.includes(d)) continue;
      if (i >= 2 && Math.abs(prev - prev2) >= 2 && d - prev !== -Math.sign(prev - prev2)) continue;
      list.push({ d, step: i > 0 && Math.abs(d - prev) === 1 });
    }
    if (i === 0) return list.map(c => ({ ...c, w: 1 }));
    const steps = list.filter(c => c.step).length,
      leaps = list.length - steps;
    // Split the step/leap shares across the candidates of each kind; if one kind has no
    // candidates the other takes everything.
    return list.map(c => ({
      ...c,
      w: c.step ? (leaps ? STEP_SHARE : 1) / steps : (steps ? 1 - STEP_SHARE : 1) / leaps,
    }));
  };

  const fill = i => {
    if (i === len) return true;
    for (const c of weightedOrder(candidates(i), rand)) {
      out[i] = c.d;
      if (fill(i + 1)) return true;
    }
    out.length = i;
    return false;
  };

  if (!fill(0)) throw new Error('no phrase of length ' + len);
  return out;
}
