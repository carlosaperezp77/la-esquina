import type { Comanda, EstadoComanda, MetodoPago, NuevaComanda } from '../domain/tipos'

/** Operaciones sobre comandas que comparten caja, cocina y meseros. */
export interface Almacen {
  /** Nombre visible del modo de datos (demo o en línea). */
  readonly modo: 'demo' | 'en-linea'
  /** Comandas de hoy y las que siguen sin cobrar de días anteriores. */
  listar(): Promise<Comanda[]>
  /** Llama a `cb` cada vez que cambia cualquier comanda, en este equipo o en otro. */
  suscribir(cb: () => void): () => void
  crear(c: NuevaComanda): Promise<Comanda>
  cambiarEstado(id: string, estado: EstadoComanda): Promise<void>
  cobrar(id: string, metodo: MetodoPago, referencia: string | null): Promise<void>
}

