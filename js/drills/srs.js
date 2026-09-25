// SM-2 spaced repetition (Wozniak, SuperMemo 2), one card per drill item (the same
// kind/key pairs the accuracy stats use). Dates are local calendar days, YYYY-MM-DD.
//   interval: 1 day, then 6, then previous interval x EF
//   EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)), never below 1.3
//   q < 3 restarts the repetitions and leaves EF unchanged
//   intervals are capped at MAX_INTERVAL
export const NEW_CARD = { ef: 2.5, reps: 0, interval: 0, due: null, history: [] };
const HISTORY = 20;
// Unbounded, the interval grows by EF per success and overflows the calendar; a year is
// plenty for ear-training items.
const MAX_INTERVAL = 365;

export function addDays(day, n) {
  const [y, m, d] = day.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

export function today(now = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return now.getFullYear() + '-' + p(now.getMonth() + 1) + '-' + p(now.getDate());
}

export const isDue = (card, day) => !card || !card.due || card.due <= day;

// 5: correct and quick, 4: correct, 1: wrong, 0: no answer in time.
export function quality({ ok, ms, timeout }) {
  if (timeout) return 0;
  if (!ok) return 1;
  return ms < 3000 ? 5 : 4;
}

export function review(card, q, day) {
  const c = { ...NEW_CARD, ...card };
  let { ef, reps, interval } = c;
  if (q < 3) {
    reps = 0;
    interval = 1;
  } else {
    reps += 1;
    interval = Math.min(MAX_INTERVAL, reps === 1 ? 1 : reps === 2 ? 6 : Math.round(interval * ef));
    ef = Math.max(1.3, ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
  }
  const history = [...c.history, { d: day, q }].slice(-HISTORY);
  return { ef, reps, interval, due: addDays(day, interval), history };
}

// SM-2 schedules one review per day. Answers on due (or new) items advance the card;
// on items not yet due only a failure counts, bringing the item back tomorrow.
export function record(card, q, day) {
  if (isDue(card, day) || q < 3) return review(card, q, day);
  return card;
}

// Selection weight in drills: overdue items first, then new ones, then the rest rarely.
export function srsWeight(card, day) {
  if (!card || !card.due) return 3;
  if (card.due <= day) {
    const late = (Date.parse(day) - Date.parse(card.due)) / 864e5;
    return 5 + Math.min(late, 10);
  }
  return 0.3;
}
