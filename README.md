# Wavrynt — Android runtime prototype

Wavrynt is a web-first framework for building mobile apps from existing web frontend codebases. It includes project generation, configuration validation, and a Kotlin Android WebView host with an asynchronous JavaScript bridge. `wavrynt build android` stages vanilla web assets and runs Gradle to compile a debug APK when the required toolchain is installed.

## Local development

Requires Node.js 20+.

```bash
npm install
npm test
npm run cli -- install
npm run cli -- create hello-app
npm run cli -- doctor hello-app
npm run cli -- build android hello-app
```

To make `wavrynt` available as a command on your machine during local development:

```bash
npm install -g ./packages/cli
```

The CLI will need its workspace dependencies resolvable; for easiest iteration during early development, use `npm run cli -- ...` from the monorepo root. A publishable standalone CLI package will be prepared later.

`wavrynt install` prepares a per-user directory at `~/.wavrynt` (Windows: under the user's home directory), unless `WAVRYNT_HOME` is set. It does **not** create a copy of the source repo or download Android tools yet.

`wavrynt create hello-app` creates `hello-app/` as a direct child of the **current working directory**, independent of the CLI installation folder. New apps contain `frontend/`, `backend/`, and `wavrynt.config.mjs`.

`wavrynt init` adds the config to a compatible existing vanilla website **without moving or rewriting the site's frontend files**. Migration to a standard `frontend/` layout can be a separately designed opt-in command.

## Code ownership

- `packages/cli/bin/wavrynt.js`: executable entrypoint
- `packages/cli/src/main.js`: command dispatcher
- `packages/cli/src/commands/install.js`: shared tools-home setup
- `packages/cli/src/commands/create.js`: safe project creation
- `packages/cli/src/generators/project.js`: coordinates generated files
- `packages/cli/src/generators/frontend.js`: copies vanilla template
- `packages/cli/src/generators/backend.js`: creates optional backend placeholder
- `packages/cli/src/generators/config.js`: writes `wavrynt.config.mjs`
- `packages/config/src/index.js`: loads and validates config
- `packages/cli/src/commands/build.js`: Android build command
- `packages/cli/src/build/`: application inspection, prerequisite checks and build orchestration
- `packages/cli/src/generators/android.js`: generates an isolated Android project
- `platforms/android/template/`: shared Kotlin host, native dispatcher and Gradle configuration
- `packages/sdk/src/wavrynt.js`: Promise-based browser SDK

## Android builds

Install JDK 17–23 (17 recommended), Android SDK Platform **35**, and Android Build Tools **35.0.0**. Set `JAVA_HOME` and `ANDROID_HOME`. No global Gradle installation or `GRADLE_HOME` is needed: generated projects include the official Gradle Wrapper, pinned to **8.11.1** with SHA-256 verification. Dependencies are pinned to Android Gradle Plugin 8.9.2, Kotlin 2.1.20 and AndroidX WebKit 1.12.1. The minimum Android version is API 23.

```bash
sdkmanager "platforms;android-35" "build-tools;35.0.0" "platform-tools"
sdkmanager --licenses
npm run cli -- build android school-app
```

From an application directory, use `wavrynt build android`. The command also finds configuration in parent directories. Each invocation creates `.wavrynt/android/build-<unique-id>/`; the success message prints the exact APK path under `app/build/outputs/apk/debug/app-debug.apk`. Builds preserve frontend source and earlier generated builds. Generated directories can be removed when no longer needed.

PowerShell users with script execution disabled can use `npm.cmd` instead of `npm`. No Android tools are downloaded by `wavrynt install`. The first build downloads and verifies Gradle 8.11.1 through the Wrapper, then downloads Maven dependencies. Subsequent builds reuse the shared Gradle user cache. A failed download stops the build without switching versions. See [Wrapper provenance](platforms/android/WRAPPER.md).

To use the native SDK, add this to a frontend HTML page before the script that calls it:

```html
<script src="/__wavrynt/sdk.js"></script>
<script>
  Wavrynt.device.info().then(info => console.log(info)).catch(console.error);
</script>
```

See [Android runtime architecture and verification](docs/architecture/0003-android-runtime.md) for the bridge protocol, staging rules, limitations and device test steps.

## Upcoming decisions

- Production installation/distribution of CLI
- Android toolchain download, version pinning and checksums
- Backend selection flags/template generators (e.g. `--backend fastapi`)
- Frontend framework adapters beyond vanilla
