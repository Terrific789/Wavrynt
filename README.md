# Wavrynt Framework (foundation, v0.0.1)

**Web-first app framework.** This repository is the first working foundation, **not yet an Android APK builder**.

## Prerequisites
- Node.js 20+
- npm (included with Node.js)

## Quick start

```bash
npm install
npm test
npm run smoke
npm run cli -- create examples/my-first-app
npm run cli -- doctor examples/my-first-app
```

To add Wavrynt to your existing HTML/CSS/JS site:

```bash
cd path/to/your-site
node path/to/wavrynt-framework-starter/packages/cli/bin/wavrynt.js init
node path/to/wavrynt-framework-starter/packages/cli/bin/wavrynt.js doctor
```

`init` creates `wavrynt.config.mjs`, but **never overwrites** existing project files.

## Commands implemented
- `wavrynt help`
- `wavrynt create <folder>`: creates a vanilla starter site
- `wavrynt init [folder]`: adds config to existing vanilla site
- `wavrynt doctor [folder]`: validates config and local frontend files

## Not implemented yet
- Android host, WebView integration, native bridge, build APK command
- Python embedding, FastAPI adapter SDK, other frontend adapters

These are the next engineering milestones, not implemented functionality.

## Repository map
- `packages/cli`: Node.js CLI
- `packages/config`: config loading and validation
- `adapters/frontend-vanilla`: future vanilla integration boundary
- `adapters/backend-http`: future HTTP SDK boundary
- `platforms/android`: native host milestone
- `templates/vanilla`: starter website template
- `docs/architecture`: design decisions

See `docs/architecture/0001-foundation.md`.
