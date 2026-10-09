#!/usr/bin/env node
// Image pipeline. Reads originals from source/ and writes the files the site
// serves into assets/img/ (plus the favicons at the root). Run it after adding
// or replacing an original; the outputs are committed like the HTML.
//
//   npm run images
//
// Drawings: flattened onto their paper, greyscale, WebP at two widths.
// Plates (screenshots): WebP at up to 1360 px, colour kept.
// Photos (product shots, essay covers): greyscale, so they sit with the ink.
// Self-portrait: the ink layer as-is, plus a non-photo-blue pencil layer
// generated from it for the pencils-to-inks animation.

import sharp from 'sharp';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (...p) => path.join(ROOT, 'source', ...p);
const out = (...p) => {
  const file = path.join(ROOT, ...p);
  mkdirSync(path.dirname(file), { recursive: true });
  return file;
};
const log = (file, info) => console.log(`images: ${path.relative(ROOT, file)} ${info.width}×${info.height} ${Math.round(info.size / 1024)} KB`);

async function drawing(name, ground) {
  for (const width of [1100, 700]) {
    const file = out('assets/img/drawings', width === 1100 ? `${name}.webp` : `${name}-700.webp`);
    const info = await sharp(src('drawings', `${name}.png`)).flatten({ background: ground }).greyscale()
      .resize({ width }).webp({ quality: 70, effort: 6 }).toFile(file);
    log(file, info);
  }
}

async function plate(name, ext, { grey = false, width = 1360, quality = 80 } = {}) {
  const file = out('assets/img/work', `${name}.webp`);
  let img = sharp(src('work', `${name}.${ext}`)).resize({ width, withoutEnlargement: true });
  if (grey) img = img.greyscale();
  log(file, await img.webp({ quality, effort: 6 }).toFile(file));
}

async function cover(name) {
  const file = out('assets/img/writing', `${name}.webp`);
  log(file, await sharp(src('writing', `${name}.webp`)).greyscale().resize({ width: 640 }).webp({ quality: 78, effort: 6 }).toFile(file));
}

// The pencil layer: outlines of the ink masses plus a looser offset pass, in
// non-photo blue on transparent, the way a penciller roughs in a figure.
async function pencils(inkFile, pencilFile) {
  const { data, info } = await sharp(inkFile).ensureAlpha().extractChannel(3).raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const filter = (input, r, pick) => {
    const res = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let v = pick === 'max' ? 0 : 255;
      for (let dy = -r; dy <= r; dy++) {
        const yy = Math.min(H - 1, Math.max(0, y + dy));
        for (let dx = -r; dx <= r; dx++) {
          const p = input[yy * W + Math.min(W - 1, Math.max(0, x + dx))];
          v = pick === 'max' ? Math.max(v, p) : Math.min(v, p);
        }
      }
      res[y * W + x] = v;
    }
    return res;
  };
  const dil = filter(data, 2, 'max'), ero = filter(data, 1, 'min');
  const edge = new Uint8Array(W * H);
  for (let i = 0; i < edge.length; i++) edge[i] = Math.max(0, dil[i] - ero[i]);
  const soft = await sharp(Buffer.from(edge), { raw: { width: W, height: H, channels: 1 } }).blur(0.7).extractChannel(0).raw().toBuffer();
  const rgba = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    const line = soft[i] > 90 ? 255 : 0;
    const j = (y - 3) * W + (x - 4);
    const offset = x >= 4 && y >= 3 && soft[j] > 90 ? 128 : 0;
    rgba[i * 4] = 0xa4; rgba[i * 4 + 1] = 0xdd; rgba[i * 4 + 2] = 0xed; rgba[i * 4 + 3] = Math.max(line, offset);
  }
  log(pencilFile, await sharp(rgba, { raw: { width: W, height: H, channels: 4 } }).webp({ lossless: true, effort: 6 }).toFile(pencilFile));
}

async function self() {
  const ink = out('assets/img/self/ink.webp');
  log(ink, await sharp(src('self', 'ink.png')).webp({ lossless: true, effort: 6 }).toFile(ink));
  await pencils(src('self', 'ink.png'), out('assets/img/self/pencil.webp'));
}

// Terry: a clean mask for CSS, and a favicon that is ink by day and Bristol by night.
async function terry() {
  const raw = readFileSync(src('terry.svg'), 'utf8');
  const body = raw.slice(raw.indexOf('<g'), raw.lastIndexOf('</svg>')).replace(/\s+/g, ' ').replace(/ fill="currentColor"/, '').trim();
  const svg = (style) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 490 490">${style}${body}</svg>\n`;
  writeFileSync(out('assets/img/terry.svg'), svg(''));
  writeFileSync(out('favicon.svg'), svg('<style>g{fill:#0A0A0A}@media (prefers-color-scheme:dark){g{fill:#F2F1EE}}</style>'));
  const ink = Buffer.from(svg('<style>g{fill:#0A0A0A}</style>'));
  for (const [file, size, pad] of [['favicon-32.png', 32, 0], ['apple-touch-icon.png', 180, 18]]) {
    const inner = await sharp(ink, { density: 300 }).resize(size - pad * 2, size - pad * 2).png().toBuffer();
    const target = out(file);
    log(target, await sharp({ create: { width: size, height: size, channels: 4, background: pad ? '#FFFFFF' : { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: inner, left: pad, top: pad }]).png({ compressionLevel: 9, palette: true }).toFile(target));
  }
}

await drawing('kurtz', '#000000');
await drawing('travis', '#FFFFFF');
await drawing('coach', '#FFFFFF');
await plate('linefield', 'webp');
await plate('forma', 'webp');
await plate('agentic-light', 'webp');
await plate('vpat-vault', 'jpg', { grey: true });
await plate('photo-curator-cli', 'jpg', { grey: true });
await plate('vpat-vault-evidence', 'webp', { grey: true, width: 1100, quality: 62 });
for (const name of ['the-last-20', 'built-to-break-a-lifelong-education', 'the-disposable-architecture-of-tomorrow']) await cover(name);
await self();
await terry();
