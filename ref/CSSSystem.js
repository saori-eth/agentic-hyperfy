import * as THREE from 'three'
import { CSS3DRenderer } from 'three/examples/jsm/renderers/CSS3DRenderer.js'

const v1 = new THREE.Vector3()

export class CSSSystem {
  constructor(engine, elem) {
    this.engine = engine
    this.elem = elem
    this.init()
  }

  init() {
    if (!this.elem) return
    this.scene = new THREE.Scene()
    this.renderer = new CSS3DRenderer({ element: this.elem })
  }

  resize(width, height) {
    if (!this.elem) return
    this.renderer.setSize(width, height)
  }

  add(object3d) {
    this.scene.add(object3d)
  }

  remove(object3d) {
    this.scene.remove(object3d)
  }

  update(delta) {
    if (!this.elem) return
    for (const objectCSS of this.scene.children) {
      // if (objectCSS.interacting) return // interaction stablization
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
}
