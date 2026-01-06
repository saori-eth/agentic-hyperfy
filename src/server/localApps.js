import fs from 'fs-extra'
import path from 'path'
import chokidar from 'chokidar'

/**
 * LocalApps System
 *
 * Loads apps from the /apps directory (default development workflow).
 * Each app is a folder with:
 *   - blueprint.json (app configuration with relative paths)
 *   - index.js (the script)
 *   - /assets (folder for models, textures, etc.)
 *
 * Relative paths in blueprint.json are resolved to app://<app-name>/...
 * which are then served via /app-assets/ static route.
 */
class LocalApps {
  constructor() {
    this.list = []
    this.blueprints = new Map()
    this.dir = null
    this.watcher = null
    this.world = null
  }

  async init({ rootDir }) {
    this.dir = path.join(rootDir, 'apps')

    // Check if apps directory exists
    if (!fs.existsSync(this.dir)) {
      console.log('[localApps] no /apps directory found, skipping')
      return
    }

    console.log('[localApps] initializing from', this.dir)
    await this.scanApps()
  }

  async scanApps() {
    this.list = []
    this.blueprints.clear()

    const folderNames = fs.readdirSync(this.dir)

    for (const folderName of folderNames) {
      const folderPath = path.join(this.dir, folderName)
      const stats = fs.statSync(folderPath)
      if (!stats.isDirectory()) continue

      const blueprintPath = path.join(folderPath, 'blueprint.json')
      if (!fs.existsSync(blueprintPath)) {
        console.warn(`[localApps] ${folderName}: missing blueprint.json, skipping`)
        continue
      }

      try {
        const blueprint = await this.loadBlueprint(folderName, folderPath)
        this.list.push({
          id: folderName,
          name: blueprint.name || folderName,
          blueprints: [blueprint],
        })
        this.blueprints.set(folderName, blueprint)
        console.log(`[localApps] loaded: ${folderName}`)
      } catch (err) {
        console.error(`[localApps] ${folderName}: failed to load`, err.message)
      }
    }
  }

  async loadBlueprint(appName, folderPath) {
    const blueprintPath = path.join(folderPath, 'blueprint.json')
    const raw = fs.readJsonSync(blueprintPath)

    // Generate a stable ID based on app name
    const id = `app-${appName}`

    // Resolve relative paths to app:// protocol
    const blueprint = {
      id,
      version: Date.now(), // Use timestamp for cache busting
      name: raw.name || appName,
      image: this.resolveAppPath(raw.image, appName),
      author: raw.author || null,
      url: raw.url || null,
      desc: raw.desc || null,
      model: this.resolveAppPath(raw.model, appName),
      script: this.resolveAppPath(raw.script, appName),
      props: this.resolvePropsAppPaths(raw.props || {}, appName),
      preload: raw.preload || false,
      public: raw.public || false,
      locked: raw.locked || false,
      frozen: raw.frozen || false,
      unique: raw.unique || false,
      scene: raw.scene || false,
      disabled: raw.disabled || false,
    }

    return blueprint
  }

  /**
   * Resolve a relative path to app:// protocol
   * ./assets/model.glb -> app://app-name/assets/model.glb
   * ./index.js -> app://app-name/index.js
   */
  resolveAppPath(relativePath, appName) {
    if (!relativePath) return null

    // If it's already an absolute URL or protocol, return as-is
    if (
      relativePath.startsWith('http') ||
      relativePath.startsWith('asset://') ||
      relativePath.startsWith('app://')
    ) {
      return relativePath
    }

    // Handle image objects with url property
    if (typeof relativePath === 'object' && relativePath.url) {
      return {
        ...relativePath,
        url: this.resolveAppPath(relativePath.url, appName),
      }
    }

    // Remove leading ./ if present
    const cleanPath = relativePath.replace(/^\.\//, '')

    return `app://${appName}/${cleanPath}`
  }

  /**
   * Resolve all asset URLs in props
   */
  resolvePropsAppPaths(props, appName) {
    const resolved = {}
    for (const key in props) {
      const value = props[key]
      if (value && typeof value === 'object' && value.url) {
        resolved[key] = {
          ...value,
          url: this.resolveAppPath(value.url, appName),
        }
      } else {
        resolved[key] = value
      }
    }
    return resolved
  }

  /**
   * Start watching for file changes (called after world is set)
   */
  startWatching() {
    if (!this.dir || !this.world) return

    console.log('[localApps] starting file watcher')

    // Debounce timers per app to handle rapid file changes during creation
    this.reloadTimers = new Map()

    this.watcher = chokidar.watch(this.dir, {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 300, // Wait longer for file writes to complete
        pollInterval: 100,
      },
    })

    this.watcher.on('change', filePath => this.scheduleReload(filePath))
    this.watcher.on('add', filePath => this.scheduleReload(filePath))
    this.watcher.on('unlink', filePath => this.scheduleReload(filePath))
  }

  scheduleReload(filePath) {
    // Get the app name from the file path
    const relativePath = path.relative(this.dir, filePath)
    const appName = relativePath.split(path.sep)[0]
    if (!appName) return

    // Debounce reloads per app (300ms) to handle rapid file changes
    if (this.reloadTimers.has(appName)) {
      clearTimeout(this.reloadTimers.get(appName))
    }

    this.reloadTimers.set(
      appName,
      setTimeout(() => {
        this.reloadTimers.delete(appName)
        this.onFileChange(appName)
      }, 300)
    )
  }

  async onFileChange(appName) {
    const folderPath = path.join(this.dir, appName)
    const blueprintPath = path.join(folderPath, 'blueprint.json')

    console.log(`[localApps] reloading: ${appName}`)

    // Check if the app still exists
    if (!fs.existsSync(blueprintPath)) {
      console.log(`[localApps] ${appName}: removed`)
      this.blueprints.delete(appName)
      this.list = this.list.filter(c => c.id !== appName)
      // Notify clients to remove the app
      if (this.world?.network) {
        this.world.network.send('localAppRemoved', { appName })
      }
      return
    }

    // Validate blueprint.json is valid JSON before proceeding
    try {
      const content = fs.readFileSync(blueprintPath, 'utf8')
      JSON.parse(content)
    } catch (err) {
      console.warn(`[localApps] ${appName}: waiting for valid blueprint.json...`)
      return // File is still being written, will retry on next change
    }

    try {
      // Reload the blueprint
      const blueprint = await this.loadBlueprint(appName, folderPath)
      this.blueprints.set(appName, blueprint)

      // Update the list
      const existingIndex = this.list.findIndex(c => c.id === appName)
      if (existingIndex >= 0) {
        this.list[existingIndex].blueprints = [blueprint]
        this.list[existingIndex].name = blueprint.name || appName
      } else {
        this.list.push({
          id: appName,
          name: blueprint.name || appName,
          blueprints: [blueprint],
        })
      }

      // Clear loader cache for this app's assets
      if (this.world?.loader) {
        this.world.loader.clearLocalApp?.(appName)
      }

      // Update blueprint in the world's registry (only if it already exists)
      if (this.world?.blueprints) {
        const existingBlueprint = this.world.blueprints.get(blueprint.id)
        if (existingBlueprint) {
          this.world.blueprints.modify(blueprint)
        }
      }

      // Notify clients to reload
      if (this.world?.network) {
        this.world.network.send('localAppReloaded', { appName, blueprint })
      }

      console.log(`[localApps] ${appName}: reloaded`)
    } catch (err) {
      console.error(`[localApps] ${appName}: failed to reload -`, err.message)
    }
  }

  setWorld(world) {
    this.world = world
    this.startWatching()
  }

  destroy() {
    // Clear any pending reload timers
    if (this.reloadTimers) {
      for (const timer of this.reloadTimers.values()) {
        clearTimeout(timer)
      }
      this.reloadTimers.clear()
    }
    if (this.watcher) {
      this.watcher.close()
      this.watcher = null
    }
  }
}

export const localApps = new LocalApps()


