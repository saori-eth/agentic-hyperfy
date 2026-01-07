# Hyperfy

A real-time 3D virtual world engine built on Three.js and WebGL. Full backend/frontend solution with PhysX physics and server-side simulation out of the box. All scripts run on both server and client. First-class support for .vrm avatars, and all .glb/.vrm models are instanced by default.

## Quick Start

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` to enter the world.

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

```bash
fly launch    # First time setup
fly deploy    # Deploy updates
```

By default, Hyperfy uses local SQLite and filesystem storage which persist to the Fly volume. You do not need Fly's hosted Postgres or Tigris unless you explicitly configure them via environment variables:

- `DB_URI=postgres://...` - Use external Postgres instead of SQLite
- `ASSETS=s3` + `ASSETS_S3_URI=s3://...` - Use S3/R2 instead of local storage

See `fly.toml` for configuration.
