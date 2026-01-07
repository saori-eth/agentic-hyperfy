# Hyperfy

A real-time 3D virtual world engine built on Three.js and WebGL. Full backend/frontend solution with PhysX physics and server-side simulation out of the box. All scripts run on both server and client. First-class support for .vrm avatars, and all .glb/.vrm models are instanced by default.

## Clone

```bash
git clone https://github.com/saori-eth/agentic-hyperfy
cd agentic-hyperfy
```

## Quick Start

```bash
npm install
cp .env.example .env  # first run
npm run dev
```

Visit `http://localhost:3000` to enter the world.

AI assistants: this repo includes `CLAUDE.md`, which Claude Code uses as project context (build/run/deploy notes, conventions, etc.) so it can act with the right setup in mind.

Suggested first prompt: “create a new app and make a flower”

## App Development

Apps power Hyperfy's content - combining 3D models with scripts that run on both client and server.

### Create a New App

```bash
npm run new-app my-app
```

This scaffolds a new app in `apps/my-app/` with a blueprint.json, index.js script, and assets folder.

### Hot Reload

Edit any file in your app folder and save - changes reload instantly without browser refresh.

### Example Script

```javascript
app.on('update', delta => {
  // Called every frame on both client and server
})
```

## Documentation

- [Commands](./docs/commands.md)
- [Models](./docs/supported-files/models.md)
- [Scripting API](./docs/scripting/README.md)

## Deployment (Fly.io)

### Install Fly.io CLI

- macOS/Linux/WSL:

```bash
curl -L https://fly.io/install.sh | sh
```

- Then restart your shell (or add Fly to your `PATH`) and verify:

```bash
flyctl version
```

```bash
fly launch    # First time setup
fly deploy    # Deploy updates
```

By default, Hyperfy uses local SQLite and filesystem storage which persist to the Fly volume. You do not need Fly's hosted Postgres or Tigris unless you explicitly configure them via environment variables:

- `DB_URI=postgres://...` - Use external Postgres instead of SQLite
- `ASSETS=s3` + `ASSETS_S3_URI=s3://...` - Use S3/R2 instead of local storage

See `fly.toml` for configuration.
