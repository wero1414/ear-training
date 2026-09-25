---
name: offline-pwa
description: Use when working on the service worker, manifest, caching, icons, GitHub Pages deployment, or any bug where the app behaves differently in production than in local dev. Covers the subpath trap and iOS PWA limits.
---

# Offline PWA on GitHub Pages

## The subpath trap

The site is served from `https://<user>.github.io/<repo>/`, not from a domain root. Local
dev usually serves from `/`. Anything absolute works locally and 404s in production, which
is the most expensive failure mode in this repo.

- Every asset reference relative: `./js/main.js`, never `/js/main.js`.
- `manifest.webmanifest`: `"start_url": "./"`, `"scope": "./"`.
- Register the worker with an explicit scope: `navigator.serviceWorker.register('./sw.js', { scope: './' })`.
- A service worker can only control pages at or below its own path, so `sw.js` lives at the
  repo root, next to `index.html`.
- Add `.nojekyll` at the root or GitHub strips files and directories beginning with an
  underscore.

## Service worker

Cache-first with a versioned cache, because the app must be fully usable with no network
and has no content that goes stale on its own.

- `const CACHE = 'ear-v' + BUILD;` where `BUILD` is bumped on every deploy. Generate the
  precache list at build time from the file tree; a hand-maintained list will drift and
  the omission only shows up offline.
- `install`: `caches.open(CACHE).then(c => c.addAll(FILES))`, then `skipWaiting()` only
  after the user accepts an update, not automatically. Swapping the worker mid-session
  while audio is scheduled is a bad experience.
- `activate`: delete every cache whose name is not `CACHE`, then `clients.claim()`.
- `fetch`: respond from cache, fall back to network, and for navigation requests fall back
  to the cached `index.html` so a deep link works offline.
- Update flow: on `updatefound`, show a dismissible "new version available" bar. On accept,
  post `SKIP_WAITING` to the worker and reload on `controllerchange`.

## iOS PWA limits worth knowing

- Installation is Share → Add to Home Screen. There is no install prompt event, so the
  first-run hint has to explain this by hand on iOS.
- Storage for an installed PWA can be evicted after periods of non-use. `localStorage` is
  not durable. This is why progress export exists and why import must be implemented.
- A home-screen PWA gets a separate storage bucket from Safari: progress made in the
  browser tab does not appear in the installed app. Say so in the first-run hint.
- Audio still routes to the ringer channel in an installed PWA, so the silent-audio
  workaround is needed there too.
- `viewport-fit=cover` plus `env(safe-area-inset-*)` padding is required or content sits
  under the notch and the home indicator in standalone mode.

## Icons

Generate them in-repo, do not fetch them. 192 and 512 px PNGs plus a maskable variant with
the safe zone respected (the logo inside the central 80% circle), and an `apple-touch-icon`
at 180 px, because iOS ignores the manifest icons for the home screen.

## Deployment

GitHub Actions with `actions/configure-pages`, `actions/upload-pages-artifact` and
`actions/deploy-pages`, triggered on push to `main`. The artifact is the repo as-is; there
is no build. A separate CI job runs lint and tests on pull requests.

Verify each release offline before tagging: load the deployed URL, install to home screen,
enable airplane mode, cold launch, exercise every tab.
