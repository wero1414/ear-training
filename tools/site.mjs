// The deployable site: exactly the files GitHub Pages serves and the service worker
// precaches. One list, so the two cannot drift apart.
import { execFileSync } from 'node:child_process';

const INCLUDE =
  /^(index\.html|manifest\.webmanifest|sw\.js|\.nojekyll|css\/.+\.css|js\/.+\.(js|json)|icons\/.+\.(png|svg))$/;

// Lives with the string tables but is only read by the tests.
const TEST_ONLY = new Set(['js/i18n/same-in-all.json']);

export function siteFiles() {
  return execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' })
    .split('\n')
    .filter(f => INCLUDE.test(f) && !TEST_ONLY.has(f))
    .sort();
}
