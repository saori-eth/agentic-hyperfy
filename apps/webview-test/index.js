/**
 * WebView Test
 *
 * Tests the WebView node functionality - displays an embedded YouTube video in 3D space.
 */

// Hide the default placeholder block
app.get('Block').visible = false

// Create a webview with an embedded YouTube video
const webview = app.create('webview', {
  src: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
  width: 3.2,
  height: 1.8,
  position: [0, 1.5, 0],
  factor: 100, // 1 meter = 100 pixels
})

app.add(webview)
