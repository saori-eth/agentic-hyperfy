/**
 * WebView Test
 *
 * Tests the WebView node with TradingView widget
 */

// Hide the default placeholder block
app.get('Block').visible = false

// Create a webview with TradingView widget
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
          "symbol": "BTCUSDT",
          "interval": "D",
          "timezone": "Etc/UTC",
          "theme": "dark",
          "style": "1",
          "locale": "en",
          "backgroundColor": "#0F0F0F",
          "gridColor": "rgba(242, 242, 242, 0.06)",
          "hide_top_toolbar": false,
          "hide_legend": false,
          "hide_volume": false,
          "hide_side_toolbar": true,
          "allow_symbol_change": true,
          "save_image": true,
          "calendar": false,
          "studies": []
        }
        </script>
      </div>
    </body>
    </html>
  `,
  width: 3.2,
  height: 1.8,
  position: [0, 1.5, 0],
  factor: 200, // Higher resolution for charts
})

app.add(webview)
