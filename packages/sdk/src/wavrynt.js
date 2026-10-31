/* Browser SDK: transport is injected only into the Android app's trusted origin. */
(() => {
  const pending = new Map();
  let sequence = 0;
  let transport;
  function failure(code, message) { return Object.assign(new Error(message), { code }); }
  function receive(event) {
    let response;
    try { response = JSON.parse(event.data); } catch { return; }
    if (!response || typeof response.id !== 'string' || typeof response.ok !== 'boolean') return;
    const request = pending.get(response.id);
    if (!request) return;
    pending.delete(response.id);
    clearTimeout(request.timer);
    if (response.ok) request.resolve(response.result);
    else request.reject(failure(response.error?.code ?? 'NATIVE_ERROR', response.error?.message ?? 'Native request failed'));
  }
  function invoke(method, params = {}, { timeout = 10000 } = {}) {
    if (typeof method !== 'string' || !params || typeof params !== 'object' || Array.isArray(params) ||
        !Number.isFinite(timeout) || timeout <= 0) return Promise.reject(failure('INVALID_REQUEST', 'Invalid method, params or timeout'));
    const native = globalThis.WavryntNative;
    if (!native?.postMessage) return Promise.reject(failure('UNAVAILABLE', 'Native bridge requires the Wavrynt Android host'));
    if (transport !== native) { native.onmessage = receive; transport = native; }
    const id = `${Date.now()}-${++sequence}`;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(failure('TIMEOUT', `Native request timed out: ${method}`));
      }, timeout);
      pending.set(id, { resolve, reject, timer });
      try { native.postMessage(JSON.stringify({ version: 1, id, method, params })); }
      catch (error) {
        clearTimeout(timer); pending.delete(id);
        reject(failure('TRANSPORT_ERROR', error.message));
      }
    });
  }
  globalThis.addEventListener('pagehide', () => {
    for (const request of pending.values()) {
      clearTimeout(request.timer);
      request.reject(failure('CANCELLED', 'Page unloaded'));
    }
    pending.clear();
  });
  globalThis.Wavrynt = Object.freeze({ invoke, device: Object.freeze({ info: () => invoke('device.info') }) });
})();
