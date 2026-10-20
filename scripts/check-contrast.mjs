#!/usr/bin/env node
// Checks every text colour pair in assets/css/site.css against WCAG 2.2 AA
// (4.5:1), in both polarities and inside ink bands. Fails the build if any
// pair drops below. The tokens are read straight from the stylesheet, so the
// numbers can't drift from what ships.
//
//   npm run check:contrast

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const rgb = (hex) => {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const lum = (hex) => {
  const f = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const [r, g, b] = rgb(hex).map(f);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const ratio = (a, b) => {
  const x = lum(a), y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

const block = (css, start) => {
  const i = css.indexOf(start);
  if (i < 0) throw new Error(`check-contrast: could not find "${start}" in site.css`);
  const open = css.indexOf('{', i + start.length - 1);
  let depth = 0;
  for (let j = open; j < css.length; j++) {
    if (css[j] === '{') depth++;
    if (css[j] === '}' && --depth === 0) return css.slice(open + 1, j);
  }
  throw new Error('check-contrast: unbalanced braces');
};
const vars = (text) => Object.fromEntries([...text.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [m[1], m[2].toUpperCase()]));

// Pairs: [label, foreground token, background token, minimum ratio (default 4.5), polarity (default both)].
const PAIRS = [
  ['Body text', 'fg', 'ground'],
  ['Secondary text', 'muted', 'ground'],
  ['Notes and links', 'proof', 'ground'],
  ['Text on highlight', 'fg', 'highlight'],
  ['Callout numbers', 'proof-on', 'proof'],
  ['Button text', 'ground', 'fg'],
  ['Band text', 'band-fg', 'band'],
  ['Band secondary', 'band-muted', 'band'],
  ['Band notes', 'band-proof', 'band'],
  ['Band highlight', 'band-fg', 'band-highlight'],
  ['Terry Time band', 'tt-ink', 'tt-paper'],
  // The Terry guide's exploded view: a lifted layer sits on highlight (its secondary text turns to full ink);
  // dimmed layers use --dim, checked on the ground and on the highlight they can overlap.
  ['Notes on highlight', 'proof', 'highlight'],
  ['Dimmed layer text', 'dim', 'ground'],
  ['Dimmed text on highlight', 'dim', 'highlight'],
  // Signal is a field, never text: only ink sits on it. The home masthead and signature stay ink in both schemes.
  // /drawings/: the white half stays paper in both schemes; the black half reuses the band tokens above.
  ['Drawings white half text', 'dw-ink', 'dw-paper'],
  ['Drawings white half secondary', 'dw-muted', 'dw-paper'],
  ['Drawings white half notes', 'dw-proof', 'dw-paper'],
  ['Ink on signal', 'slab-ink', 'signal'],
  ['Text on mat', 'fg', 'mat'],
  ['Secondary on mat', 'muted', 'mat'],
  ['Notes on mat', 'proof', 'mat'],
  ['Focus ring on signal', 'proof', 'signal', 3, 'light'],
];

export function checkContrast() {
  const css = readFileSync(path.join(ROOT, 'assets/css/site.css'), 'utf8');
  const light = vars(block(css, ':root{'));
  const dark = { ...light, ...vars(block(css, '@media (prefers-color-scheme:dark){')) };
  const run = (tokens, mode) => PAIRS.filter((p) => !p[4] || p[4] === mode).map(([name, fg, bg, min = 4.5]) => {
    if (!tokens[fg] || !tokens[bg]) throw new Error(`check-contrast: missing token --${tokens[fg] ? bg : fg}`);
    return { name, fg: tokens[fg], bg: tokens[bg], min, ratio: ratio(tokens[fg], tokens[bg]) };
  });
  const result = { light: run(light, 'light'), dark: run(dark, 'dark') };
  result.all = [...result.light, ...result.dark];
  result.min = Math.min(...result.all.filter((p) => p.min === 4.5).map((p) => p.ratio));
  result.failures = result.all.filter((p) => p.ratio < p.min);
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = checkContrast();
  for (const [mode, list] of [['Bristol (light)', r.light], ['Ink (dark)', r.dark]]) {
    console.log(mode);
    for (const p of list) console.log(`  ${p.ratio >= p.min ? '✓' : '✗'} ${p.name.padEnd(18)} ${p.fg} on ${p.bg}  ${p.ratio.toFixed(2)}:1`);
  }
  if (r.failures.length) {
    console.error(`check-contrast: ${r.failures.length} pair(s) below their minimum`);
    process.exit(1);
  }
  console.log(`check-contrast: ${r.all.length} pairs pass, lowest ${r.min.toFixed(2)}:1`);
}
