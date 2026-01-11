# WebView/IFrame 3D Integration

How the iframe "cuts through" the Three.js scene without blocking objects in front of it.

## The Technique: CSS3DRenderer + Black Mesh Masking

The system uses a layering trick combining Three.js's CSS3DRenderer with a "cutout" mesh.

### Layer Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Browser Window                        │
│  ┌───────────────────────────────────────────────────┐  │
│  │              WebGL Canvas (top layer)              │  │
│  │                                                    │  │
│  │    ┌──────────┐                                   │  │
│  │    │ Black    │  ← NoBlending mesh creates        │  │
│  │    │ Cutout   │    a "hole" in the scene          │  │
│  │    └──────────┘                                   │  │
│  │         ↓                                         │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │           CSS3D Layer (behind WebGL)              │  │
│  │                                                    │  │
│  │    ┌──────────┐                                   │  │
│  │    │ IFrame   │  ← Positioned to match the mesh   │  │
│  │    │          │                                   │  │
│  │    └──────────┘                                   │  │
│  │                                                    │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## How It Works

### 1. Black Mesh with NoBlending

**File:** `packages/hyperfy-engine/src/nodes/WebView.js:86-94`

```javascript
const material = new THREE.MeshBasicMaterial({
  opacity: 0,
  color: new THREE.Color('black'),
  blending: this.src ? THREE.NoBlending : THREE.NormalBlending,
  side: THREE.DoubleSide,
})
this.mesh = new THREE.Mesh(geometry, material)
```

- `THREE.NoBlending` writes solid black pixels directly to the framebuffer
- Creates a "window" or "cutout" in the WebGL scene
- The mesh participates in normal depth testing

### 2. CSS3DObject Tracks the Mesh

**File:** `packages/hyperfy-engine/src/nodes/WebView.js:125-133`

```javascript
this.objectCSS = new CSS3DObject(container)
this.objectCSS.target = this.mesh  // <-- links to the 3D mesh
this.mesh.matrixWorld.decompose(
  this.objectCSS.position,
  this.objectCSS.quaternion,
  v1
)
this.objectCSS.scale.setScalar(1 / this.factor)
```

- The CSS3DObject stores a reference to its target mesh
- Initial position/rotation copied from the mesh's world matrix
- Scale adjusted by `1/factor` to convert world units to pixels

### 3. Frame-by-Frame Sync

**File:** `packages/hyperfy-engine/src/systems/CSSSystem.js:32-46`

```javascript
update(delta) {
  for (const objectCSS of this.scene.children) {
    objectCSS.target.matrixWorld.decompose(
      objectCSS.position,
      objectCSS.quaternion,
      v1
    )
  }
  this.render()
}

render() {
  this.renderer.render(this.scene, this.engine.graphics.camera)
}
```

- Every frame, each CSS object syncs its transform to its target mesh
- CSS3DRenderer uses the **same camera** as the main graphics scene
- This keeps the iframe perfectly aligned with the mesh from any angle

### 4. Engine Integration

**File:** `packages/hyperfy-engine/src/Engine.js:57, 80, 182`

```javascript
constructor({ driver, canvas, cssElem, isSDK }) {
  // ...
  this.css = new CSSSystem(this, cssElem)
}

regularUpdate = (delta, frame, stats) => {
  // ...
  this.css.update(delta, frame, stats)   // CSS synced
  this.graphics.update(delta, frame, stats)  // Then WebGL renders
}
```

- `cssElem` is a separate DOM element positioned **behind** the WebGL canvas
- CSS system updates before graphics to ensure alignment

## Why Objects in Front Don't Get Blocked

1. **Normal WebGL Depth Testing** - The black mesh participates in depth testing like any other object
2. **Closer objects occlude the mesh** - If a 3D object is between the camera and the black mesh, it renders on top of the black pixels
3. **CSS layer is behind WebGL** - The iframe only shows through where the black mesh is visible in the final WebGL output
4. **Occlusion is automatic** - No special handling needed; standard 3D rendering rules apply

## Visual Flow

```
Camera
   │
   ▼
┌──────────────────┐
│ Object in front  │ ← Renders normally, covers black mesh
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│   Black Mesh     │ ← Creates the "window" for iframe
│   (NoBlending)   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Objects behind   │ ← Hidden by black mesh
└──────────────────┘
         │
    CSS Layer
         │
         ▼
┌──────────────────┐
│     IFrame       │ ← Shows through the black "window"
└──────────────────┘
```

## Key Points

| Component | Purpose |
|-----------|---------|
| `THREE.NoBlending` | Creates solid black pixels that act as a mask |
| `CSS3DObject.target` | Links the DOM element to its 3D mesh counterpart |
| `CSS3DRenderer` | Renders HTML elements in 3D space using CSS transforms |
| Shared camera | Ensures CSS elements move correctly with the scene |
| DOM layering | CSS element behind WebGL canvas creates the composite effect |
