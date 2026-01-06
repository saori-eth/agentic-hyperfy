import { System } from './System'

export class Collections extends System {
  constructor(world) {
    super(world)
    this.collections = []
    this.devApps = []
  }

  init({ collections, devApps }) {
    if (collections) {
      this.deserialize(collections)
    }
    if (devApps) {
      this.devApps = devApps
    }
  }

  get(id) {
    return this.collections.find(coll => coll.id === id)
  }

  getDevApp(id) {
    return this.devApps.find(app => app.id === id)
  }

  updateDevApp(appName, blueprint) {
    const existing = this.devApps.find(app => app.id === appName)
    if (existing) {
      existing.blueprints = [blueprint]
      existing.name = blueprint.name || appName
    } else {
      this.devApps.push({
        id: appName,
        name: blueprint.name || appName,
        blueprints: [blueprint],
      })
    }
  }

  removeDevApp(appName) {
    this.devApps = this.devApps.filter(app => app.id !== appName)
  }

  deserialize(data) {
    this.collections = data
  }

  serialize() {
    return this.collections
  }

  destroy() {
    this.collections = []
    this.devApps = []
  }
}
