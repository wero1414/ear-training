// A grid of answer buttons. items: [{v, b: bold label, s: sub label}].
export function gridUI(host, items, cls, onPick) {
  const g = document.createElement('div');
  g.className = 'grid' + (cls ? ' ' + cls : '');
  items.forEach(it => {
    const b = document.createElement('button');
    b.dataset.v = it.v;
    b.innerHTML = '<b>' + it.b + '</b>' + (it.s ? '<span>' + it.s + '</span>' : '');
    b.onclick = () => onPick(it.v);
    g.appendChild(b);
  });
  host.appendChild(g);
}
