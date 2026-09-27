export type IngredienteId =
  | 'salchicha' | 'repollo' | 'papas' | 'pepinillo' | 'cebolla'
  | 'salsa' | 'mayonesa' | 'mostaza' | 'queso'

export type BebidaId = 'nestea' | 'coca' | 'agua'

export type MetodoPago = 'efectivo' | 'movil' | 'tarjeta' | 'transferencia'

/** Flujo en cocina: nueva → preparando → lista → entregada. */
export type EstadoComanda = 'nueva' | 'preparando' | 'lista' | 'entregada'

/** Una fila de la comanda: N perros preparados igual. */
export interface LineaPerro {
  cant: number
  ingredientes: IngredienteId[]
}

export interface Pago {
  metodo: MetodoPago
  referencia: string | null
  cobradaEn: string
}

export interface Comanda {
  id: string
  /** Número del día, empieza en 1 cada día. */
  numero: number
  fecha: string // AAAA-MM-DD
  nombre: string
  /** Número de mesa, 'LL' para llevar, o '' si solo hay nombre. */
  mesa: string
  perros: LineaPerro[]
  bebidas: Partial<Record<BebidaId, number>>
  observaciones: string
  /** Bs por USD usada al crear la comanda. */
  tasa: number
  totalBs: number
  /** Equivalente en USD a la tasa de la comanda. */
  totalUsd: number
  estado: EstadoComanda
  creadaEn: string
  listaEn: string | null
  entregadaEn: string | null
  pago: Pago | null
}

export interface NuevaComanda {
  nombre: string
  mesa: string
  perros: LineaPerro[]
  bebidas: Partial<Record<BebidaId, number>>
  observaciones: string
}

/** Precios de venta en bolívares que fija el cajero al abrir el día. */
export interface Precios {
  perro: number
  bebidas: Record<BebidaId, number>
}

/** Apertura del día: tasa BCV y precios en Bs. Una por fecha. */
export interface Jornada {
  fecha: string // AAAA-MM-DD
  /** Bs por USD, tasa BCV del día. */
  tasa: number
  precios: Precios
  abiertaEn: string
}
