# packages/sdk

`src/wavrynt.js` is a dependency-free browser script staged as `/__wavrynt/sdk.js` in Android builds. Include it before application scripts that need native functionality. It exposes:

```js
const info = await Wavrynt.device.info();
// { platform: 'android', manufacturer, model, osVersion, sdkVersion }
const sameInfo = await Wavrynt.invoke('device.info', {}, { timeout: 10000 });
```

Calls return Promises. Requests carry a protocol version, unique ID, method and params object. Replies settle the matching request; native errors become JavaScript Errors with a `code` property. Unknown operations are rejected by Kotlin. The SDK handles timeouts, transport errors and page unloads. Without the Android transport it rejects with `UNAVAILABLE`; loading the SDK itself on an ordinary web server requires serving the script yourself.

The transport boundary is separate from the native operation dispatcher, allowing future platforms to implement the same protocol. There is no arbitrary native method access and no insecure JavaScript-interface fallback.
