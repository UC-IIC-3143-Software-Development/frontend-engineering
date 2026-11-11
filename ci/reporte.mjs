// Compara las mediciones de main y del PR y escribe el comentario del
// PR en Markdown. Uso: node ci/reporte.mjs <dir-main> <dir-pr> <crux.json>
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

const [dirMain, dirPr, archivoCrux] = process.argv.slice(2)
const RUTAS = ['/', '/render/ssg', '/render/ssr', '/render/csr']

// Métricas de la clase. tol: cambio que se considera ruido de medición.
// umbral: [bueno hasta, deficiente desde], como en la presentación
const METRICAS = [
  { id: 'largest-contentful-paint', nombre: 'LCP', principal: true, tol: (b) => Math.max(50, b * 0.05), umbral: [2500, 4000] },
  { id: 'cumulative-layout-shift', nombre: 'CLS', principal: true, cls: true, tol: () => 0.01, umbral: [0.1, 0.25] },
  { id: 'total-blocking-time', nombre: 'TBT', principal: true, tol: (b) => Math.max(30, b * 0.1), umbral: [200, 600] },
  { id: 'first-contentful-paint', nombre: 'FCP', tol: (b) => Math.max(50, b * 0.05), umbral: [1800, 3000] },
  { id: 'speed-index', nombre: 'Speed Index', tol: (b) => Math.max(50, b * 0.05), umbral: [3400, 5800] },
  { id: 'server-response-time', nombre: 'TTFB', tol: (b) => Math.max(30, b * 0.1), umbral: [800, 1800] },
]

const mediana = (valores) => {
  const v = [...valores].sort((a, b) => a - b)
  const m = Math.floor(v.length / 2)
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2
}

// Mediana por ruta de cada métrica en las corridas de Lighthouse
function leerLighthouse(dir) {
  const carpeta = path.join(dir, '.lighthouseci')
  const corridas = {}
  for (const archivo of readdirSync(carpeta)) {
    if (!archivo.startsWith('lhr-') || !archivo.endsWith('.json')) continue
    const lhr = JSON.parse(readFileSync(path.join(carpeta, archivo), 'utf8'))
    const ruta = new URL(lhr.requestedUrl).pathname
    corridas[ruta] ??= []
    corridas[ruta].push(lhr)
  }
  const resultado = {}
  for (const [ruta, lista] of Object.entries(corridas)) {
    resultado[ruta] = { puntaje: mediana(lista.map((l) => l.categories.performance.score * 100)) }
    for (const m of METRICAS) {
      resultado[ruta][m.id] = mediana(lista.map((l) => l.audits[m.id].numericValue))
    }
  }
  return resultado
}

function leerTamano(dir) {
  const archivo = path.join(dir, 'medicion-size.json')
  if (!existsSync(archivo)) return undefined
  return JSON.parse(readFileSync(archivo, 'utf8'))[0]?.size
}

const numero = (v, decimales = 0) =>
  v.toLocaleString('es-CL', { minimumFractionDigits: decimales, maximumFractionDigits: decimales })
const formato = (v, m) => (m?.cls ? numero(v, 3) : `${numero(v)} ms`)
// Signo del cambio: si se redondea a cero, se muestra ±
const signo = (v, decimales = 0) =>
  Number(Math.abs(v).toFixed(decimales)) === 0 ? '±' : v > 0 ? '+' : '−'

function calificar(v, [bueno, malo]) {
  if (v <= bueno) return 'bueno'
  return v <= malo ? 'mejorable' : 'deficiente'
}

// Compara y devuelve el texto del resultado
function veredicto(delta, tolerancia, mayorEsMejor = false) {
  if (Math.abs(delta) <= tolerancia) return '⚪ se mantiene'
  const mejora = mayorEsMejor ? delta > 0 : delta < 0
  return mejora ? '🟢 mejora' : '🔴 empeora'
}

const main = leerLighthouse(dirMain)
const pr = leerLighthouse(dirPr)
const filas = []
const detalle = []
const peores = []
let mejoras = 0

const anotar = (resultado, texto) => {
  if (resultado.includes('empeora')) peores.push(texto)
  if (resultado.includes('mejora')) mejoras += 1
}

// Peso del JavaScript (size-limit)
const jsMain = leerTamano(dirMain)
const jsPr = leerTamano(dirPr)
if (jsMain !== undefined && jsPr !== undefined) {
  const delta = (jsPr - jsMain) / 1000
  const resultado = veredicto(delta, Math.max(1, (jsMain / 1000) * 0.01))
  const pct = (delta / (jsMain / 1000)) * 100
  filas.push(`| todas | JS del cliente (gzip) | ${numero(jsMain / 1000, 1)} kB | ${numero(jsPr / 1000, 1)} kB | ${signo(delta, 1)}${numero(Math.abs(delta), 1)} kB (${signo(pct, 1)}${numero(Math.abs(pct), 1)}%) | ${resultado} |`)
  anotar(resultado, `JS del cliente (${signo(delta, 1)}${numero(Math.abs(delta), 1)} kB)`)
}

for (const ruta of RUTAS) {
  if (!main[ruta] || !pr[ruta]) continue
  for (const m of METRICAS) {
    const b = main[ruta][m.id]
    const p = pr[ruta][m.id]
    const delta = p - b
    const resultado = veredicto(delta, m.tol(b))
    const cambio = `${signo(delta, m.cls ? 3 : 0)}${m.cls ? numero(Math.abs(delta), 3) : `${numero(Math.abs(delta))} ms`}`
    const fila = `| \`${ruta}\` | ${m.nombre} | ${formato(b, m)} | ${formato(p, m)} (${calificar(p, m.umbral)}) | ${cambio} | ${resultado} |`
    if (m.principal) filas.push(fila)
    else detalle.push(fila)
    anotar(resultado, `${m.nombre} en \`${ruta}\` (${cambio})`)
  }
  const b = main[ruta].puntaje
  const p = pr[ruta].puntaje
  const resultado = veredicto(p - b, 2, true)
  detalle.push(`| \`${ruta}\` | Puntaje de performance | ${numero(b)} | ${numero(p)} | ${signo(p - b)}${numero(Math.abs(p - b))} | ${resultado} |`)
  anotar(resultado, `puntaje en \`${ruta}\``)
}

// CrUX: datos de producción, no del PR
const UMBRALES_CRUX = {
  largest_contentful_paint: ['LCP', [2500, 4000]],
  interaction_to_next_paint: ['INP', [200, 500]],
  cumulative_layout_shift: ['CLS', [0.1, 0.25]],
  first_contentful_paint: ['FCP', [1800, 3000]],
  experimental_time_to_first_byte: ['TTFB', [800, 1800]],
}
const ICONO = { bueno: '🟢', mejorable: '🟡', deficiente: '🔴' }

function seccionCrux() {
  const crux = existsSync(archivoCrux) ? JSON.parse(readFileSync(archivoCrux, 'utf8')) : { error: 'sin-archivo' }
  const lineas = ['### Usuarios reales (CrUX)', '']
  if (crux.error === 'sin-clave') {
    lineas.push('No se consultó CrUX: falta el secreto `CRUX_API_KEY` del repositorio. El README explica cómo crearlo.')
  } else if (crux.error === 'sin-datos') {
    lineas.push(`CrUX no tiene datos de ${crux.origen}: necesita tráfico suficiente de usuarios reales de Chrome.`)
  } else if (crux.error) {
    lineas.push(`No se pudo consultar CrUX (${crux.error}).`)
  } else {
    const fin = crux.registro.collectionPeriod?.lastDate
    const fecha = fin ? `${String(fin.day).padStart(2, '0')}-${String(fin.month).padStart(2, '0')}-${fin.year}` : 'sin fecha'
    lineas.push(`Sitio: ${crux.origen}, celulares, p75 de los 28 días al ${fecha}.`, '')
    lineas.push('| Métrica | p75 | Calificación |', '|---|---:|---|')
    for (const [clave, [nombre, umbral]] of Object.entries(UMBRALES_CRUX)) {
      const p75 = crux.registro.metrics[clave]?.percentiles?.p75
      if (p75 === undefined) continue
      const valor = Number(p75)
      const nota = calificar(valor, umbral)
      lineas.push(`| ${nombre} | ${nombre === 'CLS' ? numero(valor, 2) : `${numero(valor)} ms`} | ${ICONO[nota]} ${nota} |`)
    }
  }
  lineas.push('', '> CrUX no evalúa este PR: resume 28 días de visitas reales en producción. Sirve para saber si el problema existe y para confirmar la mejora unas semanas después del deploy. El sitio se configura con la variable `CRUX_ORIGIN`.')
  return lineas.join('\n')
}

const resumen = peores.length
  ? `🔴 **${peores.length} ${peores.length === 1 ? 'métrica empeora' : 'métricas empeoran'}** más allá del ruido: ${peores.join(', ')}.`
  : '✅ **Ninguna métrica empeora** más allá del ruido de medición.'
const textoMejoras = mejoras ? ` 🟢 ${mejoras} ${mejoras === 1 ? 'mejora' : 'mejoran'}.` : ''

console.log(`<!-- reporte-rendimiento -->
## Rendimiento de este PR frente a \`main\`

${resumen}${textoMejoras}

### Core Web Vitals de laboratorio y peso del JavaScript

| Ruta | Métrica | main | Este PR | Cambio | Resultado |
|---|---|---:|---:|---:|---|
${filas.join('\n')}

INP no aparece porque en una carga de Lighthouse nadie hace clic: TBT es su aproximación. El INP real sale del RUM de la tienda (\`/rum\`) y de CrUX.

<details><summary>Más métricas de Lighthouse: FCP, Speed Index, TTFB y puntaje</summary>

| Ruta | Métrica | main | Este PR | Cambio | Resultado |
|---|---|---:|---:|---:|---|
${detalle.join('\n')}

</details>

${seccionCrux()}

<sub>Cómo se midió: Lighthouse con el perfil de celular por defecto (Moto G Power simulado, CPU 4x, red de 1,6 Mbps), mediana de 3 corridas por ruta. \`main\` y el PR se miden en el mismo runner, uno después del otro. Se considera ruido un cambio de hasta 5% o 50 ms en LCP, FCP y Speed Index, 10% o 30 ms en TBT y TTFB, 0,01 en CLS, 2 puntos en el puntaje y 1% en el JS.</sub>`)
