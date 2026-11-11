import Image from 'next/image'
import { GrillaProductos } from '@/components/GrillaProductos'
import { obtenerProductos } from '@/lib/productos'

export default async function Inicio() {
  const productos = await obtenerProductos()

  return (
    <>
      <section className="hero">
        {/* La foto es el elemento LCP: no la cargamos en diferido
            y le pedimos al navegador que la descargue primero */}
        <Image
          src="/hero.jpg"
          alt="Valle del Cajón del Maipo con cerros nevados"
          width={2560}
          height={1706}
          sizes="100vw"
          loading="eager"
          fetchPriority="high"
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
        <p className="credito">
          Foto: Cajón del Maipo, por edoalemirored (CC0).
        </p>
      </section>
    </>
  )
}
