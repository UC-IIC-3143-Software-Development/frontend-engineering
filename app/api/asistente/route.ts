// Proxy hacia el asistente RAG (proyecto ia-rag, FastAPI en Python).
// El navegador le habla a la tienda y la tienda al asistente: no hace falta
// CORS y la dirección del backend no queda expuesta en el cliente.
const ASISTENTE_URL = process.env.ASISTENTE_URL ?? 'http://localhost:8000'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const cuerpo = await request.text()
  let respuesta: Response
  try {
    respuesta = await fetch(`${ASISTENTE_URL}/preguntar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: cuerpo,
      // Tope para toda la respuesta, incluido el streaming
      signal: AbortSignal.timeout(60_000),
    })
  } catch {
    return Response.json(
      { mensaje: 'El asistente no está disponible en este momento. Escríbenos a ayuda@tienda-andes.example.' },
      { status: 503 },
    )
  }
  if (!respuesta.ok || !respuesta.body) {
    // Por ejemplo, 422 si la pregunta es muy corta o muy larga
    return new Response(await respuesta.text(), {
      status: respuesta.status,
      headers: { 'Content-Type': respuesta.headers.get('content-type') ?? 'application/json' },
    })
  }
  // Se reenvía el stream SSE tal cual: cada evento llega al navegador apenas lo escribe el backend
  return new Response(respuesta.body, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store' },
  })
}
