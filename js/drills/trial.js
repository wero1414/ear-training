// The trial engine: builds a trial from the current spec, plays it, times it, grades
// the answer and advances either the scored stage run or the endless practice loop.
import { S, sv } from '../state/store.js';
import { el, pick } from '../util.js';
import { ALL12 } from '../theory/pitch.js';
import { PROG_BASIC } from '../theory/harmony.js';
import { noiseBurst, pickTimbre, sfx } from '../audio/instruments.js';
import { bump } from './adaptive.js';
import { KINDS, grade, statKey, truthOf } from './registry.js';
import { say, pop, flash, paintHUD } from '../ui/hud.js';
import { paintStats } from '../ui/stats.js';
import { endRun } from '../ui/stages.js';

export const session = { trial: null, run: null };
let tTimer = null,
  tStart = 0,
  pending = null;

// The follow-up to an answer (next trial, or the end of a run). There is only ever one,
// and abandon() cancels it, so a timeout from a session the user has left can never act
// on a later one.
function after(ms, fn) {
  clearTimeout(pending);
  pending = setTimeout(() => {
    pending = null;
    fn();
  }, ms);
}

// Drop the current trial and run, and everything scheduled for them.
export function abandon() {
  session.trial = null;
  session.run = null;
  stopTimer();
  clearTimeout(pending);
  pending = null;
}

function specOf() {
  if (session.run) return session.run.spec;
  return {
    kinds: S.kinds.length ? S.kinds : ['note'],
    pcs: S.pcs.length ? S.pcs : [0],
    ivls: S.ivls.length ? S.ivls : [7],
    chords: S.chords.length ? S.chords : ['maj', 'min'],
    scales: S.scales.length ? S.scales : ['ionian', 'aeolian'],
    invs: [0, 1, 2],
    degrees: S.chrom ? ALL12 : [0, 1, 2, 3, 4, 5, 6],
    progs: PROG_BASIC,
    dir: S.dir,
    arp: +S.arp,
    oct: [S.octLow, S.octHigh],
    reqOct: S.reqOct,
    keyMode: S.keyMode,
    keyQual: S.keyQual,
    melLen: +S.melLen,
    limit: +S.limit,
    timbre: S.timbre,
    chrom: S.chrom,
  };
}

export function makeTrial() {
  const sp = specOf();
  const kind = sp.kinds.length > 1 ? pick(sp.kinds) : sp.kinds[0];
  const lo = (sp.oct[0] + 1) * 12,
    hi = (sp.oct[1] + 1) * 12 + 11;
  const tb = pickTimbre(sp.timbre);
  const arp = sp.arp === 2 ? Math.random() < 0.5 : !!sp.arp;
  const trial = (session.trial = { kind, sp, timbre: tb, arp, done: false, sel: { pc: null, oct: null }, seq: [] });
  KINDS[kind].make(trial, sp, lo, hi);
  renderPlay();
  say(KINDS[kind].prompt, '');
  playTrial();
  startTimer(sp.limit);
  tStart = performance.now();
}

export function playTrial() {
  const trial = session.trial;
  if (!trial) return;
  const d = +S.dur,
    t = trial.kind === 'note' && S.mask ? (noiseBurst(0, 0.26), 0.4) : 0;
  KINDS[trial.kind].play(trial, t, d);
}

function startTimer(sec) {
  clearTimeout(tTimer);
  const bar = el('timer');
  if (!bar) return;
  const i = bar.firstElementChild;
  if (!sec) {
    bar.style.visibility = 'hidden';
    return;
  }
  bar.style.visibility = 'visible';
  i.className = '';
  i.style.transition = 'none';
  i.style.width = '100%';
  void i.offsetWidth; // force a reflow so the transition restarts from full width
  i.className = 'run';
  i.style.transitionDuration = sec + 's';
  i.style.width = '0%';
  tTimer = setTimeout(() => {
    if (session.trial && !session.trial.done) judge(null);
  }, sec * 1000);
}

export function stopTimer() {
  clearTimeout(tTimer);
  const bar = el('timer');
  if (!bar) return;
  const i = bar.firstElementChild,
    w = getComputedStyle(i).width;
  i.style.transition = 'none';
  i.style.width = w;
}

// `given` is null on timeout, {pc, oct} from the keyboard, or {v} from every other widget.
export function judge(given) {
  const trial = session.trial;
  if (!trial || trial.done) return;
  trial.done = true;
  stopTimer();
  const ms = performance.now() - tStart;
  const ok = given !== null && grade(trial, given);
  mark(given, ok);
  bump(trial.kind, statKey(trial), ok);
  const truth = truthOf(trial);
  if (given === null) say('Out of time \u2014 <b>' + truth + '</b>', 'bad');
  else if (ok) say('<b>' + truth + '</b>', 'ok');
  else say('No \u2014 <b>' + truth + '</b>', 'bad');
  sfx(ok ? 'ok' : 'bad');
  flash(ok);
  const run = session.run;
  if (run) {
    run.i++;
    if (ok) {
      run.combo++;
      const mult = Math.min(3, 1 + run.combo * 0.15);
      const speed = run.spec.limit ? Math.max(0, 1 - ms / (run.spec.limit * 1000)) : Math.max(0, 1 - ms / 14000);
      const pts = Math.round((100 + 120 * speed) * mult);
      run.score += pts;
      run.right++;
      pop('+' + pts, 'var(--teal)');
      if (run.combo >= 3) setTimeout(() => pop('\u00d7' + mult.toFixed(1), 'var(--gold)'), 140);
    } else {
      run.combo = 0;
      run.lives--;
      pop(given === null ? 'time' : '\u2715', 'var(--red)');
    }
    paintHUD(run);
    if (run.lives <= 0 || run.i >= run.spec.n) {
      after(1200, endRun);
      return;
    }
    after(ok ? 950 : 2000, () => {
      if (session.run) makeTrial();
    });
  } else {
    paintStats();
    after(ok ? 950 : 2300, () => {
      const t = session.trial;
      if (t && t.done && !session.run) makeTrial();
    });
  }
  sv();
}

function mark(given, ok) {
  const trial = session.trial,
    k = trial.kind;
  if (k === 'note') {
    document.querySelectorAll('.kb .k').forEach(x => {
      const pc = +x.dataset.pc;
      if (pc === trial.ans) x.classList.add(ok ? 'right' : 'target');
      else if (given && pc === given.pc) x.classList.add('wrong');
    });
    if (trial.reqOct)
      document.querySelectorAll('.octrow button[data-oct]').forEach(b => {
        if (+b.dataset.oct === trial.oct) b.classList.add('sel');
      });
  } else if (Array.isArray(trial.ans)) {
    document.querySelectorAll('.slot').forEach((s, i) => {
      if (given && given.v[i] !== trial.ans[i]) s.classList.add('err');
    });
    const truth = el('truthSlots');
    if (truth && !ok)
      truth.innerHTML = trial.ans
        .map(a => '<div class="slot full">' + KINDS[k].slotLabel(a, trial) + '</div>')
        .join('');
  } else {
    document.querySelectorAll('.grid button[data-v]').forEach(b => {
      const v = b.dataset.v;
      const same = '' + trial.ans === v;
      if (same) b.classList.add(ok ? 'right' : 'target');
      else if (given && '' + given.v === v) b.classList.add('wrong');
    });
  }
}

function renderPlay() {
  const host = el('answers');
  if (!host) return;
  host.innerHTML = '';
  const oc = el('octrow');
  if (oc) {
    oc.innerHTML = '';
    oc.hidden = true;
  }
  const trial = session.trial;
  if (!trial) return;
  KINDS[trial.kind].render(host, trial, trial.sp);
}
