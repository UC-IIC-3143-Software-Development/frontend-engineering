// Consulta la CrUX API: p75 de usuarios reales de Chrome en celular,
// últimos 28 días. Necesita el secreto CRUX_API_KEY (ver README).
const clave = process.env.CRUX_API_KEY
const origen = process.env.CRUX_ORIGIN || 'https://web.dev'
const salida = (datos) => console.log(JSON.stringify({ origen, ...datos }))

if (!clave) {
  salida({ error: 'sin-clave' })
} else {
  const url = `https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=${clave}`
  const respuesta = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ origin: origen, formFactor: 'PHONE' }),
  })
  if (respuesta.status === 404) salida({ error: 'sin-datos' })
  else if (!respuesta.ok) salida({ error: `http-${respuesta.status}` })
  else salida({ registro: (await respuesta.json()).record })
}
