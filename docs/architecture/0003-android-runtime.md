# ADR 0003: First Android runtime

## Scope and ownership

This milestone extends the generator foundation described in ADR 0002. The shared repository installation stays separate from generated apps. No React/Vue adapter, embedded backend, iOS host or new rendering engine is introduced.

`commands/build.js` parses CLI arguments. `build/application.js` finds and validates the app and enumerates assets. `generators/android.js` copies the shared platform template and SDK. `build/android.js` validates the toolchain, runs Gradle and verifies that a non-empty APK exists. The Kotlin host and native operation dispatcher live in `platforms/android/template`; the browser SDK lives in `packages/sdk`.

## Generation and compilation

1. Resolve the directory argument (default: current directory), find `wavrynt.config.mjs` there or in a parent, and load it using the existing configuration module. Config remains executable, developer-owned JavaScript.
2. Validate configuration, require Android to be enabled (enabled by default), check the vanilla frontend root is inside the application, and require an existing HTML entry within that root.
3. Enumerate regular frontend files. Reject symbolic links/junctions, hidden frontend roots, and the reserved `__wavrynt` name. Exclude hidden files/directories, `node_modules`, `backend`, and `wavrynt.config.mjs`. These exclusions also apply to initialized sites whose frontend root is `.`. Put only deployable public files in the frontend; other non-hidden files are packaged as-is.
4. Create a fresh `.wavrynt/android/build-<unique-id>/` directory. Reject linked output directories. Copy the shared template, substitute app ID/version/label and URL-encoded entry, stage frontend files into `app/src/main/assets`, and copy the SDK into `assets/__wavrynt/sdk.js`. Sources are never edited and no old build directory is deleted.
5. Check JDK 17–23, the staged Wrapper files, Android Platform 35 and Build Tools 35.0.0. `JAVA_HOME` takes precedence over PATH; `ANDROID_HOME` takes precedence over `ANDROID_SDK_ROOT`. Normalize the SDK variables for Gradle. Missing prerequisites produce installation instructions and retain generated files for inspection. Global Gradle and `GRADLE_HOME` are not used.
6. Run the generated project's `gradlew.bat` on Windows or `gradlew` on Linux/macOS with `--no-daemon --console=plain :app:assembleDebug`. The generator ensures the Unix launcher is executable. A zero exit code and a non-empty `app/build/outputs/apk/debug/app-debug.apk` are required before reporting success. Wrapper download and Gradle failures propagate to the CLI's existing error handler without version fallback.

The host pins AGP 8.9.2, Kotlin 2.1.20 and AndroidX WebKit 1.12.1. It compiles/targets API 35 and runs on API 23+. The official Wrapper pins Gradle 8.11.1 and verifies the distribution SHA-256 before use. It downloads to the shared Gradle user cache; JDK and Android SDK installation remain manual. See [Wrapper provenance](../../platforms/android/WRAPPER.md). Generated files are disposable and direct modifications are not carried into later builds.

## Web rendering and security

WebViewAssetLoader serves bundled assets at `https://appassets.androidplatform.net/`. Mapping assets to `/` preserves root-relative asset URLs; the configured HTML entry is loaded directly. Local missing resources do not fall back to the network. JavaScript and DOM storage are enabled; file/content access, file URL access, mixed HTTP content and automatic popup creation are disabled. Cleartext network traffic is disabled in the manifest.

The app blocks nonlocal document navigations, including main-frame requests that bypass navigation callbacks. HTTPS subresources and API calls can work under normal WebView CORS rules. External links are blocked rather than opened in another app. Only package trusted frontend code: remote scripts loaded by a trusted page execute with that page's privileges. This host does not sanitize application JavaScript or supply an application-specific CSP.

The activity pauses/resumes the WebView, saves/restores navigation state, supports Back history, handles window insets, and destroys its WebView and message listener on teardown. Debug builds allow WebView debugging. Devices lacking `WEB_MESSAGE_LISTENER` show an instruction to update Android System WebView; there is no `addJavascriptInterface` fallback.

## JavaScript-to-Kotlin flow

Include `/__wavrynt/sdk.js` before using `Wavrynt.device.info()`. That helper calls the general SDK dispatcher:

```json
{"version":1,"id":"unique-request-id","method":"device.info","params":{}}
```

The SDK stores Promise callbacks by ID and sends JSON through `WavryntNative.postMessage`. AndroidX injects this transport only for the exact local HTTPS origin. The native listener additionally checks origin and requires the main frame. `NativeBridge.respond` validates the envelope and dispatches an explicit allowlist containing only `device.info`. It returns manufacturer, model, Android version and SDK level, without device identifiers or permissions.

Success replies use `{ "id": "...", "ok": true, "result": {...} }`. Errors use `{ "id": "...", "ok": false, "error": { "code": "UNKNOWN_METHOD", "message": "..." } }`. Malformed requests use `INVALID_REQUEST`; unparseable requests may have a null ID. The AndroidX reply proxy sends the response to the originating JavaScript object. The SDK resolves or rejects the matching Promise, supports concurrent out-of-order replies, ignores unrecognized responses, times out after ten seconds by default, and cancels pending requests on page unload.

The messaging interface is asynchronous; the initial inexpensive device-info operation runs on the UI thread. Future blocking operations need background execution and lifecycle cancellation before replying on the UI thread.

## Verification

From the repository in PowerShell:

```powershell
npm.cmd test
npm.cmd run smoke
node packages/cli/bin/wavrynt.js doctor school-app
node packages/cli/bin/wavrynt.js build android school-app
```

To install missing SDK components, with Android's command-line tools on PATH:

```powershell
sdkmanager.bat "platforms;android-35" "build-tools;35.0.0" "platform-tools"
sdkmanager.bat --licenses
# Set JAVA_HOME to a JDK 17–23 installation and ANDROID_HOME to the SDK.
# The Wrapper downloads and verifies Gradle 8.11.1 automatically.
node packages/cli/bin/wavrynt.js build android school-app
```

After a successful build, use the exact printed APK path:

```powershell
adb install -r "<printed-APK-path>"
adb shell am start -n com.example.schoolapp/dev.wavrynt.runtime.MainActivity
```

Substitute the application's configured ID if different. On an emulator/device, confirm the frontend renders, clicks and nested/root-relative assets work, navigation Back works, and rotation/background/resume preserve usable state. Load the SDK and display `await Wavrynt.device.info()` in the app. Confirm an unknown method rejects with `UNKNOWN_METHOD`, external document links cannot replace the app, and HTTP resources are blocked. Chrome's `chrome://inspect` can inspect the debug WebView.

Node tests cover generation, staging exclusions and source preservation, invalid config and paths, linked directories, tool discovery/version checks, CLI regression, compiler failures/missing output, the Windows process launcher, and SDK response correlation/errors/timeouts. The orchestration success test uses a simulated compiler; its artifact is explicitly not an APK. Node tests do not compile Kotlin or replace device tests.

## Current limitations

- Wrapper integration verification: the official Gradle 8.11.1 Wrapper was generated and all 32 Node tests passed. A real `school-app` build successfully downloaded and started Gradle 8.11.1 under JDK 23.0.2, but failed resolving `org.jetbrains.kotlin.android:org.jetbrains.kotlin.android.gradle.plugin:2.1.20` from Google, Maven Central and the Gradle Plugin Portal. Kotlin compilation did not start and no APK was generated. Versions were not changed and dependency downloads were not retried after that failure. The generated project was retained at `school-app/.wavrynt/android/build-Tseww7/`. No Android device tests were run.
- Debug APKs only; no release signing, bundles, store submission, app icons, version-code configuration, or automatic toolchain installation.
- Static vanilla assets only. No bundler, SPA route fallback, service-worker integration, file chooser/download handler, native permissions, or automatic backend startup. HTTP backend URLs accepted by the general schema cannot bypass Android's HTTPS policy; use HTTPS with appropriate CORS.
- The SDK is staged automatically but must be explicitly included by frontend pages. Plain browser previews do not expose the native transport.
- Build directories accumulate intentionally. Custom host changes belong in the shared template for now; no app-level native extension mechanism exists.
- Repository development is supported; publishing the CLI with its shared template/SDK remains a separate packaging milestone.

References: [Android local-content guidance](https://developer.android.com/develop/ui/views/layout/webapps/load-local-content), [origin-restricted messaging API](https://developer.android.com/reference/androidx/webkit/WebViewCompat), [AGP 8.9 compatibility](https://developer.android.com/build/releases/agp-8-9-0-release-notes).
