// Intended behaviour changes since Phase 0, applied to the seed so the differential test
// can keep holding the app to "seed plus these fixes" exactly. Loaded as a classic
// script after seed.html has run, so it can rebind the seed's global functions (they are
// function declarations) and mutate its global objects. Each fix names the commit that
// made the same change in js/.
(() => {
  /* fix(stats): degree stats keyed by semitone above the tonic; progress schema 2. */
  DEFP.schema = 2;
  if (!P.schema) P.schema = 2;
  let lastKey = null;
  const keyFor0 = keyFor;
  keyFor = sp => (lastKey = keyFor0(sp));
  const semiOf = (d, sp, minor) => (sp && sp.chrom ? d : (minor ? DIA_MIN : DIA_MAJ)[d]);
  const weighted0 = weighted;
  weighted = (items, b) => {
    if (b !== 'degree' || !S.adaptive) return weighted0(items, b);
    const st = P.stats[b] || {};
    const w = items.map(i => {
      const s = st[semiOf(i, trial.sp, lastKey.minor)];
      return !s || s.n < 3 ? 2 : 1 + 3.2 * (1 - s.ok / s.n);
    });
    let t = w.reduce((a, b2) => a + b2, 0),
      r = Math.random() * t;
    for (let i = 0; i < items.length; i++) {
      r -= w[i];
      if (r <= 0) return items[i];
    }
    return items[items.length - 1];
  };
  const bump0 = bump;
  bump = (b, key, ok) => bump0(b, b === 'degree' ? semiOf(trial.ans, trial.sp, trial.key.minor) : key, ok);
  const statLabel0 = statLabel;
  statLabel = (b, key) => (b === 'degree' ? degLabel(+key) : statLabel0(b, key));

  /* fix(melody): labels use the melody's diatonic scale even with chromatic degrees on.
     degText is a const in the seed, so give melody trials a non-chromatic spec (their
     generator ignores chrom) and redraw the answers. */
  const makeTrial0 = makeTrial;
  makeTrial = () => {
    makeTrial0();
    if (trial && trial.kind === 'melody' && trial.sp.chrom) {
      trial.sp = Object.assign({}, trial.sp, { chrom: false });
      renderPlay();
    }
  };
})();
