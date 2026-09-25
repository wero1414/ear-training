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
  if (ac.state === 'suspended') ac.resume();
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
