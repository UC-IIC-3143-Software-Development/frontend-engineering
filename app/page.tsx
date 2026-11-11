import Image from 'next/image'
import { GrillaProductos } from '@/components/GrillaProductos'
import { Recomendaciones } from '@/components/Recomendaciones'
import { obtenerProductos } from '@/lib/productos'

export default async function Inicio() {
  const productos = await obtenerProductos()

  return (
    <>
      <section className="hero">
        {/* Todas las imágenes en diferido, para ahorrar datos */}
        <Image
          src="/hero.jpg"
          alt="Valle del Cajón del Maipo con cerros nevados"
          width={2560}
          height={1706}
          sizes="100vw"
          loading="lazy"
          className="hero-img"
        />
        <div className="hero-texto">
          <h1>Equipamiento para la cordillera</h1>
          <p>Desde Atacama hasta Torres del Paine.</p>
        </div>
      </section>

      <section className="contenedor">
        <h2>Destacados</h2>
        <GrillaProductos productos={productos.slice(0, 6)} />
        <Recomendaciones />
        <p className="credito">
          Foto: Cajón del Maipo, por edoalemirored (CC0).
        </p>
      </section>
    </>
  )
}
