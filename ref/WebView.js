import * as THREE from 'three'
import { isArray, isNumber } from 'lodash'
import { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js'

import { Node } from './Node'

const defaults = {
  name: 'webview',
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  width: 1,
  height: 1,
  factor: 100,
}

const v1 = new THREE.Vector3()

export class WebView extends Node {
  constructor(
    engine,
    { id, name, position, rotation, width, height, src, factor, onPointerDown }
  ) {
    super(engine)
    this.isWebView = true

    this.id = id
    this.name = name || defaults.name
    this.object3d = new THREE.Object3D()
    this.object3d.position.fromArray(position || defaults.position)
    this.object3d.rotation.fromArray(rotation || defaults.rotation)
    this.object3d.hyperfyNode = this
    this.width = isNumber(width) ? width : defaults.width
    this.height = isNumber(height) ? height : defaults.height
    this.src = src
    this.factor = isNumber(factor) ? factor : defaults.factor

    // clicking the iframe in-world unlocks the pointer
    // so you can interact with it.
    this.hitDistance = Infinity
    this.$onPointerDown = onPointerDown

    // const iframe = this.web?.iframe
    // if (!iframe) return
    // iframe.contentWindow.postMessage(
    //   // JSON.stringify({ event: 'command', func: 'pauseVideo' }),
    //   // JSON.stringify({ event: 'command', func: 'playVideo' }),
    //   // JSON.stringify({ event: 'command', func: 'setVolume', args: [50] }), // 0-100
    //   JSON.stringify({ event: 'command', func: 'getVolume' }), // 0-100
    //   'https://www.youtube.com'
    //   // '*'
    // )
    // console.log('HEY')
  }

  onMount() {
    if (!this.parent.object3d) {
      throw new Error(
        `<${this.name}> cannot be placed inside <${this.parent.name}>`
      )
    }
    this.parent.object3d.add(this.object3d)
    this.build()
  }

  onUnmount() {
    this.cleanup()
    this.parent.object3d.remove(this.object3d)
  }

  onPointerDown(e) {
    if (this.$onPointerDown) {
      this.$onPointerDown(e)
      if (e.defaultPrevented) return
    }
    if (this.engine.driver.desktopControls.enabled) {
      this.engine.driver.desktopControls.exitPointerLock()
    }
  }

  build() {
    if (this.engine.isServer) return
    this.cleanup()

    // mesh

    const geometry = new THREE.PlaneGeometry(this.width, this.height)
    const material = new THREE.MeshBasicMaterial({
      opacity: 0,
      color: new THREE.Color('black'),
      blending: this.src ? THREE.NoBlending : THREE.NormalBlending,
      side: THREE.DoubleSide,
    })
    this.mesh = new THREE.Mesh(geometry, material)
    this.object3d.add(this.mesh)

    // html

    if (this.src) {
      const width = `${this.width * this.factor}px`
      const height = `${this.height * this.factor}px`

      const container = document.createElement('div')
      container.style.width = width
      container.style.height = height

      const inner = document.createElement('div')
      inner.style.width = width
      inner.style.height = height
      inner.style.backgroundColor = '#000'

      const iframe = document.createElement('iframe')
      iframe.frameborder = '0'
      iframe.allow =
        'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
      iframe.allowfullscreen = 'true'
      iframe.style.width = `${this.width * this.factor}px`
      iframe.style.height = `${this.height * this.factor}px`
      iframe.style.border = '0px'
      iframe.style.pointerEvents = 'none'
      iframe.src = this.src

      container.appendChild(inner)
      inner.appendChild(iframe)

      this.objectCSS = new CSS3DObject(container)
      this.objectCSS.target = this.mesh // important, the object3d to follow!
      this.mesh.updateMatrixWorld()
      this.mesh.matrixWorld.decompose(
        this.objectCSS.position,
        this.objectCSS.quaternion,
        v1
      )
      this.objectCSS.scale.setScalar(1 / this.factor)

      // IFrame Pointer Events Breaks Drag & Drop
      // ----------------------------------------
      // Chrome has a weird bug here where if the iframe receives pointer-events
      // the entire document can't listen for drag and drop events, which breaks our 3D/VRM
      // drag-drop functionality.
      // To fix this we only enable pointer-events when the mouse enters the iframe wrapper.
      // If we're not desktop just enable pointer-events

      // Interaction Stablization
      // ------------------------
      // When standing still the camera moves slightly with head idle animation.
      // This movement causes CSS3DRenderer to constantly move iframes ever so slightly, but browsers
      // don't like this tiny movement resulting in some click events etc not being registered within the iframe.
      // To solve this, we stop rendering our CSS3D when interacting with any iframe with the mouse.
      // See: iframe.interacting = Boolean flow

      if (!this.engine.isDesktop) {
        iframe.style.pointerEvents = 'auto'
      }
      inner.addEventListener('mouseenter', () => {
        if (this.engine.isDesktop) {
          this.objectCSS.interacting = true
          iframe.style.pointerEvents = 'auto'
        }
      })
      inner.addEventListener('mouseleave', () => {
        if (this.engine.isDesktop) {
          this.objectCSS.interacting = false
          iframe.style.pointerEvents = 'none'
        }
      })

      this.engine.css.add(this.objectCSS)
    }
  }

  cleanup() {
    if (this.mesh) {
      this.object3d.remove(this.mesh)
      this.mesh.geometry.dispose()
      this.mesh.material.dispose()
      this.mesh = null
    }
    if (this.objectCSS) {
      this.engine.css.remove(this.objectCSS)
      this.objectCSS = null
    }
  }

  onModify(props) {
    let rebuild
    if (props.hasOwnProperty('id')) {
      this.id = props.id
    }
    if (props.hasOwnProperty('name')) {
      this.name = props.name || defaults.name
    }
    if (props.hasOwnProperty('position')) {
      this.object3d.position.fromArray(props.position || defaults.position)
    }
    if (props.hasOwnProperty('rotation')) {
      this.object3d.rotation.fromArray(props.rotation || defaults.rotation)
    }
    if (props.hasOwnProperty('width')) {
      this.width = isNumber(props.width) ? props.width : defaults.width
      rebuild = true
    }
    if (props.hasOwnProperty('height')) {
      this.height = isNumber(props.height) ? props.height : defaults.height
      rebuild = true
    }
    if (props.hasOwnProperty('src')) {
      this.src = props.src
      rebuild = true
    }
    if (props.hasOwnProperty('factor')) {
      this.factor = isNumber(props.factor) ? props.factor : defaults.factor
      rebuild = true
    }
    if (rebuild) {
      this.build()
    }
  }

  onDestroy() {
    // ...
  }

  getRef() {
    const self = this
    return harden({
      getPosition(vec3) {
        vec3.x = self.object3d.position.x
        vec3.y = self.object3d.position.y
        vec3.z = self.object3d.position.z
      },
      setPosition(vec3) {
        self.object3d?.position.copy(vec3)
      },
      setPositionX(x) {
        self.object3d.position.x = x
      },
      setPositionY(y) {
        self.object3d.position.y = y
      },
      setPositionZ(z) {
        self.object3d.position.z = z
      },
      getRotation(eul) {
        eul.x = self.object3d.rotation.x
        eul.y = self.object3d.rotation.y
        eul.z = self.object3d.rotation.z
      },
      setRotation(eul) {
        self.object3d?.rotation.copy(eul)
      },
      setRotationX(x) {
        self.object3d.rotation.x = x
      },
      setRotationY(y) {
        self.object3d.rotation.y = y
      },
      setRotationZ(z) {
        self.object3d.rotation.z = z
      },
      getWorldPosition(vec3) {
        self.object3d.getWorldPosition(vec3)
      },
      getWorldRotation(eul) {
        self.object3d.getWorldQuaternion(q1)
        eul.setFromQuaternion(q1)
      },
      getWorldDirection(vec3) {
        self.object3d.getWorldDirection(vec3)
      },
    })
  }
}
