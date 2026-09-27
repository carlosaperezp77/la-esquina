import { describe, expect, it } from 'vitest'
import { aBolivares, esConTodo, resumen, sinIngredientes, totalUsd, validar } from './calculos'
import { INGREDIENTES } from './menu'
import type { NuevaComanda } from './tipos'

const todo = INGREDIENTES.map(i => i.id)
const base: NuevaComanda = { nombre: 'Ana', mesa: '', perros: [], bebidas: {}, observaciones: '', tasa: 190.5 }

describe('cálculos de la comanda', () => {
  it('suma perros y bebidas en USD', () => {
    expect(totalUsd({ perros: [{ cant: 2, ingredientes: todo }, { cant: 1, ingredientes: ['salchicha'] }], bebidas: { coca: 2, agua: 1 } }))
      .toBe(3 * 3 + 2 * 1.5 + 1)
  })

  it('convierte a bolívares con la tasa y redondea a céntimos', () => {
    expect(aBolivares(10.5, 190.5)).toBe(2000.25)
    expect(aBolivares(1, 36.12345)).toBe(36.12)
  })

  it('reconoce "con todo" y lo que falta', () => {
    expect(esConTodo({ cant: 1, ingredientes: todo })).toBe(true)
    const l = { cant: 1, ingredientes: todo.filter(i => i !== 'cebolla') }
    expect(esConTodo(l)).toBe(false)
    expect(sinIngredientes(l)).toEqual(['Cebolla'])
  })

  it('resume la comanda para caja', () => {
    expect(resumen({ perros: [{ cant: 3, ingredientes: todo }], bebidas: { nestea: 1 } })).toBe('3 perros con todo, 1 Nestea')
    expect(resumen({ perros: [{ cant: 2, ingredientes: todo }, { cant: 1, ingredientes: ['salchicha'] }], bebidas: {} }))
      .toBe('3 perros (2 con todo)')
  })

  it('valida antes de enviar a cocina', () => {
    expect(validar(base)).toMatch(/al menos un perro/)
    expect(validar({ ...base, bebidas: { agua: 1 }, nombre: '', mesa: '' })).toMatch(/nombre del cliente o elige la mesa/)
    expect(validar({ ...base, bebidas: { agua: 1 }, nombre: '', mesa: 'LL' })).toBeNull()
    expect(validar({ ...base, perros: [{ cant: 1, ingredientes: [] }] })).toMatch(/ingredientes/)
    expect(validar({ ...base, bebidas: { agua: 1 }, tasa: 0 })).toMatch(/tasa BCV/)
  })
})
