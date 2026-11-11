// Percentil 75 por rango más cercano (nearest-rank):
// se ordenan los valores y se toma el que está en la
// posición ceil(0,75 × n). Siempre es un valor observado.
export function p75(valores: number[]) {
  if (valores.length === 0) return undefined
  const orden = [...valores].sort((a, b) => a - b)
  return orden[Math.ceil(0.75 * orden.length) - 1]
}
