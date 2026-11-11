export type Producto = {
  id: number
  nombre: string
  precio: number
  descripcion: string
}

export const productos: Producto[] = [
  {
    id: 1,
    nombre: 'Parka Cerro Plomo',
    precio: 129990,
    descripcion: 'Relleno de pluma y capucha ajustable para el invierno.',
  },
  {
    id: 2,
    nombre: 'Mochila Aconcagua 45 L',
    precio: 89990,
    descripcion: 'Espaldar ventilado y funda para la lluvia del sur.',
  },
  {
    id: 3,
    nombre: 'Carpa Torres del Paine 2P',
    precio: 199990,
    descripcion: 'Aguanta el viento patagónico y se arma en 5 minutos.',
  },
  {
    id: 4,
    nombre: 'Saco de dormir Ojos del Salado',
    precio: 149990,
    descripcion: 'Confort hasta 5 °C bajo cero, liviano y compresible.',
  },
  {
    id: 5,
    nombre: 'Bastones Cajón del Maipo',
    precio: 39990,
    descripcion: 'Aluminio regulable con punta de carburo para roca.',
  },
  {
    id: 6,
    nombre: 'Botas Villarrica',
    precio: 119990,
    descripcion: 'Membrana impermeable y suela firme en suelo volcánico.',
  },
  {
    id: 7,
    nombre: 'Cortaviento Farellones',
    precio: 54990,
    descripcion: 'Liviano y se guarda en su propio bolsillo.',
  },
  {
    id: 8,
    nombre: 'Linterna frontal Atacama',
    precio: 24990,
    descripcion: '300 lúmenes y carga USB-C para noches de estrellas.',
  },
  {
    id: 9,
    nombre: 'Polar Chiloé',
    precio: 34990,
    descripcion: 'Abrigador y de secado rápido para días de llovizna.',
  },
  {
    id: 10,
    nombre: 'Termo Valle del Elqui 1 L',
    precio: 22990,
    descripcion: 'Mantiene el agua caliente por 24 horas.',
  },
  {
    id: 11,
    nombre: 'Guantes Osorno',
    precio: 19990,
    descripcion: 'Táctiles, aislados y con refuerzo en la palma.',
  },
  {
    id: 12,
    nombre: 'Cocinilla Nahuelbuta',
    precio: 44990,
    descripcion: 'Encendido piezoeléctrico, hierve 1 L en 3 minutos.',
  },
]

const esperar = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms))

// Simula un backend lento: tarda 300 ms en responder
export async function obtenerProductos() {
  await esperar(300)
  return productos
}
