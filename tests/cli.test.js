import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile, access, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { main } from '../packages/cli/src/main.js';

async function sandbox(fn) {
 const base = await mkdtemp(join(tmpdir(), 'wavrynt-gen-'));
 try { await fn(base); } finally { await rm(base,{recursive:true,force:true}); }
}
test('create produces frontend/, backend/, and config beside tool home', async () => sandbox(async base => {
 const oldCwd = process.cwd(); process.chdir(base);
 try {
  await main(['create','sample-app']);
  assert.match(await readFile(join(base,'sample-app','frontend','index.html'),'utf8'),/Hello from Wavrynt/);
  assert.match(await readFile(join(base,'sample-app','backend','README.md'),'utf8'),/Optional/);
  assert.match(await readFile(join(base,'sample-app','wavrynt.config.mjs'),'utf8'),/\.\/frontend/);
  await main(['doctor','sample-app']);
  await assert.rejects(()=>main(['create','sample-app']),/already exists/);
 } finally { process.chdir(oldCwd); }
}));
test('init preserves preexisting vanilla files', async () => sandbox(async base => {
 await writeFile(join(base,'index.html'),'<h1>Existing</h1>');
 await main(['init',base]);
 await assert.rejects(()=>main(['init',base]),/already exists/);
 assert.equal(await readFile(join(base,'index.html'),'utf8'),'<h1>Existing</h1>');
 await main(['doctor',base]);
}));
test('install prepares a shared home without generating an app', async () => sandbox(async base => {
 const previous = process.env.WAVRYNT_HOME;
 process.env.WAVRYNT_HOME = join(base,'shared-wavrynt');
 try {
  await main(['install']);
  await access(join(base,'shared-wavrynt','installation.json'));
  await access(join(base,'shared-wavrynt','toolchains'));
 } finally { if(previous === undefined) delete process.env.WAVRYNT_HOME; else process.env.WAVRYNT_HOME=previous; }
}));
test('reject nested create target', async () => {
 await assert.rejects(()=>main(['create','../bad']),/Project name/);
});
