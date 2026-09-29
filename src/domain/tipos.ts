export type IngredienteId =
  | 'salchicha' | 'repollo' | 'papas' | 'pepinillo' | 'cebolla'
  | 'salsa' | 'mayonesa' | 'mostaza' | 'queso'

export type BebidaId = 'nestea' | 'refresco' | 'refresco1l' | 'refresco2l' | 'agua'

/** Crédito: se sirvió y se anota como deuda; no entra como cobrado. */
export type MetodoPago = 'efectivo' | 'movil' | 'tarjeta' | 'transferencia' | 'credito'

/** Insumos del "Inventario entregado para el día" del Control diario de caja. */
export type InsumoId =
  | 'panes' | 'salchichas' | 'papas' | 'queso' | 'repollo' | 'cebolla'
  | 'pepinillo' | 'salsa' | 'mayonesa' | 'mostaza' | 'nestea' | 'refrescos' | 'refrescos1l' | 'refrescos2l' | 'agua'

export type Inventario = Partial<Record<InsumoId, number>>

/** Flujo en cocina: nueva → preparando → lista → entregada. */
export type EstadoComanda = 'nueva' | 'preparando' | 'lista' | 'entregada'

/** Una fila de la comanda: N perros preparados igual. */
export interface LineaPerro {
  cant: number
  ingredientes: IngredienteId[]
}

/** Moneda en que se recibió el efectivo. Los demás métodos son siempre en Bs. */
export type Moneda = 'bs' | 'usd'

export interface Pago {
  metodo: MetodoPago
  referencia: string | null
  /** Solo para efectivo; null en los demás métodos. */
  moneda: Moneda | null
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
  /** Envases para llevar. */
  envases: number
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
  /** Si se anuló, cuándo. Una comanda anulada no cuenta como venta. */
  anuladaEn: string | null
  /**
   * Lo que el cliente pidió después, en orden. Ya está sumado en perros,
   * bebidas, envases y totales; aquí queda para que cocina vea solo lo nuevo.
   */
  adicionales: Adicional[]
}

/** Lo que se agrega a una comanda sin cobrar. */
export interface Adicional {
  perros: LineaPerro[]
  bebidas: Partial<Record<BebidaId, number>>
  envases: number
  observaciones: string
  totalBs: number
  creadoEn: string
}

/** Lo que se pide en una ronda: la comanda nueva sin nombre ni mesa. */
export type Pedido = Pick<NuevaComanda, 'perros' | 'bebidas' | 'envases' | 'observaciones'>

export interface NuevaComanda {
  nombre: string
  mesa: string
  perros: LineaPerro[]
  bebidas: Partial<Record<BebidaId, number>>
  envases: number
  observaciones: string
}

/** Precios de venta en bolívares que fija el cajero al abrir el día. */
export interface Precios {
  perro: number
  bebidas: Record<BebidaId, number>
  envase: number
}

/** Apertura del día: tasa BCV y precios en Bs. Una por fecha. */
export interface Jornada {
  fecha: string // AAAA-MM-DD
  /** Bs por USD, tasa BCV del día. */
  tasa: number
  precios: Precios
  /** Inventario entregado al cajero al empezar el día. */
  inventario: Inventario
  abiertaEn: string
}

/** Cierre de caja: lo que el cajero contó contra lo que dice el sistema. */
export interface Cierre {
  fecha: string
  cerradoEn: string
  /** Fondo con que empezó la caja, por moneda. */
  fondoBs: number
  fondoUsd: number
  /** Efectivo contado al cerrar, por moneda (incluye el fondo). */
  contadoBs: number
  contadoUsd: number
  observaciones: string
  /** Inventario que queda al cerrar. */
  inventarioFinal: Inventario
  /** Foto del reporte al momento del cierre, para consultarlo después. */
  resumen: ResumenDia
}

export interface VentaPorMetodo {
  metodo: MetodoPago
  moneda: Moneda
  cant: number
  /** Monto en la moneda en que se cobró. */
  monto: number
  bs: number
  usd: number
}

export interface ResumenDia {
  fecha: string
  comandasCobradas: number
  totalBs: number
  totalUsd: number
  porMetodo: VentaPorMetodo[]
  perros: number
  perrosConTodo: number
  bebidas: Partial<Record<BebidaId, number>>
  envases: number
  anuladas: number
  pendientes: number
  pendientesBs: number
}
