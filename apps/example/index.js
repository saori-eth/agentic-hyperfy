app.keepActive = true
app.get('Cube').visible = false

// Use app.asset() to resolve relative paths to devapp:// URLs
const src = app.asset('./assets/cryptopunk.png')

const image = app.create('image')
image.pivot = 'bottom-center'
image.src = src
image.width = 1
image.height = 1
image.fit = 'contain'
image.color = 'transparent'
image.transparent = true
image.doubleside = true
image.lit = true
image.castShadow = true
image.receiveShadow = true
app.add(image)
