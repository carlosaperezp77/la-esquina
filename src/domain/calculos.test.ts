import { describe, expect, it } from 'vitest'
import { aDolares, esConTodo, leerNumero, resumen, sinIngredientes, sinUltimoAdicional, sumarAdicional, totalBs, ultimoAdicional, validar, validarJornada } from './calculos'
import { INGREDIENTES } from './menu'
import type { Comanda, NuevaComanda, Precios } from './tipos'

const todo = INGREDIENTES.map(i => i.id)
const base: NuevaComanda = { nombre: 'Ana', mesa: '', perros: [], bebidas: {}, envases: 0, observaciones: '' }
const precios: Precios = { perro: 600, bebidas: { nestea: 300, refresco: 350, refresco1l: 700, refresco2l: 1100, agua: 200 }, envase: 100 }

describe('cálculos de la comanda', () => {
  it('suma perros y bebidas en Bs con los precios del día', () => {
    expect(totalBs({ perros: [{ cant: 2, ingredientes: todo }, { cant: 1, ingredientes: ['salchicha'] }], bebidas: { refresco: 2, refresco2l: 1, agua: 1 }, envases: 2 }, precios))
      .toBe(3 * 600 + 2 * 350 + 1100 + 200 + 2 * 100)
  })

  it('convierte a dólares con la tasa y redondea a céntimos', () => {
    expect(aDolares(2700, 190.5)).toBe(14.17)
    expect(aDolares(100, 0)).toBe(0)
  })

  it('lee números escritos al estilo venezolano', () => {
    expect(leerNumero('190,50')).toBe(190.5)
    expect(leerNumero('190.50')).toBe(190.5)
    expect(leerNumero('1.250,75')).toBe(1250.75)
    expect(leerNumero('1.250')).toBe(1250)
    expect(leerNumero('Bs 600')).toBe(600)
    expect(leerNumero('')).toBe(0)
    expect(leerNumero('abc')).toBe(0)
    expect(leerNumero('-5')).toBe(0)
  })

  it('reconoce "con todo" y lo que falta', () => {
    expect(esConTodo({ cant: 1, ingredientes: todo })).toBe(true)
    const l = { cant: 1, ingredientes: todo.filter(i => i !== 'cebolla') }
    expect(esConTodo(l)).toBe(false)
    expect(sinIngredientes(l)).toEqual(['Cebolla'])
  })

  it('resume la comanda para caja', () => {
    expect(resumen({ perros: [{ cant: 3, ingredientes: todo }], bebidas: { nestea: 1 }, envases: 0 })).toBe('3 perros con todo, 1 Nestea')
    expect(resumen({ perros: [{ cant: 2, ingredientes: todo }, { cant: 1, ingredientes: ['salchicha'] }], bebidas: {}, envases: 1 }))
      .toBe('3 perros (2 con todo), 1 envase')
  })

  it('valida antes de enviar a cocina', () => {
    expect(validar(base)).toMatch(/al menos un perro/)
    expect(validar({ ...base, bebidas: { agua: 1 }, nombre: '', mesa: '' })).toMatch(/nombre del cliente o elige la mesa/)
    expect(validar({ ...base, bebidas: { agua: 1 }, nombre: '', mesa: 'LL' })).toBeNull()
    expect(validar({ ...base, perros: [{ cant: 1, ingredientes: [] }] })).toMatch(/ingredientes/)
  })

  it('pide tasa y todos los precios para abrir el día', () => {
    expect(validarJornada({ tasa: 0, precios })).toMatch(/tasa BCV/)
    expect(validarJornada({ tasa: 190, precios: { ...precios, perro: 0 } })).toMatch(/perro/)
    expect(validarJornada({ tasa: 190, precios: { ...precios, bebidas: { ...precios.bebidas, agua: 0 } } })).toMatch(/Agua/)
    expect(validarJornada({ tasa: 190, precios: { ...precios, bebidas: { ...precios.bebidas, refresco1l: 0 } } })).toMatch(/Refresco 1 L/)
    expect(validarJornada({ tasa: 190, precios: { ...precios, envase: 0 } })).toMatch(/envase/i)
    expect(validarJornada({ tasa: 190, precios })).toBeNull()
  })
})

describe('adicionales', () => {
  const c: Comanda = {
    id: '1', numero: 3, fecha: '2026-09-29', nombre: 'Ana', mesa: '2', perros: [{ cant: 2, ingredientes: todo }],
    bebidas: { agua: 1 }, envases: 0, observaciones: '', tasa: 200, totalBs: 1400, totalUsd: 7, estado: 'entregada',
    creadaEn: '', listaEn: 'x', entregadaEn: 'y', pago: null, anuladaEn: null, adicionales: [],
  }
  const extra = { perros: [{ cant: 1, ingredientes: ['salchicha' as const] }, { cant: 0, ingredientes: [] }], bebidas: { agua: 1, nestea: 2 }, envases: 1, observaciones: ' bien tostado ' }
  const n = sumarAdicional(c, extra, precios, 'ahora')

  it('suma lo nuevo al total y devuelve la comanda a cocina', () => {
    expect(n.perros).toHaveLength(2)
    expect(n.bebidas).toEqual({ agua: 2, nestea: 2 })
    expect(n.envases).toBe(1)
    expect(n.totalBs).toBe(1400 + 600 + 200 + 2 * 300 + 100)
    expect(n.totalUsd).toBe(14.5)
    expect([n.estado, n.listaEn, n.entregadaEn]).toEqual(['nueva', null, null])
    expect(n.adicionales).toEqual([{ perros: [extra.perros[0]], bebidas: { agua: 1, nestea: 2 }, envases: 1, observaciones: 'bien tostado', totalBs: 1500, creadoEn: 'ahora' }])
  })

  it('cocina ve solo el último adicional y lo que ya se había servido', () => {
    expect(ultimoAdicional(n)?.totalBs).toBe(1500)
    expect(ultimoAdicional({ ...n, estado: 'entregada' })).toBeNull()
    expect(sinUltimoAdicional(n)).toEqual({ perros: c.perros, bebidas: { agua: 1 }, envases: 0 })
  })
})

describe('adicionales mientras cocina no ha servido', () => {
  const base: Comanda = {
    id: '1', numero: 1, fecha: '2026-09-29', nombre: 'Ana', mesa: '', perros: [{ cant: 1, ingredientes: todo }],
    bebidas: {}, envases: 0, observaciones: 'sin picante', tasa: 200, totalBs: 600, totalUsd: 3, estado: 'preparando',
    creadaEn: '', listaEn: null, entregadaEn: null, pago: null, anuladaEn: null, adicionales: [],
  }
  const extra = (b: Partial<Record<'agua' | 'nestea', number>>, obs = '') => ({ perros: [], bebidas: b, envases: 0, observaciones: obs })

  it('se suma a la comanda original si todavía no se sirvió', () => {
    const n = sumarAdicional(base, extra({ agua: 1 }, 'hielo'), precios)
    expect(n.adicionales).toEqual([])
    expect(n.bebidas).toEqual({ agua: 1 })
    expect(n.observaciones).toBe('sin picante · hielo')
  })

  it('se junta con el adicional que cocina todavía no sirvió', () => {
    const servido = sumarAdicional({ ...base, estado: 'entregada' }, extra({ agua: 1 }), precios, 't1')
    const otra = sumarAdicional(servido, extra({ nestea: 1, agua: 1 }), precios, 't2')
    expect(otra.adicionales).toHaveLength(1)
    expect(otra.adicionales[0]).toMatchObject({ bebidas: { agua: 2, nestea: 1 }, totalBs: 700, creadoEn: 't2' })
    expect(sinUltimoAdicional(otra)).toEqual({ perros: base.perros, bebidas: {}, envases: 0 })
  })
})
