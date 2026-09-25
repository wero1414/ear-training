// Computer-keyboard answers. Space replays (or starts), Enter advances practice,
// Backspace undoes a sequence entry, the home row plays notes, digits pick grid answers.
import { el } from '../util.js';
import { session, makeTrial, playTrial } from '../drills/trial.js';
import { selectOct, selectPc } from '../drills/note.js';

// Piano layout on the home row: white keys A S D F G H J, black keys W E T Y U.
const KEYMAP = { a: 0, w: 1, s: 2, e: 3, d: 4, f: 5, t: 6, g: 7, y: 8, h: 9, u: 10, j: 11 };

export function bindShortcuts() {
  document.addEventListener('keydown', e => {
    if (e.target.matches('input,select,textarea')) return;
    const trial = session.trial;
    if (e.code === 'Space') {
      e.preventDefault();
      trial ? playTrial() : el('btnPlay') && el('btnPlay').click();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!session.run && trial && trial.done) makeTrial();
      return;
    }
    if (!trial || trial.done) return;
    if (e.key === 'Backspace' && trial.seq.length) {
      e.preventDefault();
      // The first button in the sequence widget's row is undo.
      const b = [...document.querySelectorAll('.octrow button')][0];
      if (b) b.click();
      return;
    }
    if (trial.kind === 'note') {
      const pc = KEYMAP[e.key.toLowerCase()];
      if (pc !== undefined && trial.sp.pcs.includes(pc)) {
        e.preventDefault();
        selectPc(pc);
      }
      if (trial.reqOct && /^[1-7]$/.test(e.key)) {
        const o = +e.key;
        if (o >= trial.sp.oct[0] && o <= trial.sp.oct[1])
          selectOct(o, document.querySelectorAll('.octrow button[data-oct]'));
      }
    } else {
      const i = '1234567890-='.indexOf(e.key);
      if (i >= 0) {
        const btns = [...document.querySelectorAll('.grid button')];
        if (btns[i]) {
          e.preventDefault();
          btns[i].click();
        }
      }
    }
  });
}
