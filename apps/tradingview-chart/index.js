app.get('Block').visible = false

let ticker = 'NASDAQ:AAPL'

function buildChartHtml(symbol) {
  return `
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
          "symbol": "${symbol}",
          "interval": "D",
          "timezone": "Etc/UTC",
          "theme": "dark",
          "style": "1",
          "locale": "en",
          "toolbar_bg": "#f1f3f6",
          "enable_publishing": false,
          "allow_symbol_change": true
        }
        </script>
      </div>
    </body>
    </html>
  `
}

const webview = app.create('webview', {
  html: buildChartHtml(ticker),
  width: 3.2,
  height: 1.8,
  position: [0, 1.2, 0],
  factor: 200,
})
app.add(webview)

const input = app.create('uiinput', {
  value: ticker,
  placeholder: 'Enter ticker (e.g. NASDAQ:AAPL)',
  width: 320,
  height: 36,
  fontSize: 14,
  backgroundColor: '#1e1e1e',
  color: '#ffffff',
  borderColor: '#444444',
  borderRadius: 4,
  position: [0, 2.3, 0],
  onSubmit: (value) => {
    ticker = value.toUpperCase()
    webview.html = buildChartHtml(ticker)
  },
})
app.add(input)
