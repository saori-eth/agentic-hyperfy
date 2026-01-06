# Changelog: 5d20037 → 49c52a7

## Commits

1. `49b3075` - dev app
2. `caf78f7` - boilerplate app script
3. `49c52a7` - remove apps

## Summary

Added a local development app system with hot-reload support, allowing developers to edit apps in their IDE with instant updates in the world.

## New Features

### Dev Apps System

A complete local development workflow for building Hyperfy apps:

- **Hot Reload**: File changes trigger automatic rebuilds of all spawned instances
- **IDE Integration**: Edit scripts and assets in your preferred editor
- **Asset Resolution**: New `devapp://` protocol for seamless asset loading

### CLI Scaffolding

```bash
npm run new-app <app-name>
```

Creates a new app with:
- `blueprint.json` - App configuration
- `index.js` - Script boilerplate
- `assets/` - Directory with placeholder `empty.glb`

## File Changes

### New Files

| File | Description |
|------|-------------|
| `src/server/devApps.js` | File watcher using chokidar, monitors `apps/` directory, reloads blueprints on changes, broadcasts updates to clients |
| `src/server/apps.js` | Serves dev app assets via `/dev-assets/` HTTP endpoint |
| `scripts/new-app.mjs` | CLI tool for scaffolding new apps |
| `apps/README.md` | Documentation for the dev apps system |
| `src/world/assets/empty.glb` | Default placeholder model for new apps |

### Modified Files

#### Core

| File | Changes |
|------|---------|
| `src/core/World.js` | Added `devAppsDir`/`devAppsUrl` config options; updated `resolveURL()` to handle `devapp://` protocol |
| `src/core/packets.js` | Added `devAppReloaded` and `devAppRemoved` packet types |
| `src/core/systems/Apps.js` | Added `app.asset()` helper to resolve relative paths for dev apps |
| `src/core/systems/Collections.js` | Added `devApps` array with `getDevApp()`, `updateDevApp()`, `removeDevApp()` methods |

#### Client

| File | Changes |
|------|---------|
| `src/client/components/Sidebar.js` | Added "Dev Apps" section in Add panel with green border styling; listens for reload/remove events |
| `src/core/systems/ClientNetwork.js` | Handles `devAppReloaded`/`devAppRemoved` packets; clears asset cache; rebuilds entities using updated blueprints |
| `src/core/systems/ClientLoader.js` | Added `clearDevApp()` method to bust cache on hot reload |

#### Server

| File | Changes |
|------|---------|
| `src/server/index.js` | Integrates dev apps system, serves `/dev-assets/` route |
| `src/core/systems/ServerLoader.js` | Added `clearDevApp()` method for cache invalidation |
| `src/core/systems/ServerNetwork.js` | Sends dev apps data to clients on connection |

### Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `chokidar` | `^3.6.0` | File system watching for hot reload |

## Protocol

### devapp:// URL Scheme

Resolves dev app assets differently based on context:

- **Server-side**: `devapp://app-name/file.png` → local filesystem path
- **Client-side**: `devapp://app-name/file.png` → `http://host/dev-assets/app-name/file.png`

## Usage

1. Add `DEV_APPS=true` to `.env`
2. Create an app: `npm run new-app my-app`
3. Edit `apps/my-app/index.js`
4. Save to hot-reload all instances in the world
