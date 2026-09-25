// Copies the site files into a directory for the Pages artifact (CI only).
import { cpSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { siteFiles } from './site.mjs';

const out = process.argv[2] || '_site';
for (const f of siteFiles()) {
  mkdirSync(join(out, dirname(f)), { recursive: true });
  cpSync(f, join(out, f));
}
console.log(`staged ${siteFiles().length} files into ${out}`);
