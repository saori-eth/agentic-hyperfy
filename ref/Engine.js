import React from 'react'
import EventEmitter from 'eventemitter3'
import createReconciler from 'react-reconciler'
import { isArray, isString } from 'lodash'

import { SettingsSystem } from './systems/SettingsSystem'
import { ScriptSystem } from './systems/ScriptSystem'
import { GraphicsSystem } from './systems/GraphicsSystem'
import { PhysicsSystem } from './systems/PhysicsSystem'
import { SpawnSystem } from './systems/SpawnSystem'
import { MirrorSystem } from './systems/MirrorSystem'
import { InputSystem } from './systems/InputSystem'
import { EntitySystem } from './systems/EntitySystem'
import { SyncSystem } from './systems/SyncSystem'
import { MeshSystem } from './systems/MeshSystem'
import { AudioSystem } from './systems/AudioSystem'
import { SpatialSystem } from './systems/SpatialSystem'
import { ImageSystem } from './systems/ImageSystem'
import { HDRSystem } from './systems/HDRSystem'
import { TrackSystem } from './systems/TrackSystem'
import { PanelSystem } from './systems/PanelSystem'
import { BillboardSystem } from './systems/BillboardSystem'
import { ChatSystem } from './systems/ChatSystem'
import { ScreenSystem } from './systems/ScreenSystem'
import { HookSystem } from './systems/HookSystem'
import { AnimationSystem } from './systems/AnimationSystem'
import { EffectSystem } from './systems/EffectSystem'
import { VRMSystem } from './systems/VRMSystem'
import { AvatarSystem } from './systems/AvatarSystem'
import { EntityInfoSystem } from './systems/EntityInfoSystem'
import { WorldEventSystem } from './systems/WorldEventSystem'
import { PlaceSystem } from './systems/PlaceSystem'
import { SignalSystem } from './systems/SignalSystem'
import { ClipSystem } from './systems/ClipSystem'
import { CSSSystem } from './systems/CSSSystem'
import { CamSystem } from './systems/CamSystem'
import { ReceiverSystem } from './systems/ReceiverSystem'
import { AnchorSystem } from './systems/AnchorSystem'
import { LightSystem } from './systems/LightSystem'
import { AuraSystem } from './systems/AuraSystem'
import { VehicleSystem } from './systems/VehicleSystem'

import { Space } from './components/Space'
import { Root } from './nodes/Root'

import * as hostConfig from './hostConfig'
import { physxPromise } from './PhysX'
import { ErrorBoundary } from './ErrorBoundary'
import { createFixedTimestep } from './createFixedTimestep'
import { CameraSystem } from './systems/CameraSystem'

const FIXED_TIMESTEP = 1 / 60

const reconciler = createReconciler(hostConfig)

export class Engine extends EventEmitter {
  constructor({ driver, canvas, cssElem, isSDK }) {
    super()
    this.id = null
    this.shard = null
    this.frame = 0
    // the number of seconds the server has been running for.
    // servers broadcast this time to clients, and clients
    // set it here.
    this.serverTime = 0

    this.driver = driver

    this.isSDK = isSDK
    this.checkDevice()

    this.entityInfo = new EntityInfoSystem(this)
    this.worldEvents = new WorldEventSystem(this)
    this.places = new PlaceSystem(this)
    this.signals = new SignalSystem(this)
    this.avatars = new AvatarSystem(this)
    this.settings = new SettingsSystem(this)
    this.scripts = new ScriptSystem(this)
    this.graphics = new GraphicsSystem(this, canvas)
    this.css = new CSSSystem(this, cssElem)
    this.animation = new AnimationSystem(this)
    this.clips = new ClipSystem(this)
    this.vrm = new VRMSystem(this)
    this.mirrors = new MirrorSystem(this)
    this.meshes = new MeshSystem(this)
    this.images = new ImageSystem(this)
    this.hdr = new HDRSystem(this)
    this.physics = null // loaded in init()
    this.root = null // loaded in init()
    this.input = new InputSystem(this)
    this.camera = new CameraSystem(this)
    this.entities = new EntitySystem(this)
    this.vehicles = new VehicleSystem(this)
    this.spawn = new SpawnSystem()
    this.hooks = new HookSystem(this)
    this.audio = new AudioSystem(this)
    this.spatial = new SpatialSystem(this)
    this.sync = new SyncSystem(this)
    this.anchors = new AnchorSystem(this)
    this.tracks = new TrackSystem(this)
    this.panels = new PanelSystem(this)
    this.billboards = new BillboardSystem(this)
    this.auras = new AuraSystem(this)
    this.chat = new ChatSystem(this)
    this.receivers = new ReceiverSystem(this)
    this.screens = new ScreenSystem(this)
    this.effects = new EffectSystem(this)
    this.cams = new CamSystem(this)
    this.lights = new LightSystem(this)

    this.container = reconciler.createContainer(this, false, false)
    this.update = createFixedTimestep(
      FIXED_TIMESTEP,
      this.fixedUpdate,
      this.regularUpdate
    )
    reconciler.injectIntoDevTools({
      bundleType: 1, // 0 for PROD, 1 for DEV
      version: '1.0.0', // version for your renderer
      rendererPackageName: 'hyperfy', // package name
      findHostInstanceByFiber: reconciler.findHostInstance, // host instance (root)
    })
  }

  checkDevice() {
    this.isServer = this.driver.isServer
    this.isClient = this.driver.isClient
    this.isMobile =
      this.driver.isClient &&
      /iPhone|iPad|iPod|Android/i.test(globalThis.navigator.userAgent)
    this.isVR =
      this.isClient && /OculusBrowser/i.test(globalThis.navigator.userAgent)
    this.isDesktop = this.driver.isClient && !this.isMobile && !this.isVR
    // device type
    const prev = this.deviceType
    this.deviceType = 'unknown'
    if (this.isServer) this.deviceType = 'server'
    if (this.isMobile) this.deviceType = 'phone'
    if (this.isVR) this.deviceType = 'vr'
    if (this.isDesktop) this.deviceType = 'desktop'
    if (this.deviceType !== prev) {
      this.emit('deviceType', this.deviceType)
    }
  }

  async init() {
    if (this.hasInit) return
    // ensure physx is loaded
    await physxPromise
    this.physics = new PhysicsSystem(this)
    this.root = new Root(this)
    reconciler.updateContainer(
      <ErrorBoundary onError={this.onError}>
        <React.Suspense fallback={null}>
          <Space engine={this} />
        </React.Suspense>
      </ErrorBoundary>,
      this.container,
      null,
      null
    )
    this.hasInit = true
  }

  regularUpdate = (delta, frame, stats) => {
    this.serverTime += delta
    // this.currentDelta = delta
    this.frame++
    this.input.update(delta, frame, stats)
    this.vehicles.update(delta)
    this.entities.update(delta, frame, stats)
    this.billboards.update()
    this.spatial.update(delta)
    this.auras.update(delta)
    this.hooks.update(delta, frame, stats)
    this.animation.update(delta)
    this.vrm.update(delta)
    this.camera.update(delta)
    this.graphics.preupdate(delta, frame, stats)
    this.physics.preupdate(delta, frame, stats)
    this.physics.update(delta, frame, stats)
    this.css.update(delta, frame, stats)
    this.graphics.update(delta, frame, stats)
  }

  fixedUpdate = (delta, frame, stats) => {
    this.physics.fixedUpdate(delta, frame, stats)
    this.vehicles.fixedUpdate(delta)
    this.entities.fixedUpdate(delta, frame, stats)
  }

  teleport(entityUid, ...args) {
    /**
     * args can be either:-
     *  - the ID of a place
     *  - a world position[] and rotationY (in degrees)
     */
    let place
    if (isString(args[0])) {
      place = this.places.find(args[0])
    } else if (isArray(args[0])) {
      place = {
        position: args[0],
        rotationY: args[1],
      }
    }
    if (!place) return

    // if no entityUid then use local avatar
    const avatar = entityUid
      ? this.entities.get(entityUid)
      : this.driver.avatarEntity
    if (!avatar) return
    if (!avatar.node?.isAvatar) return
    const isLocal = avatar.isOwner()

    if (isLocal) {
      // if this is our avatar, teleport ourselves
      avatar.node.teleport({
        position: place.position,
        rotationY: place.rotationY,
      })
    } else {
      // otherwise send a signal to the other avatars to teleport themselves
      this.sync.teleport(avatar.uid, place.position, place.rotationY)
    }
  }

  setServerTime(time) {
    this.serverTime = time
  }

  onError(err) {
    console.error(err)
  }

  destroy() {
    this.graphics.destroy()
    this.physics.destroy()
    reconciler.updateContainer(null, this.container, null, () => {
      // ...
    })
  }
}
