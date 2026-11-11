'use client'

import { useEffect, useState } from 'react'
import catalogo from '@/data/catalogo-completo.json'
import { formatearPrecio } from '@/lib/formato'

type Item = (typeof catalogo)[number]

// Similitud de Jaccard: palabras en común / palabras totales
function similitud(a: Set<string>, b: Set<string>) {
  let comunes = 0
  for (const palabra of a) if (b.has(palabra)) comunes++
  return comunes / (a.size + b.size - comunes)
}

export function Recomendaciones() {
  const [top, setTop] = useState<Item[]>([])

  useEffect(() => {
    // Compara todo el catálogo contra todo el catálogo (1150 x 1150)
    // en el hilo principal, justo mientras la página se carga
    const conjuntos = catalogo.map(
      (p) => new Set(`${p.nombre} ${p.descripcion}`.split(' ')),
    )
    const puntajes = conjuntos.map((a) =>
      conjuntos.reduce((suma, b) => suma + similitud(a, b), 0),
    )
    const ranking = catalogo
      .map((producto, i) => ({ producto, puntaje: puntajes[i] }))
      .sort((x, y) => y.puntaje - x.puntaje)
    setTop(ranking.slice(0, 3).map((r) => r.producto))
  }, [])

  return (
    <section>
      <h2>Te podría interesar</h2>
      <ul className="grilla">
        {top.map((p) => (
          <li key={p.sku} className="tarjeta">
            <h3>{p.nombre}</h3>
            <p>{p.descripcion}</p>
            <strong>{formatearPrecio(p.precio)}</strong>
          </li>
        ))}
      </ul>
    </section>
  )
}
