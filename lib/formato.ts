const clp = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
})

export const formatearPrecio = (precio: number) => clp.format(precio)
