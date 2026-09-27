import { hoy, totalUsd } from '../domain/calculos'
import type { Comanda, EstadoComanda, MetodoPago, NuevaComanda } from '../domain/tipos'
import type { Almacen } from './almacen'

const CLAVE = 'la-esquina:comandas'

/**
 * Modo demo: guarda en este navegador y avisa a las otras pestañas del mismo
 * equipo. Sirve para probar caja, cocina y mesero en pestañas distintas sin
 * configurar nada. Para varios equipos a la vez se usa el almacén de Supabase.
 */
export class AlmacenLocal implements Almacen {
  readonly modo = 'demo' as const
  private canal = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CLAVE) : null
  private oyentes = new Set<() => void>()

  private storage: Storage

  constructor(storage: Storage = localStorage) {
    this.storage = storage
    this.canal?.addEventListener('message', () => this.avisar(false))
    if (typeof window !== 'undefined')
      window.addEventListener('storage', e => { if (e.key === CLAVE) this.avisar(false) })
  }

  private leer(): Comanda[] {
    try {
      return JSON.parse(this.storage.getItem(CLAVE) ?? '[]') as Comanda[]
    } catch {
      return []
    }
  }

  private guardar(cs: Comanda[]) {
    this.storage.setItem(CLAVE, JSON.stringify(cs))
    this.avisar(true)
  }

  private avisar(difundir: boolean) {
    if (difundir) this.canal?.postMessage('cambio')
    this.oyentes.forEach(cb => cb())
  }

  async listar() {
    const f = hoy()
    return this.leer().filter(c => c.fecha === f || !c.pago)
  }

  suscribir(cb: () => void) {
    this.oyentes.add(cb)
    return () => { this.oyentes.delete(cb) }
  }

  async crear(n: NuevaComanda) {
    const cs = this.leer()
    const fecha = hoy()
    const numero = cs.filter(c => c.fecha === fecha).reduce((m, c) => Math.max(m, c.numero), 0) + 1
    const c: Comanda = {
      id: crypto.randomUUID(),
      numero,
      fecha,
      nombre: n.nombre.trim(),
      mesa: n.mesa,
      perros: n.perros.filter(l => l.cant > 0),
      bebidas: Object.fromEntries(Object.entries(n.bebidas).filter(([, v]) => v)),
      observaciones: n.observaciones.trim(),
      tasa: n.tasa,
      totalUsd: totalUsd(n),
      estado: 'nueva',
      creadaEn: new Date().toISOString(),
      listaEn: null,
      entregadaEn: null,
      pago: null,
    }
    this.guardar([...cs, c])
    return c
  }

  async cambiarEstado(id: string, estado: EstadoComanda) {
    const ahora = new Date().toISOString()
    this.guardar(this.leer().map(c => c.id !== id ? c : {
      ...c,
      estado,
      listaEn: estado === 'lista' ? ahora : c.listaEn,
      entregadaEn: estado === 'entregada' ? ahora : c.entregadaEn,
    }))
  }

  async cobrar(id: string, metodo: MetodoPago, referencia: string | null) {
    const cobradaEn = new Date().toISOString()
    this.guardar(this.leer().map(c => c.id !== id ? c : { ...c, pago: { metodo, referencia, cobradaEn } }))
  }
}
