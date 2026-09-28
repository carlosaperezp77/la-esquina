import type { Cierre, Comanda, EstadoComanda, Jornada, MetodoPago, Moneda, NuevaComanda } from '../domain/tipos'

/** Operaciones que comparten caja, cocina y meseros. */
export interface Almacen {
  /** Nombre visible del modo de datos (demo o en línea). */
  readonly modo: 'demo' | 'en-linea'
  /** Comandas de hoy y las que siguen sin cobrar de días anteriores. */
  listar(): Promise<Comanda[]>
  /** Apertura más reciente (la de hoy si ya se hizo), o null si nunca se abrió. */
  ultimaJornada(): Promise<Jornada | null>
  /** Guarda la tasa y los precios del día; si ya había apertura hoy, la reemplaza. */
  abrirJornada(j: Omit<Jornada, 'abiertaEn'>): Promise<Jornada>
  /** Llama a `cb` cada vez que cambia una comanda o la apertura, en este equipo o en otro. */
  suscribir(cb: () => void): () => void
  /** Crea la comanda con la tasa y los precios de la jornada. */
  crear(c: NuevaComanda, jornada: Jornada): Promise<Comanda>
  cambiarEstado(id: string, estado: EstadoComanda): Promise<void>
  /** Anula una comanda sin cobrar: sale de cocina y no cuenta como venta. */
  anular(id: string): Promise<void>
  /** `moneda` solo aplica al efectivo. */
  cobrar(id: string, metodo: MetodoPago, referencia: string | null, moneda: Moneda | null): Promise<void>
  /** Cierre de caja de esa fecha, o null si el día sigue abierto. */
  cierre(fecha: string): Promise<Cierre | null>
  /** Guarda el cierre del día. Falla si ese día ya se cerró. */
  cerrarDia(c: Omit<Cierre, 'cerradoEn'>): Promise<Cierre>
}
