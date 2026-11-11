import type { Almacen } from './almacen'
import { hoy } from '../domain/calculos'
import type { Jornada, MetodoPago, Moneda, NuevaComanda } from '../domain/tipos'

/** Usuario y clave de la demo; se muestran en la pantalla de entrar. */
export const USUARIO_DEMO = { usuario: 'demo', clave: 'demo123' }

const TODO = ['salchicha', 'repollo', 'papas', 'pepinillo', 'cebolla', 'salsa', 'mayonesa', 'mostaza', 'queso'] as const

const comanda = (c: Partial<NuevaComanda>): NuevaComanda =>
  ({ nombre: '', mesa: '', perros: [], bebidas: {}, envases: 0, observaciones: '', ...c })

/** Pedidos de ejemplo: los primeros se cobran, los últimos quedan en cocina. */
const PEDIDOS: { c: NuevaComanda; pago?: [MetodoPago, string | null, Moneda | null] }[] = [
  { c: comanda({ mesa: '2', perros: [{ cant: 2, ingredientes: [...TODO] }], bebidas: { refresco: 2 } }), pago: ['movil', '0412-4581', null] },
  { c: comanda({ nombre: 'Luis', perros: [{ cant: 1, ingredientes: [...TODO] }, { cant: 1, ingredientes: ['salchicha', 'queso', 'salsa'] }], bebidas: { nestea: 1 }, envases: 2 }), pago: ['efectivo', null, 'usd'] },
  { c: comanda({ mesa: '5', perros: [{ cant: 3, ingredientes: [...TODO] }], bebidas: { refresco1l: 1 } }), pago: ['tarjeta', '771203', null] },
  { c: comanda({ nombre: 'María', perros: [{ cant: 2, ingredientes: ['salchicha', 'papas', 'mayonesa', 'mostaza'] }], bebidas: { agua: 2 }, envases: 2 }), pago: ['transferencia', '55120', null] },
  { c: comanda({ mesa: '1', perros: [{ cant: 4, ingredientes: [...TODO] }], bebidas: { refresco2l: 1 }, observaciones: 'Uno sin cebolla' }) },
  { c: comanda({ nombre: 'Pedro', perros: [{ cant: 1, ingredientes: [...TODO] }], bebidas: { refresco: 1 } }) },
]

/**
 * Llena la demo la primera vez que se abre en un navegador: un administrador,
 * la apertura de hoy y algunas comandas, para que se vea la app trabajando.
 */
export async function sembrarDemo(almacen: Almacen) {
  if (almacen.modo !== 'demo' || await almacen.estadoAccesos() === 'listo') return
  await almacen.crearAdmin({ usuario: USUARIO_DEMO.usuario, nombre: 'Demo', clave: USUARIO_DEMO.clave })
  const jornada: Jornada = await almacen.abrirJornada({
    fecha: hoy(),
    tasa: 900,
    precios: { perro: 1800, envase: 150, bebidas: { nestea: 900, refresco: 900, refresco1l: 1800, refresco2l: 2700, agua: 600 } },
    inventario: { panes: 60, salchichas: 60, papas: 3, queso: 2, repollo: 2, cebolla: 2, pepinillo: 2, salsa: 2, mayonesa: 2, mostaza: 2, nestea: 12, refrescos: 24, refrescos1l: 6, refrescos2l: 6, agua: 12 },
  })
  for (const p of PEDIDOS) {
    const c = await almacen.crear(p.c, jornada)
    if (p.pago) {
      await almacen.cambiarEstado(c.id, 'entregada')
      await almacen.cobrar(c.id, ...p.pago)
    }
  }
}
