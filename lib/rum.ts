import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { p75 } from './p75'

export const DIRECTORIO = path.join(process.cwd(), '.data')
export const ARCHIVO = path.join(DIRECTORIO, 'rum.ndjson')

export const METRICAS = ['LCP', 'INP', 'CLS', 'TTFB'] as const
export type Metrica = (typeof METRICAS)[number]

export type Muestra = {
  name: Metrica
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  id: string
  page: string
  release: string
  device: string
  target: string | null
  lcp: Record<string, number> | null
  ts: string
}

// Mismos umbrales que usa web-vitals: [bueno hasta, malo desde]
export const UMBRALES: Record<Metrica, [number, number]> = {
  LCP: [2500, 4000],
  INP: [200, 500],
  CLS: [0.1, 0.25],
  TTFB: [800, 1800],
}

export async function leerMuestras(): Promise<Muestra[]> {
  try {
    const texto = await readFile(ARCHIVO, 'utf8')
    const lineas = texto.split('\n').filter(Boolean)
    // Una métrica puede reportarse más de una vez (por ejemplo CLS
    // al ocultar la pestaña dos veces): nos quedamos con la última.
    const porId = new Map<string, Muestra>()
    for (const linea of lineas) {
      const m: Muestra = JSON.parse(linea)
      porId.set(`${m.id}-${m.name}`, m)
    }
    return [...porId.values()]
  } catch {
    return []
  }
}

function masFrecuente(valores: (string | null)[]) {
  const conteo = new Map<string, number>()
  for (const v of valores) if (v) conteo.set(v, (conteo.get(v) ?? 0) + 1)
  return [...conteo].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
}

const porcentaje = (parte: number, total: number) =>
  Math.round((100 * parte) / total)

// Celular y escritorio van por separado, igual que en Core Web Vitals
export function agregar(muestras: Muestra[]) {
  const grupos = Map.groupBy(
    muestras,
    (m) => `${m.page}|${m.device}|${m.name}`,
  )
  const filas = [...grupos.values()].map((grupo) => {
    const valorP75 = p75(grupo.map((m) => m.value)) ?? 0
    const contar = (rating: Muestra['rating']) =>
      porcentaje(grupo.filter((m) => m.rating === rating).length, grupo.length)
    return {
      pagina: grupo[0].page,
      dispositivo: grupo[0].device,
      metrica: grupo[0].name,
      muestras: grupo.length,
      p75: valorP75,
      bueno: contar('good'),
      mejorable: contar('needs-improvement'),
      malo: contar('poor'),
      // El elemento que más se repite en las peores visitas (>= p75)
      elemento: masFrecuente(
        grupo.filter((m) => m.value >= valorP75).map((m) => m.target),
      ),
    }
  })
  return filas.sort(
    (a, b) =>
      a.pagina.localeCompare(b.pagina) ||
      a.dispositivo.localeCompare(b.dispositivo) ||
      METRICAS.indexOf(a.metrica) - METRICAS.indexOf(b.metrica),
  )
}

// p75 de cada subparte del LCP, por página y dispositivo
export function subpartesLCP(muestras: Muestra[]) {
  const conLcp = muestras.filter((m) => m.name === 'LCP' && m.lcp)
  const grupos = Map.groupBy(conLcp, (m) => `${m.page}|${m.device}`)
  const p75De = (grupo: Muestra[], subparte: string) =>
    p75(grupo.map((m) => m.lcp?.[subparte] ?? 0))
  return [...grupos]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([clave, grupo]) => ({
      pagina: grupo[0].page,
      dispositivo: grupo[0].device,
      clave,
      timeToFirstByte: p75De(grupo, 'timeToFirstByte'),
      resourceLoadDelay: p75De(grupo, 'resourceLoadDelay'),
      resourceLoadDuration: p75De(grupo, 'resourceLoadDuration'),
      elementRenderDelay: p75De(grupo, 'elementRenderDelay'),
    }))
}
