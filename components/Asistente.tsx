'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'

// El panel se descarga solo cuando el cliente abre el chat: así no suma
// JavaScript a la carga inicial de la página ni afecta el LCP.
const PanelAsistente = dynamic(() => import('./PanelAsistente').then((m) => m.PanelAsistente), {
  ssr: false,
  loading: () => <div className="asistente-panel asistente-cargando">Cargando el asistente…</div>,
})

export function Asistente() {
  const [abierto, setAbierto] = useState(false)

  return (
    <div className="asistente">
      {abierto && <PanelAsistente onCerrar={() => setAbierto(false)} />}
      <button
        type="button"
        className="asistente-boton"
        aria-expanded={abierto}
        aria-controls="asistente-panel"
        onClick={() => setAbierto(!abierto)}
      >
        {abierto ? 'Cerrar' : '¿Dudas? Pregúntanos'}
      </button>
    </div>
  )
}
