import type { Metadata } from 'next'
import { WebVitals } from './web-vitals'
import './globals.css'

export const metadata: Metadata = {
  title: 'Tienda Andes',
  description: 'Equipamiento outdoor para la cordillera de Chile',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-CL">
      <body>
        <WebVitals />
        <header className="cabecera">
          {/* Enlaces <a> normales (y no <Link>): cada visita es una
              carga completa y web-vitals mide cada página por separado */}
          <a href="/" className="marca">
            Tienda Andes
          </a>
          <nav>
            <a href="/render/ssg">SSG</a>
            <a href="/render/ssr">SSR</a>
            <a href="/render/csr">CSR</a>
            <a href="/rum">RUM</a>
          </nav>
        </header>
        <main>{children}</main>
        <footer className="pie">
          Demo de clase: rendimiento web, observabilidad y CI/CD.
        </footer>
      </body>
    </html>
  )
}
