import { obtenerProductos } from '@/lib/productos'

// API que consume la página CSR. También tarda 300 ms.
export async function GET() {
  return Response.json(await obtenerProductos())
}
