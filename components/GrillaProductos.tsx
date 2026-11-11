import { BotonAgregar } from './BotonAgregar'
import { formatearPrecio } from '@/lib/formato'
import type { Producto } from '@/lib/productos'

export function GrillaProductos({ productos }: { productos: Producto[] }) {
  return (
    <ul className="grilla">
      {productos.map((p) => (
        <li key={p.id} className="tarjeta">
          <h3>{p.nombre}</h3>
          <p>{p.descripcion}</p>
          <div className="compra">
            <strong>{formatearPrecio(p.precio)}</strong>
            <BotonAgregar />
          </div>
        </li>
      ))}
    </ul>
  )
}
