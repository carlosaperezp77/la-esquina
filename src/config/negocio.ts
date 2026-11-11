/**
 * Marca del negocio: nombre, textos y lemas que se ven en la app y en la hoja impresa.
 * Para instalar la app en otro local se cambia `negocio.json`, los logos en
 * `src/assets/iconos/` (logo.png, tag.png) y los íconos de `public/`, y el menú en
 * `src/domain/menu.ts`. Ver "Instalarla para otro negocio" en el README.
 *
 * Con `VITE_DEMO=1` se usa `negocio.demo.json`: un local ficticio para enseñar la app.
 */
import datos from './negocio.json'
import demo from './negocio.demo.json'

export type Negocio = typeof datos

/** true en la versión de demostración (datos de prueba en el navegador). */
export const ES_DEMO = import.meta.env.VITE_DEMO === '1'

export const NEGOCIO: Negocio = ES_DEMO ? demo : datos
