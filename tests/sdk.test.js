import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
const source = await readFile(new URL('../packages/sdk/src/wavrynt.js', import.meta.url), 'utf8');
function setup(native) {
  const listeners = {};
  const context = { WavryntNative: native, setTimeout, clearTimeout, addEventListener: (name, fn) => { listeners[name] = fn; } };
  runInNewContext(source, context);
  return { sdk: context.Wavrynt, listeners };
}
test('SDK correlates concurrent responses arriving out of order', async () => {
  const messages = [];
  const native = { postMessage: text => messages.push(JSON.parse(text)) };
  const { sdk } = setup(native);
  const one = sdk.device.info(); const two = sdk.device.info();
  assert.equal(messages[0].version, 1); assert.equal(messages[0].method, 'device.info');
  native.onmessage({ data: '{bad json' });
  native.onmessage({ data: JSON.stringify({ id: messages[1].id, ok: true, result: 'second' }) });
  native.onmessage({ data: JSON.stringify({ id: messages[0].id, ok: true, result: 'first' }) });
  assert.equal(await one, 'first'); assert.equal(await two, 'second');
});
test('SDK rejects structured native errors, unavailable transport, timeout and unload', async () => {
  await assert.rejects(setup().sdk.device.info(), { code: 'UNAVAILABLE' });
  const messages = [];
  const native = { postMessage: text => messages.push(JSON.parse(text)) };
  const { sdk, listeners } = setup(native);
  const unknown = sdk.invoke('unknown');
  native.onmessage({ data: JSON.stringify({ id: messages[0].id, ok: false, error: { code: 'UNKNOWN_METHOD', message: 'Unsupported' } }) });
  await assert.rejects(unknown, { code: 'UNKNOWN_METHOD' });
  await assert.rejects(sdk.invoke('device.info', {}, { timeout: 5 }), { code: 'TIMEOUT' });
  const cancelled = sdk.device.info(); listeners.pagehide();
  await assert.rejects(cancelled, { code: 'CANCELLED' });
});
test('SDK rejects invalid requests and serialization/transport failures', async () => {
  const { sdk } = setup({ postMessage() { throw new Error('Disconnected'); } });
  await assert.rejects(sdk.invoke('test', []), { code: 'INVALID_REQUEST' });
  await assert.rejects(sdk.device.info(), { code: 'TRANSPORT_ERROR' });
  const circular = {}; circular.self = circular;
  await assert.rejects(sdk.invoke('test', circular), { code: 'TRANSPORT_ERROR' });
});
