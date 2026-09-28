import { describe, expect, it } from 'vitest'
import { aDolares, esConTodo, leerNumero, resumen, sinIngredientes, totalBs, validar, validarJornada } from './calculos'
import { INGREDIENTES } from './menu'
import type { NuevaComanda, Precios } from './tipos'

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
