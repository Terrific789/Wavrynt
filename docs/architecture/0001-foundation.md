# ADR-0001: Wavrynt foundation

## Problem
Web developers need to turn existing HTML/CSS/JavaScript codebases into Android apps without a separate mobile UI rewrite.

## Initial scope
- Plain HTML/CSS/JS frontend (vanilla adapter)
- Android as first native platform
- Node.js JavaScript CLI, ESM config
- HTTP transport with FastAPI as future example, NOT a bundled Python server

## Technology decisions
- Start JavaScript first; add JSDoc/TypeScript checks incrementally.
- Use a separate Kotlin Android host and Android System WebView in the first runtime.
- Plan to load app assets through WebViewAssetLoader, never a broad untrusted file origin.
- Plan a message-based native bridge with strict origin checks, allowlisted methods and request IDs.
- Keep frontend adapters, backend transports and renderers distinct contracts.
- Respect Android lifecycle, signing, permissions, distribution policies.

## Deliberately deferred
- React/Vue/Angular detection, custom renderer, embedded Python, iOS, OTA updates.

## Next implementation milestone
Create Kotlin Android host in `platforms/android`, load the template UI from bundled assets, then add one secure bridge call with tests.
