'use client'

import { useState } from 'react'

// Isla interactiva: genera interacciones reales para medir INP
export function BotonAgregar() {
  const [agregado, setAgregado] = useState(false)

  return (
    <button
      type="button"
      className="agregar"
      aria-pressed={agregado}
      onClick={() => setAgregado(!agregado)}
    >
      {agregado ? 'En el carro' : 'Agregar al carro'}
    </button>
  )
}
