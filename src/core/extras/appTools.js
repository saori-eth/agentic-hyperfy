import { cloneDeep } from 'lodash-es'

function getAppNameFromUrl(url) {
  if (!url || typeof url !== 'string') return null
  const match = url.match(/^app:\/\/([^/]+)\//)
  return match ? match[1] : null
}

function getAppNameFromBlueprint(blueprint) {
  if (!blueprint) return null
  // Prefer script (most reliable)
  const fromScript = getAppNameFromUrl(blueprint.script)
  if (fromScript) return fromScript
  const fromModel = getAppNameFromUrl(blueprint.model)
  if (fromModel) return fromModel
  const imageUrl = typeof blueprint.image === 'string' ? blueprint.image : blueprint.image && blueprint.image.url
  const fromImage = getAppNameFromUrl(imageUrl)
  if (fromImage) return fromImage
  for (const value of Object.values(blueprint.props || {})) {
    if (value?.url) {
      const fromProp = getAppNameFromUrl(value.url)
      if (fromProp) return fromProp
    }
  }
  return null
}

export async function exportApp(blueprint, resolveFile) {
  blueprint = cloneDeep(blueprint)

  // get all asset urls
  const assets = []
  if (blueprint.model) {
    assets.push({
      type: blueprint.model.endsWith('.vrm') ? 'avatar' : 'model',
      url: blueprint.model,
      file: await resolveFile(blueprint.model),
    })
  }
  if (blueprint.script) {
    let scriptFile
    // For local apps, fetch bundled script with all imports inlined
    if (blueprint.script.startsWith('app://') && typeof fetch !== 'undefined') {
      const scriptAppName = getAppNameFromUrl(blueprint.script)
      if (scriptAppName) {
        try {
          const bundleResp = await fetch(`/api/app-bundle/${encodeURIComponent(scriptAppName)}`)
          if (bundleResp.ok) {
            const bundledCode = await bundleResp.text()
            scriptFile = new File([bundledCode], 'index.js', { type: 'application/javascript' })
          } else {
            console.warn('[exportApp] bundle endpoint failed, using raw script:', bundleResp.status)
            scriptFile = await resolveFile(blueprint.script)
          }
        } catch (err) {
          console.warn('[exportApp] failed to fetch bundled script, using raw:', err)
          scriptFile = await resolveFile(blueprint.script)
        }
      } else {
        scriptFile = await resolveFile(blueprint.script)
      }
    } else {
      scriptFile = await resolveFile(blueprint.script)
    }
    assets.push({
      type: 'script',
      url: blueprint.script,
      file: scriptFile,
    })
  }
  // blueprint.image can be a string url or an object with { url }
  const imageUrl = typeof blueprint.image === 'string' ? blueprint.image : blueprint.image && blueprint.image.url
  if (imageUrl) {
    assets.push({
      type: 'texture',
      url: imageUrl,
      file: await resolveFile(imageUrl),
    })
  }
  for (const key in blueprint.props || {}) {
    const value = blueprint.props[key]
    if (value?.url) {
      assets.push({
        type: value.type,
        url: value.url,
        file: await resolveFile(value.url),
      })
    }
  }

  // Local apps: bundle apps/<appName>/assets/** for portability
  const appName = getAppNameFromBlueprint(blueprint)
  if (appName && typeof fetch !== 'undefined') {
    try {
      const resp = await fetch(`/api/app-assets/${encodeURIComponent(appName)}`)
      if (resp.ok) {
        const data = await resp.json()
        const files = Array.isArray(data?.files) ? data.files : []
        const existingUrls = new Set(assets.map(a => a.url))
        for (const relPath of files) {
          if (!relPath || typeof relPath !== 'string') continue
          // manifest returns paths relative to app root, e.g. "assets/foo.png"
          const url = `app://${appName}/${relPath.replace(/^\.\//, '')}`
          if (existingUrls.has(url)) continue
          assets.push({
            type: 'file',
            url,
            file: await resolveFile(url),
          })
          existingUrls.add(url)
        }
      } else {
        console.warn('[exportApp] app assets manifest not available:', resp.status)
      }
    } catch (err) {
      console.warn('[exportApp] failed to fetch app assets manifest', err)
    }
  }

  if (blueprint.locked) {
    blueprint.frozen = true
  }
  if (blueprint.disabled) {
    blueprint.disabled = false
  }

  const filename = `${blueprint.name || 'app'}.hyp`

  // create header
  const header = {
    blueprint,
    assets: assets.map(asset => {
      return {
        type: asset.type,
        url: asset.url,
        size: asset.file.size,
        mime: asset.file.type,
      }
    }),
  }

  // convert header to Uint8Array
  const headerBytes = new TextEncoder().encode(JSON.stringify(header))

  // create header size prefix (4 bytes)
  const headerSize = new Uint8Array(4)
  new DataView(headerSize.buffer).setUint32(0, headerBytes.length, true)

  // combine all file data
  const fileBlobs = await Promise.all(assets.map(asset => asset.file.arrayBuffer()))

  // create final blob with header size + header + files
  const file = new File([headerSize, headerBytes, ...fileBlobs], filename, {
    type: 'application/octet-stream',
  })

  return file
}

export async function importApp(file) {
  // read as ArrayBuffer
  const buffer = await file.arrayBuffer()
  const view = new DataView(buffer)

  // read header size (first 4 bytes)
  const headerSize = view.getUint32(0, true)

  // read header
  const bytes = new Uint8Array(buffer.slice(4, 4 + headerSize))
  const header = JSON.parse(new TextDecoder().decode(bytes))

  // extract files
  let position = 4 + headerSize
  const assets = []

  for (const assetInfo of header.assets) {
    const data = buffer.slice(position, position + assetInfo.size)
    const file = new File([data], assetInfo.url.split('/').pop(), {
      type: assetInfo.mime,
    })
    assets.push({
      type: assetInfo.type,
      url: assetInfo.url,
      file,
    })
    position += assetInfo.size
  }

  return {
    blueprint: header.blueprint,
    assets,
  }
}
