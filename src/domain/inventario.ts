import type { BebidaId, Comanda, InsumoId, Inventario } from './tipos'

/** Insumo que se descuenta por cada bebida vendida. */
const INSUMO_BEBIDA: Record<BebidaId, InsumoId> = {
  nestea: 'nestea', refresco: 'refrescos', refresco1l: 'refrescos1l', refresco2l: 'refrescos2l', agua: 'agua',
}

/**
 * Insumos que la app descuenta sola con cada venta: se cuentan por unidad.
 * Los demás (papas, queso, salsas…) se miden a ojo y solo se comparan
 * entregado contra final hasta tener la receta de cada uno.
 */
export const INSUMOS_AUTOMATICOS: InsumoId[] = ['panes', 'salchichas', ...Object.values(INSUMO_BEBIDA)]

/**
 * Lo que se usó en el día según las comandas: 1 pan por perro, 1 salchicha
 * por perro que la lleva y 1 unidad por bebida. Cuenta las comandas servidas
 * aunque no se hayan cobrado; las anuladas no.
 */
export function usado(comandas: Comanda[], fecha: string): Inventario {
  const u: Inventario = Object.fromEntries(INSUMOS_AUTOMATICOS.map(i => [i, 0]))
  for (const c of comandas) {
    if (c.fecha !== fecha || c.anuladaEn) continue
    for (const l of c.perros) {
      u.panes! += l.cant
      if (l.ingredientes.includes('salchicha')) u.salchichas! += l.cant
    }
    for (const [b, n] of Object.entries(c.bebidas) as [BebidaId, number][]) {
      if (n) u[INSUMO_BEBIDA[b]]! += n
    }
  }
  return u
}

/** Lo que debería quedar de cada insumo automático: entregado − usado. */
export function deberiaQuedar(entregado: Inventario, u: Inventario): Inventario {
  return Object.fromEntries(
    INSUMOS_AUTOMATICOS.filter(i => entregado[i] !== undefined).map(i => [i, (entregado[i] ?? 0) - (u[i] ?? 0)]),
  )
}
