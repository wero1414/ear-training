// The one AudioContext for the page, and the master graph:
//   voice -> bus -> limiter -> destination
//   voice -> send -> convolver (generated IR) -> bus
import { S } from '../state/store.js';

export let ac = null;
export let bus = null;
export let send = null;

export function audio() {
  if (!ac) {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    // A safety limiter, not an effect: a 6-note stack at full volume clips on mobile without it.
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -11;
    comp.knee.value = 20;
    comp.ratio.value = 8;
    comp.attack.value = 0.003;
    comp.release.value = 0.25;
    comp.connect(ac.destination);
    bus = ac.createGain();
    bus.gain.value = 1;
    bus.connect(comp);
    const verb = ac.createConvolver();
    verb.buffer = makeIR(2.2, 3.0);
    const wet = ac.createGain();
    wet.gain.value = 1;
    verb.connect(wet);
    wet.connect(bus);
    send = ac.createGain();
    send.gain.value = S.rev;
    send.connect(verb);
  }
  // 'suspended' before the first gesture or when hidden; 'interrupted' on iOS after a
  // call or Siri. Both need resume().
  if (ac.state !== 'running') ac.resume().catch(() => {});
  return ac;
}

// Synthetic reverb impulse: lowpassed stereo noise under a (1 - t)^decay envelope with a
// 12 ms fade-in, so no impulse file ships.
function makeIR(dur, decay) {
  const sr = ac.sampleRate,
    len = (sr * dur) | 0,
    b = ac.createBuffer(2, len, sr);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const t = i / len;
      lp = lp * 0.72 + (Math.random() * 2 - 1) * 0.28;
      d[i] = lp * Math.pow(1 - t, decay) * (i < sr * 0.012 ? i / (sr * 0.012) : 1);
    }
  }
  return b;
}

export function setReverb(v) {
  if (send) send.gain.value = v;
}

// Lifecycle. The context starts suspended and may only start inside a user gesture;
// iOS also parks it in 'interrupted' after a call or Siri, and browsers suspend it when
// the page is hidden. Any gesture unlocks or recovers it, and returning to the page
// resumes it where the browser allows.
function wake() {
  if (ac && ac.state !== 'running' && document.visibilityState === 'visible') ac.resume().catch(() => {});
}

function onGesture() {
  audio();
  mediaChannel(S.iosMediaChannel);
}

export function installLifecycle() {
  for (const ev of ['pointerdown', 'keydown', 'touchend'])
    document.addEventListener(ev, onGesture, { capture: true, passive: true });
  document.addEventListener('visibilitychange', wake);
  window.addEventListener('pageshow', wake);
  window.addEventListener('focus', wake);
}

// iOS Safari plays Web Audio on the ringer channel, so the hardware mute switch silences
// the app. A playing <audio> element moves the page's audio to the media channel. This
// loop of generated silence does that; it looks like dead code and is not. It must start
// inside a user gesture, hence onGesture(). navigator.audioSession, where the browser
// has it, requests the same thing directly.
export const isIOS = () =>
  /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

let silence = null;

function silentWav() {
  // 0.5 s of 16-bit mono PCM at 8 kHz, all zeros: a valid WAV with nothing in it.
  const rate = 8000,
    n = rate / 2,
    buf = new DataView(new ArrayBuffer(44 + n * 2));
  const str = (o, s) => [...s].forEach((c, i) => buf.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF');
  buf.setUint32(4, 36 + n * 2, true);
  str(8, 'WAVEfmt ');
  buf.setUint32(16, 16, true);
  buf.setUint16(20, 1, true);
  buf.setUint16(22, 1, true);
  buf.setUint32(24, rate, true);
  buf.setUint32(28, rate * 2, true);
  buf.setUint16(32, 2, true);
  buf.setUint16(34, 16, true);
  str(36, 'data');
  buf.setUint32(40, n * 2, true);
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
}

export function mediaChannel(on) {
  if (!isIOS()) return;
  if (navigator.audioSession) navigator.audioSession.type = on ? 'playback' : 'auto';
  if (on) {
    if (!silence) {
      silence = document.createElement('audio');
      silence.src = silentWav();
      silence.loop = true;
      silence.setAttribute('playsinline', '');
      silence.id = 'mediaChannel';
    }
    if (silence.paused) silence.play().catch(() => {});
  } else if (silence) silence.pause();
}
