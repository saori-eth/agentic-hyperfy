import { System } from './System'

export class Collections extends System {
  constructor(world) {
    super(world)
    this.collections = []
    this.localApps = []
  }

  init({ collections, localApps }) {
    if (collections) {
      this.deserialize(collections)
    }
    if (localApps) {
      this.localApps = localApps
    }
  }

  get(id) {
    return this.collections.find(coll => coll.id === id)
  }

  getLocalApp(id) {
    return this.localApps.find(app => app.id === id)
  }

  updateLocalApp(appName, blueprint) {
    const existing = this.localApps.find(app => app.id === appName)
    if (existing) {
      existing.blueprints = [blueprint]
      existing.name = blueprint.name || appName
    } else {
      this.localApps.push({
        id: appName,
        name: blueprint.name || appName,
        blueprints: [blueprint],
      })
    }
  }

  removeLocalApp(appName) {
    this.localApps = this.localApps.filter(app => app.id !== appName)
  }

  deserialize(data) {
    this.collections = data
  }

  serialize() {
    return this.collections
  }

  destroy() {
    this.collections = []
    this.localApps = []
  }
}
