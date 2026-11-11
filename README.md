# Tienda Andes: rendimiento web, observabilidad y CI/CD

Una tienda de equipamiento outdoor hecha con Next.js (App Router) que
sirve para ver, con números reales, tres ideas:

1. **Optimizar lo que carga primero.** La portada usa `next/image` con
   AVIF y WebP, `srcset` según el ancho de la pantalla y prioridad alta
   para la foto principal, que es el elemento LCP.
2. **Medir a usuarios reales (RUM).** Cada página envía LCP, INP, CLS y
   TTFB con la librería `web-vitals` (con atribución) a `/api/rum`. El
   tablero `/rum` muestra el percentil 75 por página, dispositivo y métrica.
3. **Proteger el rendimiento en CI.** Cada pull request corre
   `size-limit` (peso del JavaScript) y Lighthouse CI (LCP, TBT, CLS y
   descubrimiento de la imagen LCP). Si algo empeora, el PR falla.

Además hay tres páginas con el mismo catálogo y distinta estrategia de
renderizado. El "backend" está simulado y siempre tarda 300 ms:

| Ruta          | Estrategia | Qué pasa con los 300 ms                     |
| ------------- | ---------- | ------------------------------------------- |
| `/render/ssg` | SSG        | Se pagan una vez, en `next build`           |
| `/render/ssr` | SSR        | Se pagan en cada request, antes del HTML    |
| `/render/csr` | CSR        | Se pagan en el navegador, después del JS    |

## Correr en local

Necesitan Node 20.9 o superior y Google Chrome (para Lighthouse CI).

```bash
npm ci
npm run build
npm run start        # http://localhost:3000
```

En otra terminal, con el servidor detenido para dejar libre el puerto
3000:

```bash
npm run size         # presupuesto de JS (size-limit)
npm run lhci         # Lighthouse CI: levanta el servidor solo
node demo/medianas.js
```

Los reportes de Lighthouse quedan en `.lighthouseci/` (abran los
archivos `.html` en el navegador). Si corren `npm run lhci` varias
veces, borren antes esa carpeta para no mezclar reportes de distintas
ejecuciones.

## Archivos importantes

- `app/page.tsx`: portada con la imagen LCP.
- `app/render/{ssg,ssr,csr}/page.tsx`: las tres estrategias.
- `app/web-vitals.tsx`: envía las métricas con `navigator.sendBeacon`.
- `app/api/rum/route.ts`: guarda cada métrica en `.data/rum.ndjson`.
- `app/rum/page.tsx` y `lib/p75.ts`: el tablero y el cálculo del p75.
- `lighthouserc.js` y la sección `size-limit` de `package.json`: los
  presupuestos.
- `.github/workflows/performance.yml`: el pipeline.
- `demo/regresion.patch`: una regresión lista para hacer fallar la CI.

## Repositorio

El código vive en
[UC-IIC-3143-Software-Development/frontend-engineering](https://github.com/UC-IIC-3143-Software-Development/frontend-engineering).

```bash
git clone https://github.com/UC-IIC-3143-Software-Development/frontend-engineering.git
cd frontend-engineering
npm ci
```

Para probarlo en su propia cuenta, creen un repositorio nuevo y súbanlo
con `gh repo create mi-tienda-andes --private --source . --remote propio --push`.

El workflow **Rendimiento** corre en cada push a `main` y en cada pull
request. Los reportes de Lighthouse quedan como artefacto
(`reportes-lighthouse`) en la página de cada ejecución.

Si quieren un enlace público al reporte en vez del artefacto, en el
workflow cambien `run: npm run lhci` por la línea comentada que usa
`--upload.target=temporary-public-storage`. Ojo: ese enlace es público
y dura unos días.

## Ver fallar la CI

El parche `demo/regresion.patch` mete tres errores comunes, sin agregar
dependencias:

- La foto de la portada pasa a `loading="lazy"` y pierde
  `fetchPriority="high"`.
- Un componente cliente nuevo (`Recomendaciones`) importa un JSON con
  1150 productos, que termina completo en el bundle.
- Ese mismo componente compara todo el catálogo contra todo el catálogo
  al montarse (1150 × 1150): cerca de 230 ms de trabajo síncrono en el
  hilo principal de un notebook rápido, unos 900 ms con la CPU 4x que
  simula Lighthouse.

```bash
git switch -c regresion
git apply demo/regresion.patch
git add -A
git commit -m "Recomendaciones en la portada"
git push -u origin regresion
gh pr create --fill
```

En el PR van a ver que fallan los dos presupuestos:

- `size-limit`: "Package size limit has exceeded by ..." (el JS pasa de
  unos 190 kB a unos 258 kB con gzip, con un límite de 210 kB).
- Lighthouse CI: `total-blocking-time` sobre 200 ms y
  `lcp-discovery-insight` en 0 en la portada, más una advertencia del
  puntaje de rendimiento.

Para volver atrás: `git apply -R demo/regresion.patch`.

## RUM: métricas de usuarios reales

1. Con `npm run start` corriendo, abran varias páginas y hagan clic en
   "Agregar al carro".
2. Cambien de pestaña o naveguen a otra página. `web-vitals` envía INP
   y CLS cuando la página se oculta, por eso se usa `sendBeacon`.
3. Abran `/rum` para ver el p75, el porcentaje de visitas buenas,
   mejorables y malas, y el elemento que más se repite en las peores
   visitas. `GET /api/rum` entrega lo mismo en JSON.

Cada métrica incluye el `release`, que sale de `NEXT_PUBLIC_RELEASE`.
En CI vale el SHA del commit. En local es `local`, salvo que lo
definan al compilar:

```bash
NEXT_PUBLIC_RELEASE=$(git rev-parse --short HEAD) npm run build
```

Las muestras se guardan en `.data/rum.ndjson`, que no se sube al
repositorio. Sirve para la demo. En producción conviene mandarlas a una
base de datos o a un servicio de observabilidad, porque el disco de un
servidor serverless no persiste.

## Recalibrar los umbrales

Los umbrales actuales salen de la línea base medida en un computador de
desarrollo. Los runners de GitHub son más lentos, así que conviene
recalibrar con la primera ejecución en CI:

1. Descarguen el artefacto `reportes-lighthouse` de la primera
   ejecución en `main` y descomprímanlo en `.lighthouseci/`.
2. Corran `node demo/medianas.js` para ver la mediana de cada URL.
3. En `lighthouserc.js` usen como umbral la mediana más lenta más un
   15 a 20 %, redondeada. Para TBT mantengan un piso de 200 ms.
4. Para `size-limit`, miren el tamaño que imprime `npm run size` en CI
   y usen ese valor más un 10 %.
5. Actualicen el comentario de cada umbral con la nueva línea base.

Un detalle de medición: por defecto Lighthouse no frena la red de
verdad. Carga la página rápido y después simula un celular de gama
media (RTT de 150 ms, 1,6 Mbps y CPU 4 veces más lenta). Por eso los
números son estimaciones y pueden diferir de lo que muestra el RUM.

## Créditos

Foto de la portada: "Cajon Del Maipo Chile El Yeso Valley", de
edoalemirored (publicada originalmente en Pixabay), dedicada al dominio
público con la licencia
[CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).
Fuente:
[Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Cajon-del-maipo-1104803.jpg).
El original mide 5184 × 3456 px. Acá se usa una versión de
2560 × 1706 px en JPEG (1,7 MB), sin optimizar a propósito, para que
`next/image` tenga trabajo que hacer.
