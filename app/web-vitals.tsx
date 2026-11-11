'use client'

import { useEffect } from 'react'
import { onCLS, onINP, onLCP, onTTFB } from 'web-vitals/attribution'
import type { MetricWithAttribution } from 'web-vitals/attribution'

const SUBPARTES_LCP = ['timeToFirstByte', 'resourceLoadDelay',
  'resourceLoadDuration', 'elementRenderDelay'] as const

function enviar(m: MetricWithAttribution) {
  // sendBeacon sigue funcionando aunque el usuario cierre la pestaña
  navigator.sendBeacon('/api/rum', JSON.stringify({
    name: m.name,
    value: +m.value.toFixed(m.name === 'CLS' ? 3 : 0),
    rating: m.rating,
    id: m.id,
    page: location.pathname,
    release: process.env.NEXT_PUBLIC_RELEASE ?? 'local',
    device: innerWidth <= 768 ? 'celular' : 'escritorio',
    // selector CSS del elemento responsable de la métrica
    target: m.name === 'LCP' ? m.attribution.target
      : m.name === 'INP' ? m.attribution.interactionTarget
      : m.name === 'CLS' ? m.attribution.largestShiftTarget : null,
    // LCP = TTFB + retraso de carga + carga + retraso de render
    lcp: m.name === 'LCP' ? Object.fromEntries(SUBPARTES_LCP.map(
      (k) => [k, Math.round(m.attribution[k])])) : null,
  }))
}

export function WebVitals() {
  useEffect(() => {
    for (const on of [onLCP, onINP, onCLS, onTTFB]) on(enviar)
  }, [])
  return null
}
