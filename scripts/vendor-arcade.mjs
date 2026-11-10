#!/usr/bin/env node
// Copy the private game's reviewed runtime export, never its source checkout.
import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.resolve(process.argv[2] || '../cc-sidescroller/dist');
const manifest = JSON.parse(readFileSync(path.join(source, 'manifest.json'), 'utf8'));
const safe = (name) => typeof name === 'string' && /^[\w./-]+$/.test(name) && !name.startsWith('/') && !name.split('/').some((part) => part === '..' || part === '.' || !part);
if (!/^v[\d.]+-[a-f0-9]+$/.test(manifest.id) || !Array.isArray(manifest.files)
  || !safe(manifest.entry) || !safe(manifest.music)
  || !manifest.files.every(safe) || !manifest.files.includes(manifest.entry) || !manifest.files.includes(manifest.music)) {
  throw new Error('Invalid runtime manifest');
}
const walk = (dir, prefix = '') => readdirSync(dir).flatMap((name) => {
  const rel = prefix + name, stat = lstatSync(path.join(dir, name));
  if (stat.isSymbolicLink()) throw new Error(`Symlink in runtime: ${rel}`);
  return stat.isDirectory() ? walk(path.join(dir, name), `${rel}/`) : [rel];
});
const actual = walk(source).sort();
const expected = [...new Set([...manifest.files, 'manifest.json'])].sort();
if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Runtime files differ from manifest');
const target = path.join(root, 'assets/arcade', manifest.id);
// A content-addressed release can never be silently overwritten with different bytes.
if (existsSync(target)) {
  if (JSON.stringify(walk(target).sort()) !== JSON.stringify(actual)
    || actual.some((file) => !readFileSync(path.join(source, file)).equals(readFileSync(path.join(target, file))))) {
    throw new Error(`Release ${manifest.id} already exists with different contents`);
  }
} else {
  mkdirSync(path.dirname(target), { recursive: true });
  cpSync(source, target, { recursive: true });
}
writeFileSync(path.join(root, 'data/arcade.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`vendor:arcade: ${manifest.id}, ${actual.length} runtime files`);
