#!/usr/bin/env bash
# Mide una versión de la tienda: build, peso del JS, Lighthouse y
# accesibilidad con axe-core. Se corre dentro del directorio de esa
# versión (main o el PR). LHCI_CONFIG y A11Y_SCRIPT apuntan a los
# archivos del PR, para medir ambas versiones exactamente igual.
set -euo pipefail

npm ci
npm run build
npx size-limit --json > medicion-size.json || true
npx lhci collect --config="${LHCI_CONFIG:-./lighthouserc.js}"
node "${A11Y_SCRIPT:-./ci/accesibilidad.mjs}" > medicion-a11y.json
