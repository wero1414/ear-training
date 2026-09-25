// Jam tab: preset, key and tempo controls, the bar strip, and the chord-tone keyboard.
import { P, S, sv } from '../state/store.js';
import { el } from '../util.js';
import { t } from '../i18n/index.js';
import { ALL12 } from '../theory/pitch.js';
import { CH, chordMidis } from '../theory/chords.js';
import { CHSCALE, SC } from '../theory/scales.js';
import { JAMP } from '../theory/harmony.js';
import { degLabel, nn } from '../labels.js';
import { pickTimbre, playNote, playStack, sfx } from '../audio/instruments.js';
import { jam, jamBars, jamResume, jamStart, jamStop } from '../jam/engine.js';
import { buildMidi } from '../jam/midi-export.js';
import { bump } from '../drills/adaptive.js';
import { quality, record, today } from '../drills/srs.js';
import { gridUI } from './grid.js';
import { keyboard } from './keyboard.js';
import { paintStats } from './stats.js';

// Chord tones solid, the rest of the chord's scale outlined.
export function highlightBar(i) {
  document.querySelectorAll('.bar').forEach((x, j) => x.classList.toggle('on', j === i));
  const b = jam.bars[i];
  if (!b) return;
  const scaleKey = CHSCALE[b.q] || 'ionian';
  const chordRootPc = (S.jamKey + b.s) % 12;
  const sc = SC[scaleKey].iv.map(x => (chordRootPc + x) % 12);
  const ct = CH[b.q].iv.map(x => (chordRootPc + x) % 12);
  const now = el('jamNow');
  if (now)
    now.innerHTML = t('jam.now', {
      chord: nn(chordRootPc) + CH[b.q].s,
      root: nn(chordRootPc),
      scale: t('theory.scale.' + scaleKey).name,
      notes: sc.map(p => nn(p)).join('  '),
      tones: ct.map(p => nn(p)).join(' '),
    });
  document.querySelectorAll('#jamKb .k').forEach(k => {
    const pc = +k.dataset.pc;
    k.classList.toggle('ct', ct.includes(pc));
    k.classList.toggle('sc', !ct.includes(pc) && sc.includes(pc));
  });
}

export function showJam() {
  el('setBox').hidden = true;
  const h =
    '<div class="stage"><div class="row">' +
    '<button class="play" id="jamBtn">' +
    t('jam.play') +
    '</button>' +
    '<select id="jamPreset">' +
    JAMP.map(
      (x, i) =>
        '<option value="' + i + '"' + (i === S.jamPreset ? ' selected' : '') + '>' + t('jam.presets')[i] + '</option>',
    ).join('') +
    '</select>' +
    '<select id="jamKey">' +
    ALL12.map(i => '<option value="' + i + '"' + (i === S.jamKey ? ' selected' : '') + '>' + nn(i) + '</option>').join(
      '',
    ) +
    '</select>' +
    '</div><div class="row" style="margin-top:9px">' +
    '<span class="hint">' +
    t('jam.tempo') +
    '</span><input type="range" id="jamBpm" min="50" max="180" step="1" value="' +
    S.jamBpm +
    '" style="max-width:180px">' +
    '<span class="val" id="bpmVal">' +
    t('jam.bpm', { n: S.jamBpm }) +
    '</span>' +
    '<label class="hint"><input type="checkbox" id="jamDrums"' +
    (S.jamDrums ? ' checked' : '') +
    '> ' +
    t('jam.drums') +
    '</label>' +
    '<label class="hint"><input type="checkbox" id="jamBass"' +
    (S.jamBass ? ' checked' : '') +
    '> ' +
    t('jam.bass') +
    '</label>' +
    (S.labJamQuiz
      ? '<span class="hint">' +
        t('quiz.every') +
        '</span><select id="jamQuiz">' +
        [0, 4, 8, 16]
          .map(
            n =>
              '<option value="' +
              n +
              '"' +
              (n === +S.jamQuiz ? ' selected' : '') +
              '>' +
              (n ? t('quiz.bars', { n }) : t('practiceSettings.off')) +
              '</option>',
          )
          .join('') +
        '</select>'
      : '') +
    '<button class="mini" id="jamMidi">' +
    t('jam.exportMidi') +
    '</button></div>' +
    '<div class="bars" id="jamBars"></div>' +
    '<div class="now" id="jamNow">' +
    t('jam.help') +
    '</div>' +
    '<div id="jamQuizBox"></div>' +
    '<div id="jamKb"></div></div>';
  el('view').innerHTML = h;
  jam.bars = jamBars();
  el('jamBars').innerHTML = jam.bars
    .map(b => '<div class="bar">' + nn((S.jamKey + b.s) % 12) + CH[b.q].s + '<em>' + t('jam.oneBar') + '</em></div>')
    .join('');
  keyboard(el('jamKb'), null, (pc, oc) => playNote(48 + oc * 12 + pc, 0, 1.4, pickTimbre()), { octaves: 2 });
  el('jamBtn').onclick = () => (jam.on ? jamStop() : jamStart());
  el('jamPreset').onchange = e => {
    S.jamPreset = +e.target.value;
    sv();
    const was = jam.on;
    jamStop();
    showJam();
    if (was) jamStart();
  };
  el('jamKey').onchange = e => {
    S.jamKey = +e.target.value;
    sv();
    const was = jam.on;
    jamStop();
    showJam();
    if (was) jamStart();
  };
  el('jamBpm').oninput = e => {
    S.jamBpm = +e.target.value;
    el('bpmVal').textContent = t('jam.bpm', { n: S.jamBpm });
    sv();
  };
  el('jamDrums').onchange = e => {
    S.jamDrums = e.target.checked;
    sv();
  };
  el('jamBass').onchange = e => {
    S.jamBass = e.target.checked;
    sv();
  };
  el('jamMidi').onclick = exportMidi;
  const qs = el('jamQuiz');
  if (qs)
    qs.onchange = e => {
      S.jamQuiz = +e.target.value;
      jam.quiz = S.jamQuiz;
      sv();
    };
}

function exportMidi() {
  const bytes = buildMidi(jamBars(), S.jamKey, S.jamBpm);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([bytes], { type: 'audio/midi' }));
  a.download = JAMP[S.jamPreset].id + '-' + nn(S.jamKey).replace('#', 's') + '.mid';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

// labJamQuiz: the loop has stopped after the bar `bar` (index `idx`). Ask about whichever
// of its chord quality or bass degree is weaker in the stats; answers feed the same
// stats (and review cards) as the drills.
export function onQuiz(bar, idx) {
  const box = el('jamQuizBox');
  if (!box) return;
  highlightBar(idx);
  const weak = (b, k) => {
    const s = (P.stats[b] || {})[k];
    return !s || !s.n ? 0.5 : 1 - s.ok / s.n;
  };
  const kind = weak('chord', bar.q) >= weak('degree', bar.s) ? 'chord' : 'degree';
  const key = kind === 'chord' ? bar.q : bar.s;
  const chordLabel = c => nn((S.jamKey + c.s) % 12) + CH[c.q].s;
  let items, answer, truth;
  if (kind === 'chord') {
    const distinct = jam.bars.filter((c, i, all) => all.findIndex(d => d.s === c.s && d.q === c.q) === i);
    items = distinct.map((c, i) => ({ v: i, b: chordLabel(c) }));
    answer = distinct.findIndex(c => c.s === bar.s && c.q === bar.q);
    truth = chordLabel(bar);
  } else {
    const semis = [...new Set(jam.bars.map(c => c.s))].sort((a, b) => a - b);
    items = semis.map(s => ({ v: s, b: degLabel(s) }));
    answer = bar.s;
    truth = degLabel(bar.s) + '  (' + nn((S.jamKey + bar.s) % 12) + ')';
  }
  box.innerHTML =
    '<div class="msg" id="quizMsg">' +
    t('quiz.' + kind) +
    '</div><div id="quizAnswers"></div><div class="row" style="margin-top:10px">' +
    '<button class="ghost" id="quizReplay">' +
    t('quiz.replay') +
    '</button><button class="play" id="quizGo" hidden>' +
    t('quiz.continue') +
    '</button></div>';
  const started = performance.now();
  let done = false;
  gridUI(el('quizAnswers'), items, 'tight', v => {
    if (done) return;
    done = true;
    const ok = v === answer;
    bump(kind, key, ok);
    if (S.labSrs) {
      const cards = P.srs[kind] || (P.srs[kind] = {});
      cards[key] = record(cards[key], quality({ ok, ms: performance.now() - started }), today());
    }
    sv();
    box.querySelectorAll('.grid button').forEach(b => {
      if (+b.dataset.v === answer) b.classList.add(ok ? 'right' : 'target');
      else if (+b.dataset.v === v) b.classList.add('wrong');
    });
    const msg = el('quizMsg');
    msg.innerHTML = ok ? '<b>' + truth + '</b>' : t('trial.wrong', { truth });
    msg.className = 'msg ' + (ok ? 'ok' : 'bad');
    sfx(ok ? 'ok' : 'bad');
    paintStats();
    el('quizGo').hidden = false;
  });
  el('quizReplay').onclick = () => {
    const root = 48 + ((S.jamKey + bar.s) % 12);
    playStack(chordMidis(root, bar.q, 0), 0, 1.4, 'rhodes', false, 0.55);
    playNote(root - 12, 0, 1.4, 'bass', 0.7);
  };
  el('quizGo').onclick = () => {
    box.innerHTML = '';
    jamResume();
  };
}
