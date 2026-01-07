#!/usr/bin/env node

import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.join(__dirname, '..')
const appsDir = path.join(rootDir, 'apps')

// Get app name from command line args
const appName = process.argv[2]

if (!appName) {
  console.error('Usage: npm run new-app <app-name>')
  console.error('Example: npm run new-app my-game')
  process.exit(1)
}

// Validate app name (alphanumeric, hyphens, underscores only)
if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(appName)) {
  console.error('Error: App name must start with a letter and contain only letters, numbers, hyphens, and underscores')
  process.exit(1)
}

const appDir = path.join(appsDir, appName)

// Check if app already exists
if (fs.existsSync(appDir)) {
  console.error(`Error: App "${appName}" already exists at ${appDir}`)
  process.exit(1)
}

// Create app directory structure
console.log(`Creating app: ${appName}`)

fs.ensureDirSync(appDir)
fs.ensureDirSync(path.join(appDir, 'assets'))

// Copy empty.glb as default model
const emptyGlbSrc = path.join(rootDir, 'src/world/assets/empty.glb')
const emptyGlbDest = path.join(appDir, 'assets/empty.glb')
if (fs.existsSync(emptyGlbSrc)) {
  fs.copyFileSync(emptyGlbSrc, emptyGlbDest)
}

// Copy app-icon.png as default thumbnail image
const appIconSrc = path.join(rootDir, 'src/world/assets/app-icon.png')
const appIconDest = path.join(appDir, 'assets/app-icon.png')
if (fs.existsSync(appIconSrc)) {
  fs.copyFileSync(appIconSrc, appIconDest)
}

// Create blueprint.json
const blueprint = {
  name: appName
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' '),
  desc: '',
  author: '',
  model: './assets/empty.glb',
  image: { url: './assets/app-icon.png' },
  script: './index.js',
  props: {},
  preload: false,
  public: false,
}

fs.writeJsonSync(path.join(appDir, 'blueprint.json'), blueprint, { spaces: 2 })

// Create index.js with boilerplate
const script = `/**
 * ${blueprint.name}
 * 
 * Edit this file and save to hot-reload!
 */

app.on('update', delta => {
  // Called every frame
  // delta is time since last frame in seconds
  app.rotation.y += 1 * delta
})

`

fs.writeFileSync(path.join(appDir, 'index.js'), script)

// Create .gitkeep in assets folder
fs.writeFileSync(path.join(appDir, 'assets', '.gitkeep'), '')

console.log(`
✓ Created ${appDir}
  ├── blueprint.json
  ├── index.js
  └── assets/
      ├── app-icon.png
      └── empty.glb

Next steps:
  1. Replace assets/empty.glb with your own model, or remove it
  2. Replace assets/app-icon.png with your own thumbnail, or remove it
  3. Edit index.js to add your app logic
  4. Place assets in the assets/ folder
  5. Use app.asset('./assets/file.png') to load assets in scripts
`)
