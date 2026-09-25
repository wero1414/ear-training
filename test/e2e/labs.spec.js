// Phase 2 features behind the Experimental flags, exercised through the UI.
import { test, expect } from '@playwright/test';
import { AUDIO_CLOCK, PRNG, watch } from './helpers.js';
import { readFileSync } from 'node:fs';

const EN = JSON.parse(readFileSync('js/i18n/en.json', 'utf8'));

async function practice(page, kind, flags = []) {
  await page.addInitScript(PRNG);
  await page.goto('./');
  await page.click('#labBox summary');
  for (const f of flags) await page.check('#' + f);
  await page.click('#nav-practice');
  await page.click('#setBox summary');
  const chips = page.locator('#kindChips button');
  await chips
    .nth(['note', 'interval', 'chord', 'inv', 'degree', 'melody', 'prog', 'cadence', 'scale'].indexOf(kind))
    .click();
  await chips.nth(0).click();
}

test('labMelody: dictated melodies end on 1, 3 or 5 and never repeat a note', async ({ page }) => {
  const problems = watch(page);
  await page.clock.install();
  await practice(page, 'melody', ['labMelody']);
  await page.selectOption('#melLen', '6');
  await page.click('#btnPlay');
  for (let i = 0; i < 12; i++) {
    const len = await page.locator('#answers .slots').first().locator('.slot').count();
    for (let k = 0; k < len; k++) await page.locator('#answers .grid button').first().click();
    const seq = (await page.locator('#msg b').textContent()).split('   ')[0].split(' ');
    expect(seq).toHaveLength(6);
    expect(['1', '3', '5']).toContain(seq.at(-1));
    for (let k = 1; k < seq.length; k++) expect(seq[k]).not.toBe(seq[k - 1]);
    await page.clock.runFor(2500);
  }
  expect(problems).toEqual([]);
});

test('labMelody: minor-key practice asks minor and modal progressions', async ({ page }) => {
  await page.clock.install();
  await practice(page, 'prog', ['labMelody']);
  await page.selectOption('#keyQual', 'min');
  await page.click('#btnPlay');
  const buttons = await page.locator('#answers .grid button').allTextContents();
  expect(buttons).toContain('i');
  expect(buttons).toContain('iv');
  expect(buttons).not.toContain('I');
  expect(await page.locator('#msg').textContent()).toBeTruthy();
});

test('without the flag, progressions stay major', async ({ page }) => {
  await practice(page, 'prog');
  await page.selectOption('#keyQual', 'min');
  await page.click('#btnPlay');
  const buttons = await page.locator('#answers .grid button').allTextContents();
  expect(buttons).toContain('I');
  expect(buttons).not.toContain('i');
});

test('labSrs: answers create review cards, and due cards drive the Review button', async ({ page }) => {
  const problems = watch(page);
  await page.clock.install();
  await practice(page, 'interval', ['labSrs']);
  await page.click('#btnPlay');
  await page.locator('#answers .grid button').first().click();
  const prog = await page.evaluate(() => JSON.parse(localStorage.getItem('pe.prog')));
  const cards = Object.values(prog.srs.interval);
  expect(cards).toHaveLength(1);
  expect(cards[0]).toMatchObject({ reps: expect.any(Number), interval: 1, history: [{ q: expect.any(Number) }] });

  // A chord card that was due yesterday.
  await page.evaluate(() => {
    const p = JSON.parse(localStorage.getItem('pe.prog'));
    p.srs.chord = { dim7: { ef: 2.5, reps: 2, interval: 6, due: '2000-01-01', history: [] } };
    localStorage.setItem('pe.prog', JSON.stringify(p));
  });
  await page.reload();
  await expect(page.locator('.due')).toContainText('1');
  await page.click('#btnReview');
  await expect(page.locator('#nav-practice')).toHaveAttribute('aria-selected', 'true');
  await page.click('#btnPlay');
  // Practice is set to notes only; review drills the kind that is due.
  const symbols = await page.locator('#answers .grid button b').allTextContents();
  expect(symbols).toContain('\u00b07');
  expect(problems).toEqual([]);
});

test('without labSrs no review cards are recorded', async ({ page }) => {
  await practice(page, 'interval');
  await page.click('#btnPlay');
  await page.locator('#answers .grid button').first().click();
  const prog = await page.evaluate(() => JSON.parse(localStorage.getItem('pe.prog')));
  expect(prog.srs).toEqual({});
  await page.click('#nav-map');
  await expect(page.locator('.due')).toHaveCount(0);
});

// A fake controller: window.__key(note) sends a note-on through Web MIDI.
const FAKE_MIDI = () => {
  const input = { onmidimessage: null };
  navigator.requestMIDIAccess = () => Promise.resolve({ inputs: new Map([['fake', input]]), onstatechange: null });
  window.__key = note => input.onmidimessage && input.onmidimessage({ data: new Uint8Array([0x90, note, 100]) });
};

async function midiPractice(page, kind, flags = ['labMidi']) {
  await page.addInitScript(FAKE_MIDI);
  await practice(page, kind, flags);
  await page.click('#btnPlay');
}

const marked = (page, sel) =>
  page.locator(sel).evaluate(b => b.classList.contains('right') || b.classList.contains('wrong'));

test('labMidi: a key answers the note drill', async ({ page }) => {
  await midiPractice(page, 'note');
  await page.evaluate(() => window.__key(64)); // E4
  expect(await marked(page, '#answers .kb .k[data-pc="4"]')).toBe(true);
});

test('labMidi: a key answers the degree drill relative to the key', async ({ page }) => {
  await midiPractice(page, 'degree');
  await page.evaluate(() => window.__key(64)); // E in C major: degree index 2
  expect(await marked(page, '#answers .grid button[data-v="2"]')).toBe(true);
});

test('labMidi: a note outside the scale is a wrong degree answer', async ({ page }) => {
  await midiPractice(page, 'degree');
  await page.evaluate(() => window.__key(61)); // C#: not in C major
  await expect(page.locator('#msg')).toHaveClass(/bad/);
});

test('labMidi: two keys answer the interval drill', async ({ page }) => {
  await midiPractice(page, 'interval');
  await page.evaluate(() => window.__key(60));
  // A single immediate check: toHaveCount(0) would retry until a verdict disappears.
  expect(await page.locator('#msg.ok, #msg.bad').count()).toBe(0);
  await page.evaluate(() => window.__key(67)); // a fifth
  expect(await marked(page, '#answers .grid button[data-v="7"]')).toBe(true);
});

test('without labMidi, MIDI keys do nothing', async ({ page }) => {
  await midiPractice(page, 'note', []);
  await page.evaluate(() => window.__key(64));
  // A single immediate check: toHaveCount(0) would retry until a verdict disappears.
  expect(await page.locator('#msg.ok, #msg.bad').count()).toBe(0);
});

test('browsers without Web MIDI never show the setting', async ({ page }) => {
  await page.addInitScript(() => delete Navigator.prototype.requestMIDIAccess);
  await page.goto('./');
  await page.click('#labBox summary');
  await expect(page.locator('#labMelody')).toBeVisible();
  await expect(page.locator('#labMidi')).toHaveCount(0);
});

test('labJamQuiz: the jam stops after N bars, asks about the last bar, and feeds the stats', async ({ page }) => {
  const problems = watch(page);
  await page.addInitScript(AUDIO_CLOCK);
  await page.clock.install();
  await page.goto('./');
  await page.click('#labBox summary');
  await page.check('#labJamQuiz');
  await page.click('#nav-jam');
  await page.selectOption('#jamQuiz', '4');
  await page.locator('#jamBpm').fill('180');
  await page.click('#jamBtn');
  // Four bars at 180 bpm take 5.3 s of audio time.
  await page.clock.runFor(4000);
  await expect(page.locator('#quizMsg')).toHaveCount(0);
  await page.clock.runFor(2000);
  await expect(page.locator('#quizMsg')).toBeVisible();
  // The loop stops while the question is open.
  const barAt = () => page.locator('.bar.on').evaluate(b => [...b.parentNode.children].indexOf(b));
  const asked = await barAt();
  expect(asked).toBe(3);
  await page.clock.runFor(5000);
  expect(await barAt()).toBe(asked);

  const before = await page.evaluate(() => JSON.parse(localStorage.getItem('pe.prog') || '{"stats":{}}').stats);
  await page.locator('#quizAnswers .grid button').first().click();
  await expect(page.locator('#quizMsg')).toHaveClass(/ok|bad/);
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem('pe.prog')).stats);
  const count = s =>
    Object.values(s.chord || {})
      .concat(Object.values(s.degree || {}))
      .reduce((n, x) => n + x.n, 0);
  expect(count(after)).toBe(count(before) + 1);

  await page.click('#quizGo');
  await expect(page.locator('#jamQuizBox')).toBeEmpty();
  await page.clock.runFor(1000);
  expect(await barAt()).toBe(0);
  expect(problems).toEqual([]);
});

test('without labJamQuiz the jam never stops to ask', async ({ page }) => {
  await page.addInitScript(AUDIO_CLOCK);
  await page.clock.install();
  await page.goto('./');
  await page.click('#nav-jam');
  await expect(page.locator('#jamQuiz')).toHaveCount(0);
  await page.locator('#jamBpm').fill('180');
  await page.click('#jamBtn');
  await page.clock.runFor(12000);
  await expect(page.locator('#quizMsg')).toHaveCount(0);
});

// A fake microphone: getUserMedia yields a silent stream, and the analyser reads a
// synthesized voice (fundamental plus harmonics) at window.__singHz, or noise when
// window.__singNoise is set, or silence.
const FAKE_MIC = () => {
  window.__singHz = 0;
  window.__micTracks = 0;
  navigator.mediaDevices.getUserMedia = async () => {
    if (window.__micDenied) throw new DOMException('denied', 'NotAllowedError');
    const ctx = new AudioContext();
    const stream = ctx.createMediaStreamDestination().stream;
    window.__micTracks++;
    stream.getTracks().forEach(tr => {
      const stop = tr.stop.bind(tr);
      tr.stop = () => {
        window.__micTracks--;
        stop();
      };
    });
    return stream;
  };
  let seed = 7;
  AnalyserNode.prototype.getFloatTimeDomainData = function (buf) {
    const sr = this.context.sampleRate,
      f = window.__singHz;
    for (let i = 0; i < buf.length; i++) {
      if (window.__singNoise) buf[i] = ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5) * 0.4;
      else if (!f) buf[i] = 0;
      else {
        let v = 0;
        for (let h = 1; h <= 6; h++) v += Math.sin((2 * Math.PI * f * h * i) / sr) / h;
        buf[i] = 0.2 * v;
      }
    }
  };
};

async function singPractice(page, kind, flags = ['labSing']) {
  await page.addInitScript(FAKE_MIC);
  await page.addInitScript(AUDIO_CLOCK);
  // Paused, so only runFor() moves time: a flowing clock would start the next question
  // while an assertion retries and hide a verdict.
  await page.clock.install({ time: new Date('2026-03-02T10:00:00Z') });
  await page.clock.pauseAt(new Date('2026-03-02T10:00:00Z'));
  await practice(page, kind, flags);
}

async function allowMic(page) {
  await page.click('#btnSing');
  await expect(page.locator('#singPanel')).toContainText(/never recorded, stored or sent/);
  await page.click('#singAllow');
  await expect(page.locator('#singStatus')).toBeVisible();
}

test('labSing: singing a degree answers it, and the privacy promise is shown first', async ({ page }) => {
  const problems = watch(page);
  await singPractice(page, 'degree');
  await page.click('#btnPlay');
  await allowMic(page);
  // Past the key context and the target note.
  await page.clock.runFor(4000);
  await page.evaluate(() => (window.__singHz = 329.63)); // E4: degree index 2 in C major
  await page.clock.runFor(800);
  expect(await marked(page, '#answers .grid button[data-v="2"]')).toBe(true);
  expect(problems).toEqual([]);
});

test('labSing: a degree sung an octave lower is still that degree', async ({ page }) => {
  await singPractice(page, 'degree');
  await page.click('#btnPlay');
  await allowMic(page);
  await page.clock.runFor(4000);
  await page.evaluate(() => (window.__singHz = 164.81)); // E3
  await page.clock.runFor(800);
  expect(await marked(page, '#answers .grid button[data-v="2"]')).toBe(true);
});

test('labSing: the app does not hear its own playback as an answer', async ({ page }) => {
  await singPractice(page, 'degree');
  await page.click('#btnPlay');
  await allowMic(page);
  // Singing starts while the key context is still sounding.
  await page.evaluate(() => (window.__singHz = 329.63));
  await page.clock.runFor(1000);
  // A single immediate check: toHaveCount(0) would retry until a verdict disappears.
  expect(await page.locator('#msg.ok, #msg.bad').count()).toBe(0);
  await page.clock.runFor(4000);
  await expect(page.locator('#msg.ok, #msg.bad')).toHaveCount(1);
});

test('labSing: unclear input asks again instead of marking wrong', async ({ page }) => {
  await singPractice(page, 'degree');
  await page.click('#btnPlay');
  await allowMic(page);
  await page.clock.runFor(4000);
  await page.evaluate(() => (window.__singNoise = true));
  await page.clock.runFor(7000);
  // A single immediate check: toHaveCount(0) would retry until a verdict disappears.
  expect(await page.locator('#msg.ok, #msg.bad').count()).toBe(0);
  await expect(page.locator('#singStatus')).toHaveText(EN.sing.retry);
});

test('labSing: a blocked microphone says so', async ({ page }) => {
  await page.addInitScript(() => (window.__micDenied = true));
  await singPractice(page, 'degree');
  await page.click('#btnPlay');
  await page.click('#btnSing');
  await page.click('#singAllow');
  await expect(page.locator('#singStatus')).toHaveText(EN.sing.denied);
  // A single immediate check: toHaveCount(0) would retry until a verdict disappears.
  expect(await page.locator('#msg.ok, #msg.bad').count()).toBe(0);
});

test('labSing: leaving the drill releases the microphone', async ({ page }) => {
  await singPractice(page, 'degree');
  await page.click('#btnPlay');
  await allowMic(page);
  expect(await page.evaluate(() => window.__micTracks)).toBe(1);
  await page.click('#nav-jam');
  expect(await page.evaluate(() => window.__micTracks)).toBe(0);
});

test('without labSing there is no Sing button', async ({ page }) => {
  await singPractice(page, 'degree', []);
  await expect(page.locator('#btnSing')).toHaveCount(0);
});

const currentPattern = page => page.evaluate(async () => (await import('./js/drills/trial.js')).session.trial.ans);

async function rhythmPractice(page, kind) {
  await page.addInitScript(AUDIO_CLOCK);
  await page.clock.install({ time: new Date('2026-03-02T10:00:00Z') });
  await page.clock.pauseAt(new Date('2026-03-02T10:00:00Z'));
  await page.goto('./');
  await page.click('#labBox summary');
  await page.check('#labRhythm');
  await page.click('#nav-practice');
  await page.click('#setBox summary');
  await page.locator('#kindChips button', { hasText: kind === 'rhythm' ? /^rhythm$/ : /^tap-back$/ }).click();
  await page.locator('#kindChips button', { hasText: /^notes$/ }).click();
  await page.click('#btnPlay');
}

test('labRhythm: writing the heard rhythm cell by cell', async ({ page }) => {
  const problems = watch(page);
  await rhythmPractice(page, 'rhythm');
  const cells = await currentPattern(page);
  for (const c of cells) await page.locator(`#answers .grid button[data-v="${c}"]`).click();
  await expect(page.locator('#msg')).toHaveClass(/ok/);
  await page.clock.runFor(1000);
  const next = await currentPattern(page);
  const wrong = next.map(c => (c === 'q' ? 'ee' : 'q'));
  for (const c of wrong) await page.locator(`#answers .grid button[data-v="${c}"]`).click();
  await expect(page.locator('#msg')).toHaveClass(/bad/);
  expect(problems).toEqual([]);
});

async function tapBack(page, { shift = 0, drop = 0 } = {}) {
  const cells = await currentPattern(page);
  const spb = 60 / 80;
  const onsets = [];
  let t = 0;
  const durs = { q: [4], ee: [2, 2], ssss: [1, 1, 1, 1], ess: [2, 1, 1], sse: [1, 1, 2] };
  for (const c of cells)
    for (const d of durs[c]) {
      onsets.push((t / 4) * spb);
      t += d;
    }
  const clock = () => page.evaluate(async () => (await import('./js/audio/context.js')).ac.currentTime);
  await page.click('#tapStart');
  const down = (await clock()) + 0.1 + 4 * spb;
  for (const o of onsets.slice(drop)) {
    const wait = (down + o + shift - (await clock())) * 1000;
    if (wait > 0) await page.clock.runFor(Math.round(wait));
    await page.locator('#tapPad').dispatchEvent('pointerdown');
  }
  // Until the verdict appears (the tapping window closes half a beat after the bar);
  // running further would start the next question and clear it.
  for (let i = 0; i < 60 && !(await page.locator('#msg.ok, #msg.bad').count()); i++) await page.clock.runFor(100);
}

test('labRhythm: tapping the rhythm back in time, with a constant latency, passes', async ({ page }) => {
  await rhythmPractice(page, 'tap');
  await tapBack(page, { shift: 0.06 });
  await expect(page.locator('#msg')).toHaveClass(/ok/);
});

test('labRhythm: missing taps fail and say how many', async ({ page }) => {
  await rhythmPractice(page, 'tap');
  await tapBack(page, { drop: 2 });
  await expect(page.locator('#msg')).toHaveClass(/bad/);
  await expect(page.locator('#msg')).toContainText('taps for');
});

test('without labRhythm the rhythm drills are not offered, even if saved', async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('pe.set')) localStorage.setItem('pe.set', JSON.stringify({ kinds: ['rhythm', 'tap'] }));
  });
  await page.goto('./');
  await page.click('#nav-practice');
  await page.click('#setBox summary');
  await expect(page.locator('#kindChips button', { hasText: /^rhythm$/ })).toHaveCount(0);
  await page.click('#btnPlay');
  await expect(page.locator('#answers .kb')).toBeVisible();
});
