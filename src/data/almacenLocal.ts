import { aDolares, hoy, totalBs } from '../domain/calculos'
import type { Comanda, EstadoComanda, Jornada, MetodoPago, NuevaComanda } from '../domain/tipos'
import type { Almacen } from './almacen'

const CLAVE = 'la-esquina:comandas'
const CLAVE_JORNADAS = 'la-esquina:jornadas'

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
      window.addEventListener('storage', e => { if (e.key === CLAVE || e.key === CLAVE_JORNADAS) this.avisar(false) })
  }

  private leerDe<T>(clave: string): T[] {
    try {
      return JSON.parse(this.storage.getItem(clave) ?? '[]') as T[]
    } catch {
      return []
    }
  }

  private leer() { return this.leerDe<Comanda>(CLAVE) }

  private guardar(cs: Comanda[]) {
    this.storage.setItem(CLAVE, JSON.stringify(cs))
    this.avisar(true)
  }

  async ultimaJornada() {
    const js = this.leerDe<Jornada>(CLAVE_JORNADAS)
    return js.reduce<Jornada | null>((u, j) => (!u || j.fecha > u.fecha ? j : u), null)
  }

  async abrirJornada(j: Omit<Jornada, 'abiertaEn'>) {
    const nueva: Jornada = { ...j, abiertaEn: new Date().toISOString() }
    const js = this.leerDe<Jornada>(CLAVE_JORNADAS).filter(x => x.fecha !== j.fecha)
    this.storage.setItem(CLAVE_JORNADAS, JSON.stringify([...js, nueva]))
    this.avisar(true)
    return nueva
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

  async crear(n: NuevaComanda, jornada: Jornada) {
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
      tasa: jornada.tasa,
      totalBs: totalBs(n, jornada.precios),
      totalUsd: aDolares(totalBs(n, jornada.precios), jornada.tasa),
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
