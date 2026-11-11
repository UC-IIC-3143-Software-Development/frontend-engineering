import { appendFile, mkdir } from 'node:fs/promises'
import {
  ARCHIVO,
  DIRECTORIO,
  METRICAS,
  agregar,
  leerMuestras,
} from '@/lib/rum'

// Recibe los beacons de web-vitals. sendBeacon los manda como
// text/plain, por eso leemos texto en vez de usar request.json().
export async function POST(request: Request) {
  let metrica
  try {
    metrica = JSON.parse(await request.text())
  } catch {
    return new Response('JSON inválido', { status: 400 })
  }
  const valida =
    METRICAS.includes(metrica?.name) &&
    Number.isFinite(metrica.value) &&
    typeof metrica.page === 'string'
  if (!valida) return new Response('Métrica inválida', { status: 400 })

  const linea = { ...metrica, ts: new Date().toISOString() }
  await mkdir(DIRECTORIO, { recursive: true })
  await appendFile(ARCHIVO, JSON.stringify(linea) + '\n')
  return new Response(null, { status: 204 })
}

// Resumen por página, dispositivo y métrica (lo mismo que muestra /rum)
export async function GET() {
  return Response.json(agregar(await leerMuestras()))
}
