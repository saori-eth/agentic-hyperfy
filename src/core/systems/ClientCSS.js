import * as THREE from '../extras/three'
import { CSS3DRenderer } from 'three/examples/jsm/renderers/CSS3DRenderer.js'

import { System } from './System'

const v1 = new THREE.Vector3()

/**
 * ClientCSS System
 *
 * - Runs on the client
 * - Manages CSS3D rendering for WebView nodes (iframes in 3D space)
 * - Renders behind the WebGL canvas to create the cutout effect
 *
 */
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
