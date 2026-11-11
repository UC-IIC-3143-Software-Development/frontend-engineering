// Atributo de la Element Timing API, que React pasa tal cual al DOM
import 'react'

declare module 'react' {
  interface HTMLAttributes<T> {
    elementtiming?: string
  }
}
