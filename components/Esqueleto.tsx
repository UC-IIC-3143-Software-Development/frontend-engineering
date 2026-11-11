// Marcador de posición con las mismas medidas que el catálogo,
// para que la llegada de los datos no mueva la página (CLS).
export function Esqueleto() {
  return (
    <section className="contenedor" aria-busy="true">
      <div className="esqueleto esqueleto-titulo" />
      <div className="esqueleto esqueleto-bajada" />
      <ul className="grilla">
        {Array.from({ length: 12 }, (_, i) => (
          <li key={i} className="tarjeta esqueleto" />
        ))}
      </ul>
    </section>
  )
}
