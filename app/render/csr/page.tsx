'use client'

import { useEffect, useState } from 'react'
import { Catalogo } from '@/components/Catalogo'
import { Esqueleto } from '@/components/Esqueleto'
import type { Producto } from '@/lib/productos'

// CSR: el HTML inicial trae solo el esqueleto. Los datos se piden
// desde el navegador, después de descargar y ejecutar el JS.
export default function PaginaCSR() {
  const [productos, setProductos] = useState<Producto[] | null>(null)

  useEffect(() => {
    fetch('/api/productos')
      .then((respuesta) => respuesta.json())
      .then(setProductos)
  }, [])

  if (!productos) return <Esqueleto />
  return <Catalogo productos={productos} />
}
