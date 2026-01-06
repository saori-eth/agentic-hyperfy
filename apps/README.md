# Dev Apps

This directory contains local development apps that can be edited in your IDE with hot-reload support.

## Setup

1. Add `DEV_APPS=true` to your `.env` file
2. Restart the server
3. Dev apps will appear in the "Add" panel under "Dev Apps"

## App Structure

Each app is a folder containing:

```
apps/
  my-app/
    blueprint.json    # App configuration
    index.js          # App script
    assets/           # Models, textures, etc.
      model.glb
      texture.png
```

## blueprint.json

The blueprint defines your app's configuration:

```json
{
  "name": "My App",
  "desc": "Description of my app",
  "author": "Your Name",
  "model": "./assets/model.glb",
  "script": "./index.js",
  "props": {},
  "preload": false,
  "public": false
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Display name of the app |
| `desc` | string | Optional description |
| `author` | string | Optional author name |
| `model` | string | Path to GLB/VRM model (relative to app folder) |
| `script` | string | Path to script file (relative to app folder) |
| `image` | object | Optional thumbnail `{ "url": "./assets/thumb.png" }` |
| `props` | object | Custom properties (see Props section) |
| `preload` | boolean | Whether to preload before entering world |
| `public` | boolean | Whether app is publicly accessible |
| `locked` | boolean | Prevent script/model changes |
| `frozen` | boolean | Prevent all modifications |
| `unique` | boolean | Each spawn is independent |
| `scene` | boolean | This is a scene app (replaces environment) |

## Props

Define custom properties that appear in the app's inspector panel:

```json
{
  "props": {
    "speed": 1.0,
    "color": "#ff0000",
    "model": {
      "type": "model",
      "url": "./assets/custom.glb"
    }
  }
}
```

Asset props require `type` and `url`:
- `type`: `"model"`, `"avatar"`, `"texture"`, `"audio"`
- `url`: Relative path to the asset

## Scripts

Scripts use the standard Hyperfy app API:

```javascript
// Access props
const speed = app.props.speed

// Load assets using relative paths
const texture = app.asset('./assets/texture.png')
const model = app.asset('./assets/model.glb')

// Lifecycle events
app.on('start', () => {
  console.log('App started!')
})

app.on('update', delta => {
  // Called every frame
})

app.on('destroy', () => {
  // Cleanup
})
```

### app.asset(relativePath)

Resolves relative asset paths to proper URLs. Use this for loading images, models, audio, etc. in your scripts:

```javascript
const image = app.create('image')
image.src = app.asset('./assets/sprite.png')
app.add(image)
```

See the [scripting documentation](../docs/scripting/README.md) for the full API.

## Hot Reload

When you save any file in your app folder:
1. The server detects the change
2. The blueprint is reloaded
3. All spawned instances of the app are rebuilt
4. No browser refresh needed!

**Note:** All instances of a dev app share the same blueprint, so changes affect all spawned copies.

## Asset Paths

Use relative paths starting with `./`:

```json
{
  "model": "./assets/model.glb",
  "script": "./index.js",
  "props": {
    "texture": {
      "type": "texture", 
      "url": "./assets/texture.png"
    }
  }
}
```

These are resolved to `devapp://app-name/...` URLs internally.

## Tips

- Keep assets in the `assets/` subfolder for organization
- Use descriptive app folder names (they become the app ID)
- Check the server console for loading errors
- Props changes require re-spawning the app to see new fields

## Exporting

To share your app, you can export it as a `.hyp` file from the in-world inspector (download button). This bundles the blueprint and all assets into a single file.

