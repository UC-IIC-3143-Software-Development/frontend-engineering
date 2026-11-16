'use client'

import { type FormEvent, useRef, useState } from 'react'

type Fuente = { n: number; documento: string; seccion: string }
type Fin = { traza?: string; costo_usd?: number | null; cache?: boolean }

// Muestra las negritas y las citas [n] del texto del modelo sin usar HTML:
// React escapa todo, así que el modelo no puede inyectar etiquetas.
function TextoConCitas({ texto }: { texto: string }) {
  const partes = texto.split(/(\*\*[^*]+\*\*|\[\d+\])/g)
  return (
    <>
      {partes.map((p, i) =>
        /^\*\*[^*]+\*\*$/.test(p) ? (
          <strong key={i}>{p.slice(2, -2)}</strong>
        ) : /^\[\d+\]$/.test(p) ? (
          <span key={i} className="asistente-cita">
            {p}
          </span>
        ) : (
          p
        ),
      )}
    </>
  )
}

export function PanelAsistente({ onCerrar }: { onCerrar: () => void }) {
  const [pregunta, setPregunta] = useState('')
  const [texto, setTexto] = useState('')
  const [fuentes, setFuentes] = useState<Fuente[]>([])
  const [estado, setEstado] = useState<'listo' | 'esperando' | 'escribiendo'>('listo')
  const [metricas, setMetricas] = useState('')
  const entrada = useRef<HTMLInputElement>(null)

  async function preguntar(e: FormEvent) {
    e.preventDefault()
    if (estado !== 'listo' || pregunta.trim().length < 3) return
    setTexto('')
    setFuentes([])
    setMetricas('')
    setEstado('esperando')
    const t0 = performance.now()
    let primero: number | null = null
    try {
      const r = await fetch('/api/asistente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pregunta: pregunta.trim() }),
      })
      if (!r.ok || !r.body) {
        const error = await r.json().catch(() => null)
        setTexto(error?.mensaje ?? 'No pudimos responder tu pregunta. Intenta de nuevo en unos minutos.')
        return
      }
      // Stream SSE: cada evento es «event: nombre» y «data: json», y termina con una línea en blanco
      const lector = r.body.pipeThrough(new TextDecoderStream()).getReader()
      let buffer = ''
      while (true) {
        const { value, done } = await lector.read()
        if (done) break
        buffer += value
        const bloques = buffer.split('\n\n')
        buffer = bloques.pop() ?? ''
        for (const bloque of bloques) {
          const [lineaEvento, lineaDatos] = bloque.split('\n')
          if (!lineaEvento?.startsWith('event: ') || !lineaDatos?.startsWith('data: ')) continue
          const evento = lineaEvento.slice(7)
          const datos = JSON.parse(lineaDatos.slice(6))
          if (evento === 'fuentes') setFuentes(datos as Fuente[])
          if (evento === 'texto') {
            primero ??= performance.now() - t0
            setEstado('escribiendo')
            setTexto((t) => t + (datos as string))
          }
          if (evento === 'reemplazar') setTexto(datos as string)
          if (evento === 'error') setTexto((datos as { mensaje: string }).mensaje)
          if (evento === 'fin') {
            const fin = datos as Fin
            setMetricas(
              `Primer texto en ${((primero ?? performance.now() - t0) / 1000).toLocaleString('es-CL', { maximumFractionDigits: 1 })} s` +
                (fin.cache ? ' · desde el caché' : '') +
                (typeof fin.costo_usd === 'number'
                  ? ` · US$ ${fin.costo_usd.toLocaleString('es-CL', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`
                  : '') +
                (fin.traza ? ` · traza ${fin.traza}` : ''),
            )
          }
        }
      }
    } catch {
      setTexto('Se cortó la conexión con el asistente. Intenta de nuevo.')
    } finally {
      setEstado('listo')
      entrada.current?.focus()
    }
  }

  return (
    <section id="asistente-panel" className="asistente-panel" aria-label="Asistente del centro de ayuda">
      <header className="asistente-cabecera">
        <strong>Centro de ayuda</strong>
        <button type="button" className="asistente-cerrar" onClick={onCerrar} aria-label="Cerrar el asistente">
          ×
        </button>
      </header>
      <p className="asistente-ayuda">
        Respondo con las políticas de la tienda: despachos, devoluciones, garantía y arriendo.
      </p>
      <div className="asistente-respuesta" aria-live="polite">
        {estado === 'esperando' && !texto && <span className="asistente-suave">Buscando en el centro de ayuda…</span>}
        <TextoConCitas texto={texto} />
      </div>
      {fuentes.length > 0 && (
        <ol className="asistente-fuentes">
          {fuentes.map((f) => (
            <li key={f.n}>
              {f.documento} › {f.seccion}
            </li>
          ))}
        </ol>
      )}
      {metricas && <p className="asistente-metricas">{metricas}</p>}
      <form className="asistente-form" onSubmit={preguntar}>
        <label htmlFor="asistente-pregunta" className="solo-lectores">
          Tu pregunta
        </label>
        <input
          id="asistente-pregunta"
          ref={entrada}
          value={pregunta}
          onChange={(e) => setPregunta(e.target.value)}
          placeholder="¿Cuánto demora un despacho a Coyhaique?"
          minLength={3}
          maxLength={500}
          autoFocus
          required
        />
        <button type="submit" disabled={estado !== 'listo'}>
          Preguntar
        </button>
      </form>
    </section>
  )
}
