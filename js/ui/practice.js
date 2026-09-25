// Endless, unscored drilling driven by the Practice settings panel.
import { el } from '../util.js';
import { t } from '../i18n/index.js';
import { makeTrial, playTrial } from '../drills/trial.js';

export function showPractice() {
  el('setBox').hidden = false;
  el('view').innerHTML =
    '<div class="timer" id="timer" style="visibility:hidden"><i></i></div>' +
    '<div class="stage"><div class="row">' +
    '<button class="play" id="btnPlay">' +
    t('run.start') +
    '</button>' +
    '<button class="ghost" id="btnReplay" disabled>' +
    t('run.replay') +
    '</button>' +
    '<button class="ghost" id="btnSkip" disabled>' +
    t('run.skip') +
    '</button>' +
    '<div class="spacer"></div><span class="hint" id="kh">' +
    t('practice.keys') +
    '</span></div>' +
    '<div class="msg" id="msg">' +
    t('practice.ready') +
    '</div>' +
    '<div id="answers"></div><div class="octrow" id="octrow" hidden></div></div>';
  el('btnPlay').onclick = () => {
    el('btnReplay').disabled = false;
    el('btnSkip').disabled = false;
    makeTrial();
  };
  el('btnReplay').onclick = () => playTrial();
  el('btnSkip').onclick = () => makeTrial();
}
