import type { ReactNode } from 'react'
import { GrillaProductos } from './GrillaProductos'
import type { Producto } from '@/lib/productos'

// Mismo contenido para SSG, SSR y CSR: así comparamos solo
// la estrategia de renderizado y no el diseño.
// Sin productos (CSR mientras carga) muestra un esqueleto con las
// mismas medidas, para que la llegada de los datos no mueva la página.
// El panel va entre la bajada y la grilla: así el texto del catálogo
// queda arriba, visible en cualquier pantalla, y sigue siendo el LCP.
export function Catalogo({
  productos,
  panel,
}: {
  productos: Producto[] | null
  panel?: ReactNode
}) {
  return (
    <section className="contenedor" aria-busy={productos ? undefined : true}>
      {productos ? (
        <>
          <h1>Catálogo de temporada</h1>
          {/* elementtiming: el panel de medición registra cuándo se pinta */}
          <p className="bajada" elementtiming="catalogo">
            Equipamiento probado en la cordillera, desde el desierto de
            Atacama hasta Torres del Paine. Precios en pesos chilenos con
            IVA incluido y despacho a todo Chile.
          </p>
        </>
      ) : (
        <>
          <div className="esqueleto esqueleto-titulo" />
          <div className="esqueleto esqueleto-bajada" />
        </>
      )}
      {panel}
      <h2 className="solo-lectores">Productos</h2>
      {productos ? (
        <GrillaProductos productos={productos} />
      ) : (
        <ul className="grilla">
          {Array.from({ length: 12 }, (_, i) => (
            <li key={i} className="tarjeta esqueleto" />
          ))}
        </ul>
      )}
    </section>
  )
}
