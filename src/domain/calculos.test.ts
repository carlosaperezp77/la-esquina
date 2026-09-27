import { describe, expect, it } from 'vitest'
import { aDolares, esConTodo, leerNumero, resumen, sinIngredientes, totalBs, validar, validarJornada } from './calculos'
import { INGREDIENTES } from './menu'
import type { NuevaComanda, Precios } from './tipos'

const todo = INGREDIENTES.map(i => i.id)
const base: NuevaComanda = { nombre: 'Ana', mesa: '', perros: [], bebidas: {}, observaciones: '' }
const precios: Precios = { perro: 600, bebidas: { nestea: 300, coca: 350, agua: 200 } }

describe('cálculos de la comanda', () => {
  it('suma perros y bebidas en Bs con los precios del día', () => {
    expect(totalBs({ perros: [{ cant: 2, ingredientes: todo }, { cant: 1, ingredientes: ['salchicha'] }], bebidas: { coca: 2, agua: 1 } }, precios))
      .toBe(3 * 600 + 2 * 350 + 200)
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
    expect(resumen({ perros: [{ cant: 3, ingredientes: todo }], bebidas: { nestea: 1 } })).toBe('3 perros con todo, 1 Nestea')
    expect(resumen({ perros: [{ cant: 2, ingredientes: todo }, { cant: 1, ingredientes: ['salchicha'] }], bebidas: {} }))
      .toBe('3 perros (2 con todo)')
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
    expect(validarJornada({ tasa: 190, precios })).toBeNull()
  })
})
