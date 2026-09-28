import { describe, expect, it } from 'vitest'
import { AlmacenLocal } from './almacenLocal'

class MemoriaStorage implements Storage {
  private m = new Map<string, string>()
  get length() { return this.m.size }
  clear() { this.m.clear() }
  getItem(k: string) { return this.m.get(k) ?? null }
  key(i: number) { return [...this.m.keys()][i] ?? null }
  removeItem(k: string) { this.m.delete(k) }
  setItem(k: string, v: string) { this.m.set(k, v) }
}

const nueva = { nombre: 'Ana', mesa: '3', perros: [{ cant: 2, ingredientes: ['salchicha' as const] }, { cant: 0, ingredientes: [] }], bebidas: { agua: 1, refresco: 0 }, envases: 1, observaciones: ' ' }
const jornada = { fecha: '2026-09-27', tasa: 200, precios: { perro: 600, bebidas: { nestea: 300, refresco: 350, refresco1l: 700, refresco2l: 1100, agua: 200 }, envase: 100 }, inventario: { panes: 40 }, abiertaEn: '' }

describe('almacén en modo demo', () => {
  it('numera las comandas del día y guarda el total', async () => {
    const a = new AlmacenLocal(new MemoriaStorage())
    const c1 = await a.crear(nueva, jornada)
    const c2 = await a.crear(nueva, jornada)
    expect([c1.numero, c2.numero]).toEqual([1, 2])
    expect(c1.totalBs).toBe(1500)
    expect(c1.totalUsd).toBe(7.5)
    expect(c1.envases).toBe(1)
    expect(c1.tasa).toBe(200)
    expect(c1.perros).toHaveLength(1)
    expect(c1.bebidas).toEqual({ agua: 1 })
    expect(c1.estado).toBe('nueva')
  })

  it('avanza el estado, cobra y avisa a los suscritos', async () => {
    const a = new AlmacenLocal(new MemoriaStorage())
    let avisos = 0
    a.suscribir(() => avisos++)
    const c = await a.crear(nueva, jornada)
    await a.cambiarEstado(c.id, 'lista')
    await a.cobrar(c.id, 'movil', '4521', null)
    const [g] = await a.listar()
    expect(g.estado).toBe('lista')
    expect(g.listaEn).not.toBeNull()
    expect(g.pago).toMatchObject({ metodo: 'movil', referencia: '4521' })
    expect(avisos).toBe(3)
  })
  it('guarda la apertura del día y devuelve la más reciente', async () => {
    const a = new AlmacenLocal(new MemoriaStorage())
    expect(await a.ultimaJornada()).toBeNull()
    await a.abrirJornada({ fecha: '2026-09-26', tasa: 189, precios: jornada.precios, inventario: {} })
    await a.abrirJornada({ fecha: '2026-09-27', tasa: 190, precios: jornada.precios, inventario: {} })
    await a.abrirJornada({ fecha: '2026-09-27', tasa: 191, precios: jornada.precios, inventario: { panes: 40 } })
    expect(await a.ultimaJornada()).toMatchObject({ fecha: '2026-09-27', tasa: 191, inventario: { panes: 40 } })
  })

  it('anula solo comandas sin cobrar', async () => {
    const a = new AlmacenLocal(new MemoriaStorage())
    const c1 = await a.crear(nueva, jornada)
    const c2 = await a.crear(nueva, jornada)
    await a.cobrar(c2.id, 'credito', null, null)
    await a.anular(c1.id)
    await a.anular(c2.id)
    const l = await a.listar()
    expect(l.find(c => c.id === c1.id)!.anuladaEn).not.toBeNull()
    expect(l.find(c => c.id === c2.id)!.anuladaEn).toBeNull()
  })
})
