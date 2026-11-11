// Umbral = línea base local (mediana de 3 corridas) + 15 a 20 %
const max = (valor) =>
  ['error', { maxNumericValue: valor, aggregationMethod: 'median' }]

module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run start',
      url: ['/', '/render/ssg', '/render/ssr', '/render/csr']
        .map((ruta) => `http://localhost:3000${ruta}`),
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        // base: 2164 ms en /render/csr, la página más lenta
        'largest-contentful-paint': max(2600),
        // base: menos de 50 ms, piso de 200 ms porque CI es lento
        'total-blocking-time': max(200),
        // base: 0, usamos el umbral "bueno" de Core Web Vitals
        'cumulative-layout-shift': max(0.1),
        // la imagen LCP no puede ser lazy y debe tener prioridad alta
        'lcp-discovery-insight': ['error', { minScore: 1 }],
        // base: 99 a 100 puntos, solo advierte y no bloquea
        'categories:performance':
          ['warn', { minScore: 0.9, aggregationMethod: 'median' }],
      },
    },
    upload: { target: 'filesystem', outputDir: '.lighthouseci' },
  },
}
