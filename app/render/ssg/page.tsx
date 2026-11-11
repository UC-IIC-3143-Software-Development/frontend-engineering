import { Catalogo } from '@/components/Catalogo'
import { obtenerProductos } from '@/lib/productos'

// SSG: no usa APIs dinámicas, así que Next la renderiza una sola
// vez durante `next build` y luego sirve ese HTML ya listo.
export default async function PaginaSSG() {
  const productos = await obtenerProductos()
  return <Catalogo productos={productos} />
}
