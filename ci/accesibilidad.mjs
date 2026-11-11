// Revisa la accesibilidad con axe-core, el motor open source que también
// usa Lighthouse. Levanta la app con next start en el directorio actual,
// abre cada ruta en Chrome y entrega las reglas que fallan, en JSON.
// Uso: node ci/accesibilidad.mjs > medicion-a11y.json
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import puppeteer from 'puppeteer-core'

const require = createRequire(import.meta.url)
const RUTAS = ['/', '/render/ssg', '/render/ssr', '/render/csr']
const BASE = 'http://localhost:3000'
const CHROME =
  process.env.CHROME_PATH ??
  (process.platform === 'darwin'
    ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    : '/usr/bin/google-chrome')
const esperar = (ms) => new Promise((listo) => setTimeout(listo, ms))

const servidor = spawn('npx', ['next', 'start', '-p', '3000'], {
  detached: true,
  stdio: 'ignore',
})
let listo = false
let intentos = 0
while (!listo && intentos < 60) {
  intentos += 1
  listo = await fetch(BASE).then((r) => r.ok, () => false)
  if (!listo) await esperar(1000)
}

const navegador = await puppeteer.launch({ executablePath: CHROME, headless: true })
const resultado = {}
try {
  for (const ruta of RUTAS) {
    const pagina = await navegador.newPage()
    await pagina.goto(BASE + ruta, { waitUntil: 'networkidle0' })
    // CSR y el panel de medición terminan de pintar después de la carga
    await esperar(2000)
    await pagina.addScriptTag({ path: require.resolve('axe-core/axe.min.js') })
    const { violations, passes } = await pagina.evaluate(() => window.axe.run(document))
    resultado[ruta] = {
      reglasQuePasan: passes.length,
      violaciones: violations.map((v) => ({
        regla: v.id,
        impacto: v.impact,
        ayuda: v.help,
        url: v.helpUrl,
        elementos: v.nodes.length,
      })),
    }
    await pagina.close()
  }
} finally {
  await navegador.close()
  process.kill(-servidor.pid)
}
console.log(JSON.stringify(resultado, null, 1))
