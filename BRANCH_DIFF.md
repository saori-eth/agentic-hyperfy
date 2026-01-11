# Branch Diff: `iframe` vs `main`

This document shows all changes made in the `iframe` branch compared to `main`.

## Summary of Changes

This branch implements the WebView node feature, which allows embedding interactive iframes in 3D space with proper depth occlusion using CSS3D rendering.

### Files Added
- `src/core/systems/ClientCSS.js` - CSS3D rendering system
- `src/core/nodes/WebView.js` - WebView node implementation
- `docs/scripting/nodes/types/WebView.md` - WebView documentation

### Files Modified
- `src/client/world-client.js` - Added CSS layer DOM element
- `src/core/createClientWorld.js` - Registered ClientCSS system
- `src/core/systems/ClientGraphics.js` - Added CSS3D rendering integration
- `src/core/nodes/index.js` - Exported WebView node

---

## New Files

### `src/core/systems/ClientCSS.js`

**Purpose:** Manages CSS3D rendering for WebView nodes (iframes in 3D space)

```javascript
import * as THREE from '../extras/three'
import { CSS3DRenderer } from 'three/examples/jsm/renderers/CSS3DRenderer.js'

import { System } from './System'

const v1 = new THREE.Vector3()

export class ClientCSS extends System {
  constructor(world) {
    super(world)
    this.scene = new THREE.Scene()
    this.renderer = null
    this.elem = null
  }

  async init({ cssLayer }) {
    if (!cssLayer) return
    this.elem = cssLayer
    this.renderer = new CSS3DRenderer({ element: this.elem })
  }

  start() {
    if (!this.elem) return
    this.world.graphics.on('resize', this.onResize)
    this.resize(this.world.graphics.width, this.world.graphics.height)
  }

  onResize = () => {
    this.resize(this.world.graphics.width, this.world.graphics.height)
  }

  resize(width, height) {
    if (!this.renderer) return
    this.renderer.setSize(width, height)
  }

  add(object3d) {
    this.scene.add(object3d)
  }

  remove(object3d) {
    this.scene.remove(object3d)
  }

  // Sync CSS objects to their target meshes after all transforms updated
  lateUpdate(delta) {
    if (!this.renderer) return
    for (const objectCSS of this.scene.children) {
      if (objectCSS.interacting) continue // interaction stabilization
      objectCSS.target.matrixWorld.decompose(
        objectCSS.position,
        objectCSS.quaternion,
        v1
      )
    }
  }

  // Render before WebGL (called from ClientGraphics.commit)
  render() {
    if (!this.renderer) return
    this.renderer.render(this.scene, this.world.camera)
  }

  destroy() {
    if (this.elem) {
      this.world.graphics.off('resize', this.onResize)
    }
  }
}
```

---

### `src/core/nodes/WebView.js`

**Purpose:** Node for embedding interactive iframes in 3D space

**Key Features:**
- Supports both `src` (URL) and `html` (inline HTML via srcdoc)
- Uses CSS3D + black mesh masking for proper depth occlusion
- Configurable width, height, and resolution factor
- Automatic pointer unlock on click (disabled in build mode)
- Desktop: pointer events enabled on mouseenter
- Mobile: pointer events always enabled

**Properties:**
- `src: String` - URL to load in iframe
- `html: String` - Raw HTML content for srcdoc
- `width: Number` - Width in meters (default: 1)
- `height: Number` - Height in meters (default: 1)
- `factor: Number` - Resolution scaling (default: 100)
- `onPointerDown: Function` - Click handler

```javascript
import { isNumber, isString } from 'lodash-es'
import * as THREE from '../extras/three'
import { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js'

import { Node } from './Node'

const defaults = {
  src: null,
  html: null,
  width: 1,
  height: 1,
  factor: 100,
}

const v1 = new THREE.Vector3()

export class WebView extends Node {
  constructor(data = {}) {
    super(data)
    this.name = 'webview'

    this.src = data.src
    this.html = data.html
    this.width = data.width
    this.height = data.height
    this.factor = data.factor

    this.n = 0
  }

  // ... (full implementation in file)

  build() {
    this.needsRebuild = false
    if (this.ctx.world.network.isServer) return
    this.unbuild()

    const hasContent = this._src || this._html

    // Create the black mesh (cutout)
    const geometry = new THREE.PlaneGeometry(this._width, this._height)
    const material = new THREE.MeshBasicMaterial({
      opacity: 0,
      color: new THREE.Color('black'),
      blending: hasContent ? THREE.NoBlending : THREE.NormalBlending,
      side: THREE.DoubleSide,
    })
    this.mesh = new THREE.Mesh(geometry, material)
    // ... add to scene and octree

    // Create the CSS3D iframe (only if we have content)
    if (hasContent) {
      const iframe = document.createElement('iframe')
      // ... configure iframe

      if (this._html) {
        iframe.srcdoc = this._html
      } else {
        iframe.src = this._src
      }

      this.objectCSS = new CSS3DObject(container)
      this.objectCSS.target = this.mesh // important: the mesh to follow
      this.objectCSS.scale.setScalar(1 / this._factor)

      // Add to CSS system
      this.ctx.world.css?.add(this.objectCSS)
    }
  }

  onPointerDown(e) {
    if (this._onPointerDown) {
      this._onPointerDown(e)
      if (e.defaultPrevented) return
    }
    // Don't unlock pointer in build mode
    if (this.ctx.world.builder?.enabled) return
    // Unlock pointer so user can interact with iframe
    if (this.ctx.world.controls?.pointer?.locked) {
      this.ctx.world.controls.unlockPointer()
    }
  }
}
```

---

### `docs/scripting/nodes/types/WebView.md`

Complete documentation with:
- Property descriptions
- Usage examples (basic website, TradingView widget, dashboard, portal wall)
- Important notes about performance and security

---

## Modified Files

### `src/client/world-client.js`

**Changes:**
1. Added `cssLayerRef` for CSS3D rendering layer
2. Pass `cssLayer` to world.init()
3. Added CSS layer styles with z-index stacking

```diff
export function Client({ wsUrl, onSetup }) {
  const viewportRef = useRef()
+ const cssLayerRef = useRef()
  const uiRef = useRef()

  useEffect(() => {
    const init = async () => {
      const viewport = viewportRef.current
+     const cssLayer = cssLayerRef.current
      const ui = uiRef.current
      // ...
-     const config = { viewport, ui, wsUrl, baseEnvironment }
+     const config = { viewport, cssLayer, ui, wsUrl, baseEnvironment }
      onSetup?.(world, config)
      world.init(config)
    }
  }, [])

  return (
    <div className='App'>
      <style>
        {`
          .App__viewport {
            position: absolute;
            inset: 0;
          }
+         .App__cssLayer {
+           position: absolute;
+           inset: 0;
+           z-index: 0;
+           pointer-events: none;
+         }
          .App__ui {
            position: absolute;
            inset: 0;
+           z-index: 2;
            pointer-events: none;
            user-select: none;
          }
        `}
      </style>
      <div className='App__viewport' ref={viewportRef}>
+       <div className='App__cssLayer' ref={cssLayerRef} />
        <div className='App__ui' ref={uiRef}>
          <CoreUI world={world} />
        </div>
      </div>
    </div>
  )
}
```

**Z-Index Stacking:**
- CSS layer: `z-index: 0` (behind)
- WebGL canvas: `z-index: 1` (middle, set in ClientGraphics)
- UI layer: `z-index: 2` (front)

---

### `src/core/createClientWorld.js`

**Changes:**
1. Import ClientCSS system
2. Register CSS system before graphics

```diff
+ import { ClientCSS } from './systems/ClientCSS'
  import { ClientGraphics } from './systems/ClientGraphics'

  export function createClientWorld() {
    // ...
    world.register('controls', ClientControls)
    world.register('network', ClientNetwork)
    world.register('loader', ClientLoader)
+   world.register('css', ClientCSS)
    world.register('graphics', ClientGraphics)
    // ...
  }
```

---

### `src/core/systems/ClientGraphics.js`

**Changes:**
1. Enable alpha transparency in WebGLRenderer
2. Set canvas z-index to 1
3. Call CSS render before WebGL render

```diff
  function getRenderer() {
    renderer = new THREE.WebGLRenderer({
      powerPreference: 'high-performance',
      antialias: true,
+     alpha: true, // Required for CSS3D WebView occlusion
    })
  }

  start() {
    // ...
    this.viewport.appendChild(this.renderer.domElement)
+   // Ensure canvas is above CSS3D layer for WebView occlusion
+   this.renderer.domElement.style.position = 'relative'
+   this.renderer.domElement.style.zIndex = '1'
    this.resizer.observe(this.viewport)
  }

  render() {
+   // Render CSS3D layer first (behind WebGL)
+   this.world.css?.render()
+   // Then render WebGL
    if (this.renderer.xr.isPresenting || !this.usePostprocessing) {
      this.renderer.render(this.world.stage.scene, this.world.camera)
    } else {
      // postprocessing...
    }
  }
```

---

### `src/core/nodes/index.js`

**Changes:**
1. Export WebView node as 'webview'

```diff
  export { Video as video } from './Video.js'
+ export { WebView as webview } from './WebView.js'
  export { Image as image } from './Image.js'
```

---

## Technical Architecture

### CSS3D + Black Mesh Masking

The WebView uses a clever technique to embed iframes in 3D space with proper depth occlusion:

1. **CSS Layer** (z-index: 0): Contains the CSS3DRenderer with iframes
2. **WebGL Canvas** (z-index: 1): Rendered with `alpha: true` transparency
3. **Black Mesh**: PlaneGeometry with `THREE.NoBlending` creates a "cutout"
4. **Result**: 3D objects properly occlude iframes, creating seamless integration

### Render Pipeline

```
lateUpdate() → ClientCSS syncs CSS3DObject transforms to target meshes
commit() →
  1. world.css.render() - Renders CSS3D layer (behind)
  2. WebGL render - Renders 3D scene with black cutout meshes (front)
```

### Interaction Handling

**Desktop:**
- Pointer events disabled by default (fixes Chrome drag-and-drop bug)
- `mouseenter` → enable pointer events + set `interacting = true`
- `mouseleave` → disable pointer events + set `interacting = false`
- `interacting` flag stops CSS3D position updates (stabilizes clicks)

**Mobile:**
- Pointer events always enabled
- No mouseenter/mouseleave handling needed

**Build Mode:**
- Clicking WebView doesn't unlock pointer
- User can move node around freely

---

## Usage Example

```javascript
// Basic URL embed
const webview = app.create('webview', {
  src: 'https://example.com',
  width: 2,
  height: 1.5,
  position: [0, 1.5, 0],
})
app.add(webview)

// TradingView widget (using HTML)
const chart = app.create('webview', {
  html: `
    <!DOCTYPE html>
    <html>
    <body>
      <div class="tradingview-widget-container" style="height:100%;width:100%">
        <script src="https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js" async>
        {"symbol": "NASDAQ:AAPL", "theme": "dark", "autosize": true}
        </script>
      </div>
    </body>
    </html>
  `,
  width: 3.2,
  height: 1.8,
  factor: 200, // Higher resolution for charts
})
app.add(chart)
```

---

## Compliance with v1 Critique

The implementation addresses the following requirements from the v1 migration critique:

✅ **Use a `webview` node** (not `uiiframe`)
✅ **Independent of UI node paradigm**
✅ **Use CSS3DRenderer** for positioning iframe behind WebGL canvas
✅ **Use mask/punch-out area** (black mesh with NoBlending)
⚠️ **Screen space mode** - Not implemented (only world space supported)

If screen space mode is needed, it would require:
- `space: 'world' | 'screen'` property
- Screen space rendering path (attach to UI layer)
- Different interaction model
