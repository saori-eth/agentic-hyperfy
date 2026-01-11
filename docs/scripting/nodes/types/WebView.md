# WebView

Embeds an interactive iframe in 3D space that players can interact with. WebViews use CSS3D rendering with proper depth occlusion, allowing 3D objects to pass in front of them naturally.

When players click on a WebView, their pointer is unlocked so they can interact with the iframe content. The WebView automatically maintains synchronization between the CSS layer and 3D space.

## Properties

### `.src`: String

A URL to load in the iframe. This can be any website that allows iframe embedding.

Note: Some websites block embedding via `X-Frame-Options` headers. For these cases, use the `.html` property instead.

### `.html`: String

Raw HTML content to embed directly in the iframe using the `srcdoc` attribute. This is useful for:
- Embedding widgets that don't allow direct URL access (e.g., TradingView)
- Creating custom HTML interfaces
- Bypassing X-Frame-Options restrictions

When both `.src` and `.html` are set, `.html` takes precedence.

### `.width`: Number

The width of the WebView surface in meters. Defaults to `1`.

This determines the physical size of the iframe in the 3D world.

### `.height`: Number

The height of the WebView surface in meters. Defaults to `1`.

This determines the physical size of the iframe in the 3D world.

### `.factor`: Number

The resolution scaling factor. Higher values produce sharper content but use more memory. Defaults to `100`.

The actual iframe pixel dimensions are calculated as: `width * factor` by `height * factor`.

For high-detail content like charts or text, use values between `150-300`. For simple content, `100` is sufficient.

### `.doubleside`: Boolean

Whether the WebView should render on both sides of the plane. Defaults to `false` (single-sided).

When `true`, the iframe content is visible from both the front and back of the plane. When `false`, it's only visible from the front.

### `.onPointerDown`: Function

Callback function triggered when a player clicks on the WebView.

By default, clicking unlocks the pointer to allow iframe interaction. In build mode, pointer unlocking is automatically prevented. You can override this behavior by setting a custom `onPointerDown` handler and calling `e.preventDefault()`.

```javascript
webview.onPointerDown = (e) => {
  console.log('WebView clicked')
  e.preventDefault() // Prevents default pointer unlock behavior
}
```

### `.{...Node}`

Inherits all [Node](/docs/scripting/nodes/Node.md) properties

## Examples

### Basic Website Embed

```javascript
const webview = app.create('webview', {
  src: 'https://example.com',
  width: 2,
  height: 1.5,
  position: [0, 1.5, 0],
})
app.add(webview)
```

### TradingView Widget

```javascript
const webview = app.create('webview', {
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * { margin: 0; padding: 0; }
        html, body { width: 100%; height: 100%; overflow: hidden; }
      </style>
    </head>
    <body>
      <div class="tradingview-widget-container" style="height:100%;width:100%">
        <div class="tradingview-widget-container__widget" style="height:100%;width:100%"></div>
        <script type="text/javascript" src="https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js" async>
        {
          "autosize": true,
          "symbol": "NASDAQ:AAPL",
          "interval": "D",
          "timezone": "Etc/UTC",
          "theme": "dark",
          "style": "1",
          "locale": "en",
          "toolbar_bg": "#f1f3f6",
          "enable_publishing": false,
          "allow_symbol_change": true,
          "container_id": "tradingview_widget"
        }
        </script>
      </div>
    </body>
    </html>
  `,
  width: 3.2,
  height: 1.8,
  position: [0, 1.5, 0],
  factor: 200, // Higher resolution for readable charts
})
app.add(webview)
```

### High-Resolution Dashboard

```javascript
const dashboard = app.create('webview', {
  src: 'https://my-dashboard.com',
  width: 4,
  height: 2.25,
  position: [0, 2, -5],
  factor: 250, // Very high resolution for crisp text
})
app.add(dashboard)
```

### Interactive Portal Wall

```javascript
const wall = app.create('group')

const urls = [
  'https://news.ycombinator.com',
  'https://github.com/trending',
  'https://example.com/dashboard',
]

urls.forEach((url, i) => {
  const webview = app.create('webview', {
    src: url,
    width: 2,
    height: 1.5,
    position: [i * 2.5 - 2.5, 1.5, 0],
    factor: 150,
  })
  wall.add(webview)
})

app.add(wall)
```

### Double-Sided Display

```javascript
// Create a WebView that's visible from both sides
const billboard = app.create('webview', {
  src: 'https://example.com/dashboard',
  width: 3,
  height: 2,
  position: [0, 2, 0],
  doubleside: true, // Visible from front and back
})
app.add(billboard)
```

## Notes

- WebViews automatically prevent pointer unlock when in build mode, allowing you to move them freely
- The iframe content runs in a sandboxed environment with standard browser security policies
- WebViews use CSS3D rendering positioned behind the WebGL canvas, with a black mesh providing depth occlusion
- For best performance, avoid creating too many WebViews (>10) in a single scene
- Content that uses heavy JavaScript or rendering may impact performance
- Pointer events are automatically routed to the iframe when the pointer is unlocked
