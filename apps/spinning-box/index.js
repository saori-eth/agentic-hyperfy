/**
 * WebView Test
 *
 * Tests the WebView node with TradingView widget
 */

// Hide the default placeholder block
app.get('Block').visible = false

// Create a webview with TradingView widget
const webview = app.create('webview', {
  // add rick roll iframe youtube link
  src: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
  width: 3.2,
  height: 1.8,
  position: [0, 1.5, 0],
  factor: 200, // Higher resolution for charts
})

app.add(webview)
