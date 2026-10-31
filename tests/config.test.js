import test from 'node:test';
import assert from 'node:assert/strict';
import { validateConfig } from '../packages/config/src/index.js';

test('valid vanilla app config', () => {
  assert.deepEqual(validateConfig({
    app: { name: 'My App', id: 'com.example.myapp' },
    frontend: { framework: 'vanilla', root: './www', entry: 'index.html' },
    backend: { type: 'none' }
  }), []);
});

test('reject unsupported frontend adapter', () => {
  const errors = validateConfig({
    app: { name: 'My App', id: 'com.example.myapp' },
    frontend: { framework: 'react', root: './www', entry: 'index.html' }
  });
  assert.ok(errors.some(error => error.includes('vanilla')));
});

test('http backend requires baseUrl', () => {
  const errors = validateConfig({
    app: { name: 'My App', id: 'com.example.myapp' },
    frontend: { framework: 'vanilla', root: '.', entry: 'index.html' },
    backend: { type: 'http' }
  });
  assert.ok(errors.some(error => error.includes('baseUrl')));
});

test('reject invalid Android platform settings and version', () => {
  for (const platforms of [null, [], { android: null }, { android: [] }, { android: { enabled: 'yes' } }]) {
    assert.ok(validateConfig({ app: { name: 'App', id: 'com.example.app', version: 12 },
      frontend: { framework: 'vanilla', root: '.', entry: 'index.html' }, platforms }).some(e => e.includes('platforms')));
  }
});
