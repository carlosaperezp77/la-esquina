import { esConTodo, redondear, totalPerros } from './calculos'
import { BEBIDAS, METODOS_PAGO } from './menu'
import type { Comanda, Moneda, ResumenDia, VentaPorMetodo } from './tipos'

/** Ventas del día: solo cuentan las comandas de esa fecha que ya se cobraron. */
export function resumenDia(comandas: Comanda[], fecha: string): ResumenDia {
  const delDia = comandas.filter(c => c.fecha === fecha)
  const cobradas = delDia.filter(c => c.pago)
  const pendientes = delDia.filter(c => !c.pago)

  const metodos = new Map<string, VentaPorMetodo>()
  for (const c of cobradas) {
    const metodo = c.pago!.metodo
    const moneda: Moneda = metodo === 'efectivo' && c.pago!.moneda === 'usd' ? 'usd' : 'bs'
    const clave = `${metodo}:${moneda}`
    const v = metodos.get(clave) ?? { metodo, moneda, cant: 0, monto: 0, bs: 0, usd: 0 }
    v.cant++
    v.bs = redondear(v.bs + c.totalBs)
    v.usd = redondear(v.usd + c.totalUsd)
    v.monto = moneda === 'usd' ? v.usd : v.bs
    metodos.set(clave, v)
  }
  const orden = (v: VentaPorMetodo) => METODOS_PAGO.findIndex(m => m.id === v.metodo) * 2 + (v.moneda === 'usd' ? 1 : 0)

  const bebidas: ResumenDia['bebidas'] = {}
  for (const b of BEBIDAS) {
    const n = cobradas.reduce((s, c) => s + (c.bebidas[b.id] ?? 0), 0)
    if (n) bebidas[b.id] = n
  }

  return {
    fecha,
    comandasCobradas: cobradas.length,
    totalBs: redondear(cobradas.reduce((s, c) => s + c.totalBs, 0)),
    totalUsd: redondear(cobradas.reduce((s, c) => s + c.totalUsd, 0)),
    porMetodo: [...metodos.values()].sort((a, b) => orden(a) - orden(b)),
    perros: cobradas.reduce((s, c) => s + totalPerros(c.perros), 0),
    perrosConTodo: cobradas.reduce((s, c) => s + totalPerros(c.perros.filter(esConTodo)), 0),
    bebidas,
    pendientes: pendientes.length,
    pendientesBs: redondear(pendientes.reduce((s, c) => s + c.totalBs, 0)),
  }
}

/** Efectivo que debería haber en caja por moneda: fondo inicial más ventas en efectivo. */
export function efectivoEsperado(r: ResumenDia, fondoBs: number, fondoUsd: number) {
  const venta = (m: Moneda) => r.porMetodo.find(v => v.metodo === 'efectivo' && v.moneda === m)?.monto ?? 0
  return { bs: redondear(fondoBs + venta('bs')), usd: redondear(fondoUsd + venta('usd')) }
}
