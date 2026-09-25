// Progress import: the inverse of "Export progress". Accepts the exported JSON, checks
// its shape and brings it up to the current schema the same way stored data is.
import { migrateProgress, upgradeSettings } from './migrate.js';

const isObj = v => typeof v === 'object' && v !== null && !Array.isArray(v);

export function parseBackup(text) {
  const data = JSON.parse(text);
  if (!isObj(data) || !isObj(data.settings) || !isObj(data.progress)) throw new Error('not an export');
  const p = data.progress;
  if (typeof p.xp !== 'number' || !isObj(p.stars) || !isObj(p.best) || !isObj(p.stats))
    throw new Error('not an export');
  return { settings: upgradeSettings(data.settings), progress: migrateProgress(p) };
}
