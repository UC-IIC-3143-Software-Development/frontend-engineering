// Compara las mediciones de main y del PR y escribe el comentario del
// PR en Markdown. Uso: node ci/reporte.mjs <dir-main> <dir-pr>
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

const [dirMain, dirPr] = process.argv.slice(2)
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
    const puntaje = (categoria) =>
      mediana(lista.map((l) => (l.categories[categoria]?.score ?? 0) * 100))
    resultado[ruta] = {
      puntaje: puntaje('performance'),
      accesibilidad: puntaje('accessibility'),
      buenasPracticas: puntaje('best-practices'),
      seo: puntaje('seo'),
    }
    for (const m of METRICAS) {
      resultado[ruta][m.id] = mediana(lista.map((l) => l.audits[m.id].numericValue))
    }
  }
  return resultado
}

function leerA11y(dir) {
  const archivo = path.join(dir, 'medicion-a11y.json')
  return existsSync(archivo) ? JSON.parse(readFileSync(archivo, 'utf8')) : {}
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

// Puntajes de Lighthouse fuera de performance
const CATEGORIAS = [
  ['accesibilidad', 'Accesibilidad (Lighthouse)', true],
  ['buenasPracticas', 'Buenas prácticas (Lighthouse)', false],
  ['seo', 'SEO (Lighthouse)', false],
]
const IMPACTO = { critical: 'crítico', serious: 'serio', moderate: 'moderado', minor: 'menor' }
const a11yMain = leerA11y(dirMain)
const a11yPr = leerA11y(dirPr)
const filasA11y = []
const violacionesPr = []

for (const ruta of RUTAS) {
  if (!main[ruta] || !pr[ruta]) continue
  for (const [clave, nombre, principal] of CATEGORIAS) {
    const b = main[ruta][clave]
    const p = pr[ruta][clave]
    const resultado = veredicto(p - b, 0, true)
    const fila = `| \`${ruta}\` | ${nombre} | ${numero(b)} | ${numero(p)} | ${signo(p - b)}${numero(Math.abs(p - b))} | ${resultado} |`
    if (principal) filasA11y.push(fila)
    else detalle.push(fila)
    anotar(resultado, `${nombre.replace(' (Lighthouse)', '').toLowerCase()} en \`${ruta}\``)
  }
  // axe-core: reglas que fallan y elementos afectados
  const vMain = a11yMain[ruta]?.violaciones
  const vPr = a11yPr[ruta]?.violaciones
  if (vMain && vPr) {
    const elementos = (lista) => lista.reduce((total, v) => total + v.elementos, 0)
    const texto = (lista) => `${lista.length} ${lista.length === 1 ? 'regla' : 'reglas'}, ${elementos(lista)} elem.`
    const delta = vPr.length - vMain.length || elementos(vPr) - elementos(vMain)
    const resultado = veredicto(delta, 0)
    filasA11y.push(`| \`${ruta}\` | Violaciones de axe-core | ${texto(vMain)} | ${texto(vPr)} | ${signo(vPr.length - vMain.length)}${Math.abs(vPr.length - vMain.length)} reglas | ${resultado} |`)
    anotar(resultado, `accesibilidad (axe) en \`${ruta}\``)
    for (const v of vPr) {
      violacionesPr.push(`| \`${ruta}\` | [\`${v.regla}\`](${v.url}) | ${IMPACTO[v.impacto] ?? v.impacto} | ${v.elementos} | ${v.ayuda} |`)
    }
  }
}

function seccionA11y() {
  const lineas = ['### Accesibilidad', '', '| Ruta | Métrica | main | Este PR | Cambio | Resultado |', '|---|---|---:|---:|---:|---|', ...filasA11y, '']
  if (violacionesPr.length) {
    lineas.push('Reglas que fallan en este PR:', '', '| Ruta | Regla | Impacto | Elementos | Qué falla |', '|---|---|---|---:|---|', ...violacionesPr)
  } else {
    lineas.push('axe-core no encontró violaciones en este PR.')
  }
  lineas.push('', '> axe-core es el motor open source de accesibilidad que también usa Lighthouse. Revisa reglas de WCAG 2 y buenas prácticas, pero no reemplaza la revisión manual con teclado y lector de pantalla.')
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

INP no aparece porque en una carga de Lighthouse nadie hace clic: TBT es su aproximación. El INP real se mide con usuarios: el RUM de la tienda (\`/rum\`).

<details><summary>Más métricas de Lighthouse: FCP, Speed Index, TTFB, puntaje, buenas prácticas y SEO</summary>

| Ruta | Métrica | main | Este PR | Cambio | Resultado |
|---|---|---:|---:|---:|---|
${detalle.join('\n')}

</details>

${seccionA11y()}

<sub>Cómo se midió: Lighthouse con el perfil de celular por defecto (Moto G Power simulado, CPU 4x, red de 1,6 Mbps), mediana de 3 corridas por ruta. \`main\` y el PR se miden en el mismo runner, uno después del otro. Se considera ruido un cambio de hasta 5% o 50 ms en LCP, FCP y Speed Index, 10% o 30 ms en TBT y TTFB, 0,01 en CLS, 2 puntos en el puntaje de performance y 1% en el JS. En accesibilidad, buenas prácticas, SEO y axe-core cualquier cambio cuenta.</sub>`)
