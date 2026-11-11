#!/usr/bin/env bash
# Mide una versión de la tienda: build, peso del JS y Lighthouse.
# Se corre dentro del directorio de esa versión (main o el PR).
# LHCI_CONFIG apunta al lighthouserc.js del PR, para medir ambas
# versiones con exactamente la misma configuración.
set -euo pipefail

npm ci
npm run build
npx size-limit --json > medicion-size.json || true
npx lhci collect --config="${LHCI_CONFIG:-./lighthouserc.js}"
