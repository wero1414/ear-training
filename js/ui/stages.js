// Stage map, the scored stage run, and its result screen.
import { S, P, sv, touchDay } from '../state/store.js';
import { el } from '../util.js';
import { t } from '../i18n/index.js';
import { ALL12, ALLIVL } from '../theory/pitch.js';
import { PROG_BASIC } from '../theory/harmony.js';
import { sfx } from '../audio/instruments.js';
import { CHAPTERS } from '../drills/chapters.js';
import { abandon, dueCount, session, makeTrial, playTrial, stopTimer } from '../drills/trial.js';
import { paintHUD, paintTop, say } from './hud.js';
import { paintStats } from './stats.js';
import { go } from '../main.js';

const skey = (c, s) => 'c' + c + 's' + s;
// A stage opens once the previous stage in its chapter has at least one star.
const unlocked = (c, s) => s === 0 || (P.stars[skey(c, s - 1)] || 0) > 0;

export function showMap() {
  el('setBox').hidden = true;
  let h = '';
  if (S.labSrs) {
    const n = dueCount();
    h +=
      '<div class="due"><span>' +
      (n ? t('srs.due', { n }) : t('srs.none')) +
      '</span>' +
      (n ? '<button class="mini" id="btnReview">' + t('srs.review') + '</button>' : '') +
      '</div>';
  }
  CHAPTERS.forEach((ch, ci) => {
    const got = ch.st.reduce((a, _, si) => a + (P.stars[skey(ci, si)] || 0), 0);
    h +=
      '<div class="chap"><b>' +
      t('chapters')[ci].title +
      '</b><span class="cs">' +
      got +
      ' / ' +
      ch.st.length * 3 +
      ' \u2605</span></div><div class="stages">';
    ch.st.forEach((s, si) => {
      const st = P.stars[skey(ci, si)] || 0,
        open = unlocked(ci, si);
      h +=
        '<button class="tile' +
        (st ? ' done' : '') +
        '" data-c="' +
        ci +
        '" data-s="' +
        si +
        '"' +
        (open ? '' : ' disabled') +
        '>' +
        '<div class="no">' +
        (open ? String(si + 1).padStart(2, '0') : t('map.locked')) +
        '</div>' +
        '<div class="ti">' +
        t('chapters')[ci].stages[si] +
        '</div>' +
        '<div class="stars">' +
        [0, 1, 2].map(k => '<span class="' + (k < st ? 'on' : '') + '">\u2605</span>').join('') +
        '</div>' +
        '<div class="meta">' +
        t('map.questions', { n: s.n }) +
        (s.limit ? '  \u00b7  ' + t('map.limit', { n: s.limit }) : '') +
        (P.best[skey(ci, si)] ? '  \u00b7  ' + P.best[skey(ci, si)] : '') +
        '</div></button>';
    });
    h += '</div>';
  });
  el('view').innerHTML = h;
  el('view')
    .querySelectorAll('[data-c]')
    .forEach(b => (b.onclick = () => startRun(+b.dataset.c, +b.dataset.s)));
  const rv = el('btnReview');
  if (rv)
    rv.onclick = () => {
      const n = dueCount();
      go('practice');
      session.review = true;
      say(t('srs.reviewing', { n }), '');
    };
}

function startRun(ci, si) {
  const s = CHAPTERS[ci].st[si];
  const spec = {
    kinds: s.k,
    pcs: s.pcs || ALL12,
    ivls: s.ivls || ALLIVL,
    chords: s.chords || ['maj', 'min', 'maj7', 'dom7', 'min7'],
    scales: s.scales || ['ionian', 'aeolian'],
    invs: s.invs || [0],
    degrees: s.degrees || [0, 1, 2, 3, 4, 5, 6],
    progs: s.progs || PROG_BASIC,
    dir: s.dir || 'asc',
    arp: s.arp || 0,
    oct: s.oct || [3, 5],
    reqOct: !!s.reqOct,
    keyMode: s.keyMode || 'fixed',
    keyQual: s.keyQual || 'maj',
    melLen: s.melLen || 4,
    chrom: !!s.chrom,
    limit: s.limit || 0,
    timbre: s.timbre || S.timbre,
    n: s.n,
  };
  session.run = { ci, si, spec, i: 0, right: 0, score: 0, combo: 0, lives: 3 };
  el('setBox').hidden = true;
  el('view').innerHTML =
    '<div class="hud"><div><div class="nm">' +
    t('chapters')[ci].stages[si] +
    '</div><div class="q" id="hq"></div></div>' +
    '<div class="spacer"></div><div class="hearts" id="hh"></div>' +
    '<div class="combo" id="hc"></div><div class="score" id="hs">0</div></div>' +
    '<div class="timer" id="timer"><i></i></div>' +
    '<div class="stage"><div class="row">' +
    '<button class="play" id="btnPlay">' +
    t('run.start') +
    '</button>' +
    '<button class="ghost" id="btnReplay" disabled>' +
    t('run.replay') +
    '</button>' +
    '<button class="ghost" id="btnQuit">' +
    t('run.quit') +
    '</button>' +
    '<div class="spacer"></div><span class="hint" id="kh"></span></div>' +
    '<div class="msg" id="msg">' +
    t('run.ready') +
    '</div>' +
    '<div id="answers"></div><div class="octrow" id="octrow" hidden></div></div>';
  el('btnPlay').onclick = () => {
    el('btnPlay').disabled = true;
    el('btnReplay').disabled = false;
    makeTrial();
  };
  el('btnReplay').onclick = () => playTrial();
  el('btnQuit').onclick = () => {
    abandon();
    go('map');
  };
  el('timer').style.visibility = 'hidden';
  el('kh').textContent = s.k[0] === 'note' ? t('run.keysNote') : t('run.keysGrid');
  paintHUD(session.run);
}

// Clearing needs 70% with hearts left; 85% and 95% earn the second and third star.
export function endRun() {
  const r = session.run;
  session.run = null;
  session.trial = null;
  stopTimer();
  const acc = r.i ? r.right / r.i : 0;
  const cleared = r.lives > 0 && acc >= 0.7;
  const stars = !cleared ? 0 : acc >= 0.95 ? 3 : acc >= 0.85 ? 2 : 1;
  const k = skey(r.ci, r.si);
  if (stars > (P.stars[k] || 0)) P.stars[k] = stars;
  if (!P.best[k] || r.score > P.best[k]) P.best[k] = r.score;
  const gained = Math.round(r.score / 12) + stars * 40;
  P.xp += gained;
  touchDay();
  sv();
  sfx(cleared ? 'clear' : 'fail');
  const last = r.si + 1 >= CHAPTERS[r.ci].st.length;
  el('view').innerHTML =
    '<div class="stage result">' +
    '<div class="burst">' +
    [0, 1, 2]
      .map((x, i) => '<i class="' + (x < stars ? 'on' : '') + '" style="animation-delay:' + i * 160 + 'ms">\u2605</i>')
      .join('') +
    '</div>' +
    '<div class="big">' +
    r.score +
    '</div>' +
    '<div class="sub">' +
    t('result.summary', { right: r.right, total: r.i, pct: Math.round(acc * 100), xp: gained }) +
    '</div>' +
    '<div class="sub" style="margin-top:8px;color:' +
    (cleared ? 'var(--teal)' : 'var(--red)') +
    '">' +
    t(
      cleared
        ? stars === 3
          ? 'result.mastered'
          : 'result.cleared'
        : r.lives <= 0
          ? 'result.outOfHearts'
          : 'result.below',
    ) +
    '</div>' +
    '<div class="row" style="justify-content:center;margin-top:16px">' +
    '<button class="play" id="rAgain">' +
    t('result.again') +
    '</button>' +
    (cleared && !last ? '<button class="ghost" id="rNext">' + t('result.next') + '</button>' : '') +
    '<button class="ghost" id="rMap">' +
    t('result.map') +
    '</button></div></div>';
  el('rAgain').onclick = () => startRun(r.ci, r.si);
  const nx = el('rNext');
  if (nx) nx.onclick = () => startRun(r.ci, r.si + 1);
  el('rMap').onclick = () => go('map');
  paintTop();
  paintStats();
}
