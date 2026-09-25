// Sing-back (labSing): answer by singing. The microphone feeds an AnalyserNode that is
// never connected to the output; each animation frame reads one window, estimates the
// pitch on this device (audio/pitch-detect.js) and throws the samples away. Nothing is
// recorded, stored or sent anywhere, and the permission panel says so before asking.
//
// A steady sung note is answered like a MIDI key (ui/midi.js), so degree answers are
// relative to the tonic modulo 12: singing in another octave is still correct.
import { S } from '../state/store.js';
import { el } from '../util.js';
import { t } from '../i18n/index.js';
import { fullName } from '../labels.js';
import { audio } from '../audio/context.js';
import { sounding } from '../audio/instruments.js';
import { WINDOW, createSingDetector, freqToMidi, yin } from '../audio/pitch-detect.js';
import { session } from '../drills/trial.js';
import { onMidiNote } from './midi.js';

export const singAvailable = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

let mic = null; // { stream, source, analyser, buf, frame }
let detector = null;
let trialSeen = null;

function status(key, vars) {
  const s = el('singStatus');
  if (s) {
    s.hidden = !key;
    s.textContent = key ? t('sing.' + key, vars) : '';
  }
}

function tick() {
  if (!mic) return;
  mic.frame = requestAnimationFrame(tick);
  const trial = session.trial;
  const now = performance.now();
  if (trial !== trialSeen) {
    trialSeen = trial;
    detector.reset(now);
    if (trial && !trial.done) status('listening');
  }
  if (!trial || trial.done) return;
  // The app's own playback would be graded as an answer; wait until it has finished.
  if (sounding()) {
    detector.reset(now);
    return;
  }
  mic.analyser.getFloatTimeDomainData(mic.buf);
  let e = 0;
  for (let i = 0; i < WINDOW; i++) e += mic.buf[i] * mic.buf[i];
  const level = Math.sqrt(e / WINDOW);
  const { freq, clarity } = yin(mic.buf, mic.analyser.context.sampleRate);
  detector.frame({ t: now, midi: freq ? freqToMidi(freq, S.a4) : 0, clarity, level });
}

function onState(e) {
  if (e.state === 'hold') status('hold', { note: fullName(e.midi) });
  else if (e.state === 'retry') {
    status('retry');
    detector.reset(performance.now());
  } else if (e.state === 'heard') {
    status('heard', { note: fullName(e.midi) });
    onMidiNote(e.midi);
  }
}

async function start() {
  const ac = audio();
  try {
    // Raw signal: the browser's voice processing smears pitch.
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
    const source = ac.createMediaStreamSource(stream);
    const analyser = ac.createAnalyser();
    analyser.fftSize = WINDOW;
    source.connect(analyser);
    mic = { stream, source, analyser, buf: new Float32Array(WINDOW), frame: 0 };
    detector = createSingDetector({ onState });
    trialSeen = undefined;
    status('listening');
    tick();
    paintButton();
  } catch {
    status('denied');
  }
}

export function stopSing() {
  if (!mic) return;
  cancelAnimationFrame(mic.frame);
  mic.stream.getTracks().forEach(tr => tr.stop());
  mic.source.disconnect();
  mic = null;
  status(null);
  paintButton();
}

function paintButton() {
  const b = el('btnSing');
  if (b) b.textContent = t(mic ? 'sing.stop' : 'sing.button');
}

// The panel that explains the microphone before the browser asks for it.
function askPermission() {
  const host = el('singPanel');
  if (!host) return;
  host.hidden = false;
  host.innerHTML =
    '<p>' +
    t('sing.why') +
    '</p><div class="row"><button class="play" id="singAllow">' +
    t('sing.allow') +
    '</button><button class="ghost" id="singCancel">' +
    t('sing.cancel') +
    '</button></div>';
  el('singAllow').onclick = () => {
    host.hidden = true;
    start();
  };
  el('singCancel').onclick = () => (host.hidden = true);
}

// Markup for the drill views: the Sing button, its panel and the status line.
export const singButton = () =>
  S.labSing && singAvailable()
    ? '<button class="ghost" id="btnSing">' + t(mic ? 'sing.stop' : 'sing.button') + '</button>'
    : '';
export const singArea = () =>
  S.labSing && singAvailable()
    ? '<div class="sing" id="singPanel" hidden></div><div class="hint" id="singStatus" hidden></div>'
    : '';

export function bindSing() {
  const b = el('btnSing');
  if (!b) return;
  b.onclick = () => (mic ? stopSing() : askPermission());
  if (mic) {
    trialSeen = undefined;
    status('listening');
  }
}
