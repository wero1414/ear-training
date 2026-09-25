// Serves the repo under /ear-training/ so that an absolute asset path 404s here exactly
// as it would on GitHub Pages. Anything outside the prefix is a 404, never a fallback.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const PREFIX = '/ear-training/';
const PORT = Number(process.env.PORT || 4173);
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (!path.startsWith(PREFIX)) {
    res.writeHead(404).end('outside ' + PREFIX);
    return;
  }
  let rel = path.slice(PREFIX.length);
  if (rel === '' || rel.endsWith('/')) rel += 'index.html';
  const file = normalize(join(ROOT, rel));
  if (!file.startsWith(ROOT)) {
    res.writeHead(403).end();
    return;
  }
  try {
    let body = await readFile(file);
    // Test hook: a `sw-version` cookie serves the worker as a different build, so the
    // update flow can be exercised. Cookies are per browser context, and the browser's
    // own worker update check (which page routing cannot see) sends them.
    const cookie = /(?:^|;\s*)sw-version=([\w-]+)/.exec(req.headers.cookie || '');
    if (rel === 'sw.js' && cookie)
      body = String(body).replace(/const VERSION = '[^']*';/, `const VERSION = '${cookie[1]}';`);
    res.writeHead(200, {
      'content-type': TYPES[extname(file)] || 'application/octet-stream',
      'cache-control': 'no-store',
    });
    res.end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
}).listen(PORT, () => console.log(`http://localhost:${PORT}${PREFIX}`));
