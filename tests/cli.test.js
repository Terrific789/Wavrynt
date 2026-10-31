import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { main } from '../packages/cli/src/main.js';

test('create produces a valid app', async () => {
  const parent = await mkdtemp(join(tmpdir(), 'wavrynt-test-'));
  try {
    const app = join(parent, 'my-app');
    await main(['create', app]);
    assert.match(await readFile(join(app, 'www/index.html'), 'utf8'), /Hello from Wavrynt/);
    await main(['doctor', app]);
  } finally { await rm(parent, {recursive:true,force:true}); }
});

test('init never overwrites an existing config', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'wavrynt-init-'));
  try {
    await writeFile(join(dir, 'index.html'), '<h1>Existing</h1>');
    await main(['init', dir]);
    await assert.rejects(() => main(['init', dir]), /already exists/);
    assert.equal(await readFile(join(dir, 'index.html'), 'utf8'), '<h1>Existing</h1>');
  } finally { await rm(dir, {recursive:true,force:true}); }
});
