# ADR 0002: Shared tool home and generated project layout

## Decision

Install one CLI for all projects and store future toolchain/cache data under a shared Wavrynt home (`~/.wavrynt` by default). `wavrynt install` initializes the home; npm installs the actual CLI binary. `wavrynt create <name>` creates an application as a direct child of the current working directory, never inside shared tool home unless the user deliberately runs it there.

Generated application:

```
app-name/
  frontend/
    index.html
    style.css
    app.js
  backend/
    README.md
  wavrynt.config.mjs
  .gitignore
  README.md
```

The backend is optional. Version one leaves it as a placeholder. Remote HTTP integrations may point outside this project. Existing websites initialized with `wavrynt init` retain their current directories, to prevent destructive migration.

## Generator responsibilities

- CLI `main.js` dispatches commands.
- `create.js` validates target and prevents clobbering an existing directory.
- `project.js` invokes frontend/backend/config generators.
- Templates hold static starter files.
- `doctor.js` validates generated configuration and entry file.

## Non-goals in this milestone

No APK generation, Android runtime, framework auto-detection, local Python interpreter, or functioning server generated here.
