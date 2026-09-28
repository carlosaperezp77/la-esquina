import { describe, expect, it } from 'vitest'
import { deberiaQuedar, usado } from './inventario'
import type { Comanda } from './tipos'

let n = 0
const comanda = (p: Partial<Comanda>): Comanda => ({
  id: String(++n), numero: n, fecha: '2026-09-28', nombre: 'X', mesa: '', perros: [], bebidas: {}, envases: 0,
  observaciones: '', tasa: 200, totalBs: 0, totalUsd: 0, estado: 'nueva', creadaEn: '', listaEn: null,
  entregadaEn: null, anuladaEn: null, pago: null, ...p,
})

describe('inventario automático', () => {
  const comandas = [
    comanda({ perros: [{ cant: 2, ingredientes: ['salchicha', 'queso'] }, { cant: 1, ingredientes: ['queso'] }], bebidas: { refresco2l: 1, agua: 2 } }),
    comanda({ perros: [{ cant: 3, ingredientes: ['salchicha'] }], bebidas: { nestea: 1, refresco: 0 } }),
    comanda({ perros: [{ cant: 5, ingredientes: ['salchicha'] }], bebidas: { agua: 4 }, anuladaEn: 'x' }),
    comanda({ fecha: '2026-09-27', perros: [{ cant: 9, ingredientes: ['salchicha'] }] }),
  ]

  it('descuenta panes, salchichas y bebidas de las comandas del día, sin las anuladas', () => {
    expect(usado(comandas, '2026-09-28')).toEqual({
      panes: 6, salchichas: 5, nestea: 1, refrescos: 0, refrescos1l: 0, refrescos2l: 1, agua: 2,
    })
  })

  it('calcula lo que debería quedar solo de lo entregado', () => {
    const u = usado(comandas, '2026-09-28')
    expect(deberiaQuedar({ panes: 40, salchichas: 40, agua: 12, papas: 3 }, u)).toEqual({ panes: 34, salchichas: 35, agua: 10 })
  })
})
