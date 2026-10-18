// Turns a potrace trace of the signature (source/signature-<take>.svg) into the
// one filled path and tight viewBox the portrait needs. Potrace traced the
// paper, so the mark is the hole in a full-frame rectangle: drop that rectangle
// and fill what is left with evenodd (specks inside the mark stay holes).
// Coordinates stay in the trace's own space (780x760 for a, 700x780 for b), flipped upright, so the
// hand-placed centerlines in data/site.json share it.
import { readFileSync } from 'node:fs';

export function resolveSignature(root, sig) {
  const svg = readFileSync(`${root}/source/signature-${sig.take}.svg`, 'utf8');
  const [, ty] = /translate\(\s*[\d.]+[ ,]+([\d.]+)\s*\)/.exec(svg);
  const [, k] = /scale\(\s*([\d.]+)/.exec(svg);
  const scale = +k, flipY = +ty;
  const [, W, H] = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg).map(Number);
  const subs = [];
  for (const m of svg.matchAll(/<path d="([^"]+)"/g)) {
    // split into subpaths, keeping each command's args
    const toks = m[1].match(/[a-zA-Z]|-?\d*\.?\d+/g);
    let cmd = '', i = 0, x = 0, y = 0, cur = null;
    const pt = (px, py) => [+(px * scale).toFixed(1), +(flipY - py * scale).toFixed(1)];
    const take = (n) => { const a = toks.slice(i, i + n).map(Number); i += n; return a; };
    while (i < toks.length) {
      if (/[a-zA-Z]/.test(toks[i])) cmd = toks[i++];
      if (cmd === 'z' || cmd === 'Z') { if (cur) cur.closed = true; continue; }
      if (cmd === 'M' || cmd === 'm') {
        const [a, b] = take(2);
        x = cmd === 'm' ? x + a : a; y = cmd === 'm' ? y + b : b;
        cur = { segs: [], start: pt(x, y) }; subs.push(cur); cmd = cmd === 'm' ? 'l' : 'L';
      } else if (cmd === 'l' || cmd === 'L') {
        const [a, b] = take(2);
        x = cmd === 'l' ? x + a : a; y = cmd === 'l' ? y + b : b;
        cur.segs.push(['L', pt(x, y)]);
      } else if (cmd === 'c' || cmd === 'C') {
        const v = take(6), r = cmd === 'c';
        const p = [0, 2, 4].map((j) => pt(r ? x + v[j] : v[j], r ? y + v[j + 1] : v[j + 1]));
        x = r ? x + v[4] : v[4]; y = r ? y + v[5] : v[5];
        cur.segs.push(['C', ...p]);
      } else throw new Error(`signature: unsupported path command ${cmd}`);
    }
  }
  // the full-frame background rectangle: a subpath touching every frame corner
  const frame = (s) => { const xs = [s.start, ...s.segs.map((g) => g[g.length - 1])]; return xs.some((p) => p[0] <= 0.5) && xs.some((p) => p[0] >= W - 0.5) && xs.some((p) => p[1] <= 0.5) && xs.some((p) => p[1] >= H - 0.5); };
  const keep = subs.filter((s) => !frame(s));
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, p0 = null;
  const grow = ([px, py]) => { x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py); };
  for (const s of keep) {
    let a = s.start; grow(a);
    for (const g of s.segs) {
      if (g[0] === 'L') grow(g[1]);
      else for (let t = 0.1; t <= 1.001; t += 0.1) { // sample the curve, control points overshoot
        const [b, c, d] = g.slice(1), u = 1 - t;
        grow([0, 1].map((j) => u * u * u * a[j] + 3 * u * u * t * b[j] + 3 * u * t * t * c[j] + t * t * t * d[j]));
      }
      a = g[g.length - 1];
    }
  }
  const f = (p) => `${p[0]} ${p[1]}`;
  const d = keep.map((s) => `M${f(s.start)}${s.segs.map((g) => g[0] + g.slice(1).map(f).join(' ')).join('')}Z`).join('');
  const r = (n) => Math.floor(n);
  return { d, viewBox: `${r(x0) - 2} ${r(y0) - 2} ${Math.ceil(x1 - x0) + 4} ${Math.ceil(y1 - y0) + 4}`, ...sig.takes[sig.take] };
}
