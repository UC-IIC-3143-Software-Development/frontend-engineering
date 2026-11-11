import { connection } from 'next/server'
import { Catalogo } from '@/components/Catalogo'
import { obtenerProductos } from '@/lib/productos'

// SSR: connection() le indica a Next que espere una request real,
// así que la página se renderiza en cada visita y cada visita
// paga los 300 ms del backend antes del primer byte.
export default async function PaginaSSR() {
  await connection()
  const productos = await obtenerProductos()
  return <Catalogo productos={productos} />
}
