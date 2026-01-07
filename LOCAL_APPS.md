# Local App Development Feature

## Summary

This update introduces a **local app development workflow** that allows developers to build and test apps directly from the filesystem with **hot-reload** support.

### Key Changes

- **New `/apps` directory** - Local development apps live here with their assets
- **Hot-reload system** - File changes trigger automatic app reload without browser refresh
- **`npm run new-app <name>`** - CLI script to scaffold new apps
- **`app://` protocol** - Relative paths in blueprints resolve to `app://<name>/path`
- **Asset bundling** - Export includes all assets for portable `.hyp` files
- **Sidebar simplified** - Removed script editor/metadata UI (224 lines removed)

### Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         DEVELOPMENT FLOW                            │
└─────────────────────────────────────────────────────────────────────┘

  apps/                          src/server/
  ├── my-app/                    ├── localApps.js ◄──── File Watcher
  │   ├── blueprint.json              │                 (chokidar)
  │   ├── index.js         ──────────►│                     │
  │   └── assets/                     │                     │
  │       └── model.glb               ▼                     │
  │                          ┌────────────────┐             │
  └── another-app/           │  LocalApps     │◄────────────┘
      └── ...                │  Class         │
                             └───────┬────────┘
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         │                           │                           │
         ▼                           ▼                           ▼
  ┌──────────────┐         ┌─────────────────┐         ┌────────────────┐
  │ /app-assets/ │         │ WebSocket       │         │ World          │
  │ static route │         │ localAppReloaded│         │ blueprints     │
  └──────────────┘         └─────────────────┘         └────────────────┘
         │                           │                           │
         └───────────────────────────┼───────────────────────────┘
                                     │
                                     ▼
                          ┌─────────────────────┐
                          │   CLIENT BROWSER    │
                          │                     │
                          │  ClientLoader       │
                          │  ├─ clearLocalApp() │ ◄── Cache busting
                          │  └─ resolve app://  │
                          │                     │
                          │  ClientNetwork      │
                          │  └─ handle reload   │
                          └─────────────────────┘
```

### App Structure

```
apps/
└── spinning-box/
    ├── blueprint.json    ─── { name, model, script, props }
    ├── index.js          ─── app.on('update', delta => {...})
    └── assets/
        └── empty.glb
```

### URL Resolution

```
blueprint.json                    Resolved URL
───────────────────────────────────────────────────────
"./assets/model.glb"      →      app://spinning-box/assets/model.glb
"./index.js"              →      app://spinning-box/index.js
                                        │
                                        ▼
                                 /app-assets/spinning-box/...
```

### Hot Reload Sequence

```
 ┌──────────┐     ┌───────────┐     ┌────────────┐     ┌────────┐
 │  Editor  │     │  Chokidar │     │ LocalApps  │     │ Client │
 └────┬─────┘     └─────┬─────┘     └──────┬─────┘     └───┬────┘
      │                 │                  │               │
      │ save file       │                  │               │
      ├────────────────►│                  │               │
      │                 │ debounce 300ms   │               │
      │                 ├─────────────────►│               │
      │                 │                  │               │
      │                 │    reload blueprint              │
      │                 │                  ├───────┐       │
      │                 │                  │       │       │
      │                 │                  │◄──────┘       │
      │                 │                  │               │
      │                 │   localAppReloaded (ws)          │
      │                 │                  ├──────────────►│
      │                 │                  │               │
      │                 │                  │  clear cache  │
      │                 │                  │               ├───┐
      │                 │                  │               │   │
      │                 │                  │               │◄──┘
      │                 │                  │  rebuild app  │
      │                 │                  │               ├───┐
      │                 │                  │               │   │
      │                 │                  │               │◄──┘
      │                 │                  │               │
```
