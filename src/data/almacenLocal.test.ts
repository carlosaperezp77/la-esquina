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

const nueva = { nombre: 'Ana', mesa: '3', perros: [{ cant: 2, ingredientes: ['salchicha' as const] }, { cant: 0, ingredientes: [] }], bebidas: { agua: 1, coca: 0 }, observaciones: ' ', tasa: 190 }

describe('almacén en modo demo', () => {
  it('numera las comandas del día y guarda el total', async () => {
    const a = new AlmacenLocal(new MemoriaStorage())
    const c1 = await a.crear(nueva)
    const c2 = await a.crear(nueva)
    expect([c1.numero, c2.numero]).toEqual([1, 2])
    expect(c1.totalUsd).toBe(7)
    expect(c1.perros).toHaveLength(1)
    expect(c1.bebidas).toEqual({ agua: 1 })
    expect(c1.estado).toBe('nueva')
  })

  it('avanza el estado, cobra y avisa a los suscritos', async () => {
    const a = new AlmacenLocal(new MemoriaStorage())
    let avisos = 0
    a.suscribir(() => avisos++)
    const c = await a.crear(nueva)
    await a.cambiarEstado(c.id, 'lista')
    await a.cobrar(c.id, 'movil', '4521')
    const [g] = await a.listar()
    expect(g.estado).toBe('lista')
    expect(g.listaEn).not.toBeNull()
    expect(g.pago).toMatchObject({ metodo: 'movil', referencia: '4521' })
    expect(avisos).toBe(3)
  })
})
