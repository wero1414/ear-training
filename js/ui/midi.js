// Web MIDI input (labMidi). A note-on is turned into a press of the matching answer
// button, so grading and feedback stay in one place. Covered drills: note, degree,
// melody, interval (two keys in a row). Browsers without Web MIDI (Safari) never see
// the setting at all.
import { pitchClass } from '../theory/pitch.js';
import { degreeToSemitone, drillScale } from '../theory/scales.js';
import { judge, session } from '../drills/trial.js';

export const midiAvailable = () => typeof navigator.requestMIDIAccess === 'function';

let access = null;
let first = null; // pending first key of an interval: { note, at }
const INTERVAL_WINDOW_MS = 2000;

const press = selector => {
  const b = document.querySelector(selector);
  if (b && !b.disabled) b.click();
  return !!b;
};

function answerDegree(trial, note, scale) {
  const semi = pitchClass(note - trial.key.pc);
  const degs = [...document.querySelectorAll('#answers .grid button[data-v]')].map(b => +b.dataset.v);
  const d = degs.find(x => degreeToSemitone(x, scale) === semi);
  if (d !== undefined) press(`#answers .grid button[data-v="${d}"]`);
  // A note outside the choices is a wrong answer in a single-degree question.
  else if (trial.kind === 'degree') judge({ v: 'midi:' + semi });
}

export function onMidiNote(note) {
  const trial = session.trial;
  if (!trial || trial.done) return;
  if (trial.kind === 'note') {
    if (trial.reqOct) press(`#octrow button[data-oct="${Math.floor(note / 12) - 1}"]`);
    press(`#answers .kb .k[data-pc="${pitchClass(note)}"]`);
  } else if (trial.kind === 'degree') answerDegree(trial, note, drillScale(trial.sp, trial.key.minor));
  else if (trial.kind === 'melody') answerDegree(trial, note, trial.scale);
  else if (trial.kind === 'interval') {
    const now = performance.now();
    if (!first || now - first.at > INTERVAL_WINDOW_MS) {
      first = { note, at: now };
      return;
    }
    const size = Math.abs(note - first.note);
    first = null;
    if (!press(`#answers .grid button[data-v="${size}"]`)) judge({ v: 'midi:' + size });
  }
}

function onMessage(e) {
  const [status, note, velocity] = e.data;
  // Note-on with velocity 0 is a note-off by convention.
  if ((status & 0xf0) === 0x90 && velocity > 0) onMidiNote(note);
}

function listen() {
  for (const input of access.inputs.values()) input.onmidimessage = onMessage;
}

export async function setMidi(on) {
  if (!midiAvailable()) return;
  if (!on) {
    if (access) for (const input of access.inputs.values()) input.onmidimessage = null;
    return;
  }
  try {
    access = access || (await navigator.requestMIDIAccess());
    listen();
    // Controllers plugged in later.
    access.onstatechange = listen;
  } catch (e) {
    console.warn('MIDI unavailable', e);
  }
}
