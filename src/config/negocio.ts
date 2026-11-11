/**
 * Marca del negocio: nombre, textos y lemas que se ven en la app y en la hoja impresa.
 * Para instalar la app en otro local se cambia `negocio.json`, los logos en
 * `src/assets/iconos/` (logo.png, tag.png) y los íconos de `public/`, y el menú en
 * `src/domain/menu.ts`. Ver "Instalarla para otro negocio" en el README.
 */
import datos from './negocio.json'

export type Negocio = typeof datos

export const NEGOCIO: Negocio = datos
