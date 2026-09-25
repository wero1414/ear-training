import { rnd, el } from '../util.js';
import { t } from '../i18n/index.js';
import { fullName, nn } from '../labels.js';
import { freqOf, playNote } from '../audio/instruments.js';
import { keyboard } from '../ui/keyboard.js';
import { say } from '../ui/hud.js';
import { guard, weighted } from './adaptive.js';
import { judge, session } from './trial.js';

export function make(trial, sp) {
  const pcs = sp.pcs;
  let pc,
    g = 0;
  do pc = weighted(pcs, 'note');
  while (pcs.length > 1 && pc === guard.last && g++ < 8);
  guard.last = pc;
  const oct = sp.oct[0] + rnd(sp.oct[1] - sp.oct[0] + 1);
  Object.assign(trial, { midis: [(oct + 1) * 12 + pc], ans: pc, oct, reqOct: !!sp.reqOct });
}

export function play(trial, t, d) {
  playNote(trial.midis[0], t, d, trial.timbre);
}

export const grade = (trial, given) => given.pc === trial.ans && (!trial.reqOct || given.oct === trial.oct);

export const truth = tr => t('truth.note', { note: fullName(tr.midis[0]), hz: freqOf(tr.midis[0]).toFixed(1) });

export const statLabel = key => nn(+key);

// Picking a pitch class first and then an octave (or the reverse) when the octave is required.
export function selectPc(pc) {
  const trial = session.trial;
  trial.sel.pc = pc;
  if (trial.reqOct && trial.sel.oct === null) {
    document.querySelectorAll('.kb .k').forEach(x => x.classList.toggle('target', +x.dataset.pc === pc));
    say(t('trial.nowOctave'), '');
    return;
  }
  judge({ pc, oct: trial.sel.oct });
}

export function selectOct(o, row) {
  const trial = session.trial;
  trial.sel.oct = o;
  row.forEach(x => x.classList.toggle('sel', +x.dataset.oct === o));
  if (trial.sel.pc !== null) judge({ pc: trial.sel.pc, oct: o });
}

export function render(host, trial, sp) {
  keyboard(host, sp.pcs, pc => {
    const t = session.trial;
    if (!t || t.done) return;
    selectPc(pc);
  });
  if (trial.reqOct) octRow();
}

function octRow() {
  const row = el('octrow');
  row.hidden = false;
  const l = document.createElement('span');
  l.className = 'hint';
  l.textContent = t('trial.octave');
  row.appendChild(l);
  const trial = session.trial;
  for (let o = trial.sp.oct[0]; o <= trial.sp.oct[1]; o++) {
    const b = document.createElement('button');
    b.textContent = o;
    b.dataset.oct = o;
    b.onclick = () => {
      const t = session.trial;
      if (!t || t.done) return;
      selectOct(o, row.querySelectorAll('button'));
    };
    row.appendChild(b);
  }
}
