import { GrillaProductos } from './GrillaProductos'
import type { Producto } from '@/lib/productos'

// Mismo contenido para SSG, SSR y CSR: así comparamos solo
// la estrategia de renderizado y no el diseño.
export function Catalogo({ productos }: { productos: Producto[] }) {
  return (
    <section className="contenedor">
      <h1>Catálogo de temporada</h1>
      <p className="bajada">
        Equipamiento probado en la cordillera, desde el desierto de
        Atacama hasta Torres del Paine. Precios en pesos chilenos con
        IVA incluido y despacho a todo Chile.
      </p>
      <h2 className="solo-lectores">Productos</h2>
      <GrillaProductos productos={productos} />
    </section>
  )
}
