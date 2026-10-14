import { describe, expect, it } from 'vitest'
import { AlmacenLocal } from './almacenLocal'
import { diaAnterior, hoy, quedaronSinCobrar } from '../domain/calculos'
import { pantallasDe } from '../domain/accesos'

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

describe('adicionales en modo demo', () => {
  it('agrega a una comanda sin cobrar y rechaza las cobradas', async () => {
    const a = new AlmacenLocal(new MemoriaStorage())
    const c = await a.crear(nueva, jornada)
    await a.cambiarEstado(c.id, 'entregada')
    const n = await a.agregar(c.id, { perros: [], bebidas: { nestea: 1 }, envases: 0, observaciones: '' }, jornada)
    expect(n.estado).toBe('nueva')
    expect(n.totalBs).toBe(c.totalBs + 300)
    expect(n.adicionales).toHaveLength(1)
    await a.cobrar(c.id, 'efectivo', null, 'bs')
    await expect(a.agregar(c.id, { perros: [], bebidas: { agua: 1 }, envases: 0, observaciones: '' }, jornada)).rejects.toThrow(/cobró/)
  })
})

describe('fin de la jornada', () => {
  const manana = () => { const d = new Date(); d.setDate(d.getDate() + 1); return hoy(d) }

  it('al cerrar caja saca de cocina todas las comandas del día', async () => {
    const a = new AlmacenLocal(new MemoriaStorage())
    const c = await a.crear(nueva, jornada)
    await a.cobrar(c.id, 'efectivo', null, 'bs')
    await a.cerrarDia({ fecha: hoy(), fondoBs: 0, fondoUsd: 0, contadoBs: 0, contadoUsd: 0, observaciones: '', inventarioFinal: {}, resumen: null as never })
    const [g] = await a.listar()
    expect(g.estado).toBe('entregada')
    expect(g.pago).toMatchObject({ metodo: 'efectivo' })
  })

  it('al abrir el día siguiente pasa a crédito lo que quedó sin cobrar', async () => {
    const a = new AlmacenLocal(new MemoriaStorage())
    const c1 = await a.crear(nueva, jornada)
    const c2 = await a.crear(nueva, jornada)
    const c3 = await a.crear(nueva, jornada)
    await a.cobrar(c2.id, 'movil', '1', null)
    await a.anular(c3.id)
    await a.abrirJornada({ fecha: hoy(), tasa: 200, precios: jornada.precios, inventario: {} })
    expect((await a.listar()).find(c => c.id === c1.id)!.pago).toBeNull()

    await a.abrirJornada({ fecha: manana(), tasa: 200, precios: jornada.precios, inventario: {} })
    const l = await a.listar()
    expect(l.find(c => c.id === c1.id)).toMatchObject({ estado: 'entregada', pago: { metodo: 'credito' } })
    expect(l.find(c => c.id === c2.id)!.pago).toMatchObject({ metodo: 'movil' })
    expect(l.find(c => c.id === c3.id)).toMatchObject({ estado: 'nueva', pago: null })
    expect(quedaronSinCobrar(l, manana())).toHaveLength(0)
  })
})

describe('diaAnterior', () => {
  it('cruza meses y años', () => {
    expect(diaAnterior('2026-03-01')).toBe('2026-02-28')
    expect(diaAnterior('2027-01-01')).toBe('2026-12-31')
  })
})

describe('accesos por usuario en modo demo', () => {
  it('crea el administrador una sola vez y entra con su clave', async () => {
    const a = new AlmacenLocal(new MemoriaStorage(), new MemoriaStorage())
    expect(await a.estadoAccesos()).toBe('sin-admin')
    await a.crearAdmin({ nombre: 'Carlos', usuario: 'Carlos', clave: '123456' })
    expect(await a.estadoAccesos()).toBe('listo')
    await expect(a.crearAdmin({ nombre: 'Otro', usuario: 'otro', clave: '123456' })).rejects.toThrow('ya existe')
    await expect(a.entrar('carlos', 'mala')).rejects.toThrow('incorrectos')
    expect(await a.entrar('carlos', '123456')).toMatchObject({ usuario: 'carlos', rol: 'admin' })
    expect((await a.sesion())?.nombre).toBe('Carlos')
  })

  it('solo el administrador maneja usuarios, y no se quita el acceso a sí mismo', async () => {
    const a = new AlmacenLocal(new MemoriaStorage(), new MemoriaStorage())
    await a.crearAdmin({ nombre: 'Carlos', usuario: 'carlos', clave: '123456' })
    await a.entrar('carlos', '123456')
    await a.crearUsuario({ nombre: 'Gerencia', usuario: 'gerencia', clave: 'abcdef', rol: 'gerencia' })
    await expect(a.crearUsuario({ nombre: 'X', usuario: 'gerencia', clave: 'abcdef', rol: 'caja' })).rejects.toThrow('Ya existe')
    const [yo, g] = await a.usuarios()
    await expect(a.cambiarUsuario(yo.id, { activo: false })).rejects.toThrow('a ti mismo')
    await a.cambiarUsuario(g.id, { activo: false })
    await a.salir()
    await expect(a.entrar('gerencia', 'abcdef')).rejects.toThrow('desactivado')
    await a.entrar('carlos', '123456')
    await a.cambiarUsuario(g.id, { activo: true, clave: 'nueva1' })
    await a.entrar('gerencia', 'nueva1')
    await expect(a.usuarios()).rejects.toThrow('Solo el administrador')
  })
})

describe('pantallas por rol', () => {
  it('cada rol ve solo lo suyo', () => {
    expect(pantallasDe('admin')).toContain('usuarios')
    expect(pantallasDe('gerencia')).toEqual(['caja', 'cocina', 'mesero'])
    expect(pantallasDe('cocina')).toEqual(['cocina'])
    expect(pantallasDe(null)).not.toContain('usuarios')
  })
})
