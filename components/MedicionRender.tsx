'use client'

import { useEffect, useState } from 'react'
import type { MetricWithAttribution } from 'web-vitals/attribution'

export type TipoRender = 'ssg' | 'ssr' | 'csr'

// Milisegundos desde que el navegador empezó a cargar la página
// (CLS no tiene unidad)
type Medicion = {
  ttfb?: number // llega el primer byte del HTML
  fcp?: number // primer texto o imagen en pantalla
  catalogo?: number // el catálogo se pinta (Element Timing)
  interactiva?: number // React terminó de hidratar: los clics funcionan
  lcp?: number
  inp?: number
  cls?: number
}

type Vital = { valor: number, rating: string, elemento?: string }
type NombreVital = 'LCP' | 'INP' | 'CLS'

type Sesion = Partial<Record<TipoRender, Medicion>>

const CLAVE = 'medicion-render'
const TIPOS: TipoRender[] = ['ssg', 'ssr', 'csr']

// Core Web Vitals: umbral "bueno" de Google y pista mientras no hay valor
const VITALES: [NombreVital, string, string, string][] = [
  ['LCP', 'Largest Contentful Paint', 'bueno ≤ 2.500 ms', 'esperando el elemento más grande'],
  ['INP', 'Interaction to Next Paint', 'bueno ≤ 200 ms', 'hagan clic en «Agregar al carro»'],
  ['CLS', 'Cumulative Layout Shift', 'bueno ≤ 0,1', 'midiendo movimientos'],
]
const LINEA: [keyof Medicion, string][] = [
  ['ttfb', 'Primer byte (TTFB)'],
  ['fcp', 'Primer pintado (FCP)'],
  ['catalogo', 'Catálogo visible'],
  ['interactiva', 'Interactiva (hidratada)'],
]
const TABLA: [keyof Medicion, string][] = [
  ['ttfb', 'TTFB'],
  ['fcp', 'FCP'],
  ['lcp', 'LCP'],
  ['inp', 'INP'],
  ['cls', 'CLS'],
  ['interactiva', 'Interactiva'],
]
const RATING: Record<string, [string, string]> = {
  good: ['bueno', 'bueno'],
  'needs-improvement': ['mejorable', 'mejorable'],
  poor: ['deficiente', 'malo'],
}

const ms = (v?: number) => (v === undefined ? '...' : `${Math.round(v)} ms`)
const cls = (v: number) =>
  v.toLocaleString('es-CL', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
const formato = (clave: keyof Medicion, v?: number) =>
  v === undefined ? '...' : clave === 'cls' ? cls(v) : ms(v)

function leerSesion(): Sesion {
  try {
    return JSON.parse(sessionStorage.getItem(CLAVE) ?? '{}')
  } catch {
    return {}
  }
}

export function MedicionRender({
  tipo,
  generadoEn,
}: {
  tipo: TipoRender
  generadoEn?: string
}) {
  const [actual, setActual] = useState<Medicion>({})
  const [vitales, setVitales] = useState<Partial<Record<NombreVital, Vital>>>({})
  const [sesion, setSesion] = useState<Sesion>({})
  const [api, setApi] = useState<{ duracion: number, fin: number }>()
  const [html, setHtml] = useState<{ kb: number, productos: number }>()
  const [hora, setHora] = useState<string>()

  useEffect(() => {
    // useEffect corre después de hidratar: desde aquí la página responde
    const m: Medicion = { interactiva: performance.now() }
    const nav = performance.getEntriesByType('navigation')[0] as
      | PerformanceNavigationTiming
      | undefined
    if (nav) m.ttfb = nav.responseStart
    if (generadoEn) {
      const fecha = new Date(generadoEn)
      setHora(
        tipo === 'ssg'
          ? fecha.toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'medium', hourCycle: 'h23' })
          : fecha.toLocaleTimeString('es-CL', { hourCycle: 'h23' }),
      )
    }

    let activo = true
    const guardar = () => {
      if (!activo) return
      setActual({ ...m })
      const nueva = { ...leerSesion(), [tipo]: { ...m } }
      sessionStorage.setItem(CLAVE, JSON.stringify(nueva))
      setSesion(nueva)
    }

    // Core Web Vitals con la misma librería que usa Google.
    // reportAllChanges: muestra cada cambio en vivo, no solo el final
    const registrar = (metrica: MetricWithAttribution) => {
      const elemento =
        metrica.name === 'LCP' ? metrica.attribution.target
        : metrica.name === 'INP' ? metrica.attribution.interactionTarget
        : metrica.name === 'CLS' ? metrica.attribution.largestShiftTarget
        : undefined
      const nombre = metrica.name as NombreVital
      const clave = nombre.toLowerCase() as 'lcp' | 'inp' | 'cls'
      m[clave] = metrica.value
      if (activo) {
        setVitales((v) => ({
          ...v,
          [nombre]: { valor: metrica.value, rating: metrica.rating, elemento },
        }))
      }
      guardar()
    }
    // Import dinámico: web-vitals se carga después de hidratar y no
    // retrasa la carga de la página (en CSR, el pedido de los datos).
    // Sus observadores usan buffered, así que no pierden nada
    import('web-vitals/attribution').then(({ onCLS, onINP, onLCP }) => {
      if (!activo) return
      onLCP(registrar, { reportAllChanges: true })
      onINP(registrar, { reportAllChanges: true })
      onCLS(registrar, { reportAllChanges: true })
    })

    const tipos = PerformanceObserver.supportedEntryTypes
    const conElement = tipos.includes('element')
    const observador = new PerformanceObserver((lista) => {
      for (const e of lista.getEntries()) {
        if (e.name === 'first-contentful-paint') m.fcp = e.startTime
        // Element Timing marca el párrafo del catálogo (Chrome y Edge)
        const id = (e as PerformanceEntry & { identifier?: string }).identifier
        if (e.entryType === 'element' && id === 'catalogo') {
          m.catalogo = e.startTime
        }
        // En otros navegadores, el LCP sirve como aproximación
        if (e.entryType === 'largest-contentful-paint' && !conElement) {
          m.catalogo = e.startTime
        }
        if (e.entryType === 'resource' && e.name.endsWith('/api/productos')) {
          const r = e as PerformanceResourceTiming
          setApi({ duracion: r.responseEnd - r.startTime, fin: r.responseEnd })
        }
      }
      guardar()
    })
    for (const t of ['paint', 'element', 'largest-contentful-paint', 'resource']) {
      if (tipos.includes(t)) observador.observe({ type: t, buffered: true })
    }
    guardar()

    // Después de la carga: ¿el HTML que manda el servidor ya trae los
    // productos? Se cuenta cada <h3> de la grilla
    const espera = setTimeout(async () => {
      const respuesta = await fetch(location.pathname, { cache: 'no-store' })
      const texto = await respuesta.text()
      setHtml({
        kb: new Blob([texto]).size / 1024,
        productos: texto.match(/<h3>/g)?.length ?? 0,
      })
    }, 1500)

    return () => {
      activo = false
      observador.disconnect()
      clearTimeout(espera)
    }
  }, [tipo, generadoEn])

  // Texto fijo de cada tipo: se pinta en el servidor y no se mueve
  const pista = {
    ssg: 'Recarguen: la hora no cambia.',
    ssr: 'Recarguen: la hora cambia.',
    csr: 'Desactiven JavaScript: no aparece nada.',
  }[tipo]
  const datos = {
    ssg: hora ? `leídos en el build, ${hora}` : '...',
    ssr: hora ? `leídos en esta petición, ${hora}` : '...',
    csr: api
      ? `pedidos por el navegador: ${ms(api.duracion)}, listos a los ${ms(api.fin)}`
      : '...',
  }[tipo]
  const kb = (v: number) => v.toLocaleString('es-CL', { maximumFractionDigits: 1 })

  const maximo = Math.max(1, ...TIPOS.map((t) => sesion[t]?.lcp ?? 0))

  return (
    <div className="medicion">
      <p className="medicion-titulo">Core Web Vitals de esta visita</p>
      <dl className="cifras vitales">
        {VITALES.map(([nombre, completo, umbral, espera]) => {
          const v = vitales[nombre]
          const [etiqueta, clase] = v ? RATING[v.rating] : ['', '']
          return (
            <div key={nombre}>
              <dt>
                <strong>{nombre}</strong> {completo}
              </dt>
              <dd className={clase}>
                {v ? (nombre === 'CLS' ? cls(v.valor) : ms(v.valor)) : '...'}
                <span className="rating">{etiqueta}</span>
              </dd>
              <dd className="pista">
                {v ? (v.elemento ? `elemento: ${v.elemento.split('>').at(-1)}` : 'ningún elemento se movió') : espera}
              </dd>
              <dd className="pista">{umbral}</dd>
            </div>
          )
        })}
      </dl>

      <p className="medicion-titulo">Línea de tiempo de la carga</p>
      <dl className="cifras">
        {LINEA.map(([clave, nombre]) => (
          <div key={clave}>
            <dt>{nombre}</dt>
            <dd>{ms(actual[clave])}</dd>
          </div>
        ))}
      </dl>
      <dl className="cifras detalles">
        <div>
          <dt>Datos del catálogo</dt>
          <dd>{datos}</dd>
          <dd className="pista">{pista}</dd>
        </div>
        <div>
          <dt>HTML que manda el servidor</dt>
          <dd>{html ? `${kb(html.kb)} kB, con ${html.productos} de 12 productos` : '...'}</dd>
          <dd className="pista">Es lo que ven Google y quien no tiene JavaScript.</dd>
        </div>
      </dl>

      <div className="tabla-scroll">
        <table className="comparacion">
          <caption>Comparación en esta sesión (visiten las tres rutas)</caption>
          <thead>
            <tr>
              <th>Ruta</th>
              {TABLA.map(([clave, nombre]) => (
                <th key={clave}>{nombre}</th>
              ))}
              <th className="barra-col">
                <span className="solo-lectores">Gráfico del LCP</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {TIPOS.map((t) => {
              const fila = sesion[t]
              return (
                <tr key={t} className={t === tipo ? 'actual' : undefined}>
                  <th>{t.toUpperCase()}</th>
                  {TABLA.map(([clave]) => (
                    <td key={clave}>
                      {!fila ? 'sin medir' : clave === 'inp' && fila.inp === undefined ? 'sin clic' : formato(clave, fila[clave])}
                    </td>
                  ))}
                  <td className="barra-col">
                    <span
                      className="barra"
                      style={{ width: `${((fila?.lcp ?? 0) / maximo) * 100}%` }}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {/* Párrafos cortos a propósito: un texto largo aquí sería el
          elemento LCP y escondería cuándo aparece el catálogo */}
      <p className="nota">Recarguen cada ruta: la primera visita también baja el JS y el CSS.</p>
      <p className="nota">Para ver más diferencia: Fast 4G y CPU 4x en DevTools.</p>
    </div>
  )
}
