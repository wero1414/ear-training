// Service worker registration and the "new version available" bar. The worker never
// takes over by itself (see sw.js); the user accepts, the page asks it to skip waiting,
// and reloads once it controls the page.
import { t } from '../i18n/index.js';

let accepted = false;

function offer(worker) {
  if (document.getElementById('updateBar')) return;
  const bar = document.createElement('div');
  bar.id = 'updateBar';
  bar.className = 'update';
  const msg = document.createElement('span');
  msg.textContent = t('update.available');
  const btn = document.createElement('button');
  btn.className = 'play';
  btn.textContent = t('update.reload');
  btn.onclick = () => {
    accepted = true;
    worker.postMessage('SKIP_WAITING');
  };
  const close = document.createElement('button');
  close.className = 'ghost';
  close.textContent = '\u2715';
  close.setAttribute('aria-label', t('update.dismiss'));
  close.onclick = () => bar.remove();
  bar.append(msg, btn, close);
  document.body.appendChild(bar);
}

export function registerWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // The first install claims the page too; only reload for an update the user accepted.
    if (!accepted) return;
    accepted = false;
    location.reload();
  });
  navigator.serviceWorker
    .register('./sw.js', { scope: './' })
    .then(reg => {
      if (reg.waiting && navigator.serviceWorker.controller) offer(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const w = reg.installing;
        w.addEventListener('statechange', () => {
          if (w.state === 'installed' && navigator.serviceWorker.controller) offer(w);
        });
      });
    })
    .catch(e => console.warn('service worker registration failed', e));
}
