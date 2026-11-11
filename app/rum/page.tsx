import { connection } from 'next/server'
import {
  UMBRALES,
  agregar,
  leerMuestras,
  subpartesLCP,
  type Metrica,
} from '@/lib/rum'

const formatear = (metrica: Metrica, valor: number) =>
  metrica === 'CLS' ? valor.toFixed(3) : `${Math.round(valor)} ms`

// Permite cortar el selector en cada ">" para que no desborde
const cortable = (selector: string) => selector.replaceAll('>', '>\u200b')

function calificar(metrica: Metrica, valor: number) {
  const [bueno, malo] = UMBRALES[metrica]
  if (valor <= bueno) return 'bueno'
  return valor <= malo ? 'mejorable' : 'malo'
}

export default async function PaginaRUM() {
  await connection()
  const muestras = await leerMuestras()
  const filas = agregar(muestras)
  const subpartes = subpartesLCP(muestras)
  const releases = new Set(muestras.map((m) => m.release))

  return (
    <section className="contenedor rum">
      <h1>RUM: lo que viven los usuarios reales</h1>
      <p className="bajada">
        {muestras.length} muestras de {releases.size} release(s).
        Percentil 75 por página, dispositivo y métrica, igual que los
        umbrales de Core Web Vitals.
      </p>

      <table>
        <thead>
          <tr>
            <th>Página</th>
            <th>Dispositivo</th>
            <th>Métrica</th>
            <th className="num">Muestras</th>
            <th className="num">p75</th>
            <th className="num">% bueno</th>
            <th className="num">% mejorable</th>
            <th className="num">% malo</th>
            <th>Elemento más frecuente (≥ p75)</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={`${f.pagina}-${f.dispositivo}-${f.metrica}`}>
              <td>{f.pagina}</td>
              <td>{f.dispositivo}</td>
              <td>{f.metrica}</td>
              <td className="num">{f.muestras}</td>
              <td className={`num ${calificar(f.metrica, f.p75)}`}>
                {formatear(f.metrica, f.p75)}
              </td>
              <td className="num">{f.bueno}%</td>
              <td className="num">{f.mejorable}%</td>
              <td className="num">{f.malo}%</td>
              <td>
                <code>{f.elemento ? cortable(f.elemento) : '-'}</code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Subpartes del LCP (p75 por página y dispositivo)</h2>
      <table>
        <thead>
          <tr>
            <th>Página</th>
            <th>Dispositivo</th>
            <th className="num">TTFB</th>
            <th className="num">Retraso de carga</th>
            <th className="num">Duración de carga</th>
            <th className="num">Retraso de render</th>
          </tr>
        </thead>
        <tbody>
          {subpartes.map((s) => (
            <tr key={s.clave}>
              <td>{s.pagina}</td>
              <td>{s.dispositivo}</td>
              <td className="num">{s.timeToFirstByte} ms</td>
              <td className="num">{s.resourceLoadDelay} ms</td>
              <td className="num">{s.resourceLoadDuration} ms</td>
              <td className="num">{s.elementRenderDelay} ms</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="nota">
        Los p75 de las subpartes se calculan por separado, así que no
        tienen por qué sumar exactamente el p75 del LCP.
      </p>
    </section>
  )
}
