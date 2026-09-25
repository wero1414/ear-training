// Fails if any source, test, config or CLAUDE.md file contains a non-ASCII byte. Symbols
// the UI needs (flat, sharp, dashes, arrows) are written as \u escapes in string literals.
// The brief and skill docs are exempt: they are authored outside this codebase.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const EXEMPT = /^(PROMPT\.md|\.claude\/|package-lock\.json$)/;
const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' })
  .split('\n')
  .filter(f => f && !EXEMPT.test(f) && /\.(js|mjs|css|html|json|md)$/.test(f));

let bad = 0;
for (const f of files) {
  readFileSync(f, 'utf8')
    .split('\n')
    .forEach((line, i) => {
      const m = line.match(/[\u0080-\uffff]/);
      if (m) {
        bad++;
        console.error(`${f}:${i + 1}: non-ASCII U+${m[0].codePointAt(0).toString(16).padStart(4, '0')}`);
      }
    });
}
if (bad) process.exit(1);
