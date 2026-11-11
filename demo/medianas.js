// Muestra la mediana de LCP, TBT y CLS por URL a partir de los
// reportes de .lighthouseci/. Sirve para recalibrar los umbrales.
// Uso: node demo/medianas.js
const fs = require('node:fs')

const dir = '.lighthouseci'
const porUrl = {}
for (const archivo of fs.readdirSync(dir)) {
  if (!/^lhr-.*\.json$/.test(archivo)) continue
  const lhr = JSON.parse(fs.readFileSync(`${dir}/${archivo}`, 'utf8'))
  const url = new URL(lhr.finalDisplayedUrl).pathname
  porUrl[url] ??= []
  porUrl[url].push(lhr)
}

const mediana = (valores) =>
  valores.sort((a, b) => a - b)[Math.floor(valores.length / 2)]
const valor = (lhrs, id) =>
  mediana(lhrs.map((lhr) => lhr.audits[id].numericValue))

for (const [url, lhrs] of Object.entries(porUrl)) {
  console.log(
    url.padEnd(14),
    `LCP ${Math.round(valor(lhrs, 'largest-contentful-paint'))} ms`,
    `TBT ${Math.round(valor(lhrs, 'total-blocking-time'))} ms`,
    `CLS ${valor(lhrs, 'cumulative-layout-shift').toFixed(3)}`,
  )
}
