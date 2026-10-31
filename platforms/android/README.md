# platforms/android

`template/` is the shared native host, copied into an application's generated build directory by the Android generator. It uses Kotlin, WebViewAssetLoader and AndroidX origin-restricted web messaging. App identity and entry URL are supplied by the generator; the host contains no app-specific behavior.

Build with `wavrynt build android [application-directory]`. Requirements, security boundaries and verification steps are documented in [ADR 0003](../../docs/architecture/0003-android-runtime.md).
