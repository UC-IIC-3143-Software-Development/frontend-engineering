import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    // Por defecto Next solo genera WebP. Agregamos AVIF primero:
    // si el navegador lo acepta recibe AVIF, y si no, WebP.
    formats: ['image/avif', 'image/webp'],
  },
}

export default nextConfig
