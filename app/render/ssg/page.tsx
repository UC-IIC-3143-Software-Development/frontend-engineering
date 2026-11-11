import { Catalogo } from '@/components/Catalogo'
import { PanelRender } from '@/components/PanelRender'
import { obtenerProductos } from '@/lib/productos'

// SSG: no usa APIs dinámicas, así que Next la renderiza una sola
// vez durante `next build` y luego sirve ese HTML ya listo.
export default async function PaginaSSG() {
  const productos = await obtenerProductos()
  // Hora del build: queda fija en el HTML hasta el próximo deploy
  const generadoEn = new Date().toISOString()
  return (
    <Catalogo
      productos={productos}
      panel={<PanelRender tipo="ssg" generadoEn={generadoEn} />}
    />
  )
}
