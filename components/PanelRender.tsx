import { MedicionRender, type TipoRender } from './MedicionRender'

type Explicacion = {
  titulo: string
  queHace: string
  diferencia: string
  percepcion: string
}

// Lo mismo que muestra la clase, pero sobre la página real
const EXPLICACION: Record<TipoRender, Explicacion> = {
  ssg: {
    titulo: 'SSG: el HTML se armó una sola vez, en el build',
    queHace:
      'Next.js consultó el backend (300 ms) al correr npm run build y guardó el HTML. Cada visita recibe ese mismo archivo.',
    diferencia:
      'Nadie espera al backend en cada visita. A cambio, los datos quedan fijos hasta el próximo build o hasta revalidar.',
    percepcion:
      'El catálogo aparece casi de inmediato, incluso sin JavaScript. Si recargan, ven exactamente lo mismo.',
  },
  ssr: {
    titulo: 'SSR: el servidor arma el HTML en cada petición',
    queHace:
      'En cada visita, el servidor consulta el backend (300 ms), arma el HTML y recién ahí lo envía.',
    diferencia:
      'Los datos siempre están al día, pero cada visita paga los 300 ms antes de recibir el primer byte.',
    percepcion:
      'La pantalla queda en blanco unos 300 ms y luego aparece todo junto. Si recargan, la hora de generación cambia.',
  },
  csr: {
    titulo: 'CSR: el navegador arma el catálogo con JavaScript',
    queHace:
      'Llega un HTML sin productos. El navegador descarga el JavaScript, pide /api/productos (300 ms) y recién arma el catálogo.',
    diferencia:
      'El servidor no arma nada, el trabajo lo hace el navegador. El HTML inicial no trae el catálogo, y eso afecta al SEO.',
    percepcion:
      'Primero ve un esqueleto gris y el catálogo aparece después. Con JavaScript desactivado, no ve productos.',
  },
}

const OTRAS: Record<TipoRender, TipoRender[]> = {
  ssg: ['ssr', 'csr'],
  ssr: ['ssg', 'csr'],
  csr: ['ssg', 'ssr'],
}

// Enlaces <a> (no <Link>): cada visita es una carga completa y se
// puede medir por separado
export function PanelRender({
  tipo,
  generadoEn,
}: {
  tipo: TipoRender
  generadoEn?: string
}) {
  const e = EXPLICACION[tipo]
  return (
    <section className="panel-render" aria-label="Qué está pasando">
      <p className="panel-titulo">
        {e.titulo}
        <span className="panel-otras">
          Comparen con{' '}
          {OTRAS[tipo].map((o, i) => (
            <span key={o}>
              {i > 0 && ' y '}
              <a href={`/render/${o}`}>{o.toUpperCase()}</a>
            </span>
          ))}
        </span>
      </p>
      <div className="explicacion">
        <div>
          <strong>Qué hace</strong>
          <p>{e.queHace}</p>
        </div>
        <div>
          <strong>Diferencia</strong>
          <p>{e.diferencia}</p>
        </div>
        <div>
          <strong>Cómo lo percibe el usuario</strong>
          <p>{e.percepcion}</p>
        </div>
      </div>
      <MedicionRender tipo={tipo} generadoEn={generadoEn} />
    </section>
  )
}
