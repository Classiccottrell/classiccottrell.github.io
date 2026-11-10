import { test, expect } from '@playwright/test';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';

test('vendor copies runtime only and refuses altered IDs or unexpected files', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'cc-arcade-'));
  try {
    mkdirSync(path.join(root, 'scripts'));
    mkdirSync(path.join(root, 'data'));
    mkdirSync(path.join(root, 'dist'));
    cpSync(new URL('../scripts/vendor-arcade.mjs', import.meta.url), path.join(root, 'scripts/vendor-arcade.mjs'));
    const manifest = { version: '0.1.0', id: 'v0.1.0-abcdef', entry: 'game.js', music: 'music.mp3', files: ['game.js', 'music.mp3'] };
    const write = (file, value) => writeFileSync(path.join(root, 'dist', file), value);
    const run = () => spawnSync(process.execPath, ['scripts/vendor-arcade.mjs', 'dist'], { cwd: root, encoding: 'utf8' });
    write('manifest.json', JSON.stringify(manifest));
    write('game.js', 'export const mountGame = () => {};');
    write('music.mp3', 'music fixture');
    expect(run().status).toBe(0);
    expect(JSON.parse(readFileSync(path.join(root, 'data/arcade.json'), 'utf8'))).toEqual(manifest);
    expect(run().status).toBe(0);
    write('game.js', 'changed');
    expect(run().stderr).toContain('already exists with different contents');
    write('private-prompt.md', 'must never ship');
    expect(run().stderr).toContain('Runtime files differ from manifest');
    manifest.files.push('../private-prompt.md');
    write('manifest.json', JSON.stringify(manifest));
    expect(run().stderr).toContain('Invalid runtime manifest');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
