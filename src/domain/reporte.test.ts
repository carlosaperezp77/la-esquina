import { describe, expect, it } from 'vitest'
import { efectivoEsperado, resumenDia } from './reporte'
import { INGREDIENTES } from './menu'
import type { Comanda, Pago } from './tipos'

const todo = INGREDIENTES.map(i => i.id)
let n = 0
function comanda(p: Partial<Comanda>, pago: Omit<Pago, 'cobradaEn'> | null): Comanda {
  n++
  return {
    id: String(n), numero: n, fecha: '2026-09-28', nombre: 'X', mesa: '', perros: [], bebidas: {}, envases: 0,
    observaciones: '', tasa: 200, totalBs: 0, totalUsd: 0, estado: 'entregada', creadaEn: '', listaEn: null,
    entregadaEn: null, anuladaEn: null, adicionales: [], pago: pago && { ...pago, cobradaEn: '' }, ...p,
  }
}

const comandas = [
  comanda({ perros: [{ cant: 2, ingredientes: todo }], bebidas: { refresco: 1 }, envases: 1, totalBs: 1600, totalUsd: 8 }, { metodo: 'efectivo', moneda: 'usd', referencia: null }),
  comanda({ perros: [{ cant: 1, ingredientes: ['salchicha'] }], totalBs: 600, totalUsd: 3 }, { metodo: 'efectivo', moneda: 'bs', referencia: null }),
  comanda({ perros: [{ cant: 1, ingredientes: todo }], bebidas: { agua: 2, refresco1l: 1 }, totalBs: 1000, totalUsd: 5 }, { metodo: 'movil', moneda: null, referencia: '1234' }),
  comanda({ perros: [{ cant: 3, ingredientes: todo }], totalBs: 1800, totalUsd: 9 }, null),
  comanda({ perros: [{ cant: 5, ingredientes: todo }], bebidas: { nestea: 2 }, envases: 3, totalBs: 3000, anuladaEn: 'x' }, null),
  comanda({ perros: [{ cant: 1, ingredientes: todo }], totalBs: 600, totalUsd: 3 }, { metodo: 'credito', moneda: null, referencia: null }),
  comanda({ fecha: '2026-09-27', perros: [{ cant: 1, ingredientes: todo }], totalBs: 600, totalUsd: 3 }, { metodo: 'tarjeta', moneda: null, referencia: null }),
]

describe('reporte del día', () => {
  const r = resumenDia(comandas, '2026-09-28')

  it('suma solo lo cobrado de ese día', () => {
    expect(r.comandasCobradas).toBe(4)
    expect(r.totalBs).toBe(3800)
    expect(r.totalUsd).toBe(19)
    expect(r.pendientes).toBe(1)
    expect(r.pendientesBs).toBe(1800)
  })

  it('separa por forma de pago y moneda del efectivo', () => {
    expect(r.porMetodo.map(v => [v.metodo, v.moneda, v.cant, v.monto])).toEqual([
      ['efectivo', 'bs', 1, 600],
      ['efectivo', 'usd', 1, 8],
      ['movil', 'bs', 1, 1000],
      ['credito', 'bs', 1, 600],
    ])
  })

  it('cuenta perros y bebidas vendidos', () => {
    expect(r.perros).toBe(5)
    expect(r.perrosConTodo).toBe(4)
    expect(r.bebidas).toEqual({ refresco: 1, agua: 2, refresco1l: 1 })
    expect(r.envases).toBe(1)
  })

  it('deja fuera las anuladas y las cuenta aparte', () => {
    expect(r.anuladas).toBe(1)
  })

  it('calcula el efectivo esperado con el fondo inicial', () => {
    expect(efectivoEsperado(r, 500, 10)).toEqual({ bs: 1100, usd: 18 })
  })
})
